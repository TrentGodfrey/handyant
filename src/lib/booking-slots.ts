export const VISIT_DURATION_MINUTES = 105;

/** The four customer-bookable windows offered each working day. */
export const BOOKING_SLOT_STARTS = ["08:00", "10:00", "12:00", "14:00"] as const;

export function isBookingSlotStart(value: string): boolean {
  return (BOOKING_SLOT_STARTS as readonly string[]).includes(value);
}

export function bookingSlotEnd(start: string): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(start);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const end = hours * 60 + minutes + VISIT_DURATION_MINUTES;
  return `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}
