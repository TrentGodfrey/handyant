import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { BookingStatus } from "@/generated/prisma/enums";
import { completedStatusDelta, getVisitUsage } from "@/lib/subscription-usage";
import { decryptHomeAccess } from "@/lib/sensitive-data";
import { bookingTimeToDatabaseDate } from "@/lib/booking-time";
import {
  VISIT_DURATION_MINUTES,
  canStartVisitBlocks,
  isVisitBlockCount,
  visitDurationMinutes,
} from "@/lib/booking-slots";
import { sendActivityEmail } from "@/lib/activity-email";
import { shouldRequestVisitReview } from "@/lib/review-prompt";

function bookingUpdateSummary(body: Record<string, unknown>) {
  if (typeof body.status === "string") {
    return `Your MCQ visit status was updated to ${body.status.replaceAll("_", " ")}.`;
  }
  if (body.scheduledDate !== undefined || body.scheduledTime !== undefined) {
    return "The date or time for your MCQ visit was updated.";
  }
  return "There is an update to your MCQ visit.";
}

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
  if (body.scheduledDate !== undefined && (isTech || isCustomer)) data.scheduledDate = new Date(body.scheduledDate);
  if (body.scheduledTime !== undefined && (isTech || isCustomer)) {
    const scheduledTimeInput = typeof body.scheduledTime === "string" ? body.scheduledTime : "";
    const scheduledTime = bookingTimeToDatabaseDate(scheduledTimeInput);
    if (!scheduledTime) return badRequest("Invalid scheduled time");
    data.scheduledTime = scheduledTime;
  }
  if (body.durationMinutes !== undefined && isTech) {
    const visitCount = Number(body.durationMinutes) / VISIT_DURATION_MINUTES;
    if (!isVisitBlockCount(visitCount)) return badRequest("Visit length must use 1 hour 45 minute blocks");
    data.durationMinutes = visitDurationMinutes(visitCount);
  }
  if (body.description !== undefined && isTech) data.description = body.description;
  if (body.customerNotes !== undefined && isCustomer) data.customerNotes = body.customerNotes;
  if (body.techNotes !== undefined && isTech) data.techNotes = body.techNotes;
  if (body.estimatedCost !== undefined && isTech) data.estimatedCost = body.estimatedCost;
  if (body.finalCost !== undefined && isTech) data.finalCost = body.finalCost;

  if ((isTech || isCustomer) && (body.scheduledDate !== undefined || body.scheduledTime !== undefined || body.durationMinutes !== undefined)) {
    const targetTime = data.scheduledTime instanceof Date ? data.scheduledTime : existing.scheduledTime;
    const targetDate = data.scheduledDate instanceof Date ? data.scheduledDate : existing.scheduledDate;
    const targetDuration = typeof data.durationMinutes === "number"
      ? data.durationMinutes
      : existing.durationMinutes ?? VISIT_DURATION_MINUTES;
    const visitCount = targetDuration / VISIT_DURATION_MINUTES;
    const targetTimeValue = `${String(targetTime.getUTCHours()).padStart(2, "0")}:${String(targetTime.getUTCMinutes()).padStart(2, "0")}`;
    if (!isVisitBlockCount(visitCount) || !canStartVisitBlocks(targetTimeValue, visitCount)) {
      return badRequest("Choose a valid start time and visit length");
    }
    const otherBookings = await prisma.booking.findMany({
      where: {
        id: { not: id },
        techId: existing.techId,
        scheduledDate: targetDate,
        status: { in: ["pending", "confirmed", "in_progress"] },
      },
      select: { scheduledTime: true, durationMinutes: true },
    });
    const start = targetTime.getUTCHours() * 60 + targetTime.getUTCMinutes();
    const end = start + targetDuration;
    const overlaps = otherBookings.some((booking) => {
      const otherStart = booking.scheduledTime.getUTCHours() * 60 + booking.scheduledTime.getUTCMinutes();
      const otherEnd = otherStart + (booking.durationMinutes ?? VISIT_DURATION_MINUTES);
      return start < otherEnd && otherStart < end;
    });
    if (overlaps) {
      return Response.json({ error: "That time overlaps another booking. Please choose an available time." }, { status: 409 });
    }
  }

  const nextStatus = typeof data.status === "string" ? data.status : existing.status;
  const usageDuration = typeof data.durationMinutes === "number"
    ? data.durationMinutes
    : existing.durationMinutes ?? VISIT_DURATION_MINUTES;
  const visitUnits = Math.max(1, Math.round(usageDuration / VISIT_DURATION_MINUTES));
  const usageDelta = completedStatusDelta(existing.status, nextStatus, visitUnits);

  let shouldSendReviewRequest = false;
  const booking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id },
      data,
      include: {
        home: true,
        customer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        tech: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
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
            visitsUsed: usageDelta > 0 ? { lte: allowance - usageDelta } : { gte: Math.abs(usageDelta) },
          },
          data: { visitsUsed: usageDelta > 0 ? { increment: usageDelta } : { decrement: Math.abs(usageDelta) } },
        });
      }
    }

    if (existing.status !== "completed" && updated.status === "completed") {
      const existingReview = await tx.review.findFirst({
        where: { bookingId: updated.id, customerId: updated.customerId },
        select: { id: true },
      });
      shouldSendReviewRequest = shouldRequestVisitReview(
        existing.status,
        updated.status,
        !!existingReview,
      );

      if (shouldSendReviewRequest) {
        const reviewLink = `/account/rate/${updated.id}`;
        const existingPrompt = await tx.notification.findFirst({
          where: { userId: updated.customerId, type: "review", link: reviewLink },
          select: { id: true },
        });
        if (!existingPrompt) {
          await tx.notification.create({
            data: {
              userId: updated.customerId,
              title: "How was your visit?",
              body: "Your MCQ visit is complete. Tap to leave a quick review for Anthony.",
              type: "review",
              link: reviewLink,
            },
          });
        }
      }
    }

    return updated;
  });

  if (shouldSendReviewRequest) {
    await sendActivityEmail({
      to: booking.customer.email,
      recipientName: booking.customer.name,
      subject: "How was your MCQ visit?",
      heading: "Your visit is complete",
      message: "Thanks for choosing MCQ Property Care. Please take a moment to rate your visit and share any feedback.",
      actionPath: `/account/rate/${booking.id}`,
      actionLabel: "Leave a review",
    });
  } else {
    const recipient = isTech ? booking.customer : booking.tech;
    await sendActivityEmail({
      to: recipient?.email,
      recipientName: recipient?.name,
      subject: "Your MCQ visit was updated",
      heading: "Visit update",
      message: bookingUpdateSummary(body),
      actionPath: isTech ? `/booking?id=${booking.id}` : `/jobs/${booking.id}`,
      actionLabel: "View visit",
    });
  }

  return Response.json({ ...booking, home: booking.home ? decryptHomeAccess(booking.home) : null });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      tech: { select: { name: true, email: true } },
    },
  });
  if (!existing) return notFound("Booking not found");
  const isCustomer = existing.customerId === user.id;
  const isTech = user.role === "tech" && existing.techId === user.id;
  if (!isCustomer && !isTech) return forbidden();

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { status: "cancelled" } });
    if (existing.status === "completed" && existing.homeId) {
      const visitUnits = Math.max(1, Math.round((existing.durationMinutes ?? VISIT_DURATION_MINUTES) / VISIT_DURATION_MINUTES));
      const subscription = await tx.subscription.findFirst({
        where: { homeId: existing.homeId, status: "active" },
        orderBy: { startedAt: "desc" },
      });
      if (subscription) {
        await tx.subscription.updateMany({
          where: { id: subscription.id, visitsUsed: { gte: visitUnits } },
          data: { visitsUsed: { decrement: visitUnits } },
        });
      }
    }
  });

  const recipient = isTech ? existing.customer : existing.tech;
  await sendActivityEmail({
    to: recipient?.email,
    recipientName: recipient?.name,
    subject: "MCQ visit cancelled",
    heading: "Visit cancelled",
    message: "Your MCQ visit was cancelled.",
    actionPath: isTech ? "/home" : "/jobs",
    actionLabel: "Open MCQ",
  });
  return Response.json({ ok: true });
}
