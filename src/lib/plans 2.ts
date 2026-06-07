// Single source of truth for subscription plans.
// Used by /account/plans and /account/manage. Pricing here matches the
// /account/manage UI ($0 / $149) plus a Premium tier for power users.

export type PlanId = "free" | "pro" | "premium";

export interface PlanDefinition {
  id: PlanId;
  label: string;
  monthlyPrice: number;
  annualPrice: number; // per-month price billed annually
  visits: number; // -1 = unlimited
  visitLabel: string;
  tagline: string;
  details: string;
  features: string[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    label: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    visits: 0,
    visitLabel: "Pay per visit",
    tagline: "On-demand bookings",
    details: "On-demand bookings · pay per visit",
    features: [
      "On-demand bookings",
      "Standard scheduling",
      "Email support",
      "Basic home profile",
      "Job history & receipts",
      "Online booking",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    monthlyPrice: 149,
    annualPrice: 124,
    visits: 2,
    visitLabel: "2 visits / month",
    tagline: "Most popular for homeowners",
    details: "2 visits/month · priority scheduling",
    features: [
      "2 technician visits per month",
      "Priority scheduling",
      "Parts tracking & ordering",
      "SMS & email reminders",
      "Full home profile",
      "Dedicated tech",
      "Job history & receipts",
      "Phone support",
    ],
  },
  {
    id: "premium",
    label: "Premium",
    monthlyPrice: 249,
    annualPrice: 207,
    visits: -1,
    visitLabel: "Unlimited visits",
    tagline: "For comprehensive home care",
    details: "Unlimited visits · same-day availability",
    features: [
      "Unlimited technician visits",
      "Same-day availability",
      "Dedicated tech + backup",
      "Full home profile & photos",
      "Priority parts ordering",
      "Annual home inspection",
      "24/7 emergency line",
      "Multi-room project support",
      "Annual health report",
    ],
  },
];

export function planMeta(plan: string): { label: string; price: string; details: string } {
  const found = PLANS.find((p) => p.id === plan);
  if (found) {
    return {
      label: found.label,
      price: found.monthlyPrice === 0 ? "$0/mo" : `$${found.monthlyPrice}/mo`,
      details: found.details,
    };
  }
  return {
    label: plan.charAt(0).toUpperCase() + plan.slice(1),
    price: "—",
    details: "Custom plan",
  };
}
