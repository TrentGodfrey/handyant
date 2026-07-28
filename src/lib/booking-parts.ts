import {
  normalizePartPurchaseStatus,
  normalizePartsBuyer,
  type PartPurchaseStatus,
  type PartsBuyer,
} from "@/lib/parts-status";

type TaskWithParts = {
  partsDescription?: string | null;
  parts?: string | null;
  partsBuyer?: string | null;
  partStatus?: string | null;
};

export type BookingPartItem = {
  item: string;
  buyer: PartsBuyer | null;
  status: PartPurchaseStatus;
};

/** Combine booking-entered parts with parts saved on selected home tasks. */
export function mergeBookingPartItems(
  manualItems: string[],
  selectedTasks: TaskWithParts[],
): BookingPartItem[] {
  const merged: BookingPartItem[] = [];
  const normalized = new Set<string>();

  const candidates: { raw: string; buyer: PartsBuyer | null; status: PartPurchaseStatus }[] = [
    ...manualItems.map((raw) => ({
      raw,
      buyer: null,
      status: "needed" as PartPurchaseStatus,
    })),
    ...selectedTasks.map((task) => ({
      raw: task.partsDescription ?? task.parts ?? "",
      buyer: normalizePartsBuyer(task.partsBuyer, task.partStatus),
      status: normalizePartPurchaseStatus(task.partStatus),
    })),
  ];

  for (const candidate of candidates) {
    const item = candidate.raw.trim();
    const key = item.toLowerCase();
    if (!item || normalized.has(key)) continue;
    merged.push({ item, buyer: candidate.buyer, status: candidate.status });
    normalized.add(key);
  }

  return merged;
}
