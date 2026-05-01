"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  ChevronLeft,
  Send,
  Download,
  MessageSquare,
  Mail,
  ToggleLeft,
  ToggleRight,
  Check,
  Copy,
  DollarSign,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { demoCustomerBy } from "@/lib/demoData";
import Spinner from "@/components/Spinner";

const TAX_RATE = 8.25;

type PaymentMethod = {
  key: "venmo" | "zelle" | "cashapp" | "paypal" | "card";
  name: string;
  handle: string;
  icon: typeof Smartphone;
  color: string;
};

const DEMO_PAYMENT_METHODS: PaymentMethod[] = [
  { key: "venmo", name: "Venmo", handle: "@MCQHomeCo", icon: Smartphone, color: "text-[#3D95CE] bg-[#E8F4FC]" },
  { key: "zelle", name: "Zelle", handle: "(214) 555-0199", icon: DollarSign, color: "text-[#6D1ED4] bg-[#F3EAFD]" },
  { key: "card",  name: "Card",  handle: "Via secure link", icon: CreditCard, color: "text-success bg-success-light" },
];

interface BusinessPayment {
  venmoHandle?: string | null;
  zelleHandle?: string | null;
  cashappHandle?: string | null;
  paypalEmail?: string | null;
}

function buildLivePaymentMethods(biz: BusinessPayment | null): PaymentMethod[] {
  if (!biz) return [];
  const out: PaymentMethod[] = [];
  if (biz.venmoHandle && biz.venmoHandle.trim()) {
    const v = biz.venmoHandle.trim();
    out.push({
      key: "venmo",
      name: "Venmo",
      handle: v.startsWith("@") ? v : `@${v}`,
      icon: Smartphone,
      color: "text-[#3D95CE] bg-[#E8F4FC]",
    });
  }
  if (biz.zelleHandle && biz.zelleHandle.trim()) {
    out.push({
      key: "zelle",
      name: "Zelle",
      handle: biz.zelleHandle.trim(),
      icon: DollarSign,
      color: "text-[#6D1ED4] bg-[#F3EAFD]",
    });
  }
  if (biz.cashappHandle && biz.cashappHandle.trim()) {
    const c = biz.cashappHandle.trim();
    out.push({
      key: "cashapp",
      name: "Cash App",
      handle: c.startsWith("$") ? c : `$${c}`,
      icon: DollarSign,
      color: "text-success bg-success-light",
    });
  }
  if (biz.paypalEmail && biz.paypalEmail.trim()) {
    out.push({
      key: "paypal",
      name: "PayPal",
      handle: biz.paypalEmail.trim(),
      icon: CreditCard,
      color: "text-[#0070BA] bg-[#E8F4FC]",
    });
  }
  return out;
}

// ── Demo data ────────────────────────────────────────────────────────────────

const DEMO_INVOICE = {
  number: "INV-2026-031",
  date: "Mar 29, 2026",
  dueDate: "Apr 5, 2026",
  client: (() => {
    const c = demoCustomerBy("1")!;
    return {
      name: c.name,
      address: c.address,
      city: `${c.city}, ${c.state} ${c.zip}`,
      phone: c.phone ?? "",
      email: c.email ?? "",
    };
  })(),
  lineItems: [
    { description: "Labor — Kitchen faucet replacement + garage door sensor", detail: "3 hrs @ $80/hr", amount: 240 },
    { description: "Materials — Moen 7594ESRS Arbor Faucet", detail: "Brushed nickel", amount: 75 },
    { description: "Materials — Garage door sensor mounting bracket", detail: "Universal fit", amount: 25 },
  ],
  subtotal: 340,
  taxRate: TAX_RATE,
  tax: 28.05,
  total: 368.05,
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiBooking {
  id: string;
  durationMinutes: number | null;
  estimatedCost: string | number | null;
  finalCost: string | number | null;
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
  home: { address: string; city: string | null; state: string | null; zip: string | null } | null;
  tasks: { id: string; label: string }[];
  parts: { id: string; item: string; qty: number | null; cost: string | number | null }[];
  invoices: ApiInvoice[];
}

interface ApiInvoice {
  id: string;
  number: string;
  subtotal: string | number;
  tax: string | number | null;
  total: string | number;
  status: string | null;
  sentAt: string | null;
  createdAt: string | null;
}

interface InvoiceView {
  id?: string;
  number: string;
  date: string;
  dueDate: string;
  client: { name: string; address: string; city: string; phone: string; email: string };
  lineItems: { description: string; detail: string; amount: number }[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  exists: boolean;
  sentAt?: string | null;
}

function buildView(b: ApiBooking, invoice?: ApiInvoice): InvoiceView {
  const durationMins = b.durationMinutes ?? 120;
  const hours = durationMins / 60;
  const laborRate = 80;
  const labor = Math.round(hours * laborRate);
  const partsItems = (b.parts ?? []).map((p) => {
    const cost = p.cost == null ? 0 : Number(p.cost);
    return {
      description: `Materials — ${p.item}`,
      detail: `Qty ${p.qty ?? 1}`,
      amount: cost,
    };
  });
  const labels = b.tasks.map((t) => t.label).join(" + ");
  const lineItems = [
    {
      description: `Labor — ${labels || "Service visit"}`,
      detail: `${hours} hrs @ $${laborRate}/hr`,
      amount: labor,
    },
    ...partsItems,
  ];

  const computedSubtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const subtotal = invoice ? Number(invoice.subtotal) : computedSubtotal;
  const tax = invoice ? Number(invoice.tax ?? 0) : Number((subtotal * (TAX_RATE / 100)).toFixed(2));
  const total = invoice ? Number(invoice.total) : Number((subtotal + tax).toFixed(2));

  const sourceDate = invoice?.sentAt ?? invoice?.createdAt ?? new Date().toISOString();
  const dateObj = new Date(sourceDate);
  const dueObj = new Date(dateObj.getTime() + 7 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const home = b.home;
  const cityLine = home
    ? `${home.city ?? ""}${home.state ? `, ${home.state}` : ""}${home.zip ? ` ${home.zip}` : ""}`.trim()
    : "";

  return {
    id: invoice?.id,
    number: invoice?.number ?? "DRAFT",
    date: fmt(dateObj),
    dueDate: fmt(dueObj),
    client: {
      name: b.customer?.name ?? "Customer",
      address: home?.address ?? "—",
      city: cityLine || "—",
      phone: b.customer?.phone ?? "",
      email: b.customer?.email ?? "",
    },
    lineItems,
    subtotal,
    taxRate: TAX_RATE,
    tax,
    total,
    exists: !!invoice,
    sentAt: invoice?.sentAt ?? null,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const { isDemo, mounted } = useDemoMode();

  const [view, setView] = useState<InvoiceView | null>(null);
  const [business, setBusiness] = useState<BusinessPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [includePaymentLink, setIncludePaymentLink] = useState(true);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Hi! It was a pleasure working on your home today. Here's your invoice for today's service. Please let me know if you have any questions!"
  );
  const [sent, setSent] = useState<"text" | "email" | null>(null);
  const [copied, setCopied] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);

  function loadInvoice() {
    if (isDemo) {
      setView({ ...DEMO_INVOICE, exists: true });
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/bookings/${jobId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/admin/business`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([booking, biz]: [ApiBooking | null, BusinessPayment | null]) => {
        if (biz) setBusiness(biz);
        if (!booking) {
          setView(null);
          return;
        }
        const invoice = booking.invoices?.[0];
        setView(buildView(booking, invoice));
      })
      .catch(() => setView(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!mounted) return;
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, isDemo, mounted]);

  async function handleSendEmail() {
    if (!view) return;
    setSendError(null);
    if (isDemo) {
      setSent("email");
      setTimeout(() => setSent(null), 3500);
      return;
    }
    if (!view.exists || !view.id) {
      setSendError("Generate the invoice before sending.");
      return;
    }
    if (!view.client.email) {
      setSendError("Customer has no email address on file.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${view.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includePaymentLink }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok === false) {
        throw new Error(body?.error ?? `Send failed (${res.status})`);
      }
      setView((prev) =>
        prev ? { ...prev, sentAt: body?.sentAt ?? new Date().toISOString() } : prev
      );
      setSent("email");
      setTimeout(() => setSent(null), 3500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send invoice.");
    } finally {
      setSending(false);
    }
  }

  async function handleCopyPaymentHandle(key: string, value: string) {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      }
      setCopiedHandle(key);
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch {
      setSendError("Could not copy to clipboard.");
    }
  }

  async function handleCopySmsLink() {
    if (!view) return;
    setSendError(null);
    const phone = (view.client.phone ?? "").replace(/[^0-9+]/g, "");
    const linkBase =
      typeof window !== "undefined" ? window.location.origin : "https://handyant.jordangodfrey.com";
    const link = `${linkBase}/account/receipts`;
    const body = `Hi ${view.client.name.split(" ")[0] ?? ""}, here's your MCQ Home Co. invoice ${view.number} for $${view.total.toFixed(2)}: ${link}`;
    const smsHref = phone
      ? `sms:${phone}?&body=${encodeURIComponent(body)}`
      : `sms:?&body=${encodeURIComponent(body)}`;
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(smsHref);
      }
      setSmsCopied(true);
      setTimeout(() => setSmsCopied(false), 2500);
    } catch {
      setSendError("Could not copy SMS link.");
    }
  }

  async function handleCopy() {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSendError("Could not copy to clipboard.");
    }
  }

  function handleDownloadPdf() {
    if (typeof window !== "undefined") window.print();
  }

  function generateInvoice() {
    if (!view || isDemo) return;
    setGenerating(true);
    fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: jobId,
        subtotal: view.subtotal,
        tax: view.tax,
        total: view.total,
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then(() => loadInvoice())
      .catch(() => {})
      .finally(() => setGenerating(false));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center">
        <p className="text-[16px] font-bold text-text-primary">Booking not found</p>
        <Link href={`/jobs/${jobId}`} className="mt-4 text-[13px] font-semibold text-primary">Back to Job</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 invoice-page">
      <style>{`
        @media print {
          body { background: #fff !important; }
          .invoice-page > *:not(.invoice-print-area) { display: none !important; }
          .invoice-print-area { display: block !important; padding: 0 !important; }
          .invoice-print-area > *:not(.invoice-printable) { display: none !important; }
          .invoice-printable { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4">
        <Link
          href={`/jobs/${jobId}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Job #{jobId.slice(0, 8)}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">{view.exists ? "Send Invoice" : "Generate Invoice"}</h1>
            <p className="mt-0.5 text-[13px] text-text-secondary">{view.client.name} · {view.number}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
            <Send size={20} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 invoice-print-area">

        {/* ── Generate prompt if no invoice yet ── */}
        {!view.exists && !isDemo && (
          <Card padding="md" className="border border-warning/30 bg-warning-light">
            <p className="text-[14px] font-semibold text-text-primary">No invoice yet</p>
            <p className="mt-1 text-[12px] text-text-secondary">
              An invoice hasn&apos;t been generated for this job. Review the totals below and tap Generate to create one.
            </p>
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<Send size={15} />}
              onClick={generateInvoice}
              disabled={generating}
            >
              {generating ? "Generating…" : `Generate Invoice · $${view.total.toFixed(2)}`}
            </Button>
          </Card>
        )}

        {/* ── Invoice Preview Card ── */}
        <Card padding="lg" className="invoice-printable">
          {/* Invoice header */}
          <div className="flex items-start justify-between mb-5 pb-5 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-[9px] font-black tracking-[-0.06em] text-white">MCQ</span>
                </div>
                <span className="text-[18px] font-bold text-text-primary">MCQ Home Co.</span>
              </div>
              <p className="text-[11px] text-text-tertiary">Meticulous Craftsman Quality</p>
              <p className="text-[11px] text-text-tertiary">DFW Metro Area, TX</p>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-bold text-primary">{view.number}</p>
              <p className="text-[11px] text-text-tertiary mt-1">Date: {view.date}</p>
              <p className="text-[11px] text-text-tertiary">Due: {view.dueDate}</p>
              <span className="mt-2 inline-flex items-center rounded-full bg-warning-light px-2.5 py-0.5 text-[10px] font-semibold text-accent-amber">
                Due in 7 days
              </span>
            </div>
          </div>

          {/* Bill to */}
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-1.5">Bill To</p>
            <p className="text-[14px] font-semibold text-text-primary">{view.client.name}</p>
            <p className="text-[12px] text-text-secondary">{view.client.address}</p>
            <p className="text-[12px] text-text-secondary">{view.client.city}</p>
            {view.client.phone && (
              <p className="text-[12px] text-text-tertiary mt-1">{view.client.phone}</p>
            )}
          </div>

          {/* Line items */}
          <div className="mb-4">
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Description</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary text-right">Amount</p>
            </div>
            <div className="space-y-3">
              {view.lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 items-start">
                  <div>
                    <p className="text-[13px] font-medium text-text-primary leading-snug">{item.description}</p>
                    <p className="text-[11px] text-text-tertiary">{item.detail}</p>
                  </div>
                  <p className="text-[13px] font-semibold text-text-primary text-right pt-0.5">
                    ${item.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-text-secondary">Subtotal</span>
              <span className="font-medium text-text-primary">${view.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-text-secondary">Tax ({view.taxRate}%)</span>
              <span className="font-medium text-text-primary">${view.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border mt-2">
              <span className="text-[15px] font-bold text-text-primary">Total Due</span>
              <span className="text-[20px] font-bold text-primary">${view.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-2.5">
              Payment Accepted Via
            </p>
            {(() => {
              const methods = isDemo ? DEMO_PAYMENT_METHODS : buildLivePaymentMethods(business);
              if (methods.length === 0) {
                return (
                  <div className="rounded-xl border border-dashed border-border bg-surface-secondary p-3 text-center">
                    <p className="text-[12px] font-semibold text-text-primary">
                      No payment methods configured
                    </p>
                    <p className="mt-1 text-[11px] text-text-secondary">
                      Add your handles in{" "}
                      <Link href="/settings" className="font-semibold text-primary hover:underline">
                        Settings &rarr; Payment Methods
                      </Link>{" "}
                      to display them here.
                    </p>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 gap-2">
                  {methods.map((method) => {
                    const isCopied = copiedHandle === method.key;
                    return (
                      <button
                        type="button"
                        key={method.key}
                        onClick={() => handleCopyPaymentHandle(method.key, method.handle)}
                        className={`group flex items-center gap-2 rounded-xl p-2.5 text-left transition-all ${method.color} hover:opacity-90 active:scale-[0.97]`}
                      >
                        <method.icon size={16} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold leading-none">{method.name}</p>
                          <p className="text-[10px] font-medium opacity-80 truncate mt-0.5">{method.handle}</p>
                        </div>
                        {isCopied ? (
                          <Check size={13} className="shrink-0" strokeWidth={2.5} />
                        ) : (
                          <Copy size={12} className="shrink-0 opacity-70" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            {(() => {
              const methods = isDemo ? DEMO_PAYMENT_METHODS : buildLivePaymentMethods(business);
              if (methods.length === 0) return null;
              return (
                <p className="mt-2 text-[10px] text-text-tertiary text-center">
                  {isDemo ? "Pay your tech directly at the time of service." : "Tap a method to copy the handle."}
                </p>
              );
            })()}
          </div>
        </Card>

        {/* ── Personal Message ── */}
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
            Personal Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
            placeholder="Add a personal note to your client..."
          />
        </div>

        {/* ── Payment link toggle ── */}
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-text-primary">Include Payment Link</p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                Adds a secure &quot;Pay Now&quot; button to the invoice
              </p>
            </div>
            <button
              onClick={() => setIncludePaymentLink((v) => !v)}
              className="transition-colors"
            >
              {includePaymentLink ? (
                <ToggleRight size={34} className="text-primary" />
              ) : (
                <ToggleLeft size={34} className="text-text-tertiary" />
              )}
            </button>
          </div>
        </Card>

        {/* ── Send Options ── */}
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Send Via
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopySmsLink}
              disabled={!view.exists}
              className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-4 transition-all duration-150 ${
                smsCopied
                  ? "border-success bg-success-light"
                  : "border-border bg-surface hover:border-primary/40 active:scale-[0.97] disabled:opacity-50"
              }`}
            >
              {smsCopied ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success">
                    <Check size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-[13px] font-bold text-success">SMS Link Copied!</p>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                    <MessageSquare size={20} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-text-primary">Copy SMS Link</p>
                    <p className="text-[11px] text-text-tertiary">{view.client.phone || "—"}</p>
                  </div>
                </>
              )}
            </button>

            <button
              onClick={handleSendEmail}
              disabled={!view.exists || sending}
              className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-4 transition-all duration-150 ${
                sent === "email"
                  ? "border-success bg-success-light"
                  : "border-border bg-surface hover:border-primary/40 active:scale-[0.97] disabled:opacity-50"
              }`}
            >
              {sent === "email" ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success">
                    <Check size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-[13px] font-bold text-success">Sent!</p>
                </>
              ) : sending ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                    <Spinner className="h-5 w-5" />
                  </div>
                  <p className="text-[13px] font-bold text-text-primary">Sending…</p>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                    <Mail size={20} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-text-primary">Email</p>
                    <p className="text-[11px] text-text-tertiary truncate max-w-[110px]">
                      {view.client.email || "—"}
                    </p>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Success banner ── */}
        {sent === "email" && (
          <div className="flex items-center gap-3 rounded-2xl bg-success-light border border-success/20 px-4 py-3.5 animate-fade-in">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success">
              <Check size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-success">
                Invoice emailed to {view.client.name}!
              </p>
              <p className="text-[12px] text-success/80 mt-0.5">
                Sent to {view.client.email} · {view.number}
              </p>
            </div>
          </div>
        )}

        {/* ── Primary Send Button ── */}
        {view.exists ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Send size={17} />}
            onClick={handleSendEmail}
            disabled={sending}
          >
            {sending ? "Sending…" : `Email Invoice · $${view.total.toFixed(2)}`}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Send size={17} />}
            onClick={generateInvoice}
            disabled={generating || isDemo}
          >
            {generating ? "Generating…" : `Generate Invoice · $${view.total.toFixed(2)}`}
          </Button>
        )}

        {/* ── Secondary Actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="md"
            icon={<Download size={15} />}
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>

        {sendError && (
          <p className="text-center text-[12px] text-error">{sendError}</p>
        )}

        <p className="text-center text-[11px] text-text-tertiary pb-2">
          Invoice will be logged in {view.client.name}&apos;s job history
        </p>
      </div>
    </div>
  );
}
