"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import {
  ArrowLeft, Phone, MessageCircle, Star, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Check, Wrench, Package, CalendarDays, Sparkles, XCircle,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { toast } from "@/components/Toaster";
import { bookingDateToLocalDate, bookingTimeParts, formatBookingTime } from "@/lib/booking-time";
import {
  bookingDateAndTimeToInstant,
  businessDateString,
} from "@/lib/booking-policy";

function combineDateTime(scheduledDate: string, scheduledTime: string): Date | null {
  return bookingDateAndTimeToInstant(scheduledDate, scheduledTime);
}

// ─── Types & Data ──────────────────────────────────────────────────────────

type Phase = 0 | 1 | 2 | 3;

interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string | null;
  durationMinutes: number | null;
  tech: { id: string; name: string; phone: string | null } | null;
  tasks: { id: string; label: string; done: boolean | null }[];
  parts?: { id: string; item: string }[];
}

interface ActiveBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string | null;
  durationMinutes: number | null;
  techName: string;
  techInitial: string;
  techPhone: string | null;
  tasks: { label: string; done: boolean }[];
  parts: string[];
}

const DEMO_ACTIVE: ActiveBooking = {
  id: "demo",
  status: "confirmed",
  scheduledDate: businessDateString(),
  scheduledTime: "10:00",
  description: null,
  durationMinutes: 105,
  techName: "Anthony B.",
  techInitial: "A",
  techPhone: "(214) 555-0199",
  tasks: [
    { label: "Replace kitchen faucet", done: false },
    { label: "Fix garage door sensor", done: false },
  ],
  parts: ["Moen 7594ESRS Arbor Faucet"],
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "in_progress"]);

function todayStr(): string {
  return businessDateString();
}

function statusToPhase(status: string): Phase {
  if (status === "completed") return 3;
  if (status === "in_progress") return 2;
  if (status === "confirmed") return 1;
  return 0;
}

function formatTime(scheduledTime: string): string {
  return formatBookingTime(scheduledTime);
}

function formatDate(dateStr: string): string {
  const d = bookingDateToLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function adapt(b: ApiBooking): ActiveBooking {
  const techName = b.tech?.name ?? "Technician TBD";
  return {
    id: b.id,
    status: b.status,
    scheduledDate: b.scheduledDate,
    scheduledTime: b.scheduledTime,
    description: b.description,
    durationMinutes: b.durationMinutes,
    techName,
    techInitial: techName[0]?.toUpperCase() ?? "?",
    techPhone: b.tech?.phone ?? null,
    tasks: (b.tasks ?? []).map((t) => ({ label: t.label, done: !!t.done })),
    parts: (b.parts ?? []).map((p) => p.item),
  };
}

function pickActive(list: ApiBooking[]): ApiBooking | null {
  const today = todayStr();
  const now = Date.now();
  const isUpcoming = (booking: ApiBooking) => {
    if (!ACTIVE_STATUSES.has(booking.status)) return false;
    if (booking.status === "in_progress") return true;
    const start = combineDateTime(booking.scheduledDate, booking.scheduledTime);
    return !!start && start.getTime() >= now;
  };
  // Prefer today's requested, confirmed, or in-progress booking.
  const active = list
    .filter(isUpcoming)
    .sort((a, b) => {
      const aStart = combineDateTime(a.scheduledDate, a.scheduledTime);
      const bStart = combineDateTime(b.scheduledDate, b.scheduledTime);
      return (aStart?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (bStart?.getTime() ?? Number.MAX_SAFE_INTEGER);
    });
  const todayBooking = active.find((booking) => booking.scheduledDate.startsWith(today));
  if (todayBooking) return todayBooking;
  // Fall back to the next requested, confirmed, or in-progress booking.
  return active[0] ?? null;
}

// ─── Progress Timeline ─────────────────────────────────────────────────────

function ProgressTimeline({ currentPhase, scheduledTimeLabel }: { currentPhase: Phase; scheduledTimeLabel: string }) {
  const phases = [
    { label: "Requested", time: scheduledTimeLabel, description: "Booking request received" },
    { label: "Confirmed", time: scheduledTimeLabel, description: "Appointment confirmed" },
    { label: "In Progress", time: "", description: "Work has started" },
    { label: "Complete", time: "", description: "All tasks finished" },
  ];

  return (
    <div className="relative pl-8">
      {phases.map((step, i) => {
        const isComplete = i < currentPhase;
        const isCurrent = i === currentPhase;
        const isLast = i === phases.length - 1;

        return (
          <div key={step.label} className="relative pb-6 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={`absolute left-[-20px] top-[22px] w-[2px] h-[calc(100%-10px)] ${
                  isComplete ? "bg-primary" : "border-l-2 border-dashed border-border"
                }`}
              />
            )}

            {/* Circle indicator */}
            <div className="absolute left-[-28px] top-[2px]">
              {isComplete ? (
                <div className="h-[18px] w-[18px] rounded-full bg-primary flex items-center justify-center">
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
              ) : isCurrent ? (
                <div className="relative">
                  <div className="h-[18px] w-[18px] rounded-full bg-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                  <div className="absolute inset-0 h-[18px] w-[18px] rounded-full bg-primary/30 animate-ping" />
                </div>
              ) : (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-border bg-surface" />
              )}
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[14px] font-semibold ${
                    isComplete || isCurrent ? "text-text-primary" : "text-text-tertiary"
                  }`}
                >
                  {step.label}
                </span>
                {(isComplete || isCurrent) && step.time && (
                  <span className="text-[12px] text-text-tertiary">{step.time}</span>
                )}
              </div>
              <p
                className={`text-[12px] mt-0.5 ${
                  isCurrent ? "text-text-secondary" : "text-text-tertiary"
                }`}
              >
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TrackPage() {
  const { isDemo, mounted } = useDemoMode();

  const [booking, setBooking] = useState<ActiveBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const currentBookingId = useRef<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setBooking(DEMO_ACTIVE);
      setPhase(statusToPhase(DEMO_ACTIVE.status));
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBooking(initialLoad: boolean) {
      try {
        const response = await fetch("/api/bookings?view=customer", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load appointment status");
        const data: unknown = await response.json();
        if (cancelled || !Array.isArray(data)) return;

        const current = currentBookingId.current
          ? (data as ApiBooking[]).find(
              (item) =>
                item.id === currentBookingId.current &&
                (ACTIVE_STATUSES.has(item.status) || item.status === "completed"),
            ) ?? null
          : null;
        const active = current ?? pickActive(data as ApiBooking[]);

        if (!active) {
          currentBookingId.current = null;
          setBooking(null);
          return;
        }

        const adapted = adapt(active);
        currentBookingId.current = adapted.id;
        setBooking(adapted);
        setPhase(statusToPhase(adapted.status));
      } catch {
        if (initialLoad && !cancelled) setBooking(null);
      } finally {
        if (initialLoad && !cancelled) setLoading(false);
      }
    }

    void loadBooking(true);
    const pollId = window.setInterval(() => {
      void loadBooking(false);
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [isDemo, mounted]);

  const advancePhase = () => setPhase((p) => (p < 3 ? ((p + 1) as Phase) : 1));

  // ── Loading / empty states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <div className="bg-surface border-b border-border px-5 pt-12 lg:pt-8 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              aria-label="Back to home"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-secondary transition-transform active:scale-95"
            >
              <ArrowLeft size={18} className="text-text-primary" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-text-primary leading-tight">Your Appointment</h1>
              <p className="mt-0.5 text-[12px] text-text-tertiary">View your appointment status</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <div className="bg-surface border-b border-border px-5 pt-12 lg:pt-8 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              aria-label="Back to home"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-secondary transition-transform active:scale-95"
            >
              <ArrowLeft size={18} className="text-text-primary" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-text-primary leading-tight">Your Appointment</h1>
              <p className="mt-0.5 text-[12px] text-text-tertiary">View your appointment status</p>
            </div>
          </div>
        </div>

        <div className="px-5 pt-8">
          <Card className="border border-dashed border-border">
            <div className="flex flex-col items-center py-8 text-center">
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                  <CalendarDays size={28} className="text-primary" />
                </div>
                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-sm">
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>
              <h3 className="text-[16px] font-bold text-text-primary">No active appointment</h3>
              <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-text-secondary">
                Booking requests and active visits will appear here with their current status.
              </p>
              <Link href="/book" className="mt-4 w-full max-w-[240px]">
                <Button variant="primary" fullWidth>Book a Visit</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const timeLabel = formatTime(booking.scheduledTime);
  const dateLabel = formatDate(booking.scheduledDate);
  const durationLabel = booking.durationMinutes
    ? `${timeLabel} – ${(() => {
        // Compute end time by adding minutes
        const parts = bookingTimeParts(booking.scheduledTime);
        const [h, m] = [parts?.hours ?? 0, parts?.minutes ?? 0];
        const total = h * 60 + m + (booking.durationMinutes ?? 0);
        const eh = Math.floor(total / 60) % 24;
        const em = total % 60;
        const ampm = eh >= 12 ? "PM" : "AM";
        const h12 = eh % 12 === 0 ? 12 : eh % 12;
        return `${h12}:${String(em).padStart(2, "0")} ${ampm}`;
      })()}`
    : timeLabel;

  const statusConfig = {
    0: { label: "Requested", sub: "Waiting for Anthony to confirm this time", color: "bg-warning", textColor: "text-white" },
    1: { label: "Confirmed", sub: `${dateLabel} · ${durationLabel}`, color: "bg-primary", textColor: "text-white" },
    2: { label: "In Progress", sub: `${booking.techName} is working at your home`, color: "bg-success", textColor: "text-white" },
    3: { label: "Complete", sub: "All tasks have been finished", color: "bg-success", textColor: "text-white" },
  } as const;

  const status = statusConfig[phase];

  return (
    <div
      className={`min-h-screen bg-background ${
        phase <= 1
          ? "pb-[calc(12.25rem+env(safe-area-inset-bottom))]"
          : "pb-[calc(9.25rem+env(safe-area-inset-bottom))]"
      } lg:pb-28`}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-border px-5 pt-12 lg:pt-8 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            aria-label="Back to home"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-secondary transition-transform active:scale-95"
          >
            <ArrowLeft size={18} className="text-text-primary" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-text-primary leading-tight">Your Appointment</h1>
            <p className="mt-0.5 text-[12px] text-text-tertiary">Status refreshes every 30 seconds</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ── Status Banner ───────────────────────────────────────────── */}
        <button
          type="button"
          onClick={isDemo ? advancePhase : undefined}
          className="w-full active:scale-[0.985] transition-all duration-200"
          aria-label={isDemo ? "Advance demo phase" : "Status"}
          disabled={!isDemo}
        >
          <div
            className={`relative overflow-hidden rounded-2xl ${status.color} p-5 transition-colors duration-500`}
          >
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute bottom-2 right-16 h-12 w-12 rounded-full bg-white/5" />

            <div className="relative z-10 flex items-center gap-4">
              {/* Status icon */}
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                {phase === 0 && <Clock size={28} className="text-white" />}
                {phase === 1 && <CheckCircle2 size={28} className="text-white" />}
                {phase === 2 && <Wrench size={28} className="text-white" />}
                {phase === 3 && (
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                    <Check size={20} className="text-success" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className={`text-[22px] font-bold ${status.textColor} leading-tight`}>
                  {status.label}
                </p>
                <p className={`text-[13px] ${status.textColor} opacity-80 mt-1 leading-snug`}>
                  {status.sub}
                </p>
              </div>
            </div>

            {/* Demo hint - only visible in demo mode */}
            {isDemo && (
              <div className="relative z-10 mt-3 flex items-center justify-center">
                <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">
                  Demo: tap to advance
                </span>
              </div>
            )}
          </div>
        </button>

        {/* ── Tech Card ───────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[17px] font-bold text-white">{booking.techInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary">{booking.techName}</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Your MCQ technician</p>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Link
                href="/messages"
                aria-label="Message your technician"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface transition-all active:scale-95 active:bg-surface-secondary"
              >
                <MessageCircle size={17} className="text-primary" />
              </Link>
              {booking.techPhone && (
                <a
                  href={`tel:${booking.techPhone}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface transition-all active:scale-95 active:bg-surface-secondary"
                  aria-label="Call your tech"
                >
                  <Phone size={17} className="text-success" />
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* ── Progress Timeline ────────────────────────────────────────── */}
        <Card>
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-4">Progress</p>
          <ProgressTimeline currentPhase={phase} scheduledTimeLabel={timeLabel} />
        </Card>

        {/* ── Job Details (Expandable) ────────────────────────────────── */}
        <Card padding="sm">
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            aria-expanded={detailsOpen}
            className="flex min-h-11 w-full items-center justify-between rounded-lg px-1.5"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <Wrench size={15} className="text-primary" />
              </div>
              <span className="text-[14px] font-semibold text-text-primary">Job Details</span>
            </div>
            {detailsOpen ? (
              <ChevronUp size={18} className="text-text-tertiary" />
            ) : (
              <ChevronDown size={18} className="text-text-tertiary" />
            )}
          </button>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              detailsOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pt-3 px-1.5 pb-1.5 space-y-4">
              {/* Tasks */}
              {booking.tasks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Tasks</p>
                  <div className="space-y-2.5">
                    {booking.tasks.map((task) => {
                      const checked = task.done || phase >= 3;
                      return (
                        <div key={task.label} className="flex items-center gap-2.5">
                          <div
                            className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors duration-300 ${
                              checked
                                ? "bg-success border-success"
                                : "border-border"
                            }`}
                          >
                            {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <span
                            className={`text-[13px] transition-colors duration-300 ${
                              checked
                                ? "text-text-tertiary line-through"
                                : "text-text-primary"
                            }`}
                          >
                            {task.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parts */}
              {booking.parts.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Parts</p>
                  <div className="space-y-2">
                    {booking.parts.map((part) => (
                      <div key={part} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-secondary">
                        <Package size={15} className="text-text-tertiary shrink-0" />
                        <span className="text-[13px] text-text-primary">{part}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </Card>

      </div>

      {/* ── Bottom Action Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 lg:bottom-0 lg:left-64">
        <div className="lg:max-w-3xl lg:mx-auto bg-surface/95 backdrop-blur-md border-t border-border px-5 py-3.5">
          {phase <= 1 && (
            <div className="space-y-2">
              <div className={`grid gap-3 ${booking.techPhone ? "grid-cols-2" : "grid-cols-1"}`}>
                <Link href="/messages" className="min-w-0">
                  <Button variant="outline" fullWidth icon={<MessageCircle size={16} />}>
                    Message
                  </Button>
                </Link>
                {booking.techPhone && (
                  <a href={`tel:${booking.techPhone}`} className="min-w-0">
                    <Button variant="primary" fullWidth icon={<Phone size={16} />}>
                      Call
                    </Button>
                  </a>
                )}
              </div>
              {!isDemo && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="min-h-11 w-full rounded-lg text-center text-[12px] font-semibold text-error transition-colors hover:underline"
                >
                  Cancel visit
                </button>
              )}
            </div>
          )}

          {phase === 2 && (
            <Link href="/messages" className="block">
              <Button variant="primary" fullWidth size="lg" icon={<MessageCircle size={16} />}>
                Message {booking.techName.split(" ")[0]}
              </Button>
            </Link>
          )}

          {phase === 3 && (
            <Link href={`/account/rate/${booking.id}`} className="block">
              <Button variant="primary" fullWidth size="lg" icon={<Star size={16} />}>
                Rate your visit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Cancel modal */}
      {cancelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:items-center sm:p-4"
          onClick={() => !cancelling && setCancelOpen(false)}
        >
          <div
            className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-error-light">
                <XCircle size={26} className="text-error" />
              </div>
              <h2 className="text-[17px] font-bold text-text-primary">Cancel this visit?</h2>
              <p className="mt-1.5 text-[13px] text-text-secondary">
                We&apos;ll let {booking.techName.split(" ")[0]} know.
              </p>
            </div>
            <div className="px-5 pb-5 pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
                className="min-h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-[14px] font-semibold text-text-primary active:bg-surface-secondary disabled:opacity-60"
              >
                Keep visit
              </button>
              <button
                type="button"
                onClick={async () => {
                  setCancelling(true);
                  try {
                    const res = await fetch(`/api/bookings/${booking.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "cancelled" }),
                    });
                    if (!res.ok) throw new Error("Failed");
                    currentBookingId.current = null;
                    setBooking(null);
                    setCancelOpen(false);
                    toast.success("Visit cancelled");
                  } catch {
                    toast.error("Couldn't cancel - please try again");
                  } finally {
                    setCancelling(false);
                  }
                }}
                disabled={cancelling}
                className="min-h-11 flex-1 rounded-xl bg-error px-3 text-[14px] font-semibold text-white active:opacity-90 disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Cancel visit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
