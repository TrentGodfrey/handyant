import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { decryptHomeAccess } from "@/lib/sensitive-data";
import { sendActivityEmail } from "@/lib/activity-email";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();
  const { id } = await ctx.params;

  const claimed = await prisma.booking.updateMany({
    where: {
      id,
      status: "pending",
      OR: [{ techId: null }, { techId: tech.id }],
    },
    data: {
      techId: tech.id,
      status: "confirmed",
    },
  });
  if (claimed.count !== 1) {
    const current = await prisma.booking.findUnique({
      where: { id },
      select: { status: true, techId: true },
    });
    if (!current) return notFound("Booking not found");
    if (current.techId && current.techId !== tech.id) {
      return Response.json(
        { error: "This booking was already accepted by another technician" },
        { status: 409 },
      );
    }
    if (current.status !== "pending") {
      return badRequest("Only pending bookings can be accepted");
    }
    return forbidden();
  }

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id },
    include: {
      home: true,
      customer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
    },
  });
  await prisma.bookingDecline.deleteMany({
    where: { bookingId: id, techId: tech.id },
  });

  await prisma.notification.create({
    data: {
      userId: booking.customerId,
      title: "Booking confirmed",
      body: `${tech.name ?? "Your tech"} accepted your booking`,
      type: "booking",
      link: "/home",
    },
  });

  await sendActivityEmail({
    to: booking.customer.email,
    recipientName: booking.customer.name,
    subject: "Your MCQ booking is confirmed",
    heading: "Booking confirmed",
    message: `${tech.name ?? "Your MCQ technician"} accepted your booking.`,
    actionPath: "/home",
    actionLabel: "View booking",
  });

  return Response.json({
    ...booking,
    estimatedCost: null,
    finalCost: null,
    home: booking.home ? decryptHomeAccess(booking.home) : null,
  });
}
