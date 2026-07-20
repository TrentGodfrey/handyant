type TaskWithParts = {
  partsDescription?: string | null;
  parts?: string | null;
};

/** Combine booking-entered parts with parts saved on selected home tasks. */
export function mergeBookingPartItems(
  manualItems: string[],
  selectedTasks: TaskWithParts[],
): string[] {
  const merged: string[] = [];
  const normalized = new Set<string>();

  for (const rawItem of [
    ...manualItems,
    ...selectedTasks.map((task) => task.partsDescription ?? task.parts ?? ""),
  ]) {
    const item = rawItem.trim();
    const key = item.toLowerCase();
    if (!item || normalized.has(key)) continue;
    merged.push(item);
    normalized.add(key);
  }

  return merged;
}
