import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

/**
 * Returns true if `user` is allowed to read/edit this home:
 * - The customer who owns it.
 * - A tech who has ever had a booking on this home (or with the home's customer).
 */
async function canAccessHome(
  user: { id: string; role: "customer" | "tech" },
  home: { id: string; customerId: string }
): Promise<boolean> {
  if (home.customerId === user.id) return true;
  if (user.role !== "tech") return false;

  const booking = await prisma.booking.findFirst({
    where: {
      techId: user.id,
      OR: [{ homeId: home.id }, { customerId: home.customerId }],
    },
    select: { id: true },
  });
  return Boolean(booking);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({
    where: { id },
    include: {
      photos: true,
      customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
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
    },
  });

  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  return Response.json(home);
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

  const updated = await prisma.home.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  // Only the customer who owns the home may delete it (techs cannot delete).
  if (home.customerId !== user.id) return forbidden();

  await prisma.home.delete({ where: { id } });
  return Response.json({ ok: true });
}
