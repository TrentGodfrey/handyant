import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { BookingStatus } from "@/generated/prisma/enums";
import { completedStatusDelta, getVisitUsage } from "@/lib/subscription-usage";
import { decryptHomeAccess } from "@/lib/sensitive-data";
import { bookingTimeToDatabaseDate } from "@/lib/booking-time";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      categories: { include: { category: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
      parts: true,
      photos: true,
      reviews: true,
      invoices: true,
      bookingNotes: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) return notFound("Booking not found");

  const isCustomerOwner = booking.customerId === user.id;
  const isAssignedTech = user.role === "tech" && booking.techId === user.id;
  if (!isCustomerOwner && !isAssignedTech) return forbidden();

  return Response.json({
    ...booking,
    techNotes: user.role === "tech" ? booking.techNotes : null,
    bookingNotes: user.role === "tech" ? booking.bookingNotes : [],
    home: booking.home ? decryptHomeAccess(booking.home) : null,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return notFound("Booking not found");

  const isCustomer = existing.customerId === user.id;
  const isTech = user.role === "tech" && existing.techId === user.id;
  if (!isCustomer && !isTech) return forbidden();

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!Object.values(BookingStatus).includes(body.status)) {
      return badRequest("Invalid booking status");
    }
    if (isTech) {
      data.status = body.status;
    } else if (isCustomer) {
      // Customers may only cancel their own bookings.
      if (body.status !== "cancelled") {
        return badRequest("Customers may only set status to 'cancelled'");
      }
      data.status = "cancelled";
    }
  }
  if (body.techId !== undefined && isTech) data.techId = body.techId;
  if (body.scheduledDate !== undefined && isTech) data.scheduledDate = new Date(body.scheduledDate);
  if (body.scheduledTime !== undefined && isTech) {
    const scheduledTime = typeof body.scheduledTime === "string" ? bookingTimeToDatabaseDate(body.scheduledTime) : null;
    if (!scheduledTime) return badRequest("Invalid scheduled time");
    data.scheduledTime = scheduledTime;
  }
  if (body.durationMinutes !== undefined && isTech) data.durationMinutes = body.durationMinutes;
  if (body.description !== undefined && isTech) data.description = body.description;
  if (body.customerNotes !== undefined && isCustomer) data.customerNotes = body.customerNotes;
  if (body.techNotes !== undefined && isTech) data.techNotes = body.techNotes;
  if (body.estimatedCost !== undefined && isTech) data.estimatedCost = body.estimatedCost;
  if (body.finalCost !== undefined && isTech) data.finalCost = body.finalCost;

  const nextStatus = typeof data.status === "string" ? data.status : existing.status;
  const usageDelta = completedStatusDelta(existing.status, nextStatus);

  const booking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id },
      data,
      include: {
        home: true,
        customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        tasks: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (usageDelta !== 0 && existing.homeId) {
      const subscription = await tx.subscription.findFirst({
        where: { homeId: existing.homeId, status: "active" },
        orderBy: { startedAt: "desc" },
      });
      if (subscription) {
        const allowance = getVisitUsage(subscription.plan, 0).allowance;
        await tx.subscription.updateMany({
          where: {
            id: subscription.id,
            visitsUsed: usageDelta > 0 ? { lt: allowance } : { gt: 0 },
          },
          data: { visitsUsed: usageDelta > 0 ? { increment: 1 } : { decrement: 1 } },
        });
      }
    }

    return updated;
  });

  return Response.json({ ...booking, home: booking.home ? decryptHomeAccess(booking.home) : null });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return notFound("Booking not found");
  const isCustomer = existing.customerId === user.id;
  const isTech = user.role === "tech" && existing.techId === user.id;
  if (!isCustomer && !isTech) return forbidden();

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { status: "cancelled" } });
    if (existing.status === "completed" && existing.homeId) {
      const subscription = await tx.subscription.findFirst({
        where: { homeId: existing.homeId, status: "active" },
        orderBy: { startedAt: "desc" },
      });
      if (subscription) {
        await tx.subscription.updateMany({
          where: { id: subscription.id, visitsUsed: { gt: 0 } },
          data: { visitsUsed: { decrement: 1 } },
        });
      }
    }
  });
  return Response.json({ ok: true });
}
