import assert from "node:assert/strict";
import test from "node:test";
import { countsAsBooked, sumBookedMinutes } from "./booking-stats";

test("cancelled visits do not count as booked", () => {
  assert.equal(countsAsBooked("cancelled"), false);
  assert.equal(countsAsBooked("confirmed"), true);
  assert.equal(countsAsBooked("completed"), true);
});

test("booked minutes immediately exclude cancelled visits", () => {
  assert.equal(sumBookedMinutes([
    { status: "confirmed", durationMinutes: 105 },
    { status: "cancelled", durationMinutes: 210 },
    { status: "completed", durationMinutes: 105 },
  ]), 210);
});
