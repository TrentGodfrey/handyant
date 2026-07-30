export function normalizeHomeTodoStatus(status: unknown): string {
  if (typeof status !== "string") return "";

  const normalized = status.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return normalized === "done" ? "completed" : normalized;
}

export function isOpenHomeTodoStatus(status: unknown): boolean {
  // Unknown legacy values stay visible as open work instead of silently
  // disappearing from the staff roster.
  return normalizeHomeTodoStatus(status) !== "completed";
}

export function countOpenHomeTodos(
  todos: ReadonlyArray<{ status: unknown }>,
): number {
  return todos.filter((todo) => isOpenHomeTodoStatus(todo.status)).length;
}
