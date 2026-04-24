import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, notFound } from "@/lib/session";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return notFound("Booking not found");

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      techId: tech.id,
      status: "confirmed",
    },
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
    },
  });

  await prisma.notification.create({
    data: {
      userId: booking.customerId,
      title: "Booking confirmed",
      body: `${tech.name ?? "Your tech"} accepted your booking`,
      type: "booking",
      link: `/booking?id=${booking.id}`,
    },
  });

  return Response.json(booking);
}
