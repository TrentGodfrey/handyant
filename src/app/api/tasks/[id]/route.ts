import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { booking: { include: { customer: { select: { name: true, email: true } } } } },
  });
  if (!task) return notFound("Task not found");

  const isAssignedTech = user.role === "tech" && task.booking.techId === user.id;
  if (!isAssignedTech) return forbidden();

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.done !== undefined) data.done = body.done;
  if (body.label !== undefined) data.label = body.label;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.update({ where: { id }, data });
    if (task.homeTodoId && body.done !== undefined) {
      await tx.homeTodo.update({
        where: { id: task.homeTodoId },
        data: { status: body.done ? "completed" : "pending" },
      });
    }
    return result;
  });
  await sendActivityEmail({
    to: task.booking.customer.email,
    recipientName: task.booking.customer.name,
    subject: `Visit task updated: ${updated.label}`,
    heading: "Visit task updated",
    message: `${user.name} updated “${updated.label}”.${body.done !== undefined ? ` It is now ${body.done ? "complete" : "open"}.` : ""}`,
    actionPath: `/booking?id=${task.booking.id}`,
    actionLabel: "View booking",
  });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { booking: { include: { customer: { select: { name: true, email: true } } } } },
  });
  if (!task) return notFound("Task not found");

  // Only the assigned tech can delete a task entirely; customers can untick
  // via PATCH but should never remove tasks.
  const isAssignedTech = user.role === "tech" && task.booking.techId === user.id;
  if (!isAssignedTech) return forbidden();

  await prisma.task.delete({ where: { id } });
  await sendActivityEmail({
    to: task.booking.customer.email,
    recipientName: task.booking.customer.name,
    subject: `Visit task removed: ${task.label}`,
    heading: "Visit task removed",
    message: `${user.name} removed “${task.label}” from your MCQ visit.`,
    actionPath: `/booking?id=${task.booking.id}`,
    actionLabel: "View booking",
  });
  return Response.json({ ok: true });
}
