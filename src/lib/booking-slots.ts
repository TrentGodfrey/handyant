export const VISIT_DURATION_MINUTES = 105;
export const MAX_VISIT_BLOCKS = 4;

export const VISIT_BLOCK_OPTIONS = [
  { count: 1, label: "Single visit", durationLabel: "1 hr 45 min" },
  { count: 2, label: "Double visit", durationLabel: "3 hr 30 min" },
  { count: 3, label: "Triple visit", durationLabel: "5 hr 15 min" },
  { count: 4, label: "Full-day visit", durationLabel: "7 hr" },
] as const;

/** The four customer-bookable windows offered each working day. */
export const BOOKING_SLOT_STARTS = ["08:00", "10:00", "12:00", "14:00"] as const;

export function isBookingSlotStart(value: string): boolean {
  return (BOOKING_SLOT_STARTS as readonly string[]).includes(value);
}

export function isVisitBlockCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= MAX_VISIT_BLOCKS;
}

export function visitDurationMinutes(visitCount: number): number {
  return VISIT_DURATION_MINUTES * visitCount;
}

export function canStartVisitBlocks(start: string, visitCount: number): boolean {
  if (!isVisitBlockCount(visitCount)) return false;
  const index = (BOOKING_SLOT_STARTS as readonly string[]).indexOf(start);
  return index >= 0 && index + visitCount <= BOOKING_SLOT_STARTS.length;
}

export function bookingSlotEnd(start: string, visitCount = 1): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(start);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  if (!isVisitBlockCount(visitCount)) return null;
  const end = hours * 60 + minutes + visitDurationMinutes(visitCount);
  return `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}
