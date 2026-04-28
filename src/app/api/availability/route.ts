import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — unauthenticated visitors can pick a time before signing up.
// Returns 30-min slot grid for the default tech (Anthony) on the requested date.
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

  // Find the default tech (Anthony — only one tech for now).
  const tech = await prisma.user.findFirst({
    where: { role: "tech" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!tech) {
    // No tech configured yet — nothing to book against.
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

  // Lunch break (optional).
  const lunch = hours.lunch;
  const lunchStart = lunch?.start ? parseHHMM(lunch.start) : NaN;
  const lunchEnd = lunch?.end ? parseHHMM(lunch.end) : NaN;
  const lunchEnabled = lunch?.enabled !== false; // default to enabled if defined
  const hasLunch =
    lunchEnabled &&
    !Number.isNaN(lunchStart) &&
    !Number.isNaN(lunchEnd) &&
    lunchEnd > lunchStart;

  // Pull bookings for that tech on that date.
  const bookings = await prisma.booking.findMany({
    where: {
      techId: tech.id,
      scheduledDate: date,
      status: { in: ["pending", "confirmed", "in_progress"] },
    },
    select: { scheduledTime: true, durationMinutes: true },
  });

  // Build a set of "blocked" minute marks (every 30-min slot intersecting an existing booking).
  const blocked = new Set<number>();
  for (const b of bookings) {
    if (!b.scheduledTime) continue;
    const t = new Date(b.scheduledTime);
    if (Number.isNaN(t.getTime())) continue;
    const bookingStart = t.getUTCHours() * 60 + t.getUTCMinutes();
    const duration = b.durationMinutes ?? 120;
    const bookingEnd = bookingStart + duration;
    // Mark every 30-min slot that overlaps this booking.
    for (let m = Math.floor(bookingStart / 30) * 30; m < bookingEnd; m += 30) {
      blocked.add(m);
    }
  }

  // Generate slots in 30-min increments from start to end (exclusive of end).
  const slots: { time: string; available: boolean }[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    let available = !blocked.has(m);
    // Skip lunch break.
    if (available && hasLunch && m >= lunchStart && m < lunchEnd) {
      available = false;
    }
    slots.push({ time: fmtHHMM(m), available });
  }

  return Response.json({ slots });
}
