import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";

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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; applianceId: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id, applianceId } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id }, select: { id: true, customerId: true } });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const existing = await prisma.homeAppliance.findUnique({ where: { id: applianceId } });
  if (!existing || existing.homeId !== id) return notFound("Appliance not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const n = typeof body.name === "string" ? body.name.trim() : "";
    if (!n) return badRequest("name cannot be empty");
    data.name = n;
  }
  if (body.brand !== undefined) data.brand = body.brand?.trim?.() || null;
  if (body.modelNumber !== undefined) data.modelNumber = body.modelNumber?.trim?.() || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim?.() || null;

  if (body.intervalDays !== undefined) {
    if (body.intervalDays === null || body.intervalDays === "") {
      data.intervalDays = null;
    } else {
      const n = Number(body.intervalDays);
      if (!Number.isFinite(n) || n < 0) return badRequest("intervalDays must be a non-negative number");
      data.intervalDays = n;
    }
  }
  if (body.installedAt !== undefined) {
    if (body.installedAt === null || body.installedAt === "") {
      data.installedAt = null;
    } else {
      const d = new Date(body.installedAt);
      data.installedAt = Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (body.lastServicedAt !== undefined) {
    if (body.lastServicedAt === null || body.lastServicedAt === "") {
      data.lastServicedAt = null;
    } else if (body.lastServicedAt === "now") {
      data.lastServicedAt = new Date();
    } else {
      const d = new Date(body.lastServicedAt);
      data.lastServicedAt = Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const updated = await prisma.homeAppliance.update({ where: { id: applianceId }, data });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; applianceId: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id, applianceId } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id }, select: { id: true, customerId: true } });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const existing = await prisma.homeAppliance.findUnique({ where: { id: applianceId } });
  if (!existing || existing.homeId !== id) return notFound("Appliance not found");

  await prisma.homeAppliance.delete({ where: { id: applianceId } });
  return Response.json({ ok: true });
}
