import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, notFound } from "@/lib/session";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({ where: { id } });
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

  return Response.json(booking);
}
