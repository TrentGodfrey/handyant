"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  ChevronLeft, Check, Zap, Shield, Crown, ChevronDown, ChevronUp,
  Calendar, Clock, Star, Headphones, Package, Home, Repeat,
} from "lucide-react";

const plans = [
  {
    id: "basic",
    name: "Basic",
    icon: Shield,
    iconBg: "bg-surface-secondary",
    iconColor: "text-text-secondary",
    monthlyPrice: 49,
    annualPrice: 41,
    visits: 2,
    visitLabel: "2 visits / month",
    tagline: "Great for occasional maintenance",
    color: "border-border",
    headerBg: "bg-surface-secondary",
    badge: null,
    features: [
      "2 technician visits per month",
      "Standard task completion",
      "Email support",
      "Basic home profile",
      "Job history & receipts",
      "Online booking",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Zap,
    iconBg: "bg-primary-50",
    iconColor: "text-primary",
    monthlyPrice: 89,
    annualPrice: 74,
    visits: 4,
    visitLabel: "4 visits / month",
    tagline: "Most popular for homeowners",
    color: "border-primary",
    headerBg: "bg-gradient-to-br from-primary-50 to-[#EFF6FF]",
    badge: "Current Plan",
    features: [
      "4 technician visits per month",
      "Priority scheduling",
      "Parts tracking & ordering",
      "SMS & email reminders",
      "Full home profile",
      "Dedicated tech (Anthony)",
      "Job history & receipts",
      "Phone support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    icon: Crown,
    iconBg: "bg-[#FFF7ED]",
    iconColor: "text-accent-coral",
    monthlyPrice: 149,
    annualPrice: 124,
    visits: -1,
    visitLabel: "Unlimited visits",
    tagline: "For comprehensive home care",
    color: "border-border",
    headerBg: "bg-[#FFFBF7]",
    badge: null,
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

const includedFeatures = [
  {
    icon: Calendar,
    title: "Easy Online Booking",
    desc: "Book visits directly through the app with real-time availability.",
    plans: ["Basic", "Pro", "Premium"],
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

export default function PlansPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [showDetails, setShowDetails] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState<string | null>(null);

  function handleSelect(planId: string) {
    if (planId === "pro") return; // already current
    setConfirmingPlan(planId);
    setTimeout(() => setConfirmingPlan(null), 2000);
    setSelectedPlan(planId);
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
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === "pro";
          const isSelected = selectedPlan === plan.id;
          const price = billing === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const justConfirmed = confirmingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                isCurrent
                  ? "border-primary shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                  : isSelected && !isCurrent
                  ? "border-primary/50"
                  : "border-border"
              }`}
            >
              {/* Plan header */}
              <div className={`px-5 py-4 ${plan.headerBg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.iconBg}`}>
                      <Icon size={20} className={plan.iconColor} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[18px] font-bold text-text-primary">{plan.name}</h2>
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
                    {billing === "annual" && (
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
                    className={`w-full rounded-xl py-3 text-[14px] font-semibold transition-all active:scale-[0.98] ${
                      justConfirmed
                        ? "bg-success text-white"
                        : "bg-primary text-white hover:bg-primary-dark shadow-sm"
                    }`}
                  >
                    {justConfirmed ? "Plan selected!" : `Select ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}

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
              {["Basic", "Pro", "Premium"].map((name) => (
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
                  {["Basic", "Pro", "Premium"].map((name) => (
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
