// Single source of truth for subscription plans.
// Used by /account/plans, /account/manage, /onboarding, /account.
//
// Plans are annual memberships: each tier includes a fixed number of
// scheduled visits per YEAR (not per month). Pricing is the annual total.

export type PlanId = "essential" | "pro" | "elite";

export interface PlanDefinition {
  id: PlanId;
  label: string;
  annualPrice: number; // total billed once per year
  visits: number; // visits per year
  visitLabel: string;
  tagline: string;
  details: string;
  features: string[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: "essential",
    label: "Essential",
    annualPrice: 2000,
    visits: 10,
    visitLabel: "10 visits / year",
    tagline: "Steady upkeep for the everyday home",
    details: "10 scheduled visits per year",
    features: [
      "10 scheduled visits per year",
      "Standard scheduling",
      "Priority over walk-ins",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    annualPrice: 4000,
    visits: 25,
    visitLabel: "25 visits / year",
    tagline: "Most popular for homeowners",
    details: "25 scheduled visits per year",
    features: [
      "25 scheduled visits per year",
      "Priority scheduling",
      "Parts procurement assistance",
      "Phone + chat support",
    ],
  },
  {
    id: "elite",
    label: "Elite",
    annualPrice: 6500,
    visits: 50,
    visitLabel: "50 visits / year",
    tagline: "For comprehensive home care",
    details: "50 scheduled visits per year",
    features: [
      "50 scheduled visits per year",
      "Same-day availability",
      "Dedicated handyman",
      "24/7 emergency support",
    ],
  },
];

export function planMeta(plan: string): { label: string; price: string; details: string } {
  const found = PLANS.find((p) => p.id === plan);
  if (found) {
    return {
      label: found.label,
      price: `$${found.annualPrice.toLocaleString()}/yr`,
      details: found.details,
    };
  }
  return {
    label: plan.charAt(0).toUpperCase() + plan.slice(1),
    price: "-",
    details: "Custom plan",
  };
}
