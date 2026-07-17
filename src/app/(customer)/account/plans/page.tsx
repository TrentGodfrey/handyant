"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Sparkles, MessageCircle, CreditCard } from "lucide-react";
import Card from "@/components/Card";
import { PLANS, VISIT_USES } from "@/lib/plans";
import { useDemoMode } from "@/lib/useDemoMode";

export default function AccountPlansPage() {
  const { isDemo, mounted } = useDemoMode();
  const [homes, setHomes] = useState<Array<{ id: string; address: string; city: string | null }>>([]);
  const [homeId, setHomeId] = useState("");
  const [loadingHomes, setLoadingHomes] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [processingReturn, setProcessingReturn] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    setProcessingReturn(new URLSearchParams(window.location.search).get("checkout") === "processing");
    if (isDemo) {
      setHomes([]);
      setHomeId("");
      setLoadingHomes(false);
      return;
    }
    fetch("/api/homes")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load your homes");
        return response.json();
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setHomes(rows);
        setHomeId(rows[0]?.id ?? "");
      })
      .catch(() => setCheckoutError("Could not load your homes. Refresh and try again."))
      .finally(() => setLoadingHomes(false));
  }, [isDemo, mounted]);

  async function startCheckout(plan: string) {
    setCheckoutPlan(plan);
    setCheckoutError("");
    try {
      const response = await fetch("/api/payments/square/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, homeId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.checkoutUrl) {
        throw new Error(body?.error ?? "Could not start secure checkout");
      }
      window.location.assign(body.checkoutUrl);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start secure checkout");
      setCheckoutPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="bg-white border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/account"
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
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
        {processingReturn && (
          <div className="rounded-xl border border-success/30 bg-success-light px-4 py-3">
            <p className="text-[13px] font-semibold text-text-primary">Payment received by Square</p>
            <p className="mt-0.5 text-[12px] text-text-secondary">We are confirming it now. Your membership and visit counter will update automatically.</p>
          </div>
        )}
        {checkoutError && (
          <div className="rounded-xl border border-error/20 bg-error-light px-4 py-3 text-[12px] font-medium text-error">
            {checkoutError}
          </div>
        )}
        {/* Secure payment banner */}
        <div className="rounded-xl border border-primary/20 bg-primary-50 px-4 py-3 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-primary">Secure online payment</p>
            <p className="text-[12px] text-text-secondary mt-0.5">
              Pay securely via Square. Your membership activates after payment confirmation.
            </p>
          </div>
        </div>

        {!loadingHomes && homes.length === 0 ? (
          <Link href="/account/home" className="flex min-h-12 items-center justify-center rounded-xl border border-primary bg-white px-4 text-[13px] font-semibold text-primary">
            Add your home before choosing a plan
          </Link>
        ) : homes.length > 1 ? (
          <label className="block text-[12px] font-semibold text-text-secondary">
            Membership home
            <select value={homeId} onChange={(event) => setHomeId(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-3 text-[14px] text-text-primary">
              {homes.map((home) => <option key={home.id} value={home.id}>{home.address}{home.city ? `, ${home.city}` : ""}</option>)}
            </select>
          </label>
        ) : null}

        {/* Plan cards */}
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular
                  ? "border-primary"
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
              {homeId ? (
                <button
                  type="button"
                  onClick={() => startCheckout(plan.id)}
                  disabled={checkoutPlan !== null || loadingHomes}
                  className={`flex min-h-11 items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${
                    plan.popular
                      ? "bg-primary text-white hover:bg-primary-dark shadow-[0_2px_10px_rgba(79,149,152,0.25)]"
                      : "bg-primary text-white hover:bg-primary-dark"
                  }`}
                >
                  <CreditCard size={14} />
                  {checkoutPlan === plan.id ? "Opening secure checkout…" : `Pay $${plan.annualPrice.toLocaleString()} & activate`}
                </button>
              ) : (
                <Link
                  href="/messages?topic=membership"
                  className="flex min-h-11 items-center justify-center gap-2 w-full rounded-xl border border-primary bg-white py-2.5 text-[13px] font-semibold text-primary hover:bg-primary-50 transition-colors"
                >
                  <MessageCircle size={14} />
                  Contact us to activate
                </Link>
              )}
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
