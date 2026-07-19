import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, notFound } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({
    where: { id },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!existing) return notFound("Booking not found");

  const wasUnassignedOffer = existing.techId === null;

  const booking = await prisma.booking.update({
    where: { id },
    data: wasUnassignedOffer
      ? { status: "pending", techId: null }
      : { status: "cancelled" },
  });

  await prisma.notification.create({
    data: {
      userId: existing.customerId,
      title: wasUnassignedOffer ? "Booking offer declined" : "Booking cancelled",
      body: wasUnassignedOffer
        ? "Your booking is still searching for a tech"
        : "Your booking has been cancelled by the tech",
      type: "booking",
      link: `/booking?id=${booking.id}`,
    },
  });

  await sendActivityEmail({
    to: existing.customer.email,
    recipientName: existing.customer.name,
    subject: wasUnassignedOffer ? "MCQ booking update" : "MCQ booking cancelled",
    heading: wasUnassignedOffer ? "We are finding another technician" : "Booking cancelled",
    message: wasUnassignedOffer
      ? "That technician was unavailable, but your booking remains open while MCQ finds another technician."
      : "Your booking was cancelled by the assigned technician.",
    actionPath: `/booking?id=${booking.id}`,
    actionLabel: "View booking",
  });

  return Response.json(booking);
}
