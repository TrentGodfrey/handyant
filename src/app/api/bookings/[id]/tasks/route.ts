import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!booking) return notFound("Booking not found");
  if (booking.customerId !== user.id && booking.techId !== user.id && user.role !== "tech") {
    return forbidden();
  }

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
  if (booking.techId !== user.id) return forbidden();

  const body = await req.json();
  if (!body.label) return badRequest("Label is required");

  const task = await prisma.task.create({
    data: {
      bookingId: id,
      label: body.label,
      notes: body.notes ?? null,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  await sendActivityEmail({
    to: booking.customer.email,
    recipientName: booking.customer.name,
    subject: `New visit task: ${task.label}`,
    heading: "Visit task added",
    message: `${user.name} added “${task.label}” to your upcoming MCQ visit.`,
    actionPath: `/booking?id=${booking.id}`,
    actionLabel: "View booking",
  });
  return Response.json(task, { status: 201 });
}
