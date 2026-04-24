"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import StatusBadge from "@/components/StatusBadge";
import {
  ChevronLeft, Download, ChevronRight, Wrench, DollarSign,
  FileText, CheckCircle, Loader2,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

interface Receipt {
  id: string;
  date: string;
  tasks: string;
  hours: string;
  labor: number;
  materials: number;
  total: number;
  status: "completed";
  invoiceNum: string;
  paidVia: string;
}

interface RealInvoice {
  id: string;
  number: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
  booking: {
    scheduledDate: string;
    description: string | null;
    durationMinutes: number | null;
  };
}

const DEMO_RECEIPTS: Receipt[] = [
  {
    id: "r1", date: "Mar 15, 2026", invoiceNum: "INV-2026-031",
    tasks: "Kitchen faucet repair + garbage disposal", hours: "2.5h",
    labor: 200, materials: 85, total: 285, status: "completed", paidVia: "Visa ···4242",
  },
  {
    id: "r2", date: "Feb 28, 2026", invoiceNum: "INV-2026-028",
    tasks: "Smart thermostat installation", hours: "1.5h",
    labor: 120, materials: 0, total: 120, status: "completed", paidVia: "Visa ···4242",
  },
  {
    id: "r3", date: "Feb 10, 2026", invoiceNum: "INV-2026-019",
    tasks: "Drywall patch + paint touch-up (2 rooms)", hours: "3h",
    labor: 240, materials: 45, total: 285, status: "completed", paidVia: "Subscription credit",
  },
  {
    id: "r4", date: "Jan 22, 2026", invoiceNum: "INV-2026-009",
    tasks: "Fence gate rehang + weather stripping", hours: "2h",
    labor: 160, materials: 30, total: 190, status: "completed", paidVia: "Visa ···4242",
  },
  {
    id: "r5", date: "Jan 5, 2026", invoiceNum: "INV-2026-002",
    tasks: "Ceiling fan installation (2)", hours: "3h",
    labor: 240, materials: 0, total: 240, status: "completed", paidVia: "Subscription credit",
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatHours(durationMinutes: number | null): string {
  const mins = durationMinutes ?? 120;
  const hours = mins / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export default function ReceiptsPage() {
  useSession();
  const { isDemo, mounted } = useDemoMode();

  const [demoReceipts, setDemoReceipts] = useState<Receipt[]>([]);
  const [invoices, setInvoices] = useState<RealInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setDemoReceipts(DEMO_RECEIPTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch("/api/invoices")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load invoices");
        return r.json();
      })
      .then((data) => {
        setInvoices(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load invoices");
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, [isDemo, mounted]);

  async function handlePay(invoiceId: string) {
    setPaying(invoiceId);
    setPayError((prev) => {
      const next = { ...prev };
      delete next[invoiceId];
      return next;
    });
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Payment failed");
      }
      const updated = await res.json();
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: updated.status ?? "paid", paidAt: updated.paidAt ?? new Date().toISOString() }
            : inv
        )
      );
    } catch (e: unknown) {
      setPayError((prev) => ({
        ...prev,
        [invoiceId]: e instanceof Error ? e.message : "Payment failed",
      }));
    } finally {
      setPaying(null);
    }
  }

  function handleDownloadPdf() {
    if (typeof window !== "undefined") window.print();
  }

  // Build the unified list of receipt-shaped items for rendering
  const items: Receipt[] = (() => {
    if (!mounted) return [];
    if (isDemo) return demoReceipts;
    return invoices.map((inv) => {
      const subtotal = Number(inv.subtotal) || 0;
      const tax = Number(inv.tax) || 0;
      const total = Number(inv.total) || subtotal + tax;
      const dateIso = inv.sentAt ?? inv.booking?.scheduledDate ?? inv.createdAt;
      const isPaid = !!inv.paidAt || inv.status === "paid";
      return {
        id: inv.id,
        date: formatDate(dateIso),
        tasks: inv.booking?.description || "Service visit",
        hours: formatHours(inv.booking?.durationMinutes ?? null),
        labor: subtotal,
        materials: 0,
        total,
        status: "completed" as const,
        invoiceNum: inv.number,
        paidVia: isPaid ? "Card on file" : "Unpaid",
      };
    });
  })();

  const total = items.reduce((sum, r) => sum + r.total, 0);
  const thisYear = new Date().getFullYear();
  const thisYearTotal = items
    .filter((r) => r.date.includes(String(thisYear)))
    .reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-white border-b border-border px-5 pt-14 pb-5">
        <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
          Account
        </Link>
        <h1 className="text-[24px] font-bold text-text-primary">Receipts &amp; Invoices</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Your complete service history.</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Summary card */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Visits", value: items.length.toString(), icon: Wrench, color: "text-primary", bg: "bg-primary-50" },
            { label: "Total Spent", value: `$${total.toLocaleString()}`, icon: DollarSign, color: "text-success", bg: "bg-success-light" },
            { label: "This Year", value: `$${thisYearTotal.toLocaleString()}`, icon: FileText, color: "text-accent-amber", bg: "bg-warning-light" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-surface border border-border p-3.5 text-center">
              <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className="text-[16px] font-bold text-text-primary leading-none">{stat.value}</p>
              <p className="text-[10px] text-text-tertiary mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Receipts */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">History</p>

          {!mounted || loading ? (
            <div className="rounded-xl border border-border bg-white px-6 py-10 text-center">
              <Loader2 size={22} className="animate-spin text-text-tertiary mx-auto" />
              <p className="mt-3 text-[13px] text-text-secondary">Loading receipts…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-error/30 bg-error/5 px-6 py-6 text-center">
              <p className="text-[13px] font-semibold text-error">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border bg-white px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
                <FileText size={22} className="text-text-tertiary" />
              </div>
              <p className="text-[15px] font-semibold text-text-primary">No receipts yet</p>
              <p className="mt-1 text-[13px] text-text-secondary">Completed jobs will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((r) => {
                const invoice = !isDemo ? invoices.find((inv) => inv.id === r.id) : null;
                const isPaid = invoice ? !!invoice.paidAt || invoice.status === "paid" : true;
                return (
                  <div key={r.id} className="rounded-xl border border-border bg-white overflow-hidden">
                    {/* Row */}
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isPaid ? "bg-success-light" : "bg-warning-light"}`}>
                        <CheckCircle size={18} className={isPaid ? "text-success" : "text-accent-amber"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate">{r.tasks}</p>
                        <p className="text-[11px] text-text-tertiary mt-0.5">{r.date} · {r.hours}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[15px] font-bold text-text-primary">${r.total}</span>
                        <ChevronRight
                          size={14}
                          className={`text-text-tertiary transition-transform ${expanded === r.id ? "rotate-90" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expanded === r.id && (
                      <div className="border-t border-border bg-surface-secondary px-4 py-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{r.invoiceNum}</span>
                          {isPaid ? (
                            <StatusBadge status={r.status} />
                          ) : (
                            <span className="rounded-full bg-warning-light px-2 py-0.5 text-[10px] font-semibold text-accent-amber uppercase tracking-wider">
                              {invoice?.status ?? "sent"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5 mb-3">
                          <div className="flex justify-between text-[13px]">
                            <span className="text-text-secondary">Labor ({r.hours})</span>
                            <span className="font-medium text-text-primary">${r.labor}</span>
                          </div>
                          {r.materials > 0 && (
                            <div className="flex justify-between text-[13px]">
                              <span className="text-text-secondary">Materials</span>
                              <span className="font-medium text-text-primary">${r.materials}</span>
                            </div>
                          )}
                          <div className="h-px bg-border" />
                          <div className="flex justify-between">
                            <span className="text-[13px] font-semibold text-text-primary">Total</span>
                            <span className="text-[14px] font-bold text-primary">${r.total}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-[11px] text-text-tertiary">
                            {isPaid ? `Paid via ${r.paidVia}` : "Awaiting payment"}
                          </span>
                          <div className="flex items-center gap-3">
                            {!isPaid && !isDemo && (
                              <button
                                onClick={() => handlePay(r.id)}
                                disabled={paying === r.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                              >
                                {paying === r.id ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    Paying…
                                  </>
                                ) : (
                                  <>
                                    <DollarSign size={12} />
                                    Pay ${r.total}
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={handleDownloadPdf}
                              className="flex items-center gap-1 text-[12px] font-semibold text-primary"
                            >
                              <Download size={13} />
                              Download PDF
                            </button>
                          </div>
                        </div>
                        {payError[r.id] && (
                          <p className="mt-2 text-[12px] text-error">{payError[r.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
