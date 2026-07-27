import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import {
  TEXT_LIMITS,
  optionalBoundedText,
  requiredBoundedText,
} from "@/lib/text-input";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { booking: { include: { customer: { select: { name: true, email: true } } } } },
  });
  if (!task) return notFound("Task not found");

  const isAssignedTech =
    user.role === "tech" && (user.isAdmin || task.booking.techId === user.id);
  if (!isAssignedTech) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Invalid request body");
  }
  const limit = takeRateLimit(`booking-task-update:${user.id}`, 180, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  const data: Record<string, unknown> = {};

  if (body.done !== undefined) {
    if (typeof body.done !== "boolean") return badRequest("done must be true or false");
    data.done = body.done;
  }
  if (body.label !== undefined) {
    const label = requiredBoundedText(body.label, "Label", TEXT_LIMITS.taskTitle);
    if (!label.ok) return badRequest(label.message);
    data.label = label.value;
  }
  if (body.notes !== undefined) {
    const notes = optionalBoundedText(body.notes, "Notes", TEXT_LIMITS.taskNotes);
    if (!notes.ok) return badRequest(notes.message);
    data.notes = notes.value;
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 10_000) {
      return badRequest("Invalid task order");
    }
    data.sortOrder = body.sortOrder;
  }
  if (Object.keys(data).length === 0) return badRequest("No valid task updates were provided");

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
    actionPath: "/home",
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
  const isAssignedTech =
    user.role === "tech" && (user.isAdmin || task.booking.techId === user.id);
  if (!isAssignedTech) return forbidden();
  const limit = takeRateLimit(`booking-task-delete:${user.id}`, 90, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  await prisma.task.delete({ where: { id } });
  await sendActivityEmail({
    to: task.booking.customer.email,
    recipientName: task.booking.customer.name,
    subject: `Visit task removed: ${task.label}`,
    heading: "Visit task removed",
    message: `${user.name} removed “${task.label}” from your MCQ visit.`,
    actionPath: "/home",
    actionLabel: "View booking",
  });
  return Response.json({ ok: true });
}
