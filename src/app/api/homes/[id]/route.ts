import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

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
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  return Response.json(home);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

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
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  await prisma.home.delete({ where: { id } });
  return Response.json({ ok: true });
}
