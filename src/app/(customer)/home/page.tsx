"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import { useDemoMode } from "@/lib/useDemoMode";
import { toast } from "@/components/Toaster";
import { PLANS, type PlanId } from "@/lib/plans";
import {
  MapPin, Clock, Star, ArrowRight, Camera,
  MessageCircle, Phone, CheckCircle2,
  CalendarDays, BadgeCheck, Users, CalendarPlus,
  X, XCircle,
} from "lucide-react";

// ─── Static Data (UI config, not mock) ──────────────────────────────────────

// Fallback contact for the "Call" button when the tech's phone isn't loaded yet.
const FALLBACK_TEL = "tel:+12144697795";

function planById(id: string | null): (typeof PLANS)[number] | null {
  if (!id) return null;
  return PLANS.find((p) => p.id === (id as PlanId)) ?? null;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingData {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  description: string | null;
  tasks: { label: string; done: boolean }[];
  tech: { name: string; phone?: string | null } | null;
  home: { address: string; city: string | null } | null;
}

interface ApiReview {
  id: string;
  rating: number;
}

interface ApiSubscription {
  id: string;
  plan: string;
  status: string | null;
  visitsUsed: number;
}

const DEMO_BOOKING: BookingData = {
  id: "demo",
  scheduledDate: "2026-04-08",
  scheduledTime: "09:00",
  status: "confirmed",
  description: null,
  tasks: [
    { label: "Replace kitchen faucet", done: false },
    { label: "Fix garage door sensor", done: false },
  ],
  tech: { name: "Anthony" },
  home: { address: "4821 Oak Hollow Dr", city: "Plano" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CustomerHome() {
  const { data: session } = useSession();
  const [nextBooking, setNextBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState<{ count: number; avg: number } | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [techPhone, setTechPhone] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { isDemo, mounted } = useDemoMode();

  const userName = !mounted
    ? "there"
    : isDemo
      ? "Sarah"
      : session?.user?.name?.split(" ")[0] || "there";
  const userInitials = !mounted
    ? "?"
    : isDemo
      ? "SH"
      : session?.user?.name
        ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "?";

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setNextBooking(DEMO_BOOKING);
      setReviewStats({ count: 86, avg: 4.9 });
      setActivePlanId("pro");
      setCompletedCount(12);
      setTechPhone("+12144697795");
      setLoading(false);
      return;
    }

    let cancelled = false;
    Promise.all([
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/reviews").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/subscriptions").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([bookings, reviews, subs]) => {
        if (cancelled) return;

        const bookingList: BookingData[] = Array.isArray(bookings) ? bookings : [];
        const upcoming = bookingList.find((b) =>
          ["pending", "confirmed", "in_progress"].includes(b.status)
        );
        setNextBooking(upcoming || null);

        // Surface a tech phone for the Call button (prefer the upcoming booking's tech).
        const phone =
          (upcoming?.tech?.phone as string | null | undefined) ??
          bookingList.find((b) => b.tech?.phone)?.tech?.phone ??
          null;
        setTechPhone(phone ?? null);

        const reviewList: ApiReview[] = Array.isArray(reviews) ? reviews : [];
        if (reviewList.length > 0) {
          const sum = reviewList.reduce((acc, r) => acc + (r.rating ?? 0), 0);
          setReviewStats({
            count: reviewList.length,
            avg: Math.round((sum / reviewList.length) * 10) / 10,
          });
        } else {
          setReviewStats(null);
        }

        const subsList: ApiSubscription[] = Array.isArray(subs) ? subs : [];
        const active = subsList.find((s) => s.status === "active") ?? subsList[0];
        setActivePlanId(active ? active.plan : null);
        setCompletedCount(active?.visitsUsed ?? 0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isDemo, mounted]);

  const trustStats = [
    { icon: BadgeCheck, label: "Insured & Reliable", sub: "$1M liability coverage", color: "text-primary" },
    ...(reviewStats
      ? [{ icon: Star, label: `${reviewStats.avg} Rating`, sub: `${reviewStats.count} review${reviewStats.count === 1 ? "" : "s"}`, color: "text-warning" }]
      : []),
    { icon: Users, label: "DFW Since 2024", sub: "Justin · Plano · Frisco", color: "text-success" },
  ];

  const trustGridCols = trustStats.length === 3 ? "grid-cols-3" : "grid-cols-2";

  const callHref = techPhone
    ? `tel:${techPhone.replace(/[^+\d]/g, "")}`
    : FALLBACK_TEL;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Header + Membership CTA ─────────────────────────────────── */}
      <div className="bg-surface border-b border-border px-5 pt-12 lg:pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Welcome back
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold text-text-primary leading-tight">
              {userName}&apos;s Home
            </h1>
            {nextBooking?.home && (
              <div className="mt-1 flex items-center gap-1 text-text-tertiary">
                <MapPin size={12} />
                <span className="text-[12px]">
                  {nextBooking.home.address}{nextBooking.home.city ? `, ${nextBooking.home.city}` : ""}
                </span>
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-[14px] font-bold text-primary">{userInitials}</span>
          </div>
        </div>

        {!activePlanId && (
          <Link href="/messages?topic=membership">
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3 active:scale-[0.99] transition-transform">
              <BadgeCheck size={18} className="text-primary shrink-0" />
              <span className="text-[14px] font-semibold text-text-primary">Choose your membership</span>
            </div>
          </Link>
        )}
      </div>

      <div className="px-5 pt-4">

        {/* spacer */}

        {/* ── Track Banner (only if upcoming booking) ────────────────── */}
        {nextBooking && nextBooking.tech && (
          <div className="mb-5">
            <Link href="/track">
              <div className="rounded-2xl bg-primary p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-white">
                      {nextBooking.tech.name} is {nextBooking.status === "confirmed" ? "confirmed" : "scheduled"}
                    </p>
                    <p className="text-[12px] text-white/70 mt-0.5">Tap to track on the day of your visit</p>
                  </div>
                  <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shrink-0">
                    <MapPin size={20} className="text-white" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Next Visit Card (or Empty State) ────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Next Visit
            </h2>
            {nextBooking && <StatusBadge status={nextBooking.status as "confirmed" | "pending" | "completed" | "in-progress" | "needs-parts" | "scheduled" | "cancelled"} />}
          </div>

          {loading ? (
            <Card className="border border-border">
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            </Card>
          ) : nextBooking ? (
            <Card className="border border-border">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-[15px] font-bold text-white">
                    {nextBooking.tech?.name?.[0] || "A"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-text-primary">
                    {nextBooking.tech?.name || "Technician TBD"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-text-secondary">
                    <CalendarDays size={13} />
                    <span className="text-[13px]">{formatDate(nextBooking.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-text-secondary">
                    <Clock size={13} />
                    <span className="text-[13px]">{nextBooking.scheduledTime}</span>
                  </div>
                </div>
                {nextBooking.status === "confirmed" && (
                  <div className="flex items-center gap-1 bg-success-light rounded-full px-2.5 py-1">
                    <CheckCircle2 size={12} className="text-success" />
                    <span className="text-[11px] font-semibold text-success">Confirmed</span>
                  </div>
                )}
              </div>

              {nextBooking.tasks && nextBooking.tasks.length > 0 && (
                <div className="bg-background rounded-lg px-3.5 py-3 mb-4 border border-border-light space-y-2">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Tasks</p>
                  {nextBooking.tasks.map((task) => (
                    <div key={task.label} className="flex items-center gap-2.5">
                      <div className="h-5 w-5 rounded-full border-2 border-primary/30 flex items-center justify-center shrink-0">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                      <span className="text-[13px] text-text-primary">{task.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {nextBooking.description && (
                <p className="text-[13px] text-text-secondary mb-4 px-1">{nextBooking.description}</p>
              )}

              <div className="flex gap-2.5">
                <Link href="/messages" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white active:bg-primary-dark transition-colors">
                    <MessageCircle size={15} />
                    Message
                  </button>
                </Link>
                <a
                  href={callHref}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-text-primary active:bg-surface-secondary transition-colors"
                >
                  <Phone size={15} className="text-success" />
                  Call
                </a>
              </div>
            </Card>
          ) : (
            <Card className="border border-dashed border-border">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                  <CalendarDays size={28} className="text-primary" />
                </div>

                <h3 className="text-[16px] font-bold text-text-primary">Book your first visit</h3>
                <p className="mt-1.5 max-w-[220px] text-[13px] leading-relaxed text-text-secondary">
                  Your home maintenance starts here. Schedule a visit and we&apos;ll handle the rest.
                </p>

                <Link href="/book" className="mt-4 w-full">
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-bold text-white shadow-[0_2px_8px_rgba(79,149,152,0.25)] active:bg-primary-dark transition-colors">
                    <CalendarPlus size={16} />
                    Book a Visit
                  </button>
                </Link>

                <p className="mt-3 text-[11px] text-text-tertiary">
                  DFW Metro · Fully Insured
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* ── Quick Actions Row ─────────────────────────────────────── */}
        {nextBooking && (
          <div className="mb-5 grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                if (isDemo) {
                  toast.info("Reschedule disabled in demo mode");
                  return;
                }
                setRescheduleOpen(true);
              }}
              className="block"
            >
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 active:bg-surface-secondary transition-colors">
                <CalendarDays size={18} className="text-primary" />
                <span className="text-[11px] font-semibold text-text-secondary">Reschedule</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isDemo) {
                  toast.info("Cancel disabled in demo mode");
                  return;
                }
                setCancelOpen(true);
              }}
              className="block"
            >
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 active:bg-surface-secondary transition-colors">
                <XCircle size={18} className="text-error" />
                <span className="text-[11px] font-semibold text-text-secondary">Cancel</span>
              </div>
            </button>
            <Link href="/account/home/photos" className="block">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 active:bg-surface-secondary transition-colors">
                <Camera size={18} className="text-primary" />
                <span className="text-[11px] font-semibold text-text-secondary">Photos</span>
              </div>
            </Link>
            <Link href="/account" className="block">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 active:bg-surface-secondary transition-colors">
                <Clock size={18} className="text-primary" />
                <span className="text-[11px] font-semibold text-text-secondary">History</span>
              </div>
            </Link>
          </div>
        )}

        {/* ── Trust Indicators ───────────────────────────────────────── */}
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2.5">
            Why Choose Us
          </h2>
          <div className={`grid ${trustGridCols} gap-2`}>
            {trustStats.map((stat) => (
              <Card key={stat.label} padding="sm" className="flex flex-col items-center text-center gap-2 py-4">
                <stat.icon size={22} className={stat.color} />
                <div>
                  <p className="text-[12px] font-semibold text-text-primary leading-tight">{stat.label}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight">{stat.sub}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Book Now CTA ────────────────────────────────────────────── */}
        <Link href="/book">
          <div className="rounded-2xl bg-primary p-6 active:scale-[0.99] transition-transform">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-1">
                Professional Handyman
              </p>
              <p className="text-[20px] font-bold text-white leading-snug">
                Something needs fixing?
              </p>
              <p className="mt-1.5 text-[13px] text-white/70 leading-relaxed">
                Book a visit or add items to your to-do list. We&apos;ll handle the rest.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white py-2.5 px-5">
                <span className="text-[14px] font-bold text-primary">Book a Visit</span>
                <ArrowRight size={16} className="text-primary" />
              </div>
            </div>
          </div>
        </Link>

        {/* ── Your Plan Card ──────────────────────────────────────────── */}
        {(() => {
          const plan = planById(activePlanId);
          if (!plan) {
            // No active membership - invite them to subscribe.
            return (
              <Link href="/messages?topic=membership" className="block mt-5 mb-2">
                <div className="rounded-2xl bg-surface border border-border px-4 py-3.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary">No active membership</p>
                      <p className="text-[12px] font-medium text-primary mt-0.5">
                        Ask Anthony about a visit plan →
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 shrink-0">
                      <BadgeCheck size={16} className="text-primary" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          }
          // Active membership - show plan, price, visit usage, manage link.
          const usagePct = Math.min(100, Math.round((completedCount / plan.visits) * 100));
          return (
            <Link href="/account" className="block mt-5 mb-2">
              <div className="rounded-2xl bg-surface border border-border px-4 py-4 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-text-primary">{plan.label} Plan</p>
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Active
                      </span>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      ${plan.annualPrice.toLocaleString()}/yr · {plan.visits} visits/year
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-primary-100 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-semibold text-text-primary tabular-nums">
                        {completedCount}/{plan.visits}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-medium text-primary">Manage plan →</p>
                      <p className="text-[11px] font-semibold text-success">{Math.max(0, plan.visits - completedCount)} remaining</p>
                    </div>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 shrink-0">
                    <BadgeCheck size={16} className="text-primary" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })()}

      </div>

      {/* ── Reschedule modal ────────────────────────────────────────── */}
      {rescheduleOpen && nextBooking && (
        <RescheduleModal
          booking={nextBooking}
          onClose={() => setRescheduleOpen(false)}
          onRescheduled={(updated) => {
            setNextBooking((prev) => prev ? { ...prev, scheduledDate: updated.scheduledDate, scheduledTime: updated.scheduledTime } : prev);
            setRescheduleOpen(false);
            toast.success("Visit rescheduled");
          }}
        />
      )}

      {/* ── Cancel modal ────────────────────────────────────────────── */}
      {cancelOpen && nextBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => !cancelling && setCancelOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-error-light">
                <XCircle size={26} className="text-error" />
              </div>
              <h2 className="text-[17px] font-bold text-text-primary">Cancel this visit?</h2>
              <p className="mt-1.5 text-[13px] text-text-secondary">
                We&apos;ll let {nextBooking.tech?.name ?? "your tech"} know. You can always rebook later.
              </p>
            </div>
            <div className="px-5 pb-5 pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-border bg-surface py-3 text-[14px] font-semibold text-text-primary active:bg-surface-secondary disabled:opacity-60"
              >
                Keep visit
              </button>
              <button
                type="button"
                onClick={async () => {
                  setCancelling(true);
                  try {
                    const res = await fetch(`/api/bookings/${nextBooking.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "cancelled" }),
                    });
                    if (!res.ok) throw new Error("Failed");
                    setNextBooking(null);
                    setCancelOpen(false);
                    toast.success("Visit cancelled");
                  } catch {
                    toast.error("Couldn't cancel - please try again");
                  } finally {
                    setCancelling(false);
                  }
                }}
                disabled={cancelling}
                className="flex-1 rounded-xl bg-error py-3 text-[14px] font-semibold text-white active:opacity-90 disabled:opacity-60"
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

// ─── Reschedule Modal ────────────────────────────────────────────────────────

interface RescheduleModalProps {
  booking: BookingData;
  onClose: () => void;
  onRescheduled: (updated: { scheduledDate: string; scheduledTime: string }) => void;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatSlotLabel(time: string): string {
  const [hh, mm] = time.split(":");
  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parseCurrentTime(scheduledTime: string): string {
  // scheduledTime can be ISO or "HH:MM". Normalize to "HH:MM".
  if (scheduledTime.includes("T")) {
    const d = new Date(scheduledTime);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const [hh, mm] = scheduledTime.split(":");
  return `${hh}:${mm}`;
}

function RescheduleModal({ booking, onClose, onRescheduled }: RescheduleModalProps) {
  // Build a 30-day window starting today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: Date[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const currentDateISO = booking.scheduledDate.includes("T")
    ? booking.scheduledDate.slice(0, 10)
    : booking.scheduledDate;
  const currentTime = parseCurrentTime(booking.scheduledTime);

  const initialDate = dates.find((d) => toISODate(d) === currentDateISO) ?? dates[0];
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(initialDate));
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>(currentTime);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch slots when the date changes.
  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setError(null);
    fetch(`/api/availability?date=${selectedDate}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((data: { slots?: { time: string; available: boolean }[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.slots) ? data.slots : [];
        // For the booking's current date, mark its own slot as available so the
        // user can choose to keep the same time (it's their own booking).
        if (selectedDate === currentDateISO) {
          for (const s of list) {
            if (s.time === currentTime) s.available = true;
          }
        }
        setSlots(list);
        // If the previously-selected time isn't in this date's slots, reset it.
        const stillThere = list.find((s) => s.time === selectedTime && s.available);
        if (!stillThere) {
          const firstAvail = list.find((s) => s.available);
          setSelectedTime(firstAvail?.time ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
    // selectedTime intentionally excluded to avoid re-fetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function handleConfirm() {
    if (!selectedTime) {
      setError("Pick a time slot");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to reschedule");
      }
      onRescheduled({ scheduledDate: selectedDate, scheduledTime: selectedTime });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reschedule");
    } finally {
      setSubmitting(false);
    }
  }

  const currentDateLabel = new Date(currentDateISO + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-surface shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Reschedule visit</h2>
            <p className="text-[12px] text-text-secondary mt-0.5">
              Currently {currentDateLabel} at {formatSlotLabel(currentTime)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Date picker (horizontal scroll) */}
        <div className="px-5 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">Pick a date</p>
          <div className="-mx-1 overflow-x-auto">
            <div className="flex gap-2 px-1 pb-2">
              {dates.map((d) => {
                const iso = toISODate(d);
                const isSelected = iso === selectedDate;
                const isCurrent = iso === currentDateISO;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={`shrink-0 flex flex-col items-center justify-center gap-0.5 w-14 h-16 rounded-xl border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : isCurrent
                          ? "border-primary/40 bg-primary-50 text-primary"
                          : "border-border bg-surface text-text-primary hover:border-primary/30"
                    }`}
                  >
                    <span className={`text-[10px] font-semibold uppercase ${isSelected ? "text-white/80" : "text-text-tertiary"}`}>
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-[16px] font-bold leading-none">{d.getDate()}</span>
                    <span className={`text-[9px] ${isSelected ? "text-white/80" : "text-text-tertiary"}`}>
                      {d.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time slots */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">Pick a time</p>
          {loadingSlots ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-[13px] text-text-secondary py-6 text-center">No availability this day. Try another date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const isSelected = slot.time === selectedTime;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-lg border py-2.5 text-[12px] font-semibold transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : slot.available
                          ? "border-border bg-surface text-text-primary hover:border-primary/30"
                          : "border-border bg-surface-secondary text-text-tertiary cursor-not-allowed line-through"
                    }`}
                  >
                    {formatSlotLabel(slot.time)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 space-y-2">
          {error && (
            <p className="text-[12px] text-error">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-border bg-surface py-3 text-[14px] font-semibold text-text-primary active:bg-surface-secondary transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !selectedTime}
              className="flex-1 rounded-xl bg-primary py-3 text-[14px] font-semibold text-white shadow-sm active:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {submitting ? "Rescheduling…" : "Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
