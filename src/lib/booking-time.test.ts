import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingDateParts,
  bookingDateToDatabaseDate,
  bookingDateToLocalDate,
  bookingTimeInputValue,
  bookingTimeParts,
  bookingTimeToDatabaseDate,
  formatBookingDate,
  formatBookingTime,
} from "./booking-time";

test("database time values remain wall-clock times", () => {
  assert.deepEqual(bookingTimeParts("1970-01-01T08:00:00.000Z"), { hours: 8, minutes: 0 });
  assert.equal(formatBookingTime("1970-01-01T08:00:00.000Z"), "8:00 AM");
  assert.equal(formatBookingTime("1970-01-01T14:30:00.000Z"), "2:30 PM");
  assert.equal(bookingTimeInputValue("1970-01-01T14:30:00.000Z"), "14:30");
  assert.equal(bookingTimeToDatabaseDate("14:30")?.toISOString(), "1970-01-01T14:30:00.000Z");
});

test("database date values remain calendar dates", () => {
  const date = bookingDateToLocalDate("2026-07-20T00:00:00.000Z");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 6);
  assert.equal(date.getDate(), 20);
  assert.equal(
    bookingDateToDatabaseDate("2026-07-20T00:00:00.000Z")?.toISOString(),
    "2026-07-20T00:00:00.000Z",
  );
  assert.deepEqual(bookingDateParts("2026-07-20"), { year: 2026, month: 7, day: 20 });
  assert.equal(
    formatBookingDate("2026-07-20T00:00:00.000Z", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    "Monday, July 20",
  );
});

test("invalid calendar dates are rejected instead of rolling into another day", () => {
  assert.equal(bookingDateParts("2026-02-29"), null);
  assert.equal(bookingDateToDatabaseDate("2026-04-31"), null);
  assert.equal(Number.isNaN(bookingDateToLocalDate("not-a-date").getTime()), true);
});
