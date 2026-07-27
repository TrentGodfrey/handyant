import {
  BOOKING_SLOT_STARTS,
  canStartVisitBlocks,
  isVisitBlockCount,
  visitDurationMinutes,
} from "./booking-slots";
import {
  bookingDateParts,
  bookingTimeInputValue,
} from "./booking-time";

export const BUSINESS_TIME_ZONE = "America/Chicago";
export const MAX_BOOKING_ADVANCE_DAYS = 180;
export const MAX_PENDING_BOOKINGS_PER_CUSTOMER = 8;
export const MAX_FUTURE_BOOKINGS_PER_CUSTOMER = 24;

export const DEFAULT_WORKING_HOURS = {
  mon: { start: "08:00", end: "17:00", enabled: true },
  tue: { start: "08:00", end: "17:00", enabled: true },
  wed: { start: "08:00", end: "17:00", enabled: true },
  thu: { start: "08:00", end: "17:00", enabled: true },
  fri: { start: "08:00", end: "17:00", enabled: true },
  sat: { start: "09:00", end: "13:00", enabled: false },
  sun: { start: "09:00", end: "13:00", enabled: false },
} as const;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type DayKey = (typeof DAY_KEYS)[number];
type DayHours = { start: string; end: string; enabled: boolean };
type LunchBreak = { start: string; end: string; enabled: boolean };
export type WorkingHours = Partial<Record<DayKey, DayHours>> & Record<string, unknown>;

export type BookingWindow = {
  date: string;
  time: string;
  visitCount: number;
  startAt: Date;
  endAt: Date;
};

export type BookingPolicyResult =
  | { ok: true; window: BookingWindow }
  | { ok: false; message: string };

function parseMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

function zoneParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** Convert a DFW wall-clock date/time into the corresponding UTC instant. */
export function businessDateTimeToInstant(date: string, time: string): Date | null {
  const dateParts = bookingDateParts(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateParts || !timeMatch) return null;
  const { year, month, day } = dateParts;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return null;

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(naiveUtc);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const local = zoneParts(candidate);
    const representedLocal = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    candidate = new Date(naiveUtc - (representedLocal - candidate.getTime()));
  }
  if (Number.isNaN(candidate.getTime())) return null;
  const represented = zoneParts(candidate);
  if (
    represented.year !== year ||
    represented.month !== month ||
    represented.day !== day ||
    represented.hour !== hour ||
    represented.minute !== minute
  ) {
    return null;
  }
  return candidate;
}

export function businessDateString(date = new Date()): string {
  const parts = zoneParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function dateOnlyString(value: Date | string): string | null {
  const parts = bookingDateParts(value);
  if (!parts) return null;
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function addDaysToDateString(date: string, days: number): string | null {
  const parts = bookingDateParts(date);
  if (!parts) return null;
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Combine Postgres date/time-without-zone values into a real DFW instant. */
export function bookingDateAndTimeToInstant(
  date: Date | string,
  time: Date | string,
): Date | null {
  const dateValue = dateOnlyString(date);
  const timeValue = bookingTimeInputValue(time instanceof Date ? time.toISOString() : time);
  if (!dateValue) return null;
  return businessDateTimeToInstant(dateValue, timeValue);
}

function effectiveDayHours(workingHours: unknown, day: DayKey): DayHours {
  const candidate =
    workingHours && typeof workingHours === "object"
      ? (workingHours as Record<string, unknown>)[day]
      : null;
  if (candidate && typeof candidate === "object") {
    const record = candidate as Record<string, unknown>;
    if (
      typeof record.start === "string" &&
      typeof record.end === "string" &&
      typeof record.enabled === "boolean"
    ) {
      return { start: record.start, end: record.end, enabled: record.enabled };
    }
  }
  return { ...DEFAULT_WORKING_HOURS[day] };
}

function effectiveLunchBreak(workingHours: unknown): LunchBreak | null {
  const candidate =
    workingHours && typeof workingHours === "object"
      ? (workingHours as Record<string, unknown>).lunch
      : null;
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Record<string, unknown>;
  if (
    record.enabled !== true ||
    typeof record.start !== "string" ||
    typeof record.end !== "string"
  ) {
    return null;
  }
  return { enabled: true, start: record.start, end: record.end };
}

export function validateBookingWindow(params: {
  date: string;
  time: string;
  visitCount: number;
  workingHours?: unknown;
  now?: Date;
  allowBeyondAdvanceHorizon?: boolean;
}): BookingPolicyResult {
  const {
    date,
    time,
    visitCount,
    workingHours,
    now = new Date(),
    allowBeyondAdvanceHorizon = false,
  } = params;
  const dateValue = businessDateTimeToInstant(date, time);
  if (!dateValue) return { ok: false, message: "Choose a valid date and time" };
  if (!isVisitBlockCount(visitCount) || !canStartVisitBlocks(time, visitCount)) {
    return { ok: false, message: "Choose one of the four available start times and a valid visit length" };
  }

  const dateAtMidnight = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(dateAtMidnight.getTime())) {
    return { ok: false, message: "Choose a valid date" };
  }
  const day = DAY_KEYS[dateAtMidnight.getUTCDay()];
  const hours = effectiveDayHours(workingHours, day);
  if (!hours.enabled) return { ok: false, message: "MCQ is closed on that day" };

  const startMinutes = parseMinutes(time);
  const workingStart = parseMinutes(hours.start);
  const workingEnd = parseMinutes(hours.end);
  const endMinutes = startMinutes + visitDurationMinutes(visitCount);
  if (
    Number.isNaN(workingStart) ||
    Number.isNaN(workingEnd) ||
    startMinutes < workingStart ||
    endMinutes > workingEnd
  ) {
    return { ok: false, message: "That visit falls outside MCQ working hours" };
  }

  const lunch = effectiveLunchBreak(workingHours);
  if (lunch) {
    const lunchStart = parseMinutes(lunch.start);
    const lunchEnd = parseMinutes(lunch.end);
    if (
      Number.isNaN(lunchStart) ||
      Number.isNaN(lunchEnd) ||
      lunchStart >= lunchEnd
    ) {
      return { ok: false, message: "MCQ lunch-break hours are not configured correctly" };
    }
    if (startMinutes < lunchEnd && lunchStart < endMinutes) {
      return { ok: false, message: "That visit overlaps MCQ's lunch break" };
    }
  }

  const endAt = new Date(dateValue.getTime() + visitDurationMinutes(visitCount) * 60_000);
  if (dateValue.getTime() <= now.getTime()) {
    return { ok: false, message: "Choose a future visit time" };
  }
  const latestDate = addDaysToDateString(
    businessDateString(now),
    MAX_BOOKING_ADVANCE_DAYS,
  );
  if (!allowBeyondAdvanceHorizon && latestDate && date > latestDate) {
    return {
      ok: false,
      message: `Bookings can be requested up to ${MAX_BOOKING_ADVANCE_DAYS} days in advance`,
    };
  }

  return {
    ok: true,
    window: { date, time, visitCount, startAt: dateValue, endAt },
  };
}

export function bookingRequestLimitError(params: {
  pendingCount: number;
  futureCount: number;
  ownerOverride?: boolean;
}): string | null {
  if (params.ownerOverride) return null;
  if (params.pendingCount >= MAX_PENDING_BOOKINGS_PER_CUSTOMER) {
    return `You already have ${MAX_PENDING_BOOKINGS_PER_CUSTOMER} pending booking requests. Please wait for MCQ to review one before requesting another.`;
  }
  if (params.futureCount >= MAX_FUTURE_BOOKINGS_PER_CUSTOMER) {
    return `You already have ${MAX_FUTURE_BOOKINGS_PER_CUSTOMER} upcoming visits. Please contact MCQ if you need help scheduling more.`;
  }
  return null;
}

export function intervalsOverlap(
  startAt: Date,
  endAt: Date,
  otherStartAt: Date,
  otherEndAt: Date,
): boolean {
  return startAt < otherEndAt && otherStartAt < endAt;
}

export function isCanonicalBookingStart(value: string): boolean {
  return (BOOKING_SLOT_STARTS as readonly string[]).includes(value);
}

export function customerCancellationError(params: {
  status: string;
  date: string;
  time: string;
  now?: Date;
}): string | null {
  if (!["pending", "confirmed"].includes(params.status)) {
    return "Only future pending or confirmed visits can be cancelled";
  }
  const visitStart = businessDateTimeToInstant(params.date, params.time);
  if (!visitStart || visitStart.getTime() <= (params.now ?? new Date()).getTime()) {
    return "Only future pending or confirmed visits can be cancelled";
  }
  return null;
}
