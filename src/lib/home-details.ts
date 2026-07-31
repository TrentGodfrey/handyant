/**
 * Bounds for the numeric fields on a home profile.
 *
 * These are entered as free-text number inputs on the edit screen and as a
 * dropdown on the add-home wizard, so the API validates them rather than
 * trusting whatever the form posts.
 */

/** Oldest plausible standing home. DFW's oldest surviving houses are 1840s. */
export const MIN_YEAR_BUILT = 1800;
/** Water heaters predate no home, but a 1900s date is already implausible. */
export const MIN_WATER_HEATER_YEAR = 1900;
/** Residential service panels run 60-400A; allow headroom either side. */
export const MIN_PANEL_AMPS = 30;
export const MAX_PANEL_AMPS = 1000;

/**
 * Newest selectable year. Allows next year so a home still under construction
 * can be recorded, and is derived from the clock so the list never goes stale
 * the way a hard-coded ceiling does.
 */
export function maxHomeYear(now = new Date()): number {
  return now.getFullYear() + 1;
}

/** Year-built choices, newest first, back to 1900. */
export function buildYearBuiltOptions(now = new Date()): number[] {
  const newest = maxHomeYear(now);
  const oldest = 1900;
  return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i);
}

type NumberResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

function boundedInteger(
  value: unknown,
  label: string,
  min: number,
  max: number,
): NumberResult {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isInteger(numeric)) {
    return { ok: false, message: `${label} must be a whole number` };
  }
  if (numeric < min || numeric > max) {
    return { ok: false, message: `${label} must be between ${min} and ${max}` };
  }
  return { ok: true, value: numeric };
}

export function validateYearBuilt(value: unknown, now = new Date()): NumberResult {
  return boundedInteger(value, "Year built", MIN_YEAR_BUILT, maxHomeYear(now));
}

export function validateWaterHeaterYear(value: unknown, now = new Date()): NumberResult {
  return boundedInteger(
    value,
    "Water heater year",
    MIN_WATER_HEATER_YEAR,
    maxHomeYear(now),
  );
}

export function validatePanelAmps(value: unknown): NumberResult {
  return boundedInteger(value, "Panel amps", MIN_PANEL_AMPS, MAX_PANEL_AMPS);
}

export const HOME_NUMBER_VALIDATORS: Record<
  string,
  (value: unknown) => NumberResult
> = {
  yearBuilt: (value) => validateYearBuilt(value),
  waterHeaterYear: (value) => validateWaterHeaterYear(value),
  panelAmps: (value) => validatePanelAmps(value),
};
