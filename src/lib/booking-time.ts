/**
 * Booking dates and times are Postgres date/time-without-time-zone values.
 * Prisma serializes them as ISO-looking UTC strings, but the `Z` is a transport
 * detail: 08:00 means 8:00 AM at the property, not an instant to convert into
 * the browser's timezone.
 */
export function bookingTimeParts(value: string): { hours: number; minutes: number } | null {
  const match = /(?:T|^)(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || hours < 0 || hours > 23 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function formatBookingTime(value: string): string {
  const parts = bookingTimeParts(value);
  if (!parts) return value;
  const ampm = parts.hours >= 12 ? "PM" : "AM";
  const hour = parts.hours % 12 === 0 ? 12 : parts.hours % 12;
  return `${hour}:${String(parts.minutes).padStart(2, "0")} ${ampm}`;
}

export function bookingTimeInputValue(value: string): string {
  const parts = bookingTimeParts(value);
  if (!parts) return "08:00";
  return `${String(parts.hours).padStart(2, "0")}:${String(parts.minutes).padStart(2, "0")}`;
}

export function bookingTimeToDatabaseDate(value: string): Date | null {
  const parts = bookingTimeParts(value);
  if (!parts) return null;
  return new Date(Date.UTC(1970, 0, 1, parts.hours, parts.minutes, 0, 0));
}

export function bookingDateParts(
  value: Date | string,
): { year: number; month: number; day: number } | null {
  if (value instanceof Date && Number.isNaN(value.getTime())) return null;
  const source = value instanceof Date ? value.toISOString() : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(source);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function bookingDateToDatabaseDate(value: Date | string): Date | null {
  const parts = bookingDateParts(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function bookingDateToLocalDate(value: string): Date {
  const parts = bookingDateParts(value);
  if (!parts) return new Date(Number.NaN);
  return new Date(parts.year, parts.month - 1, parts.day);
}

/**
 * Format a Postgres `date` value without allowing the runtime timezone to
 * shift its calendar day. The UTC formatter is deliberate: `Z` on Prisma's
 * serialized date-only value is transport metadata, not the property's zone.
 */
export function formatBookingDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
): string {
  const date = bookingDateToDatabaseDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
}
