import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BOOKING_SLOT_STARTS,
  VISIT_DURATION_MINUTES,
  isVisitBlockCount,
} from "@/lib/booking-slots";
import {
  addDaysToDateString,
  businessDateTimeToInstant,
  intervalsOverlap,
  validateBookingWindow,
} from "@/lib/booking-policy";
import { bookingDateToDatabaseDate } from "@/lib/booking-time";
import { rateLimited, requestIp, takeRateLimit } from "@/lib/rate-limit";

// Public endpoint - unauthenticated visitors can pick a time before signing up.
// Returns the four fixed daily booking windows for the default tech (Anthony).
//
// GET /api/availability?date=YYYY-MM-DD
// → { slots: [{ time: "08:00", available: true }, ...] }

export async function GET(req: NextRequest) {
  const limit = takeRateLimit(
    `availability:${requestIp(req)}`,
    120,
    15 * 60 * 1000,
  );
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const visitCount = Number(searchParams.get("visits") ?? "1");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Response.json(
      { error: "Missing or invalid date (YYYY-MM-DD required)" },
      { status: 400 }
    );
  }
  if (!isVisitBlockCount(visitCount)) {
    return Response.json({ error: "visits must be between 1 and 4" }, { status: 400 });
  }

  const date = bookingDateToDatabaseDate(dateStr);
  if (!date) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  // Find the default tech (Anthony - only one tech for now).
  const tech = await prisma.user.findFirst({
    where: { role: "tech" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!tech) {
    // No tech configured yet - nothing to book against.
    return Response.json({ slots: [] });
  }

  // Pull working-hours config; fall back to defaults if no profile yet.
  const profile = await prisma.businessProfile.findUnique({
    where: { techId: tech.id },
    select: { workingHours: true },
  });

  const workingHours = profile?.workingHours;
  const policyResults = BOOKING_SLOT_STARTS.map((time) => ({
    time,
    result: validateBookingWindow({
      date: dateStr,
      time,
      visitCount,
      workingHours,
    }),
  }));
  if (policyResults.every(({ result }) => !result.ok && result.message === "MCQ is closed on that day")) {
    return Response.json({ slots: [] });
  }

  // Fixed 4-slot day, each visit is 1h 45m (105 min) with a 15-min buffer
  // before the next start:
  //   08:00 - 09:45
  //   10:00 - 11:45
  //   12:00 - 13:45
  //   14:00 - 15:45
  // Slots are only shown if they fall within the tech's working hours for
  // the day. Booked slots remain in the response as unavailable so the UI
  // consistently presents the day's four-window schedule.
  const nextDate = addDaysToDateString(dateStr, 1);
  const dayStart = businessDateTimeToInstant(dateStr, "00:00");
  const dayEnd = nextDate ? businessDateTimeToInstant(nextDate, "00:00") : null;
  if (!dayStart || !dayEnd) return Response.json({ error: "Invalid date" }, { status: 400 });

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        scheduledDate: date,
        status: { in: ["pending", "confirmed", "in_progress"] },
      },
      select: { scheduledTime: true, durationMinutes: true },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        techId: tech.id,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const bookingIntervals = bookings.flatMap((booking) => {
    const time = `${String(booking.scheduledTime.getUTCHours()).padStart(2, "0")}:${String(
      booking.scheduledTime.getUTCMinutes(),
    ).padStart(2, "0")}`;
    const startAt = businessDateTimeToInstant(dateStr, time);
    if (!startAt) return [];
    return [{
      startAt,
      endAt: new Date(startAt.getTime() + (booking.durationMinutes ?? VISIT_DURATION_MINUTES) * 60_000),
    }];
  });

  const slots = policyResults.map(({ time, result }) => {
    if (!result.ok) return { time, available: false };
    const { startAt, endAt } = result.window;
    const overlapsBooking = bookingIntervals.some((booking) =>
      intervalsOverlap(startAt, endAt, booking.startAt, booking.endAt),
    );
    const overlapsBlock = blocks.some((block) =>
      intervalsOverlap(startAt, endAt, block.startAt, block.endAt),
    );
    return { time, available: !overlapsBooking && !overlapsBlock };
  });

  return Response.json({ slots });
}
