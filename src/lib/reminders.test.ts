import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_APPOINTMENT_REMINDERS,
  MAX_REMINDER_DELIVERY_ATTEMPTS,
  canRetryReminderDelivery,
  isReminderDue,
  normalizeAppointmentReminders,
  reminderIdempotencyKey,
} from "./reminders";

test("appointment reminders default to email-only delivery", () => {
  assert.deepEqual(DEFAULT_APPOINTMENT_REMINDERS.channels, {
    email: true,
    sms: false,
    push: false,
  });
  assert.deepEqual(
    normalizeAppointmentReminders({
      enabled: true,
      leadTimes: [1440],
      channels: { email: true, sms: true, push: true },
    }).channels,
    { email: true, sms: false, push: false },
  );
});

test("due reminders include a short catch-up window without sending after a visit", () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  assert.equal(
    isReminderDue({
      now,
      appointmentAt: new Date("2026-07-26T16:00:00.000Z"),
      leadTime: 60,
    }),
    true,
  );
  assert.equal(
    isReminderDue({
      now,
      appointmentAt: new Date("2026-07-26T15:55:00.000Z"),
      leadTime: 60,
    }),
    true,
  );
  assert.equal(
    isReminderDue({
      now,
      appointmentAt: new Date("2026-07-26T14:00:00.000Z"),
      leadTime: 60,
    }),
    false,
  );
});

test("provider idempotency changes when a booking is rescheduled", () => {
  const base = {
    bookingId: "booking",
    userId: "user",
    leadTime: 1440,
    appointmentAt: new Date("2026-07-27T13:00:00.000Z"),
  };
  const first = reminderIdempotencyKey(base);
  assert.equal(first, reminderIdempotencyKey(base));
  assert.notEqual(
    first,
    reminderIdempotencyKey({
      ...base,
      appointmentAt: new Date("2026-07-28T13:00:00.000Z"),
    }),
  );
});

test("failed or abandoned reminder claims retry without duplicating sent mail", () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const base = {
    sentAt: null,
    failedAt: null,
    claimedAt: new Date("2026-07-26T14:59:00.000Z"),
    attemptCount: 1,
    now,
  };

  assert.equal(canRetryReminderDelivery(base), false);
  assert.equal(
    canRetryReminderDelivery({
      ...base,
      failedAt: new Date("2026-07-26T14:58:00.000Z"),
    }),
    true,
  );
  assert.equal(
    canRetryReminderDelivery({
      ...base,
      claimedAt: new Date("2026-07-26T14:55:00.000Z"),
    }),
    true,
  );
  assert.equal(
    canRetryReminderDelivery({
      ...base,
      sentAt: new Date("2026-07-26T14:59:30.000Z"),
    }),
    false,
  );
  assert.equal(
    canRetryReminderDelivery({
      ...base,
      attemptCount: MAX_REMINDER_DELIVERY_ATTEMPTS,
      failedAt: new Date("2026-07-26T14:50:00.000Z"),
    }),
    false,
  );
});
