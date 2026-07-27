import assert from "node:assert/strict";
import test from "node:test";
import { shouldRequestVisitReview } from "./review-prompt";

test("review prompts are created only on the first transition into completed", () => {
  assert.equal(shouldRequestVisitReview("confirmed", "completed", false), true);
  assert.equal(shouldRequestVisitReview("in_progress", "completed", false), true);
  assert.equal(shouldRequestVisitReview("completed", "completed", false), false);
  assert.equal(shouldRequestVisitReview("confirmed", "completed", true), false);
  assert.equal(shouldRequestVisitReview("confirmed", "cancelled", false), false);
});
