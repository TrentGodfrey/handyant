export const TEXT_LIMITS = {
  taskTitle: 160,
  taskDescription: 4_000,
  taskNotes: 4_000,
  partsDescription: 2_000,
  partsBuyer: 120,
  bookingDescription: 4_000,
  bookingNotes: 4_000,
  partItem: 160,
} as const;

type TextResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

type OptionalTextResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

export function requiredBoundedText(
  value: unknown,
  label: string,
  maxLength: number,
): TextResult {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, message: `${label} is required` };
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    return {
      ok: false,
      message: `${label} is too long (max ${maxLength} characters)`,
    };
  }
  return { ok: true, value: normalized };
}

export function optionalBoundedText(
  value: unknown,
  label: string,
  maxLength: number,
): OptionalTextResult {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, message: `${label} must be text` };
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    return {
      ok: false,
      message: `${label} is too long (max ${maxLength} characters)`,
    };
  }
  return { ok: true, value: normalized || null };
}
