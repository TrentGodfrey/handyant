import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { BOOKING_SLOT_STARTS, VISIT_DURATION_MINUTES } from "@/lib/booking-slots";

// Public endpoint - unauthenticated visitors can pick a time before signing up.
// Returns the four fixed daily booking windows for the default tech (Anthony).
//
// GET /api/availability?date=YYYY-MM-DD
// → { slots: [{ time: "08:00", available: true }, ...] }

const DEFAULT_HOURS: Record<string, { start: string; end: string; enabled: boolean }> = {
  mon: { start: "08:00", end: "17:00", enabled: true },
  tue: { start: "08:00", end: "17:00", enabled: true },
  wed: { start: "08:00", end: "17:00", enabled: true },
  thu: { start: "08:00", end: "17:00", enabled: true },
  fri: { start: "08:00", end: "17:00", enabled: true },
  sat: { start: "09:00", end: "13:00", enabled: false },
  sun: { start: "09:00", end: "13:00", enabled: false },
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

interface DayHours {
  start: string;
  end: string;
  enabled: boolean;
}

interface LunchHours {
  start: string;
  end: string;
  enabled?: boolean;
}

function parseHHMM(s: string): number {
  // Returns minutes since midnight, or NaN if malformed.
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return NaN;
  return h * 60 + min;
}

function fmtHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Response.json(
      { error: "Missing or invalid date (YYYY-MM-DD required)" },
      { status: 400 }
    );
  }

  // Parse the date in UTC to avoid timezone surprises when computing day-of-week.
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  const dayKey = DAY_KEYS[date.getUTCDay()];

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

  const hours = (profile?.workingHours ?? DEFAULT_HOURS) as Record<string, unknown> & {
    lunch?: LunchHours;
  };
  const dayHours = (hours[dayKey] ?? DEFAULT_HOURS[dayKey]) as DayHours | undefined;

  if (!dayHours || !dayHours.enabled) {
    return Response.json({ slots: [] });
  }

  const startMin = parseHHMM(dayHours.start);
  const endMin = parseHHMM(dayHours.end);
  if (Number.isNaN(startMin) || Number.isNaN(endMin) || endMin <= startMin) {
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
  const SLOT_STARTS = BOOKING_SLOT_STARTS.map(parseHHMM);

  // Pull bookings for that tech on that date.
  const bookings = await prisma.booking.findMany({
    where: {
      techId: tech.id,
      scheduledDate: date,
      status: { in: ["pending", "confirmed", "in_progress"] },
    },
    select: { scheduledTime: true, durationMinutes: true },
  });

  // Mark slot starts that overlap any existing booking.
  const blockedStarts = new Set<number>();
  for (const b of bookings) {
    if (!b.scheduledTime) continue;
    const t = new Date(b.scheduledTime);
    if (Number.isNaN(t.getTime())) continue;
    const bookingStart = t.getUTCHours() * 60 + t.getUTCMinutes();
    const bookingEnd = bookingStart + (b.durationMinutes ?? VISIT_DURATION_MINUTES);
    for (const slotStart of SLOT_STARTS) {
      const slotEnd = slotStart + VISIT_DURATION_MINUTES;
      // Overlap if intervals intersect at all.
      if (slotStart < bookingEnd && bookingStart < slotEnd) {
        blockedStarts.add(slotStart);
      }
    }
  }

  // Build the slot list. Skip slots outside working hours and mark overlaps booked.
  const slots: { time: string; available: boolean }[] = SLOT_STARTS
    .filter((m) => m >= startMin && m + VISIT_DURATION_MINUTES <= endMin)
    .map((m) => ({ time: fmtHHMM(m), available: !blockedStarts.has(m) }));

  return Response.json({ slots });
}
