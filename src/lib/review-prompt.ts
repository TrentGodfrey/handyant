export const HISTORICAL_REVIEW_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1_000;

export function shouldRequestVisitReview(
  previousStatus: string,
  nextStatus: string,
  alreadyReviewed: boolean,
): boolean {
  return previousStatus !== "completed" && nextStatus === "completed" && !alreadyReviewed;
}

export function shouldRequestHistoricalVisitReview(
  visitEndAt: Date,
  now = new Date(),
): boolean {
  const elapsedMs = now.getTime() - visitEndAt.getTime();
  return (
    !Number.isNaN(elapsedMs) &&
    elapsedMs >= 0 &&
    elapsedMs <= HISTORICAL_REVIEW_REQUEST_WINDOW_MS
  );
}
