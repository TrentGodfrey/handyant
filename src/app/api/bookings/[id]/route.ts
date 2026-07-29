import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { BookingStatus } from "@/generated/prisma/enums";
import {
  appliedVisitUnits,
  getVisitUsage,
} from "@/lib/subscription-usage";
import { decryptHomeAccess } from "@/lib/sensitive-data";
import {
  bookingDateToDatabaseDate,
  bookingTimeToDatabaseDate,
} from "@/lib/booking-time";
import {
  VISIT_DURATION_MINUTES,
  isVisitBlockCount,
  visitDurationMinutes,
} from "@/lib/booking-slots";
import {
  bookingDateAndTimeToInstant,
  customerCancellationError,
  dateOnlyString,
  intervalsOverlap,
  isHistoricalVisitWindowComplete,
  validateBookingWindow,
} from "@/lib/booking-policy";
import { sendActivityEmail } from "@/lib/activity-email";
import { shouldRequestVisitReview } from "@/lib/review-prompt";
import {
  TEXT_LIMITS,
  optionalBoundedText,
} from "@/lib/text-input";

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
    omit: {
      usageSubscriptionId: true,
      usageAppliedUnits: true,
    },
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      categories: { include: { category: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
      parts: true,
      photos: true,
      reviews: true,
      bookingNotes: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) return notFound("Booking not found");

  const isCustomerOwner = booking.customerId === user.id;
  const isAssignedTech =
    user.role === "tech" && (user.isAdmin || booking.techId === user.id);
  if (!isCustomerOwner && !isAssignedTech) return forbidden();
  if (booking.home && booking.home.customerId !== booking.customerId) {
    return Response.json(
      { error: "Booking and home records do not match" },
      { status: 409 },
    );
  }

  return Response.json({
    ...booking,
    techNotes: user.role === "tech" ? booking.techNotes : null,
    bookingNotes: user.role === "tech" ? booking.bookingNotes : [],
    estimatedCost: null,
    finalCost: null,
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
  const isTech =
    user.role === "tech" && (user.isAdmin || existing.techId === user.id);
  if (!isCustomer && !isTech) return forbidden();

  const body = await req.json();
  const data: Record<string, unknown> = {};
  const existingDate = dateOnlyString(existing.scheduledDate);
  const existingTime = `${String(existing.scheduledTime.getUTCHours()).padStart(2, "0")}:${String(
    existing.scheduledTime.getUTCMinutes(),
  ).padStart(2, "0")}`;

  if (body.status !== undefined) {
    if (!Object.values(BookingStatus).includes(body.status)) {
      return badRequest("Invalid booking status");
    }
    if (isTech) {
      const allowedTransitions: Record<string, string[]> = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["in_progress", "completed", "cancelled"],
        in_progress: ["completed", "cancelled"],
        completed: user.isAdmin ? ["confirmed", "cancelled"] : [],
        cancelled: [],
      };
      if (
        body.status !== existing.status &&
        !(allowedTransitions[existing.status] ?? []).includes(body.status)
      ) {
        return badRequest(`Cannot change a ${existing.status} visit to ${body.status}`);
      }
      data.status = body.status;
    } else if (isCustomer) {
      // Customers may only cancel their own bookings.
      if (body.status !== "cancelled") {
        return badRequest("Customers may only set status to 'cancelled'");
      }
      const cancellationError = existingDate
        ? customerCancellationError({
            status: existing.status,
            date: existingDate,
            time: existingTime,
          })
        : "Only future pending or confirmed visits can be cancelled";
      if (cancellationError) return badRequest(cancellationError);
      data.status = "cancelled";
    }
  }
  let targetTechId = existing.techId;
  if (body.techId !== undefined && !user.isAdmin) return forbidden();
  if (body.techId !== undefined && user.isAdmin) {
    if (typeof body.techId !== "string" || !body.techId) {
      return badRequest("Choose a valid technician");
    }
    const targetTech = await prisma.user.findFirst({
      where: { id: body.techId, role: "tech" },
      select: { id: true },
    });
    if (!targetTech) return badRequest("Assigned technician is invalid");
    targetTechId = targetTech.id;
    data.techId = targetTech.id;
  }
  if (body.scheduledDate !== undefined && (isTech || isCustomer)) {
    const value = typeof body.scheduledDate === "string"
      ? dateOnlyString(body.scheduledDate)
      : null;
    if (!value) return badRequest("Invalid scheduled date");
    const scheduledDate = bookingDateToDatabaseDate(value);
    if (!scheduledDate) return badRequest("Invalid scheduled date");
    data.scheduledDate = scheduledDate;
  }
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
  if (body.description !== undefined && isTech) {
    const description = optionalBoundedText(
      body.description,
      "Description",
      TEXT_LIMITS.bookingDescription,
    );
    if (!description.ok) return badRequest(description.message);
    data.description = description.value;
  }
  if (body.customerNotes !== undefined && isCustomer) {
    const notes = optionalBoundedText(
      body.customerNotes,
      "Customer notes",
      TEXT_LIMITS.bookingNotes,
    );
    if (!notes.ok) return badRequest(notes.message);
    data.customerNotes = notes.value;
  }
  if (body.techNotes !== undefined && isTech) {
    const notes = optionalBoundedText(
      body.techNotes,
      "Technician notes",
      TEXT_LIMITS.bookingNotes,
    );
    if (!notes.ok) return badRequest(notes.message);
    data.techNotes = notes.value;
  }
  let scheduleCheck: {
    techId: string;
    scheduledDate: Date;
    startMinutes: number;
    endMinutes: number;
    startAt: Date;
    endAt: Date;
    isPastVisit: boolean;
  } | null = null;
  if (
    (isTech || isCustomer) &&
    (
      body.scheduledDate !== undefined ||
      body.scheduledTime !== undefined ||
      body.durationMinutes !== undefined ||
      body.techId !== undefined
    )
  ) {
    if (isCustomer && !["pending", "confirmed"].includes(existing.status)) {
      return badRequest("Only pending or confirmed visits can be rescheduled");
    }
    if (!targetTechId) return badRequest("Assign a technician before scheduling");
    const targetTime = data.scheduledTime instanceof Date ? data.scheduledTime : existing.scheduledTime;
    const targetDate = data.scheduledDate instanceof Date ? data.scheduledDate : existing.scheduledDate;
    const targetDuration = typeof data.durationMinutes === "number"
      ? data.durationMinutes
      : existing.durationMinutes ?? VISIT_DURATION_MINUTES;
    const visitCount = targetDuration / VISIT_DURATION_MINUTES;
    const targetTimeValue = `${String(targetTime.getUTCHours()).padStart(2, "0")}:${String(targetTime.getUTCMinutes()).padStart(2, "0")}`;
    const targetDateValue = dateOnlyString(targetDate);
    if (!targetDateValue || !isVisitBlockCount(visitCount)) {
      return badRequest("Choose a valid start time and visit length");
    }
    const profile = await prisma.businessProfile.findUnique({
      where: { techId: targetTechId },
      select: { workingHours: true },
    });
    const now = new Date();
    const policy = validateBookingWindow({
      date: targetDateValue,
      time: targetTimeValue,
      visitCount,
      workingHours: profile?.workingHours,
      allowBeyondAdvanceHorizon: user.isAdmin,
      // Staff can move a visit onto a day already worked; customers cannot.
      allowPastVisit: isTech,
      now,
    });
    if (!policy.ok) return badRequest(policy.message);
    const start = targetTime.getUTCHours() * 60 + targetTime.getUTCMinutes();
    const end = start + targetDuration;
    scheduleCheck = {
      techId: targetTechId,
      scheduledDate: targetDate,
      startMinutes: start,
      endMinutes: end,
      startAt: policy.window.startAt,
      endAt: policy.window.endAt,
      isPastVisit: isHistoricalVisitWindowComplete(policy.window.endAt, now),
    };
    if (scheduleCheck.isPastVisit && existing.status !== "completed") {
      return badRequest("Only an already-completed visit can be moved into the past");
    }
  }
  if (Object.keys(data).length === 0) return badRequest("No valid booking updates were provided");

  const nextStatus = typeof data.status === "string" ? data.status : existing.status;
  const enteringCompleted =
    existing.status !== "completed" && nextStatus === "completed";
  const leavingCompleted =
    existing.status === "completed" && nextStatus !== "completed";
  if (leavingCompleted) {
    data.usageSubscriptionId = null;
    data.usageAppliedUnits = 0;
  }
  const completionDuration =
    typeof data.durationMinutes === "number"
      ? data.durationMinutes
      : existing.durationMinutes ?? VISIT_DURATION_MINUTES;
  const completionVisitUnits = Math.max(
    1,
    Math.round(completionDuration / VISIT_DURATION_MINUTES),
  );
  const completionStartAt = scheduleCheck?.startAt ??
    bookingDateAndTimeToInstant(
      existing.scheduledDate,
      existing.scheduledTime,
    );

  let shouldSendReviewRequest = false;
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      if (scheduleCheck) {
        const [otherBookings, availabilityBlocks] = await Promise.all([
          tx.booking.findMany({
            where: {
              id: { not: id },
              techId: scheduleCheck.techId,
              scheduledDate: scheduleCheck.scheduledDate,
              status: scheduleCheck.isPastVisit
                ? { not: "cancelled" }
                : { in: ["pending", "confirmed", "in_progress"] },
            },
            select: { scheduledTime: true, durationMinutes: true },
          }),
          tx.availabilityBlock.findMany({
            where: {
              techId: scheduleCheck.techId,
              startAt: { lt: scheduleCheck.endAt },
              endAt: { gt: scheduleCheck.startAt },
            },
            select: { startAt: true, endAt: true },
          }),
        ]);
        const overlaps = otherBookings.some((other) => {
          const otherStart =
            other.scheduledTime.getUTCHours() * 60 +
            other.scheduledTime.getUTCMinutes();
          const otherEnd =
            otherStart + (other.durationMinutes ?? VISIT_DURATION_MINUTES);
          return scheduleCheck!.startMinutes < otherEnd &&
            otherStart < scheduleCheck!.endMinutes;
        });
        if (overlaps) throw new Error("BOOKING_CONFLICT");
        if (
          !scheduleCheck.isPastVisit &&
          availabilityBlocks.some((block) =>
            intervalsOverlap(
              scheduleCheck!.startAt,
              scheduleCheck!.endAt,
              block.startAt,
              block.endAt,
            ),
          )
        ) {
          throw new Error("BOOKING_BLOCKED");
        }
      }

      const changed = await tx.booking.updateMany({
        where: {
          id,
          status: existing.status,
          updatedAt: existing.updatedAt,
        },
        data,
      });
      if (changed.count !== 1) throw new Error("BOOKING_CHANGED");

      if (leavingCompleted && existing.usageAppliedUnits > 0) {
        if (!existing.usageSubscriptionId) {
          throw new Error("SUBSCRIPTION_CHANGED");
        }
        const attributedSubscription = await tx.subscription.findUnique({
          where: { id: existing.usageSubscriptionId },
        });
        if (
          !attributedSubscription ||
          attributedSubscription.visitsUsed < existing.usageAppliedUnits
        ) {
          throw new Error("SUBSCRIPTION_CHANGED");
        }
        const reversedSubscription = await tx.subscription.updateMany({
          where: {
            id: attributedSubscription.id,
            visitsUsed: attributedSubscription.visitsUsed,
          },
          data: {
            visitsUsed:
              attributedSubscription.visitsUsed - existing.usageAppliedUnits,
          },
        });
        if (reversedSubscription.count !== 1) {
          throw new Error("SUBSCRIPTION_CHANGED");
        }
      }

      if (enteringCompleted && existing.homeId && completionStartAt) {
        const subscription = await tx.subscription.findFirst({
          where: {
            homeId: existing.homeId,
            status: "active",
            AND: [
              {
                OR: [
                  { startedAt: null },
                  { startedAt: { lte: completionStartAt } },
                ],
              },
              {
                OR: [
                  { endsAt: null },
                  { endsAt: { gte: completionStartAt } },
                ],
              },
            ],
          },
          orderBy: { startedAt: "desc" },
        });
        if (subscription) {
          const allowance = getVisitUsage(subscription.plan, 0).allowance;
          const appliedUnits = appliedVisitUnits(
            completionVisitUnits,
            subscription.visitsUsed,
            allowance,
          );
          if (appliedUnits > 0) {
            const updatedSubscription = await tx.subscription.updateMany({
              where: {
                id: subscription.id,
                visitsUsed: subscription.visitsUsed,
              },
              data: {
                visitsUsed: subscription.visitsUsed + appliedUnits,
              },
            });
            if (updatedSubscription.count !== 1) {
              throw new Error("SUBSCRIPTION_CHANGED");
            }
            await tx.booking.update({
              where: { id },
              data: {
                usageSubscriptionId: subscription.id,
                usageAppliedUnits: appliedUnits,
              },
            });
          }
        }
      }

      const updated = await tx.booking.findUniqueOrThrow({
        where: { id },
        omit: {
          usageSubscriptionId: true,
          usageAppliedUnits: true,
        },
        include: {
          home: true,
          customer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          tech: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          tasks: { orderBy: { sortOrder: "asc" } },
        },
      });

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
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_CONFLICT") {
      return Response.json(
        { error: "That time overlaps another booking. Please choose an available time." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "BOOKING_BLOCKED") {
      return Response.json(
        { error: "That time is blocked on the staff schedule. Please choose another time." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "SUBSCRIPTION_CHANGED") {
      return Response.json(
        {
          error:
            "Membership usage changed while updating this visit. Refresh and try again.",
        },
        { status: 409 },
      );
    }
    if (
      (error instanceof Error && error.message === "BOOKING_CHANGED") ||
      (typeof error === "object" && error && "code" in error && error.code === "P2034")
    ) {
      return Response.json(
        { error: "This booking changed while you were editing it. Refresh and try again." },
        { status: 409 },
      );
    }
    throw error;
  }

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
      actionPath: isTech ? "/home" : `/jobs/${booking.id}`,
      actionLabel: "View visit",
    });
  }

  return Response.json({
    ...booking,
    estimatedCost: null,
    finalCost: null,
    home: booking.home ? decryptHomeAccess(booking.home) : null,
  });
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
  const isTech =
    user.role === "tech" && (user.isAdmin || existing.techId === user.id);
  if (!isCustomer && !isTech) return forbidden();
  if (isTech && existing.status === "completed" && !user.isAdmin) return forbidden();
  if (existing.status === "cancelled") return badRequest("Booking is already cancelled");
  if (isCustomer) {
    const date = dateOnlyString(existing.scheduledDate);
    const time = `${String(existing.scheduledTime.getUTCHours()).padStart(2, "0")}:${String(
      existing.scheduledTime.getUTCMinutes(),
    ).padStart(2, "0")}`;
    const cancellationError = date
      ? customerCancellationError({ status: existing.status, date, time })
      : "Only future pending or confirmed visits can be cancelled";
    if (cancellationError) return badRequest(cancellationError);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.booking.updateMany({
        where: {
          id,
          status: existing.status,
          updatedAt: existing.updatedAt,
        },
        data: {
          status: "cancelled",
          usageSubscriptionId: null,
          usageAppliedUnits: 0,
        },
      });
      if (changed.count !== 1) throw new Error("BOOKING_CHANGED");

      if (existing.status === "completed" && existing.usageAppliedUnits > 0) {
        if (!existing.usageSubscriptionId) {
          throw new Error("SUBSCRIPTION_CHANGED");
        }
        const subscription = await tx.subscription.findUnique({
          where: { id: existing.usageSubscriptionId },
        });
        if (
          !subscription ||
          subscription.visitsUsed < existing.usageAppliedUnits
        ) {
          throw new Error("SUBSCRIPTION_CHANGED");
        }
        const reversedSubscription = await tx.subscription.updateMany({
          where: {
            id: subscription.id,
            visitsUsed: subscription.visitsUsed,
          },
          data: {
            visitsUsed: subscription.visitsUsed - existing.usageAppliedUnits,
          },
        });
        if (reversedSubscription.count !== 1) {
          throw new Error("SUBSCRIPTION_CHANGED");
        }
      }
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Error && error.message === "SUBSCRIPTION_CHANGED") {
      return Response.json(
        {
          error:
            "Membership usage changed while cancelling this visit. Refresh and try again.",
        },
        { status: 409 },
      );
    }
    if (
      (error instanceof Error && error.message === "BOOKING_CHANGED") ||
      (typeof error === "object" && error && "code" in error && error.code === "P2034")
    ) {
      return Response.json(
        { error: "This booking changed while it was being cancelled. Refresh and try again." },
        { status: 409 },
      );
    }
    throw error;
  }

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
