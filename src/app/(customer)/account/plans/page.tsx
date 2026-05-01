"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, Check, Zap, Shield, Crown, ChevronDown, ChevronUp,
  Calendar, Clock, Star, Headphones, Package, Home, Repeat, Loader2,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { PLANS, type PlanId } from "@/lib/plans";

// Visual presentation per plan id (icons / colors). Pricing + features come
// from src/lib/plans.ts so /account/manage stays in sync.
const PLAN_VISUALS: Record<PlanId, {
  icon: typeof Shield;
  iconBg: string;
  iconColor: string;
  borderActive: string;
  headerBg: string;
}> = {
  free: {
    icon: Shield,
    iconBg: "bg-surface-secondary",
    iconColor: "text-text-secondary",
    borderActive: "border-border",
    headerBg: "bg-surface-secondary",
  },
  pro: {
    icon: Zap,
    iconBg: "bg-primary-50",
    iconColor: "text-primary",
    borderActive: "border-primary",
    headerBg: "bg-gradient-to-br from-primary-50 to-[#EAF4F4]",
  },
  premium: {
    icon: Crown,
    iconBg: "bg-[#FFF7ED]",
    iconColor: "text-accent-coral",
    borderActive: "border-border",
    headerBg: "bg-[#FFFBF7]",
  },
};

const includedFeatures = [
  {
    icon: Calendar,
    title: "Easy Online Booking",
    desc: "Book visits directly through the app with real-time availability.",
    plans: ["Free", "Pro", "Premium"],
  },
  {
    icon: Clock,
    title: "Priority Scheduling",
    desc: "Skip the queue and get earlier appointment slots.",
    plans: ["Pro", "Premium"],
  },
  {
    icon: Package,
    title: "Parts Tracking",
    desc: "We source and track parts for your repairs — no hardware store runs.",
    plans: ["Pro", "Premium"],
  },
  {
    icon: Home,
    title: "Full Home Profile",
    desc: "Appliance ages, WiFi, household info, visit photos — all in one place.",
    plans: ["Pro", "Premium"],
  },
  {
    icon: Star,
    title: "Dedicated Technician",
    desc: "The same trusted tech every visit — they know your home.",
    plans: ["Pro", "Premium"],
  },
  {
    icon: Zap,
    title: "Same-Day Availability",
    desc: "Urgent issue? We'll get someone there the same day.",
    plans: ["Premium"],
  },
  {
    icon: Headphones,
    title: "24/7 Emergency Line",
    desc: "Direct line for urgent home issues around the clock.",
    plans: ["Premium"],
  },
  {
    icon: Repeat,
    title: "Annual Home Inspection",
    desc: "Comprehensive yearly walkthrough to catch issues before they grow.",
    plans: ["Premium"],
  },
];

interface SubscriptionRecord {
  id: string;
  plan: string;
  status: string | null;
  startedAt: string | null;
  endsAt: string | null;
}

export default function PlansPage() {
  const { isDemo, mounted } = useDemoMode();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [showDetails, setShowDetails] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState<string | null>(null);

  // Real-mode state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  // The currently active plan id. Demo mode keeps the original "pro"
  // hardcode; real mode reads from the subscription (defaulting to "free").
  const currentPlanId: PlanId = isDemo
    ? "pro"
    : ((subscription?.status === "active" ? subscription.plan : "free") as PlanId);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/subscriptions");
        if (!res.ok) throw new Error("Failed to load subscription");
        const subs = (await res.json()) as SubscriptionRecord[];
        if (cancelled) return;
        const active = Array.isArray(subs)
          ? subs.find((s) => s.status === "active") ?? null
          : null;
        setSubscription(active);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load subscription");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isDemo, mounted]);

  async function handleSelect(planId: PlanId) {
    if (planId === currentPlanId) return;

    if (isDemo) {
      setConfirmingPlan(planId);
      setTimeout(() => setConfirmingPlan(null), 2000);
      return;
    }

    setBusyPlan(planId);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update plan");
      }
      const sub = (await res.json()) as SubscriptionRecord;
      setSubscription(sub);
      setConfirmingPlan(planId);
      setTimeout(() => setConfirmingPlan(null), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update plan");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Account
        </Link>
        <h1 className="text-[24px] font-bold text-text-primary">Subscription Plans</h1>
        <p className="text-[13px] text-text-secondary mt-1">Choose the right plan for your home</p>

        {/* Billing toggle */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-1 rounded-xl bg-surface-secondary p-1 border border-border">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                billing === "annual"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary"
              }`}
            >
              Annual
              <span className="rounded-full bg-success text-white text-[9px] font-bold px-1.5 py-0.5">
                -17%
              </span>
            </button>
          </div>
        </div>

        {billing === "annual" && (
          <p className="text-center text-[12px] text-success font-medium mt-2">
            Save up to $300/year with annual billing
          </p>
        )}
      </div>

      <div className="px-5 py-5 space-y-4">
        {!mounted || loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-[12px] text-error">
                {error}
              </div>
            )}

            {PLANS.map((plan) => {
              const visuals = PLAN_VISUALS[plan.id];
              const Icon = visuals.icon;
              const isCurrent = plan.id === currentPlanId;
              const price = billing === "annual" ? plan.annualPrice : plan.monthlyPrice;
              const justConfirmed = confirmingPlan === plan.id;
              const isBusy = busyPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                    isCurrent
                      ? "border-primary shadow-[0_0_0_3px_rgba(79,149,152,0.1)]"
                      : "border-border"
                  }`}
                >
                  {/* Plan header */}
                  <div className={`px-5 py-4 ${visuals.headerBg}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${visuals.iconBg}`}>
                          <Icon size={20} className={visuals.iconColor} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-[18px] font-bold text-text-primary">{plan.label}</h2>
                            {isCurrent && (
                              <span className="rounded-full bg-primary text-white text-[10px] font-bold px-2.5 py-0.5">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-text-secondary">{plan.tagline}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-end gap-0.5">
                          <span className="text-[26px] font-bold text-text-primary leading-none">${price}</span>
                          <span className="text-[12px] text-text-secondary mb-1">/mo</span>
                        </div>
                        {billing === "annual" && plan.monthlyPrice > 0 && (
                          <p className="text-[10px] text-text-tertiary line-through">${plan.monthlyPrice}/mo</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                        isCurrent ? "bg-primary/10 text-primary" : "bg-surface text-text-secondary"
                      }`}>
                        <Calendar size={12} />
                        {plan.visitLabel}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-surface px-5 py-4">
                    <ul className="space-y-2.5 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5">
                          <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-success/10">
                            <Check size={10} className="text-success" strokeWidth={3} />
                          </div>
                          <span className="text-[13px] text-text-secondary">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary-50 py-3 text-[13px] font-semibold text-primary">
                        <Check size={15} strokeWidth={2.5} />
                        Your current plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelect(plan.id)}
                        disabled={isBusy}
                        className={`w-full rounded-xl py-3 text-[14px] font-semibold transition-all active:scale-[0.98] ${
                          justConfirmed
                            ? "bg-success text-white"
                            : "bg-primary text-white hover:bg-primary-dark shadow-sm"
                        } disabled:opacity-60`}
                      >
                        {isBusy ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin" />
                            Updating…
                          </span>
                        ) : justConfirmed ? (
                          "Plan selected!"
                        ) : (
                          `Select ${plan.label}`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* What's included expandable */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-border bg-surface text-left active:bg-surface-secondary transition-colors"
        >
          <div>
            <p className="text-[15px] font-semibold text-text-primary">What's included in each plan</p>
            <p className="text-[12px] text-text-secondary mt-0.5">Full feature breakdown by tier</p>
          </div>
          {showDetails ? (
            <ChevronUp size={18} className="text-text-secondary shrink-0" />
          ) : (
            <ChevronDown size={18} className="text-text-secondary shrink-0" />
          )}
        </button>

        {showDetails && (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-4 border-b border-border">
              <div className="col-span-1 px-4 py-3" />
              {["Free", "Pro", "Premium"].map((name) => (
                <div
                  key={name}
                  className={`px-2 py-3 text-center text-[11px] font-bold border-l border-border ${
                    name === "Pro" ? "bg-primary-50 text-primary" : "text-text-secondary"
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
            {includedFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={`grid grid-cols-4 ${i < includedFeatures.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="col-span-1 px-4 py-3.5 flex items-start gap-2">
                    <Icon size={13} className="text-text-tertiary shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium text-text-secondary leading-snug">{feat.title}</span>
                  </div>
                  {["Free", "Pro", "Premium"].map((name) => (
                    <div
                      key={name}
                      className={`flex items-center justify-center border-l border-border ${
                        name === "Pro" ? "bg-primary-50/50" : ""
                      }`}
                    >
                      {feat.plans.includes(name) ? (
                        <Check size={14} className={name === "Pro" ? "text-primary" : "text-success"} strokeWidth={2.5} />
                      ) : (
                        <span className="text-[16px] text-border">—</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-text-tertiary px-4 leading-relaxed">
          All plans include a 30-day money-back guarantee. Cancel anytime with no fees.
        </p>
      </div>
    </div>
  );
}
