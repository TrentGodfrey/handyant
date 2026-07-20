import assert from "node:assert/strict";
import test from "node:test";
import { clampVisitsUsed, completedStatusDelta, getVisitUsage } from "./subscription-usage";

test("elite visit usage reports used and remaining", () => {
  assert.deepEqual(getVisitUsage("elite", 1), {
    allowance: 30,
    used: 1,
    remaining: 29,
    percent: 3,
  });
});

test("visit usage is clamped to the plan allowance", () => {
  assert.equal(clampVisitsUsed(-2, "essential"), 0);
  assert.equal(clampVisitsUsed(99, "essential"), 10);
});

test("completed status transitions produce a single counter delta", () => {
  assert.equal(completedStatusDelta("confirmed", "completed"), 1);
  assert.equal(completedStatusDelta("completed", "cancelled"), -1);
  assert.equal(completedStatusDelta("completed", "completed"), 0);
});

test("multi-visit completion consumes each reserved visit block", () => {
  assert.equal(completedStatusDelta("confirmed", "completed", 3), 3);
  assert.equal(completedStatusDelta("completed", "cancelled", 3), -3);
});
