import assert from "node:assert/strict";
import test from "node:test";
import {
  isUniqueConstraintError,
  isValidAvailabilityRange,
} from "./data-integrity";

test("availability ranges require finite timestamps with end after start", () => {
  const start = new Date("2026-07-27T13:00:00Z");
  assert.equal(isValidAvailabilityRange(start, new Date("2026-07-27T14:00:00Z")), true);
  assert.equal(isValidAvailabilityRange(start, new Date("2026-07-27T13:00:00Z")), false);
  assert.equal(isValidAvailabilityRange(start, new Date("2026-07-27T12:59:59Z")), false);
  assert.equal(isValidAvailabilityRange(new Date(Number.NaN), new Date()), false);
});

test("only Prisma unique violations are classified as duplicate races", () => {
  assert.equal(isUniqueConstraintError({ code: "P2002" }), true);
  assert.equal(isUniqueConstraintError({ code: "P2003" }), false);
  assert.equal(isUniqueConstraintError(new Error("duplicate")), false);
  assert.equal(isUniqueConstraintError(null), false);
});
