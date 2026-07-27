export function isValidAvailabilityRange(startAt: Date, endAt: Date): boolean {
  return (
    Number.isFinite(startAt.getTime()) &&
    Number.isFinite(endAt.getTime()) &&
    endAt.getTime() > startAt.getTime()
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
