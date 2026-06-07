"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { toast } from "@/components/Toaster";
import {
  Wrench, Plus, X, Calendar, Check, Trash2, AlertTriangle, Settings2,
} from "lucide-react";
import type { ApplianceRecord } from "./types";

interface AppliancesProps {
  homeId: string;
  appliances: ApplianceRecord[];
  readOnly?: boolean;
  onChange: () => void | Promise<void>;
}

interface FormState {
  name: string;
  brand: string;
  modelNumber: string;
  installedAt: string; // YYYY-MM-DD
  intervalDays: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  brand: "",
  modelNumber: "",
  installedAt: "",
  intervalDays: "",
  notes: "",
};

function toDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(iso: string | null): string {
  const d = toDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function nextDueDate(a: ApplianceRecord): Date | null {
  if (!a.intervalDays || a.intervalDays <= 0) return null;
  const base = toDate(a.lastServicedAt) ?? toDate(a.installedAt);
  if (!base) return null;
  const due = new Date(base);
  due.setDate(due.getDate() + a.intervalDays);
  return due;
}

function dueStatus(a: ApplianceRecord): {
  due: Date | null;
  overdue: boolean;
  daysUntil: number | null;
} {
  const due = nextDueDate(a);
  if (!due) return { due: null, overdue: false, daysUntil: null };
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { due, overdue: daysUntil < 0, daysUntil };
}

export default function Appliances({ homeId, appliances, readOnly = false, onChange }: AppliancesProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [servicingId, setServicingId] = useState<string | null>(null);

  async function createAppliance() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        modelNumber: form.modelNumber.trim() || null,
        notes: form.notes.trim() || null,
        installedAt: form.installedAt || null,
        intervalDays: form.intervalDays ? Number(form.intervalDays) : null,
      };
      const res = await fetch(`/api/homes/${homeId}/appliances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Failed (${res.status})`);
      }
      setForm(EMPTY_FORM);
      setShowAdd(false);
      toast.success("Appliance added");
      await onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add appliance");
    } finally {
      setSaving(false);
    }
  }

  async function markServiced(applianceId: string) {
    setServicingId(applianceId);
    try {
      const res = await fetch(`/api/homes/${homeId}/appliances/${applianceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastServicedAt: "now" }),
      });
      if (!res.ok) throw new Error("Failed to mark serviced");
      toast.success("Marked as serviced");
      await onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setServicingId(null);
    }
  }

  async function removeAppliance(applianceId: string) {
    if (!confirm("Remove this appliance?")) return;
    try {
      const res = await fetch(`/api/homes/${homeId}/appliances/${applianceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Removed");
      await onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Appliances &amp; Maintenance
        </p>
        {!readOnly && !showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-[12px] font-semibold text-primary hover:bg-primary-100 transition-colors"
          >
            <Plus size={12} />
            Add
          </button>
        )}
      </div>

      {showAdd && !readOnly && (
        <Card padding="md" className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-text-primary">New appliance</p>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setForm(EMPTY_FORM);
              }}
              className="text-text-tertiary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="HVAC filter, Water heater, etc."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Brand
                </label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Carrier"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Model #
                </label>
                <input
                  type="text"
                  value={form.modelNumber}
                  onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
                  placeholder="—"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Installed
                </label>
                <input
                  type="date"
                  value={form.installedAt}
                  onChange={(e) => setForm({ ...form, installedAt: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Service every (days)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.intervalDays}
                  onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                  placeholder="90"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Filter size, location, etc."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={saving} onClick={createAppliance}>
                {saving ? "Saving…" : "Add appliance"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAdd(false);
                  setForm(EMPTY_FORM);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {appliances.length === 0 && !showAdd ? (
        <Card padding="md">
          <div className="flex flex-col items-center text-center py-2">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <Wrench size={18} className="text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-text-primary">
              Track your home&apos;s appliances
            </p>
            <p className="mt-1 text-[12px] text-text-tertiary leading-relaxed max-w-xs">
              Add your HVAC, water heater, fridge, etc. with a service interval and we&apos;ll
              remind you when maintenance is due.
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-dark transition-colors"
              >
                <Plus size={13} />
                Add appliance
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {appliances.map((a) => {
            const { due, overdue, daysUntil } = dueStatus(a);
            const subline = [a.brand, a.modelNumber].filter(Boolean).join(" · ");
            return (
              <Card key={a.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      overdue ? "bg-error-light" : "bg-primary-50"
                    }`}
                  >
                    <Settings2 size={16} className={overdue ? "text-error" : "text-primary"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-text-primary truncate">
                        {a.name}
                      </p>
                      {overdue && (
                        <span className="inline-flex shrink-0 h-1.5 w-1.5 rounded-full bg-error" />
                      )}
                    </div>
                    {subline && (
                      <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{subline}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                      {a.intervalDays != null && a.intervalDays > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} />
                          Every {a.intervalDays}d
                        </span>
                      )}
                      {due && (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            overdue ? "text-error" : "text-text-secondary"
                          }`}
                        >
                          {overdue ? (
                            <>
                              <AlertTriangle size={10} />
                              {Math.abs(daysUntil ?? 0)}d overdue
                            </>
                          ) : (
                            <>Next: {fmtDate(due.toISOString())}</>
                          )}
                        </span>
                      )}
                      {a.lastServicedAt && (
                        <span className="text-text-tertiary">
                          Serviced {fmtDate(a.lastServicedAt)}
                        </span>
                      )}
                    </div>
                    {a.notes && (
                      <p className="mt-1.5 text-[12px] text-text-tertiary leading-snug">{a.notes}</p>
                    )}
                    {!readOnly && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => markServiced(a.id)}
                          disabled={servicingId === a.id}
                          className="inline-flex items-center gap-1 rounded-full bg-success-light px-2.5 py-1 text-[11px] font-semibold text-success hover:bg-success/15 disabled:opacity-50 transition-colors"
                        >
                          <Check size={11} />
                          {servicingId === a.id ? "Saving…" : "Mark serviced"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAppliance(a.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-tertiary hover:text-error hover:bg-error-light transition-colors"
                        >
                          <Trash2 size={11} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
