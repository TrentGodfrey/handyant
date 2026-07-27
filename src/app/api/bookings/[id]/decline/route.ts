import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
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
  if (existing.techId && existing.techId !== tech.id && !tech.isAdmin) return forbidden();
  if (!["pending", "confirmed"].includes(existing.status)) {
    return badRequest("Only pending or confirmed bookings can be declined");
  }

  const wasUnassignedOffer = existing.techId === null;
  if (wasUnassignedOffer) {
    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({
          where: { id },
          select: { status: true, techId: true },
        });
        if (!current) throw new Error("BOOKING_NOT_FOUND");
        if (current.status !== "pending" || current.techId !== null) {
          throw new Error("BOOKING_CHANGED");
        }
        await tx.bookingDecline.upsert({
          where: { bookingId_techId: { bookingId: id, techId: tech.id } },
          update: { declinedAt: new Date() },
          create: { bookingId: id, techId: tech.id },
        });
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof Error && error.message === "BOOKING_NOT_FOUND") {
        return notFound("Booking not found");
      }
      if (
        (error instanceof Error && error.message === "BOOKING_CHANGED") ||
        (typeof error === "object" && error && "code" in error && error.code === "P2034")
      ) {
        return Response.json(
          { error: "This booking changed before it could be declined. Refresh and try again." },
          { status: 409 },
        );
      }
      throw error;
    }
    // Declining a shared offer is private staff state. The customer's booking
    // remains open, so sending them a cancellation-style update would be both
    // misleading and vulnerable to repeated notification spam.
    return Response.json({
      ...existing,
      estimatedCost: null,
      finalCost: null,
      declined: true,
    });
  }

  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const changed = await tx.booking.updateMany({
        where: {
          id,
          techId: existing.techId,
          status: existing.status,
          updatedAt: existing.updatedAt,
        },
        data: { status: "cancelled" },
      });
      if (changed.count !== 1) throw new Error("BOOKING_CHANGED");
      await tx.notification.create({
        data: {
          userId: existing.customerId,
          title: "Booking cancelled",
          body: "Your booking has been cancelled by the technician",
          type: "booking",
          link: "/home",
        },
      });
      return tx.booking.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (
      (error instanceof Error && error.message === "BOOKING_CHANGED") ||
      (typeof error === "object" && error && "code" in error && error.code === "P2034")
    ) {
      return Response.json(
        { error: "This booking changed before it could be declined. Refresh and try again." },
        { status: 409 },
      );
    }
    throw error;
  }

  await sendActivityEmail({
    to: existing.customer.email,
    recipientName: existing.customer.name,
    subject: "MCQ booking cancelled",
    heading: "Booking cancelled",
    message: "Your booking was cancelled by the assigned technician.",
    actionPath: "/home",
    actionLabel: "View booking",
  });

  return Response.json({
    ...booking,
    estimatedCost: null,
    finalCost: null,
  });
}
