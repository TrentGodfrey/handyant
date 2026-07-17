import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";
import { decryptHomeAccess, encryptSensitiveValue } from "@/lib/sensitive-data";
import { isConfirmedHomeHistoryDeletion } from "@/lib/home-deletion";
import { deleteLocalUploadFiles } from "@/lib/upload-storage";

/**
 * Returns true if `user` is allowed to read/edit this home:
 * - The customer who owns it.
 * - Any authenticated tech. The staff Homes screen is the business-wide client list,
 *   including newly added homes that do not have a booking yet.
 */
async function canAccessHome(
  user: { id: string; role: "customer" | "tech" },
  home: { id: string; customerId: string }
): Promise<boolean> {
  if (home.customerId === user.id) return true;
  return user.role === "tech";
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({
    where: { id },
    include: {
      photos: true,
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          avatarUrl: true,
          passwordHash: true,
          googleId: true,
        },
      },
      subscriptions: {
        where: { status: "active" },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
      bookings: {
        orderBy: { scheduledDate: "desc" },
        include: {
          tasks: true,
          categories: { include: { category: true } },
          tech: { select: { id: true, name: true, avatarUrl: true } },
          reviews: true,
        },
      },
      householdMembers: { orderBy: { sortOrder: "asc" } },
      todos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
      techNotes: { orderBy: { createdAt: "desc" } },
      appliances: { orderBy: { createdAt: "asc" } },
      invitations: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { email: true, expiresAt: true, createdAt: true },
      },
    },
  });

  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const { passwordHash, googleId, ...customer } = home.customer;
  const responseHome = {
    ...decryptHomeAccess(home),
    bookings: home.bookings.map((booking) => user.role === "tech" ? booking : { ...booking, techNotes: null }),
    techNotes: user.role === "tech" ? home.techNotes : [],
    customer: { ...customer, hasLogin: Boolean(passwordHash || googleId) },
    activeSubscription: home.subscriptions[0] ?? null,
    subscriptions: undefined,
    pendingInvitation: user.role === "tech" ? home.invitations[0] ?? null : null,
    invitations: undefined,
  };

  // Backfill: if this is the customer's primary (only) home and they have
  // completed bookings without a homeId set, surface those in the home's
  // visit history so the UI doesn't show "no visits yet" for legitimate work.
  // Tech viewers see the home's own bookings only (no need to back-fill).
  if (home.customerId === user.id) {
    const homeCount = await prisma.home.count({ where: { customerId: home.customerId } });
    if (homeCount === 1) {
      const orphanBookings = await prisma.booking.findMany({
        where: { customerId: home.customerId, homeId: null },
        orderBy: { scheduledDate: "desc" },
        include: {
          tasks: true,
          categories: { include: { category: true } },
          tech: { select: { id: true, name: true, avatarUrl: true } },
          reviews: true,
        },
      });
      if (orphanBookings.length) {
        const sanitizedOrphans = orphanBookings.map((booking) => ({ ...booking, techNotes: null }));
        const merged = [...responseHome.bookings, ...sanitizedOrphans].sort(
          (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime(),
        );
        return Response.json({ ...responseHome, bookings: merged });
      }
    }
  }

  return Response.json(responseHome);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of [
    "address",
    "city",
    "state",
    "zip",
    "notes",
    "gateCode",
    "wifiName",
    "wifiPassword",
    "yearBuilt",
    "waterHeaterYear",
    "panelAmps",
    "lat",
    "lng",
  ]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.gateCode !== undefined) data.gateCode = encryptSensitiveValue(body.gateCode);
  if (body.wifiPassword !== undefined) data.wifiPassword = encryptSensitiveValue(body.wifiPassword);

  const updated = await prisma.home.update({ where: { id }, data });
  return Response.json(decryptHomeAccess(updated));
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({
    where: { id },
    include: {
      bookings: {
        select: {
          id: true,
          invoices: { select: { id: true } },
          photos: { select: { url: true } },
        },
      },
      photos: { select: { url: true } },
      paymentCheckouts: { select: { id: true } },
      subscriptions: { select: { id: true } },
    },
  });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const hasHistory =
    home.bookings.length > 0 ||
    home.paymentCheckouts.length > 0 ||
    home.subscriptions.length > 0;
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // An ordinary empty-home deletion does not require a request body.
  }
  const deleteHistory = isConfirmedHomeHistoryDeletion(body);

  if (hasHistory && !deleteHistory) {
    return Response.json(
      {
        error: "This home has visit or payment history. Staff can permanently delete it using the history confirmation.",
        code: "HOME_HAS_HISTORY",
        canDeleteHistory: user.role === "tech",
      },
      { status: 409 },
    );
  }

  if (deleteHistory && user.role !== "tech") return forbidden();

  const photoUrls = [
    ...home.photos.map((photo) => photo.url),
    ...home.bookings.flatMap((booking) => booking.photos.map((photo) => photo.url)),
  ];
  const bookingIds = home.bookings.map((booking) => booking.id);
  const invoiceIds = home.bookings.flatMap((booking) => booking.invoices.map((invoice) => invoice.id));

  if (deleteHistory) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentCheckout.deleteMany({
        where: {
          OR: [
            { homeId: id },
            ...(invoiceIds.length ? [{ invoiceId: { in: invoiceIds } }] : []),
          ],
        },
      });
      if (invoiceIds.length) {
        await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      }
      if (bookingIds.length) {
        await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      await tx.subscription.deleteMany({ where: { homeId: id } });
      await tx.home.delete({ where: { id } });
    });
  } else {
    await prisma.home.delete({ where: { id } });
  }

  await deleteLocalUploadFiles(photoUrls);
  return Response.json({
    ok: true,
    deletedHistory: deleteHistory,
    deletedVisits: bookingIds.length,
  });
}
