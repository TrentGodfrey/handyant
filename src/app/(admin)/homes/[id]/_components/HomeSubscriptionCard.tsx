"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Sparkles } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/plans";
import { getVisitUsage } from "@/lib/subscription-usage";
import type { ApiHome } from "./types";

interface Props {
  homeId: string;
  subscription: ApiHome["activeSubscription"];
  onSaved: () => Promise<void>;
}

export default function HomeSubscriptionCard({ homeId, subscription, onSaved }: Props) {
  const [editing, setEditing] = useState(!subscription);
  const [plan, setPlan] = useState<PlanId>(subscription?.plan ?? "essential");
  const [visitsUsed, setVisitsUsed] = useState(subscription?.visitsUsed ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!subscription) return;
    setPlan(subscription.plan);
    setVisitsUsed(subscription.visitsUsed);
  }, [subscription]);

  const usage = getVisitUsage(subscription?.plan ?? plan, subscription?.visitsUsed ?? visitsUsed);
  const selectedPlan = PLANS.find((item) => item.id === plan) ?? PLANS[0];

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/homes/${homeId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, visitsUsed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not save membership");
      }
      await onSaved();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save membership");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-primary-50/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size={17} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-text-primary">Membership visits</h2>
            <p className="text-[11px] text-text-secondary">Annual plan for this home</p>
          </div>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[12px] font-semibold text-text-secondary active:bg-surface-secondary">
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-text-secondary">Plan</span>
              <select
                value={plan}
                onChange={(event) => {
                  const next = event.target.value as PlanId;
                  setPlan(next);
                  const max = PLANS.find((item) => item.id === next)?.visits ?? 0;
                  setVisitsUsed((current) => Math.min(current, max));
                }}
                className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[14px] text-text-primary outline-none focus:border-primary"
              >
                {PLANS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label} · {item.visits} visits</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-text-secondary">Visits already used</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={selectedPlan.visits}
                value={visitsUsed}
                onChange={(event) => setVisitsUsed(Number(event.target.value))}
                className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[16px] text-text-primary outline-none focus:border-primary"
              />
            </label>
          </div>
          {error && <p className="text-[12px] font-medium text-error">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {subscription && (
              <button type="button" onClick={() => setEditing(false)} className="min-h-12 rounded-xl border border-border px-4 text-[13px] font-semibold text-text-secondary">
                Cancel
              </button>
            )}
            <button type="button" disabled={saving} onClick={save} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-bold text-white disabled:opacity-50">
              <Check size={16} /> {saving ? "Saving…" : subscription ? "Save membership" : "Assign membership"}
            </button>
          </div>
        </div>
      ) : subscription ? (
        <div className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">{PLANS.find((item) => item.id === subscription.plan)?.label} plan</p>
              <p className="mt-1 text-[26px] font-black tracking-tight text-text-primary">{usage.used}/{usage.allowance} <span className="text-[13px] font-semibold text-text-secondary">visits used</span></p>
            </div>
            <p className="rounded-full bg-success-light px-3 py-1.5 text-[12px] font-bold text-success">{usage.remaining} remaining</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-secondary" aria-label={`${usage.percent}% of visits used`}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usage.percent}%` }} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
