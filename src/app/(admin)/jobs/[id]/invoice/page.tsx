"use client";

import { useState, use } from "react";
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

const INVOICE = {
  number: "INV-2026-031",
  date: "Mar 29, 2026",
  dueDate: "Apr 5, 2026",
  client: {
    name: "Sarah Mitchell",
    address: "4821 Oak Hollow Dr",
    city: "Plano, TX 75024",
    phone: "(972) 555-0142",
    email: "sarah.mitchell@gmail.com",
  },
  lineItems: [
    { description: "Labor — Kitchen faucet replacement + garage door sensor", detail: "3 hrs @ $80/hr", amount: 240 },
    { description: "Materials — Moen 7594ESRS Arbor Faucet", detail: "Brushed nickel", amount: 75 },
    { description: "Materials — Garage door sensor mounting bracket", detail: "Universal fit", amount: 25 },
  ],
  subtotal: 340,
  taxRate: 8.25,
  tax: 28.05,
  total: 368.05,
  paymentMethods: [
    { name: "Venmo", handle: "@AnthonyHandyAnt", icon: Smartphone, color: "text-[#3D95CE] bg-[#E8F4FC]" },
    { name: "Zelle", handle: "(214) 555-0199", icon: DollarSign, color: "text-[#6D1ED4] bg-[#F3EAFD]" },
    { name: "Card", handle: "Via secure link", icon: CreditCard, color: "text-success bg-success-light" },
  ],
};

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = use(params); // unwrap async params
  const [includePaymentLink, setIncludePaymentLink] = useState(true);
  const [message, setMessage] = useState(
    "Hi Sarah! It was a pleasure working on your home today. Here's your invoice for today's service. Please let me know if you have any questions!"
  );
  const [sent, setSent] = useState<"text" | "email" | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSend(method: "text" | "email") {
    setSent(method);
    setTimeout(() => setSent(null), 3500);
  }

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const jobId = _id ?? "1";

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4">
        <Link
          href={`/jobs/${jobId}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Job #{jobId}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">Send Invoice</h1>
            <p className="mt-0.5 text-[13px] text-text-secondary">{INVOICE.client.name} · {INVOICE.number}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
            <Send size={20} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* ── Invoice Preview Card ── */}
        <Card padding="lg">
          {/* Invoice header */}
          <div className="flex items-start justify-between mb-5 pb-5 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-[12px] font-bold text-white">HA</span>
                </div>
                <span className="text-[18px] font-bold text-text-primary">HandyAnt</span>
              </div>
              <p className="text-[11px] text-text-tertiary">Professional Home Services</p>
              <p className="text-[11px] text-text-tertiary">DFW Metro Area, TX</p>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-bold text-primary">{INVOICE.number}</p>
              <p className="text-[11px] text-text-tertiary mt-1">Date: {INVOICE.date}</p>
              <p className="text-[11px] text-text-tertiary">Due: {INVOICE.dueDate}</p>
              <span className="mt-2 inline-flex items-center rounded-full bg-warning-light px-2.5 py-0.5 text-[10px] font-semibold text-accent-amber">
                Due in 7 days
              </span>
            </div>
          </div>

          {/* Bill to */}
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-1.5">Bill To</p>
            <p className="text-[14px] font-semibold text-text-primary">{INVOICE.client.name}</p>
            <p className="text-[12px] text-text-secondary">{INVOICE.client.address}</p>
            <p className="text-[12px] text-text-secondary">{INVOICE.client.city}</p>
            <p className="text-[12px] text-text-tertiary mt-1">{INVOICE.client.phone}</p>
          </div>

          {/* Line items */}
          <div className="mb-4">
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Description</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary text-right">Amount</p>
            </div>
            <div className="space-y-3">
              {INVOICE.lineItems.map((item, i) => (
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
              <span className="font-medium text-text-primary">${INVOICE.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-text-secondary">Tax ({INVOICE.taxRate}%)</span>
              <span className="font-medium text-text-primary">${INVOICE.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border mt-2">
              <span className="text-[15px] font-bold text-text-primary">Total Due</span>
              <span className="text-[20px] font-bold text-primary">${INVOICE.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-2.5">
              Payment Accepted Via
            </p>
            <div className="flex gap-2">
              {INVOICE.paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl p-2.5 ${method.color}`}
                >
                  <method.icon size={16} />
                  <p className="text-[11px] font-bold">{method.name}</p>
                  <p className="text-[9px] font-medium opacity-80 text-center leading-tight">{method.handle}</p>
                </div>
              ))}
            </div>
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
                Adds a secure "Pay Now" button to the invoice
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
              onClick={() => handleSend("text")}
              className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-4 transition-all duration-150 ${
                sent === "text"
                  ? "border-success bg-success-light"
                  : "border-border bg-surface hover:border-primary/40 active:scale-[0.97]"
              }`}
            >
              {sent === "text" ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success">
                    <Check size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-[13px] font-bold text-success">Sent!</p>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                    <MessageSquare size={20} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-text-primary">Text Message</p>
                    <p className="text-[11px] text-text-tertiary">{INVOICE.client.phone}</p>
                  </div>
                </>
              )}
            </button>

            <button
              onClick={() => handleSend("email")}
              className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-4 transition-all duration-150 ${
                sent === "email"
                  ? "border-success bg-success-light"
                  : "border-border bg-surface hover:border-primary/40 active:scale-[0.97]"
              }`}
            >
              {sent === "email" ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success">
                    <Check size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-[13px] font-bold text-success">Sent!</p>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                    <Mail size={20} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-text-primary">Email</p>
                    <p className="text-[11px] text-text-tertiary truncate max-w-[110px]">
                      {INVOICE.client.email}
                    </p>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Success banner ── */}
        {sent && (
          <div className="flex items-center gap-3 rounded-2xl bg-success-light border border-success/20 px-4 py-3.5 animate-fade-in">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success">
              <Check size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-success">
                Invoice sent to {INVOICE.client.name}!
              </p>
              <p className="text-[12px] text-success/80 mt-0.5">
                Via {sent === "text" ? "text message" : "email"} · {INVOICE.number}
              </p>
            </div>
          </div>
        )}

        {/* ── Primary Send Button ── */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Send size={17} />}
          onClick={() => handleSend("text")}
        >
          Send Invoice · ${INVOICE.total.toFixed(2)}
        </Button>

        {/* ── Secondary Actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="md"
            icon={<Download size={15} />}
            onClick={() => {}}
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

        <p className="text-center text-[11px] text-text-tertiary pb-2">
          Invoice will be logged in {INVOICE.client.name}&apos;s job history
        </p>
      </div>
    </div>
  );
}
