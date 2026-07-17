export const HOME_HISTORY_DELETE_CONFIRMATION = "DELETE";

interface HomeDeletionRequest {
  deleteHistory?: unknown;
  confirmation?: unknown;
}

/**
 * A history purge is intentionally separate from an ordinary empty-home delete.
 * The API also restricts this path to staff accounts.
 */
export function isConfirmedHomeHistoryDeletion(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const request = body as HomeDeletionRequest;
  return (
    request.deleteHistory === true &&
    request.confirmation === HOME_HISTORY_DELETE_CONFIRMATION
  );
}
