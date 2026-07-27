import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_BOOKING_ADVANCE_DAYS,
  MAX_FUTURE_BOOKINGS_PER_CUSTOMER,
  MAX_PENDING_BOOKINGS_PER_CUSTOMER,
  bookingRequestLimitError,
  bookingDateAndTimeToInstant,
  businessDateString,
  businessDateTimeToInstant,
  customerCancellationError,
  intervalsOverlap,
  validateBookingWindow,
} from "./booking-policy";

test("converts DFW summer and winter booking times to UTC instants", () => {
  assert.equal(
    businessDateTimeToInstant("2026-07-27", "08:00")?.toISOString(),
    "2026-07-27T13:00:00.000Z",
  );
  assert.equal(
    businessDateTimeToInstant("2026-12-07", "08:00")?.toISOString(),
    "2026-12-07T14:00:00.000Z",
  );
  assert.equal(
    bookingDateAndTimeToInstant(
      new Date("2026-07-27T00:00:00.000Z"),
      new Date("1970-01-01T14:00:00.000Z"),
    )?.toISOString(),
    "2026-07-27T19:00:00.000Z",
  );
});

test("uses the DFW calendar date near UTC midnight", () => {
  assert.equal(businessDateString(new Date("2026-07-27T02:00:00Z")), "2026-07-26");
});

test("rejects normalized and impossible calendar values", () => {
  assert.equal(businessDateTimeToInstant("2026-02-29", "08:00"), null);
  assert.equal(businessDateTimeToInstant("2026-07-27", "24:00"), null);
});

test("allows only future canonical slots on enabled working days", () => {
  const now = new Date("2026-07-26T12:00:00Z");
  assert.equal(
    validateBookingWindow({
      date: "2026-07-27",
      time: "08:00",
      visitCount: 1,
      now,
    }).ok,
    true,
  );
  assert.deepEqual(
    validateBookingWindow({
      date: "2026-07-27",
      time: "09:00",
      visitCount: 1,
      now,
    }),
    {
      ok: false,
      message: "Choose one of the four available start times and a valid visit length",
    },
  );
  assert.deepEqual(
    validateBookingWindow({
      date: "2026-07-26",
      time: "08:00",
      visitCount: 1,
      now,
    }),
    { ok: false, message: "MCQ is closed on that day" },
  );
});

test("rejects past and out-of-hours multi-block visits", () => {
  assert.deepEqual(
    validateBookingWindow({
      date: "2026-07-27",
      time: "08:00",
      visitCount: 1,
      now: new Date("2026-07-27T14:00:00Z"),
    }),
    { ok: false, message: "Choose a future visit time" },
  );
  assert.deepEqual(
    validateBookingWindow({
      date: "2026-07-27",
      time: "12:00",
      visitCount: 3,
      now: new Date("2026-07-26T12:00:00Z"),
    }),
    {
      ok: false,
      message: "Choose one of the four available start times and a valid visit length",
    },
  );
  assert.deepEqual(
    validateBookingWindow({
      date: "2026-07-27",
      time: "14:00",
      visitCount: 1,
      workingHours: {
        mon: { start: "08:00", end: "15:00", enabled: true },
      },
      now: new Date("2026-07-26T12:00:00Z"),
    }),
    { ok: false, message: "That visit falls outside MCQ working hours" },
  );
});

test("bounds ordinary booking requests while allowing an explicit owner override", () => {
  const now = new Date("2026-07-26T12:00:00Z");
  const beyondHorizon = "2027-02-01";
  assert.deepEqual(
    validateBookingWindow({
      date: beyondHorizon,
      time: "08:00",
      visitCount: 1,
      now,
    }),
    {
      ok: false,
      message: `Bookings can be requested up to ${MAX_BOOKING_ADVANCE_DAYS} days in advance`,
    },
  );
  assert.equal(
    validateBookingWindow({
      date: beyondHorizon,
      time: "08:00",
      visitCount: 1,
      now,
      allowBeyondAdvanceHorizon: true,
    }).ok,
    true,
  );
});

test("caps pending and future bookings unless the business owner overrides", () => {
  assert.match(
    bookingRequestLimitError({
      pendingCount: MAX_PENDING_BOOKINGS_PER_CUSTOMER,
      futureCount: 0,
    }) ?? "",
    /pending booking requests/,
  );
  assert.match(
    bookingRequestLimitError({
      pendingCount: 0,
      futureCount: MAX_FUTURE_BOOKINGS_PER_CUSTOMER,
    }) ?? "",
    /upcoming visits/,
  );
  assert.equal(
    bookingRequestLimitError({
      pendingCount: MAX_PENDING_BOOKINGS_PER_CUSTOMER,
      futureCount: MAX_FUTURE_BOOKINGS_PER_CUSTOMER,
      ownerOverride: true,
    }),
    null,
  );
});

test("rejects visits that overlap an enabled lunch break", () => {
  const workingHours = {
    mon: { start: "08:00", end: "17:00", enabled: true },
    lunch: { start: "12:00", end: "13:00", enabled: true },
  };
  assert.deepEqual(
    validateBookingWindow({
      date: "2026-07-27",
      time: "12:00",
      visitCount: 1,
      workingHours,
      now: new Date("2026-07-26T12:00:00Z"),
    }),
    { ok: false, message: "That visit overlaps MCQ's lunch break" },
  );
  assert.equal(
    validateBookingWindow({
      date: "2026-07-27",
      time: "14:00",
      visitCount: 1,
      workingHours,
      now: new Date("2026-07-26T12:00:00Z"),
    }).ok,
    true,
  );
});

test("detects availability block overlap but allows touching boundaries", () => {
  const start = new Date("2026-07-27T13:00:00Z");
  const end = new Date("2026-07-27T14:45:00Z");
  assert.equal(
    intervalsOverlap(
      start,
      end,
      new Date("2026-07-27T14:00:00Z"),
      new Date("2026-07-27T15:00:00Z"),
    ),
    true,
  );
  assert.equal(
    intervalsOverlap(
      start,
      end,
      new Date("2026-07-27T14:45:00Z"),
      new Date("2026-07-27T15:00:00Z"),
    ),
    false,
  );
});

test("customers can cancel only future pending or confirmed visits", () => {
  const now = new Date("2026-07-26T12:00:00Z");
  assert.equal(
    customerCancellationError({
      status: "confirmed",
      date: "2026-07-27",
      time: "08:00",
      now,
    }),
    null,
  );
  assert.match(
    customerCancellationError({
      status: "completed",
      date: "2026-07-27",
      time: "08:00",
      now,
    }) ?? "",
    /future pending or confirmed/,
  );
  assert.match(
    customerCancellationError({
      status: "pending",
      date: "2026-07-25",
      time: "08:00",
      now,
    }) ?? "",
    /future pending or confirmed/,
  );
});
