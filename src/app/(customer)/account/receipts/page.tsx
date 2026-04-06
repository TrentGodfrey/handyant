"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { ChevronLeft, Download, ChevronRight, Wrench, DollarSign, FileText, CheckCircle } from "lucide-react";

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

export default function ReceiptsPage() {
  const { data: session } = useSession();
  const isDemo = typeof document !== "undefined" && document.cookie.includes("demo_mode=true");

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setReceipts(DEMO_RECEIPTS);
      return;
    }
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((bookings) => {
        if (!Array.isArray(bookings)) return;
        const completed: Receipt[] = bookings
          .filter((b: Record<string, unknown>) => b.status === "completed")
          .map((b: Record<string, unknown>, i: number) => {
            const durationMins = (b.durationMinutes as number) ?? 120;
            const hours = durationMins / 60;
            const hoursLabel = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
            const labor = Math.round(hours * 80);
            return {
              id: b.id as string,
              date: new Date(b.scheduledDate as string).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              }),
              tasks: (b.description as string) || "Service visit",
              hours: hoursLabel,
              labor,
              materials: 0,
              total: labor,
              status: "completed" as const,
              invoiceNum: `INV-${new Date(b.scheduledDate as string).getFullYear()}-${String(i + 1).padStart(3, "0")}`,
              paidVia: "Card on file",
            };
          });
        setReceipts(completed);
      })
      .catch(() => setReceipts([]));
  }, [isDemo, session]);

  const total = receipts.reduce((sum, r) => sum + r.total, 0);
  const thisYear = new Date().getFullYear();
  const thisYearTotal = receipts
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
            { label: "Total Visits", value: receipts.length.toString(), icon: Wrench, color: "text-primary", bg: "bg-primary-50" },
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

          {receipts.length === 0 ? (
            <div className="rounded-xl border border-border bg-white px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
                <FileText size={22} className="text-text-tertiary" />
              </div>
              <p className="text-[15px] font-semibold text-text-primary">No receipts yet</p>
              <p className="mt-1 text-[13px] text-text-secondary">Completed jobs will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-white overflow-hidden">
                  {/* Row */}
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-light">
                      <CheckCircle size={18} className="text-success" />
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
                        <StatusBadge status={r.status} />
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
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-text-tertiary">Paid via {r.paidVia}</span>
                        <button className="flex items-center gap-1 text-[12px] font-semibold text-primary">
                          <Download size={13} />
                          Download PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
