export type PartsBuyer = "customer" | "tech";
export type PartPurchaseStatus = "needed" | "purchased";

export const PARTS_BUYERS: readonly PartsBuyer[] = ["customer", "tech"];
export const PART_PURCHASE_STATUSES: readonly PartPurchaseStatus[] = [
  "needed",
  "purchased",
];

export function isPartsBuyer(value: unknown): value is PartsBuyer {
  return value === "customer" || value === "tech";
}

export function isPartPurchaseStatus(
  value: unknown,
): value is PartPurchaseStatus {
  return value === "needed" || value === "purchased";
}

/**
 * Resolve who buys the parts. Prefers the dedicated partsBuyer column but
 * falls back to legacy partStatus labels ("Anthony to Purchase",
 * "Customer to Purchase", "Tech to Purchase") written before purchase
 * tracking existed.
 */
export function normalizePartsBuyer(
  buyer: string | null | undefined,
  legacyStatus?: string | null,
): PartsBuyer | null {
  if (isPartsBuyer(buyer)) return buyer;
  const legacy = (legacyStatus ?? "").toLowerCase();
  if (legacy.includes("customer")) return "customer";
  if (legacy.includes("anthony") || legacy.includes("tech")) return "tech";
  return null;
}

/**
 * Resolve purchase state from partStatus. Legacy rows hold buyer labels
 * (never a purchase state), so anything that isn't explicitly "purchased"
 * still needs purchasing.
 */
export function normalizePartPurchaseStatus(
  status: string | null | undefined,
): PartPurchaseStatus {
  return (status ?? "").trim().toLowerCase() === "purchased"
    ? "purchased"
    : "needed";
}

type OptionalFieldResult<T> =
  | { ok: true; value: T | null }
  | { ok: false; message: string };

/** Validate an optional partsBuyer field from a request body. */
export function optionalPartsBuyer(
  value: unknown,
): OptionalFieldResult<PartsBuyer> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (!isPartsBuyer(value)) {
    return { ok: false, message: "Parts buyer must be customer or tech" };
  }
  return { ok: true, value };
}

/** Validate an optional partStatus field from a request body. */
export function optionalPartPurchaseStatus(
  value: unknown,
): OptionalFieldResult<PartPurchaseStatus> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (!isPartPurchaseStatus(value)) {
    return { ok: false, message: "Parts status must be needed or purchased" };
  }
  return { ok: true, value };
}

export function partsBuyerLabel(
  buyer: PartsBuyer | null,
  labels: { customer: string; tech: string } = {
    customer: "Customer buys",
    tech: "Anthony buys",
  },
): string | null {
  if (!buyer) return null;
  return buyer === "tech" ? labels.tech : labels.customer;
}

export function partPurchaseStatusLabel(status: PartPurchaseStatus): string {
  return status === "purchased" ? "Purchased" : "Needs purchase";
}
