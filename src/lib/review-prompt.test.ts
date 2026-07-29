import assert from "node:assert/strict";
import test from "node:test";
import {
  HISTORICAL_REVIEW_REQUEST_WINDOW_MS,
  shouldRequestHistoricalVisitReview,
  shouldRequestVisitReview,
} from "./review-prompt";

test("review prompts are created only on the first transition into completed", () => {
  assert.equal(shouldRequestVisitReview("confirmed", "completed", false), true);
  assert.equal(shouldRequestVisitReview("in_progress", "completed", false), true);
  assert.equal(shouldRequestVisitReview("completed", "completed", false), false);
  assert.equal(shouldRequestVisitReview("confirmed", "completed", true), false);
  assert.equal(shouldRequestVisitReview("confirmed", "cancelled", false), false);
});

test("historical review prompts are limited to fully elapsed visits from the last 24 hours", () => {
  const now = new Date("2026-07-29T18:00:00.000Z");
  assert.equal(
    shouldRequestHistoricalVisitReview(
      new Date(now.getTime() - HISTORICAL_REVIEW_REQUEST_WINDOW_MS),
      now,
    ),
    true,
  );
  assert.equal(
    shouldRequestHistoricalVisitReview(
      new Date(now.getTime() - HISTORICAL_REVIEW_REQUEST_WINDOW_MS - 1),
      now,
    ),
    false,
  );
  assert.equal(
    shouldRequestHistoricalVisitReview(
      new Date(now.getTime() + 1),
      now,
    ),
    false,
  );
  assert.equal(
    shouldRequestHistoricalVisitReview(new Date(Number.NaN), now),
    false,
  );
});
