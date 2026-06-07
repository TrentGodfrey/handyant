"use client";

import Link from "next/link";
import { ChevronLeft, CheckCircle2, Sparkles, MessageCircle, Info } from "lucide-react";
import Card from "@/components/Card";
import { PLANS, VISIT_USES } from "@/lib/plans";

export default function AccountPlansPage() {
  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="bg-white border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Account
        </Link>
        <h1 className="text-[24px] font-bold text-text-primary">Plans</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Annual memberships built around scheduled visits. Each visit is 1 hour 45 minutes.
        </p>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Payments coming soon banner */}
        <div className="rounded-xl border border-primary/20 bg-primary-50 px-4 py-3 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Info size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-primary">Payments coming soon</p>
            <p className="text-[12px] text-text-secondary mt-0.5">
              To activate a membership, message Anthony directly and he&apos;ll set you up.
            </p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular
                  ? "border-primary bg-gradient-to-br from-primary-50 to-white shadow-[0_4px_20px_rgba(79,149,152,0.12)]"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1">
                  <Sparkles size={10} className="text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-3 pr-24">
                <p className="text-[18px] font-black text-text-primary">{plan.label}</p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-[28px] font-black text-text-primary">
                    ${plan.annualPrice.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-text-tertiary">/yr</span>
                </div>
                <p className="text-[12px] font-semibold text-text-secondary">
                  {plan.tagline}
                </p>
              </div>
              <div className="space-y-1.5 mb-4">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-primary shrink-0" />
                    <span className="text-[13px] text-text-secondary">{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/messages?topic=membership"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary bg-white py-2.5 text-[13px] font-semibold text-primary hover:bg-primary-50 transition-colors"
              >
                <MessageCircle size={14} />
                Contact us to activate
              </Link>
            </Card>
          ))}
        </div>

        {/* What you can use visits for */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
            What you can use visits for
          </p>
          <Card>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {VISIT_USES.map((use) => (
                <div key={use} className="flex items-center gap-2 text-[13px] text-text-primary">
                  <CheckCircle2 size={14} className="text-primary shrink-0" />
                  <span>{use}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Link
          href="/messages?topic=membership"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary py-3.5 text-center text-[14px] font-bold text-white shadow-[0_2px_10px_rgba(79,149,152,0.25)] hover:bg-primary-dark transition-colors"
        >
          <MessageCircle size={16} />
          Message Anthony to activate
        </Link>
      </div>
    </div>
  );
}
