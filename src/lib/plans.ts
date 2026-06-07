// Single source of truth for subscription plans.
// Used by /account/plans, /account/manage, /onboarding, /account.
//
// Plans are annual memberships: each tier includes a fixed number of
// scheduled visits per YEAR (not per month). Pricing is the annual total.
// Each visit is 1 hour 45 minutes (105 min).

export type PlanId = "essential" | "pro" | "elite";

export interface PlanDefinition {
  id: PlanId;
  label: string;
  annualPrice: number; // total billed once per year
  visits: number; // visits per year
  visitDurationMinutes: number; // length of each visit
  visitLabel: string;
  tagline: string;
  details: string;
  popular?: boolean;
  features: string[];
  // Square checkout link Anthony generated. When present, the plan card
  // sends the customer here to pay. When null, we fall back to
  // /messages?topic=membership (gated until payment link is provided).
  paymentUrl: string | null;
}

// Shared by all plans: ways customers can use a visit.
// Surfaced on /account/plans and the onboarding pricing screen.
export const VISIT_USES: string[] = [
  "Repairs & Installations",
  "TV Mounting / Electrical Fixes",
  "Drywall / Paint Touch-Ups",
  "Fixtures, Doors, Hardware",
  "Preventative Maintenance",
  "\"Honey-Do\" Lists Knocked Out Fast",
];

// Trust points for the landing page.
export const WHY_MCQ: string[] = [
  "Attention to detail and pride in workmanship on every project.",
  "Spend less time managing home repairs, more time enjoying your home.",
  "24-hour on-call emergency response.",
  "Fully insured — $1M / $2M coverage.",
  "Trusted by high-end homeowners across DFW.",
  "Clear communication every step. No guesswork, no runaround.",
];

export const PLANS: PlanDefinition[] = [
  {
    id: "essential",
    label: "Essential",
    annualPrice: 1950,
    visits: 10,
    visitDurationMinutes: 105,
    visitLabel: "10 visits / year",
    tagline: "Ideal for maintenance & small repairs",
    details: "10 visits per year · 1h 45m each",
    features: [
      "10 Visits Per Year",
      "1 Hour 45 Minutes Per Visit",
      "Ideal for maintenance & small repairs",
    ],
    paymentUrl: "https://square.link/u/C6Nq4mFy",
  },
  {
    id: "pro",
    label: "Pro",
    annualPrice: 3400,
    visits: 20,
    visitDurationMinutes: 105,
    visitLabel: "20 visits / year",
    tagline: "Perfect for active households",
    details: "20 visits per year · 1h 45m each",
    popular: true,
    features: [
      "20 Visits Per Year",
      "1 Hour 45 Minutes Per Visit",
      "Priority Scheduling",
      "Perfect for active households",
    ],
    paymentUrl: "https://square.link/u/C60RLstN",
  },
  {
    id: "elite",
    label: "Elite",
    annualPrice: 4500,
    visits: 30,
    visitDurationMinutes: 105,
    visitLabel: "30 visits / year",
    tagline: "Dedicated handyman experience",
    details: "30 visits per year · 1h 45m each",
    features: [
      "30 Visits Per Year",
      "1 Hour 45 Minutes Per Visit",
      "VIP Scheduling + Flexibility",
      "Dedicated handyman experience",
    ],
    paymentUrl: "https://square.link/u/NEROpzVf",
  },
];

// One-off visit payment (not a plan/subscription). Used on the booking
// confirmation and the landing page "Book a one-off visit" CTA.
export const ONE_OFF_PAYMENT_URL = "https://square.link/u/KRYz6SPX";

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
