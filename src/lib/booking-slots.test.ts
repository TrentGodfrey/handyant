import assert from "node:assert/strict";
import test from "node:test";
import { BOOKING_SLOT_STARTS, VISIT_DURATION_MINUTES, bookingSlotEnd, isBookingSlotStart } from "./booking-slots";

test("the booking day has exactly four 1-hour-45-minute windows", () => {
  assert.equal(VISIT_DURATION_MINUTES, 105);
  assert.deepEqual([...BOOKING_SLOT_STARTS], ["08:00", "10:00", "12:00", "14:00"]);
  assert.deepEqual(BOOKING_SLOT_STARTS.map(bookingSlotEnd), ["09:45", "11:45", "13:45", "15:45"]);
  assert.equal(isBookingSlotStart("08:00"), true);
  assert.equal(isBookingSlotStart("16:00"), false);
});
