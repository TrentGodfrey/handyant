import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, requireTech, unauthorized } from "@/lib/session";
import { deleteLocalUploadFiles } from "@/lib/upload-storage";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const { id } = await ctx.params;
  const customer = await prisma.user.findFirst({ where: { id, role: "customer" } });
  if (!customer) return notFound("Customer not found");

  const body = await req.json();
  if (body.email === undefined) return badRequest("Email is required");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return badRequest("Enter a valid email address");

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== id) {
    return Response.json({ error: "That email is already in use" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { email },
    select: { id: true, name: true, email: true, phone: true },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const { id } = await ctx.params;
  const customer = await prisma.user.findFirst({
    where: { id, role: "customer" },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      _count: { select: { homes: true } },
    },
  });
  if (!customer) return notFound("Customer not found");

  // Homes carry the long-lived property and service record. They must be
  // removed from the Homes screen first, where history deletion has its own
  // explicit confirmation flow.
  if (customer._count.homes > 0) {
    return Response.json(
      {
        error: "Delete this customer's home before deleting their account.",
        code: "CUSTOMER_HAS_HOME",
      },
      { status: 409 },
    );
  }

  const deleted = await prisma.$transaction(async (tx) => {
    // A customer can have old home-less bookings, messages, or subscriptions.
    // Remove those account-owned records in dependency order so an orphaned
    // login can always be deleted instead of failing on a foreign key.
    const bookings = await tx.booking.findMany({
      where: { customerId: id },
      select: {
        id: true,
        photos: { select: { url: true } },
      },
    });
    const bookingIds = bookings.map((booking) => booking.id);
    const invoices = await tx.invoice.findMany({
      where: {
        OR: [
          { customerId: id },
          ...(bookingIds.length ? [{ bookingId: { in: bookingIds } }] : []),
        ],
      },
      select: { id: true },
    });
    const invoiceIds = invoices.map((invoice) => invoice.id);

    await tx.paymentCheckout.deleteMany({
      where: {
        OR: [
          { customerId: id },
          ...(invoiceIds.length ? [{ invoiceId: { in: invoiceIds } }] : []),
        ],
      },
    });
    await tx.bookingNote.deleteMany({ where: { authorId: id } });
    await tx.message.deleteMany({ where: { senderId: id } });
    await tx.conversation.deleteMany({
      where: { OR: [{ customerId: id }, { techId: id }] },
    });
    await tx.review.deleteMany({
      where: {
        OR: [
          { customerId: id },
          { techId: id },
          ...(bookingIds.length ? [{ bookingId: { in: bookingIds } }] : []),
        ],
      },
    });
    await tx.invoice.deleteMany({
      where: {
        OR: [
          { customerId: id },
          ...(bookingIds.length ? [{ bookingId: { in: bookingIds } }] : []),
        ],
      },
    });
    await tx.subscription.deleteMany({ where: { customerId: id } });
    await tx.booking.deleteMany({ where: { customerId: id } });

    // If this account was previously staff, preserve customers' bookings by
    // unassigning it while removing staff-only records that reference the user.
    await tx.booking.updateMany({ where: { techId: id }, data: { techId: null } });
    await tx.serviceArea.deleteMany({ where: { techId: id } });
    await tx.homeInvitation.deleteMany({ where: { createdById: id } });
    await tx.user.delete({ where: { id } });

    return {
      bookings: bookingIds.length,
      photoUrls: bookings.flatMap((booking) => booking.photos.map((photo) => photo.url)),
    };
  });

  await deleteLocalUploadFiles([
    ...(customer.avatarUrl ? [customer.avatarUrl] : []),
    ...deleted.photoUrls,
  ]);

  return Response.json({ ok: true, deletedBookings: deleted.bookings });
}
