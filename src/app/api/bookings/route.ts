import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  unauthorized,
  badRequest,
  forbidden,
  verificationRequired,
} from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";
import { decryptHomeAccess } from "@/lib/sensitive-data";
import {
  bookingDateToDatabaseDate,
  bookingTimeToDatabaseDate,
  formatBookingDate,
  formatBookingTime,
} from "@/lib/booking-time";
import { bookingListWhere } from "@/lib/booking-view";
import { mergeBookingPartItems } from "@/lib/booking-parts";
import {
  VISIT_DURATION_MINUTES,
  isVisitBlockCount,
  visitDurationMinutes,
} from "@/lib/booking-slots";
import {
  bookingRequestLimitError,
  businessDateString,
  dateOnlyString,
  intervalsOverlap,
  isHistoricalVisitWindowComplete,
  validateBookingWindow,
} from "@/lib/booking-policy";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import {
  appliedVisitUnits,
  getVisitUsage,
} from "@/lib/subscription-usage";
import { ACTIVE_HOME_ASSIGNMENT_STATUSES } from "@/lib/access-control";
import {
  TEXT_LIMITS,
  optionalBoundedText,
} from "@/lib/text-input";
import { shouldRequestHistoricalVisitReview } from "@/lib/review-prompt";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const bookings = await prisma.booking.findMany({
    where: bookingListWhere(user, req.nextUrl.searchParams.get("view")),
    omit: {
      usageSubscriptionId: true,
      usageAppliedUnits: true,
    },
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      categories: { include: { category: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
      parts: true,
    },
    orderBy: { scheduledDate: "desc" },
  });

  return Response.json(bookings.map((booking) => ({
    ...booking,
    techNotes: user.role === "tech" ? booking.techNotes : null,
    estimatedCost: null,
    finalCost: null,
    home:
      booking.home && booking.home.customerId === booking.customerId
        ? decryptHomeAccess(booking.home)
        : null,
  })));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();

  const body = await req.json();

  const isTechCreating = user.role === "tech" && typeof body.customerId === "string" && body.customerId.length > 0;
  const customerId = isTechCreating ? (body.customerId as string) : user.id;
  if (!UUID_PATTERN.test(customerId)) return badRequest("Invalid customer");
  if (!user.isAdmin) {
    const requestLimit = takeRateLimit(`booking-create:${user.id}`, 20, 60 * 60 * 1000);
    if (!requestLimit.allowed) return rateLimited(requestLimit.retryAfterSeconds);
  }

  // A technician can intentionally open the customer-side UI to run a real
  // end-to-end booking for a home attached to their own account. In that one
  // preview case the user still has the "tech" database role, so requiring a
  // customer role produced the misleading "Customer not found" error.
  const isTechCustomerPreview = user.role === "tech" && !isTechCreating && customerId === user.id;
  const customer = await prisma.user.findFirst({
    where: { id: customerId, ...(isTechCustomerPreview ? {} : { role: "customer" }) },
    select: { id: true },
  });
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });
  if (typeof body.homeId !== "string" || !body.homeId) {
    return badRequest("Choose a home for this visit");
  }
  if (!UUID_PATTERN.test(body.homeId)) return badRequest("Invalid home");
  if (typeof body.homeId === "string" && body.homeId) {
    const ownedHome = await prisma.home.findFirst({ where: { id: body.homeId, customerId }, select: { id: true } });
    if (!ownedHome) return Response.json({ error: "Home does not belong to this customer" }, { status: 403 });
  }
  if (isTechCreating && !user.isAdmin) {
    const assignedHome = await prisma.booking.findFirst({
      where: {
        customerId,
        homeId: body.homeId,
        techId: user.id,
        status: { in: [...ACTIVE_HOME_ASSIGNMENT_STATUSES] },
      },
      select: { id: true },
    });
    if (!assignedHome) return forbidden();
  }
  const scheduledDateValue = typeof body.scheduledDate === "string"
    ? dateOnlyString(body.scheduledDate)
    : null;
  const scheduledDate = scheduledDateValue
    ? bookingDateToDatabaseDate(scheduledDateValue)
    : null;
  const scheduledTimeInput = typeof body.scheduledTime === "string" ? body.scheduledTime : "";
  const scheduledTime = bookingTimeToDatabaseDate(scheduledTimeInput);
  if (!scheduledDateValue || !scheduledDate) {
    return Response.json({ error: "A valid scheduled date is required" }, { status: 400 });
  }
  if (!scheduledTime) {
    return Response.json({ error: "A valid scheduled time is required" }, { status: 400 });
  }
  const inferredVisitCount = Number(body.durationMinutes) > 0
    ? Math.max(1, Math.round(Number(body.durationMinutes) / VISIT_DURATION_MINUTES))
    : 1;
  const visitCount = Number(body.visitCount ?? inferredVisitCount);
  if (!isVisitBlockCount(visitCount)) {
    return badRequest("Choose a valid start time and visit length");
  }
  const durationMinutes = visitDurationMinutes(visitCount);

  // Auto-assign a tech for customer-created bookings. For now there's a single
  // default tech (Anthony); pick the earliest tech in the system. If none
  // exists, leave techId null (admin will assign manually).
  let assignedTechId: string | null = null;
  if (isTechCreating) {
    assignedTechId = user.id;
  } else {
    const defaultTech = await prisma.user.findFirst({
      where: { role: "tech" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    assignedTechId = defaultTech?.id ?? null;
  }
  if (!assignedTechId) {
    return Response.json({ error: "No technician is available for booking" }, { status: 503 });
  }

  const normalizedTime = `${String(scheduledTime.getUTCHours()).padStart(2, "0")}:${String(
    scheduledTime.getUTCMinutes(),
  ).padStart(2, "0")}`;
  const businessProfile = await prisma.businessProfile.findUnique({
    where: { techId: assignedTechId },
    select: { workingHours: true },
  });
  const now = new Date();
  const policy = validateBookingWindow({
    date: scheduledDateValue,
    time: normalizedTime,
    visitCount,
    workingHours: businessProfile?.workingHours,
    allowBeyondAdvanceHorizon: user.isAdmin,
    // Staff can log visits for days already worked.
    allowPastVisit: isTechCreating,
    now,
  });
  if (!policy.ok) return badRequest(policy.message);
  const isPastVisit = isHistoricalVisitWindowComplete(policy.window.endAt, now);
  const isHistoricalVisit = isTechCreating && isPastVisit;
  const shouldSendHistoricalReviewRequest =
    isHistoricalVisit &&
    shouldRequestHistoricalVisitReview(policy.window.endAt, now);

  // Normalize parts payload - accept string[] of items, drop blanks.
  const partItems: string[] = Array.isArray(body.parts)
    ? (body.parts as unknown[])
        .filter((p): p is string => typeof p === "string")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];
  if (partItems.length > 40) return badRequest("A booking can include at most 40 part items");
  if (partItems.some((item) => item.length > TEXT_LIMITS.partItem)) {
    return badRequest(`Part details are too long (max ${TEXT_LIMITS.partItem} characters each)`);
  }

  const description = optionalBoundedText(
    body.description,
    "Description",
    TEXT_LIMITS.bookingDescription,
  );
  if (!description.ok) return badRequest(description.message);
  const customerNotes = optionalBoundedText(
    body.customerNotes,
    "Customer notes",
    TEXT_LIMITS.bookingNotes,
  );
  if (!customerNotes.ok) return badRequest(customerNotes.message);

  const categoryIds: string[] = Array.isArray(body.categoryIds)
    ? [...new Set<string>(
        (body.categoryIds as unknown[]).filter(
          (value: unknown): value is string =>
            typeof value === "string" &&
            UUID_PATTERN.test(value),
        ),
      )]
    : [];
  if (categoryIds.length > 12) {
    return badRequest("Choose at most 12 service categories");
  }
  if (
    Array.isArray(body.categoryIds) &&
    categoryIds.length !== body.categoryIds.length
  ) {
    return badRequest("One or more service categories are invalid");
  }
  if (categoryIds.length) {
    const categoryCount = await prisma.serviceCategory.count({
      where: { id: { in: categoryIds } },
    });
    if (categoryCount !== categoryIds.length) {
      return badRequest("One or more service categories no longer exist");
    }
  }

  const requestedTodoIds: string[] = Array.isArray(body.homeTodoIds)
    ? [...new Set<string>(
        (body.homeTodoIds as unknown[]).filter(
          (value): value is string =>
            typeof value === "string" &&
            UUID_PATTERN.test(value),
        ),
      )]
    : [];
  if (requestedTodoIds.length > 12) {
    return badRequest("Choose at most 12 home tasks");
  }
  if (
    Array.isArray(body.homeTodoIds) &&
    requestedTodoIds.length !== body.homeTodoIds.length
  ) {
    return badRequest("One or more selected tasks are invalid");
  }
  const homeTodos = requestedTodoIds.length && typeof body.homeId === "string"
      ? await prisma.homeTodo.findMany({
        where: { id: { in: requestedTodoIds }, homeId: body.homeId, status: { not: "completed" } },
        select: {
          id: true,
          task: true,
          description: true,
          notes: true,
          parts: true,
          partsDescription: true,
          partsBuyer: true,
          partStatus: true,
        },
      })
    : [];
  if (homeTodos.length !== requestedTodoIds.length) {
    return badRequest("One or more selected tasks are no longer available for this home");
  }
  const todoById = new Map(homeTodos.map((todo) => [todo.id, todo]));
  const selectedTodos = requestedTodoIds.map((id) => todoById.get(id)!);
  // Parts entered while a task is waiting on the home automatically follow it
  // into the eventual booking. Keep manually entered booking parts too, while
  // avoiding duplicate rows when Anthony has entered the same item twice.
  const bookingPartItems = mergeBookingPartItems(partItems, selectedTodos);

  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      if (!user.isAdmin) {
        const today = bookingDateToDatabaseDate(businessDateString());
        if (!today) throw new Error("INVALID_BUSINESS_DATE");
        const [pendingCount, futureCount] = await Promise.all([
          tx.booking.count({
            where: {
              customerId,
              status: "pending",
              scheduledDate: { gte: today },
            },
          }),
          tx.booking.count({
            where: {
              customerId,
              status: { in: ["pending", "confirmed", "in_progress"] },
              scheduledDate: { gte: today },
            },
          }),
        ]);
        const limitError = bookingRequestLimitError({
          pendingCount,
          futureCount,
        });
        if (limitError) throw new Error(`BOOKING_LIMIT:${limitError}`);
      }

      if (assignedTechId) {
        const [existingBookings, availabilityBlocks] = await Promise.all([
          tx.booking.findMany({
            where: {
              techId: assignedTechId,
              scheduledDate,
              status: isPastVisit
                ? { not: "cancelled" }
                : { in: ["pending", "confirmed", "in_progress"] },
            },
            select: { scheduledTime: true, durationMinutes: true },
          }),
          tx.availabilityBlock.findMany({
            where: {
              techId: assignedTechId,
              startAt: { lt: policy.window.endAt },
              endAt: { gt: policy.window.startAt },
            },
            select: { startAt: true, endAt: true },
          }),
        ]);
        const requestedStart = scheduledTime.getUTCHours() * 60 + scheduledTime.getUTCMinutes();
        const requestedEnd = requestedStart + durationMinutes;
        const overlaps = existingBookings.some((existing) => {
          const start = existing.scheduledTime.getUTCHours() * 60 + existing.scheduledTime.getUTCMinutes();
          const end = start + (existing.durationMinutes ?? VISIT_DURATION_MINUTES);
          return requestedStart < end && start < requestedEnd;
        });
        if (overlaps) throw new Error("BOOKING_CONFLICT");
        if (
          !isPastVisit &&
          availabilityBlocks.some((block) =>
            intervalsOverlap(policy.window.startAt, policy.window.endAt, block.startAt, block.endAt),
          )
        ) {
          throw new Error("BOOKING_BLOCKED");
        }
      }

      const created = await tx.booking.create({
        data: {
          customerId,
          techId: assignedTechId,
          homeId: body.homeId ?? null,
          scheduledDate,
          scheduledTime,
          description: description.value,
          customerNotes: customerNotes.value,
          durationMinutes,
          serviceType: "one_time",
          status: isHistoricalVisit
            ? "completed"
            : isTechCreating
              ? "confirmed"
              : "pending",
          categories: categoryIds.length
            ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
            : undefined,
          parts: bookingPartItems.length
            ? {
                create: bookingPartItems.map((part) => ({
                  item: part.item,
                  buyer: part.buyer,
                  status: part.status,
                })),
              }
            : undefined,
          tasks: selectedTodos.length
            ? {
                create: selectedTodos.map((todo, sortOrder) => ({
                  homeTodoId: todo.id,
                  label: todo.task,
                  done: isHistoricalVisit,
                  notes: todo.notes ?? todo.description,
                  sortOrder,
                })),
              }
            : undefined,
        },
        include: {
          home: true,
          categories: { include: { category: true } },
          parts: true,
          tasks: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (isHistoricalVisit) {
        if (requestedTodoIds.length > 0 && typeof body.homeId === "string") {
          await tx.homeTodo.updateMany({
            where: {
              id: { in: requestedTodoIds },
              homeId: body.homeId,
              status: { not: "completed" },
            },
            data: { status: "completed" },
          });
        }

        if (typeof body.homeId === "string") {
          const subscription = await tx.subscription.findFirst({
            where: {
              homeId: body.homeId,
              status: "active",
              AND: [
                {
                  OR: [
                    { startedAt: null },
                    { startedAt: { lte: policy.window.startAt } },
                  ],
                },
                {
                  OR: [
                    { endsAt: null },
                    { endsAt: { gte: policy.window.startAt } },
                  ],
                },
              ],
            },
            orderBy: { startedAt: "desc" },
          });
          if (subscription) {
            const allowance = getVisitUsage(subscription.plan, 0).allowance;
            const appliedUnits = appliedVisitUnits(
              visitCount,
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
                where: { id: created.id },
                data: {
                  usageSubscriptionId: subscription.id,
                  usageAppliedUnits: appliedUnits,
                },
              });
            }
          }
        }

        if (shouldSendHistoricalReviewRequest) {
          await tx.notification.create({
            data: {
              userId: customerId,
              title: "How was your visit?",
              body: "Your MCQ visit is complete. Tap to leave a quick review for Anthony.",
              type: "review",
              link: `/account/rate/${created.id}`,
            },
          });
        }
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: created.id },
        omit: {
          usageSubscriptionId: true,
          usageAppliedUnits: true,
        },
        include: {
          home: true,
          categories: { include: { category: true } },
          parts: true,
          tasks: { orderBy: { sortOrder: "asc" } },
        },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BOOKING_LIMIT:")) {
      return Response.json(
        { error: error.message.slice("BOOKING_LIMIT:".length) },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "BOOKING_CONFLICT") {
      return Response.json({ error: "That time overlaps another booking. Please choose an available time." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "BOOKING_BLOCKED") {
      return Response.json({ error: "That time is blocked on the staff schedule. Please choose another time." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "SUBSCRIPTION_CHANGED") {
      return Response.json(
        { error: "Membership usage changed while adding this visit. Please try again." },
        { status: 409 },
      );
    }
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") {
      return Response.json({ error: "That time was just booked. Please choose another time." }, { status: 409 });
    }
    throw error;
  }

  try {
    const [customer, tech] = await Promise.all([
      prisma.user.findUnique({ where: { id: customerId }, select: { name: true, email: true } }),
      assignedTechId
        ? prisma.user.findUnique({ where: { id: assignedTechId }, select: { email: true, name: true } })
        : null,
    ]);
    const customerName = customer?.name ?? "A customer";
    const dateLabel = formatBookingDate(booking.scheduledDate, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeLabel = formatBookingTime(booking.scheduledTime.toISOString());
    const scheduleMessage = `${dateLabel} at ${timeLabel}`;

    if (!isTechCreating && assignedTechId) {
      await prisma.notification.create({
        data: {
          userId: assignedTechId,
          title: "New booking request",
          body: `${customerName} requested a visit on ${scheduleMessage}`,
          type: "booking",
          link: `/jobs/${booking.id}`,
        },
      });
      await sendActivityEmail({
        to: tech?.email,
        recipientName: tech?.name,
        subject: `New booking from ${customerName}`,
        heading: "New booking request",
        message: `${customerName} requested a visit on ${scheduleMessage}.`,
        actionPath: `/jobs/${booking.id}`,
        actionLabel: "View booking",
      });
    }

    await sendActivityEmail({
      to: customer?.email,
      recipientName: customer?.name,
      subject: shouldSendHistoricalReviewRequest
        ? "How was your MCQ visit?"
        : isHistoricalVisit
        ? "A completed MCQ visit was added"
        : isTechCreating
          ? "Your MCQ visit is scheduled"
          : "We received your MCQ booking",
      heading: shouldSendHistoricalReviewRequest
        ? "Your visit is complete"
        : isHistoricalVisit
        ? "Visit added to your history"
        : isTechCreating
          ? "Your visit is scheduled"
          : "Booking request received",
      message: shouldSendHistoricalReviewRequest
        ? "Thanks for choosing MCQ Property Care. Please take a moment to rate your visit and share any feedback."
        : isHistoricalVisit
        ? `Anthony added your completed visit from ${scheduleMessage} to your MCQ history.`
        : `${isTechCreating ? "Anthony scheduled" : "We received"} your visit for ${scheduleMessage}.`,
      actionPath: shouldSendHistoricalReviewRequest
        ? `/account/rate/${booking.id}`
        : "/home",
      actionLabel: shouldSendHistoricalReviewRequest
        ? "Leave a review"
        : "View your visit",
    });
  } catch (err) {
    // Notification failures must not break booking creation.
    console.error("[bookings] failed to send booking notifications", err);
  }

  return Response.json({
    ...booking,
    estimatedCost: null,
    finalCost: null,
    home: booking.home ? decryptHomeAccess(booking.home) : null,
  }, { status: 201 });
}
