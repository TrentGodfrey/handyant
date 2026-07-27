import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";
import { canAccessBooking } from "@/lib/resource-access";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import {
  TEXT_LIMITS,
  optionalBoundedText,
  requiredBoundedText,
} from "@/lib/text-input";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!booking) return notFound("Booking not found");
  if (!canAccessBooking(user, booking)) return forbidden();

  const tasks = await prisma.task.findMany({
    where: { bookingId: id },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(tasks);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "tech") return forbidden();
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!booking) return notFound("Booking not found");
  if (!canAccessBooking(user, booking)) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Invalid request body");
  }
  const limit = takeRateLimit(`booking-task-create:${user.id}`, 60, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  const label = requiredBoundedText(body.label, "Label", TEXT_LIMITS.taskTitle);
  if (!label.ok) return badRequest(label.message);
  const notes = optionalBoundedText(body.notes, "Notes", TEXT_LIMITS.taskNotes);
  if (!notes.ok) return badRequest(notes.message);
  const sortOrder = body.sortOrder ?? 0;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) {
    return badRequest("Invalid task order");
  }

  const task = await prisma.task.create({
    data: {
      bookingId: id,
      label: label.value,
      notes: notes.value,
      sortOrder,
    },
  });
  await sendActivityEmail({
    to: booking.customer.email,
    recipientName: booking.customer.name,
    subject: `New visit task: ${task.label}`,
    heading: "Visit task added",
    message: `${user.name} added “${task.label}” to your upcoming MCQ visit.`,
    actionPath: "/home",
    actionLabel: "View booking",
  });
  return Response.json(task, { status: 201 });
}
