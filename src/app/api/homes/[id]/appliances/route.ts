import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";

/**
 * Owner-or-tech access check (same pattern as /api/homes/[id]).
 * Tech can access any home; customer can only access their own.
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

  const home = await prisma.home.findUnique({ where: { id }, select: { id: true, customerId: true } });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const appliances = await prisma.homeAppliance.findMany({
    where: { homeId: id },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(appliances);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id }, select: { id: true, customerId: true } });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return badRequest("name required");

  const intervalDays =
    body.intervalDays === null || body.intervalDays === undefined || body.intervalDays === ""
      ? null
      : Number(body.intervalDays);
  if (intervalDays !== null && (!Number.isFinite(intervalDays) || intervalDays < 0)) {
    return badRequest("intervalDays must be a non-negative number");
  }

  const installedAt = body.installedAt ? new Date(body.installedAt) : null;
  const lastServicedAt = body.lastServicedAt ? new Date(body.lastServicedAt) : null;

  const appliance = await prisma.homeAppliance.create({
    data: {
      homeId: id,
      name,
      brand: body.brand?.trim?.() || null,
      modelNumber: body.modelNumber?.trim?.() || null,
      installedAt: installedAt && !Number.isNaN(installedAt.getTime()) ? installedAt : null,
      intervalDays,
      lastServicedAt: lastServicedAt && !Number.isNaN(lastServicedAt.getTime()) ? lastServicedAt : null,
      notes: body.notes?.trim?.() || null,
    },
  });

  return Response.json(appliance, { status: 201 });
}
