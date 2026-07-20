import assert from "node:assert/strict";
import test from "node:test";
import { shouldRequestVisitReview } from "./review-prompt";

test("a newly completed unreviewed visit requests a review", () => {
  assert.equal(shouldRequestVisitReview("in_progress", "completed", false), true);
});

test("review prompts are not sent for repeated updates or reviewed visits", () => {
  assert.equal(shouldRequestVisitReview("completed", "completed", false), false);
  assert.equal(shouldRequestVisitReview("in_progress", "completed", true), false);
  assert.equal(shouldRequestVisitReview("confirmed", "cancelled", false), false);
});
