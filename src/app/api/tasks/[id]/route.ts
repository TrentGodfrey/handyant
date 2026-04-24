import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { booking: true },
  });
  if (!task) return notFound("Task not found");
  if (task.booking.customerId !== user.id && task.booking.techId !== user.id && user.role !== "tech") {
    return forbidden();
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.done !== undefined) data.done = body.done;
  if (body.label !== undefined) data.label = body.label;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const updated = await prisma.task.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { booking: true },
  });
  if (!task) return notFound("Task not found");
  if (task.booking.customerId !== user.id && task.booking.techId !== user.id && user.role !== "tech") {
    return forbidden();
  }

  await prisma.task.delete({ where: { id } });
  return Response.json({ ok: true });
}
