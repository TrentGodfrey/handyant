export function shouldRequestVisitReview(
  previousStatus: string,
  nextStatus: string,
  alreadyReviewed: boolean,
): boolean {
  return previousStatus !== "completed" && nextStatus === "completed" && !alreadyReviewed;
}
