/**
 * Apply only fields confirmed by a partial task mutation to the latest local
 * draft. This keeps unrelated edits intact while media/status requests are in
 * flight. Photo records are returned alongside photoIds, so they move together.
 */
export function mergeTaskDraftAfterPartialSave<T extends object>(
  draft: T,
  server: T,
  patch: Record<string, unknown>,
): T {
  const merged = { ...draft };
  const target = merged as unknown as Record<string, unknown>;
  const source = server as unknown as Record<string, unknown>;

  for (const key of Object.keys(patch)) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(patch, "photoIds") &&
    Object.prototype.hasOwnProperty.call(source, "photos")
  ) {
    target.photos = source.photos;
  }

  return merged;
}
