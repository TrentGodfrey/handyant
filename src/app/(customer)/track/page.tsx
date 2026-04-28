"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import {
  ArrowLeft, Phone, MessageCircle, Star, ChevronDown, ChevronUp,
  CheckCircle2, MapPin, Clock, Share2, Truck, Check,
  Wrench, Package, DollarSign, CalendarDays, Sparkles,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

function combineDateTime(scheduledDate: string, scheduledTime: string): Date | null {
  // Date may be "YYYY-MM-DD" or full ISO; time may be "HH:mm[:ss]" or full ISO
  const dateStr = scheduledDate.split("T")[0];
  let h = 0;
  let m = 0;
  if (scheduledTime.includes("T")) {
    const d = new Date(scheduledTime);
    if (isNaN(d.getTime())) return null;
    h = d.getHours();
    m = d.getMinutes();
  } else {
    const [hh, mm] = scheduledTime.split(":");
    h = parseInt(hh ?? "0", 10);
    m = parseInt(mm ?? "0", 10);
  }
  const [yStr, moStr, dStr] = dateStr.split("-");
  const y = parseInt(yStr, 10);
  const mo = parseInt(moStr, 10) - 1;
  const day = parseInt(dStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null;
  const out = new Date(y, mo, day, h, m, 0, 0);
  return isNaN(out.getTime()) ? null : out;
}

function computeEtaLabel(scheduledDate: string, scheduledTime: string, status: string): { primary: string; secondary: string } {
  if (status === "in_progress") return { primary: "On site", secondary: "Tech is working" };
  const target = combineDateTime(scheduledDate, scheduledTime);
  if (!target) return { primary: "Soon", secondary: "" };
  const now = new Date();
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
  const arrivalTime = target.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffMin <= -5) return { primary: "Running late", secondary: `Was scheduled for ${arrivalTime}` };
  if (diffMin <= 0) return { primary: "Arriving now", secondary: `Scheduled for ${arrivalTime}` };
  if (diffMin < 60) return { primary: `Arriving in ${diffMin} min`, secondary: `Around ${arrivalTime}` };
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return { primary: `Arriving at ${arrivalTime}`, secondary: hours > 0 ? `In ${hours}h ${mins}m` : "" };
}

// ─── Types & Data ──────────────────────────────────────────────────────────

type Phase = 0 | 1 | 2 | 3;

interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string | null;
  estimatedCost: string | number | null;
  durationMinutes: number | null;
  tech: { id: string; name: string; phone: string | null } | null;
  home: { address: string; city: string | null; state?: string | null; zip?: string | null } | null;
  tasks: { id: string; label: string; done: boolean | null }[];
  parts?: { id: string; item: string }[];
}

interface ActiveBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string | null;
  estimatedCost: number | null;
  durationMinutes: number | null;
  techName: string;
  techInitial: string;
  techPhone: string | null;
  address: string;
  cityLine: string;
  tasks: { label: string; done: boolean }[];
  parts: string[];
}

const DEMO_ACTIVE: ActiveBooking = {
  id: "demo",
  status: "confirmed",
  scheduledDate: "2026-04-24",
  scheduledTime: "09:00",
  description: null,
  estimatedCost: 340,
  durationMinutes: 180,
  techName: "Anthony B.",
  techInitial: "A",
  techPhone: "(214) 555-0199",
  address: "4821 Oak Hollow Dr",
  cityLine: "Plano, TX 75024",
  tasks: [
    { label: "Replace kitchen faucet", done: false },
    { label: "Fix garage door sensor", done: false },
  ],
  parts: ["Moen 7594ESRS Arbor Faucet"],
};

const ACTIVE_STATUSES = new Set(["confirmed", "in_progress"]);

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function statusToPhase(status: string): Phase {
  if (status === "completed") return 3;
  if (status === "in_progress") return 2;
  // We don't have an explicit "on_the_way" status — keep the demo advance toggle.
  return 0;
}

function formatTime(scheduledTime: string): string {
  // scheduledTime can be ISO datetime, "HH:mm", or "HH:mm:ss"
  let h = 0;
  let m = 0;
  const tIdx = scheduledTime.indexOf("T");
  if (tIdx >= 0) {
    const d = new Date(scheduledTime);
    h = d.getHours();
    m = d.getMinutes();
  } else {
    const [hh, mm] = scheduledTime.split(":");
    h = parseInt(hh ?? "0", 10);
    m = parseInt(mm ?? "0", 10);
  }
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function adapt(b: ApiBooking): ActiveBooking {
  const techName = b.tech?.name ?? "Technician TBD";
  const cityParts = [b.home?.city, b.home?.state].filter(Boolean).join(", ");
  const cityLine = [cityParts, b.home?.zip].filter(Boolean).join(" ");
  return {
    id: b.id,
    status: b.status,
    scheduledDate: b.scheduledDate,
    scheduledTime: b.scheduledTime,
    description: b.description,
    estimatedCost: b.estimatedCost == null ? null : Number(b.estimatedCost),
    durationMinutes: b.durationMinutes,
    techName,
    techInitial: techName[0]?.toUpperCase() ?? "?",
    techPhone: b.tech?.phone ?? null,
    address: b.home?.address ?? "Address on file",
    cityLine: cityLine || "",
    tasks: (b.tasks ?? []).map((t) => ({ label: t.label, done: !!t.done })),
    parts: (b.parts ?? []).map((p) => p.item),
  };
}

function pickActive(list: ApiBooking[]): ApiBooking | null {
  const today = todayStr();
  // Prefer today's confirmed/in_progress booking
  const todays = list.filter(
    (b) => ACTIVE_STATUSES.has(b.status) && b.scheduledDate.startsWith(today)
  );
  if (todays.length) return todays[0];
  // Fall back to any active booking (next upcoming)
  const active = list
    .filter((b) => ACTIVE_STATUSES.has(b.status))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  return active[0] ?? null;
}

// ─── Route SVG ─────────────────────────────────────────────────────────────

function RouteSVG({ phase }: { phase: Phase }) {
  // Only fully visible in "On the Way" phase, but we render it conditionally
  return (
    <div className="relative w-full h-40 my-2">
      <svg viewBox="0 0 320 120" className="w-full h-full" fill="none">
        {/* Road / path background */}
        <path
          d="M 30 95 C 80 95, 90 30, 160 30 C 230 30, 240 95, 290 95"
          stroke="var(--color-border, #E5E7EB)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Traveled portion */}
        <path
          d="M 30 95 C 80 95, 90 30, 160 30 C 230 30, 240 95, 290 95"
          stroke="var(--color-primary, #2563EB)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="400"
          strokeDashoffset={phase === 1 ? "0" : "400"}
          className="transition-[stroke-dashoffset] duration-[3s] ease-in-out"
        />
        {/* Dashed center line */}
        <path
          d="M 30 95 C 80 95, 90 30, 160 30 C 230 30, 240 95, 290 95"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="6 8"
          opacity="0.5"
        />

        {/* Start point (Anthony) */}
        <circle cx="30" cy="95" r="6" fill="var(--color-primary, #2563EB)" />
        <circle cx="30" cy="95" r="3" fill="white" />

        {/* End point (Home) */}
        <circle cx="290" cy="95" r="6" fill="var(--color-success, #22C55E)" />
        <circle cx="290" cy="95" r="3" fill="white" />

        {/* Distance markers */}
        <text x="80" y="75" fontSize="9" fill="var(--color-text-tertiary, #9CA3AF)" fontFamily="system-ui">2.1 mi</text>
        <text x="200" y="75" fontSize="9" fill="var(--color-text-tertiary, #9CA3AF)" fontFamily="system-ui">0.8 mi</text>

        {/* Moving truck icon - animated along path */}
        {phase === 1 && (
          <g className="animate-truck-move">
            <circle r="12" fill="var(--color-primary, #2563EB)" className="drop-shadow-md" />
            <circle r="10" fill="var(--color-primary, #2563EB)" />
            {/* Truck icon simplified */}
            <rect x="-6" y="-4" width="8" height="7" rx="1" fill="white" />
            <rect x="2" y="-2" width="5" height="5" rx="1" fill="white" opacity="0.8" />
            <circle cx="-3" cy="4" r="1.5" fill="white" />
            <circle cx="4" cy="4" r="1.5" fill="white" />
          </g>
        )}
      </svg>

      {/* Labels under start/end */}
      <div className="absolute bottom-0 left-2 text-[10px] text-text-tertiary font-medium">Tech</div>
      <div className="absolute bottom-0 right-1 text-[10px] text-text-tertiary font-medium">Your Home</div>

      {/* CSS for the truck animation */}
      <style>{`
        @keyframes truckMove {
          0%   { transform: translate(30px, 95px); }
          25%  { transform: translate(80px, 60px); }
          50%  { transform: translate(160px, 30px); }
          75%  { transform: translate(240px, 60px); }
          100% { transform: translate(290px, 95px); }
        }
        .animate-truck-move {
          animation: truckMove 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Progress Timeline ─────────────────────────────────────────────────────

function ProgressTimeline({ currentPhase, scheduledTimeLabel }: { currentPhase: Phase; scheduledTimeLabel: string }) {
  const phases = [
    { label: "Confirmed", time: scheduledTimeLabel, description: "Appointment confirmed" },
    { label: "On the Way", time: "", description: "Tech is headed to you" },
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
  const [shareToast, setShareToast] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setBooking(DEMO_ACTIVE);
      setPhase(0);
      setLoading(false);
      return;
    }
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data: ApiBooking[]) => {
        if (!Array.isArray(data)) {
          setBooking(null);
          return;
        }
        const active = pickActive(data);
        if (!active) {
          setBooking(null);
          return;
        }
        const adapted = adapt(active);
        setBooking(adapted);
        setPhase(statusToPhase(adapted.status));
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [isDemo, mounted]);

  const advancePhase = () => setPhase((p) => (p < 3 ? ((p + 1) as Phase) : 0));

  async function handleShareEta() {
    if (!booking) return;
    const eta = computeEtaLabel(booking.scheduledDate, booking.scheduledTime, booking.status);
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const text = `${booking.techName} — ${eta.primary}${eta.secondary ? ` (${eta.secondary})` : ""}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "HandyAnt ETA",
          text,
          url: shareUrl,
        });
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to copy
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl || text);
        setShareToast("Copied");
        setTimeout(() => setShareToast(null), 2000);
      }
    } catch {
      setShareToast("Couldn't copy");
      setTimeout(() => setShareToast(null), 2000);
    }
  }

  // ── Loading / empty states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <div className="bg-surface border-b border-border px-5 pt-12 lg:pt-8 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-9 w-9 rounded-full bg-surface-secondary flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} className="text-text-primary" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-text-primary leading-tight">Your Appointment</h1>
              <p className="text-[12px] text-text-tertiary mt-0.5">Track your tech in real time</p>
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
              href="/"
              className="h-9 w-9 rounded-full bg-surface-secondary flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} className="text-text-primary" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-text-primary leading-tight">Your Appointment</h1>
              <p className="text-[12px] text-text-tertiary mt-0.5">Track your tech in real time</p>
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
                You&apos;ll see live tracking here when your tech is on the way or working at your home.
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
        const [h, m] = (() => {
          if (booking.scheduledTime.includes("T")) {
            const d = new Date(booking.scheduledTime);
            return [d.getHours(), d.getMinutes()];
          }
          const [hh, mm] = booking.scheduledTime.split(":");
          return [parseInt(hh, 10), parseInt(mm, 10)];
        })();
        const total = h * 60 + m + (booking.durationMinutes ?? 0);
        const eh = Math.floor(total / 60) % 24;
        const em = total % 60;
        const ampm = eh >= 12 ? "PM" : "AM";
        const h12 = eh % 12 === 0 ? 12 : eh % 12;
        return `${h12}:${String(em).padStart(2, "0")} ${ampm}`;
      })()}`
    : timeLabel;

  const statusConfig = {
    0: { label: "Confirmed", sub: `${dateLabel} · ${durationLabel}`, color: "bg-primary", textColor: "text-white", pulse: false },
    1: { label: "On the Way", sub: `${booking.techName} is heading to your location`, color: "bg-primary", textColor: "text-white", pulse: true },
    2: { label: "In Progress", sub: `${booking.techName} is working at your home`, color: "bg-success", textColor: "text-white", pulse: false },
    3: { label: "Complete", sub: "All tasks have been finished", color: "bg-success", textColor: "text-white", pulse: false },
  } as const;

  const status = statusConfig[phase];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-border px-5 pt-12 lg:pt-8 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-9 w-9 rounded-full bg-surface-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} className="text-text-primary" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-text-primary leading-tight">Your Appointment</h1>
            <p className="text-[12px] text-text-tertiary mt-0.5">Track your tech in real time</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ── Status Banner ───────────────────────────────────────────── */}
        <button
          onClick={isDemo ? advancePhase : undefined}
          className="w-full active:scale-[0.985] transition-all duration-200"
          aria-label={isDemo ? "Advance demo phase" : "Status"}
          disabled={!isDemo}
        >
          <div
            className={`relative overflow-hidden rounded-2xl ${status.color} p-5 ${
              status.pulse ? "animate-pulse" : ""
            } transition-colors duration-500`}
          >
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute bottom-2 right-16 h-12 w-12 rounded-full bg-white/5" />

            <div className="relative z-10 flex items-center gap-4">
              {/* Status icon */}
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                {phase === 0 && <CheckCircle2 size={28} className="text-white" />}
                {phase === 1 && <Truck size={28} className="text-white" />}
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

            {/* Demo hint — only visible in demo mode */}
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
              <p className="text-[12px] text-text-secondary mt-0.5">Your Handyman</p>
              {isDemo && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={12} className="text-warning fill-warning" />
                  <span className="text-[12px] font-semibold text-text-primary">4.9</span>
                  <span className="text-[11px] text-text-tertiary">(127 reviews)</span>
                </div>
              )}
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Link
                href="/messages"
                className="h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center active:scale-95 active:bg-surface-secondary transition-all"
              >
                <MessageCircle size={17} className="text-primary" />
              </Link>
              {booking.techPhone && (
                <a
                  href={`tel:${booking.techPhone}`}
                  className="h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center active:scale-95 active:bg-surface-secondary transition-all"
                  aria-label="Call your tech"
                >
                  <Phone size={17} className="text-success" />
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* ── ETA Section (On the Way only) ───────────────────────────── */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            phase === 1 ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <Card className="border border-primary-100">
            {/* ETA countdown */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Estimated Arrival</p>
                {isDemo ? (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[40px] font-extrabold text-primary leading-none tracking-tight">12</span>
                    <span className="text-[16px] font-semibold text-primary">min</span>
                  </div>
                ) : (
                  <p className="mt-1 text-[24px] font-extrabold text-primary leading-tight">
                    {computeEtaLabel(booking.scheduledDate, booking.scheduledTime, booking.status).primary}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Clock size={13} />
                  <span className="text-[12px]">Arriving ~{timeLabel}</span>
                </div>
                {isDemo && (
                  <div className="flex items-center gap-1.5 text-text-secondary mt-1">
                    <MapPin size={13} />
                    <span className="text-[12px]">3.2 miles away</span>
                  </div>
                )}
              </div>
            </div>

            {/* Route visualization */}
            <RouteSVG phase={phase} />

            {/* Destination */}
            <div className="flex items-center gap-2 mt-1 p-2.5 rounded-lg bg-surface-secondary">
              <div className="h-8 w-8 rounded-lg bg-success-light flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-success" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-text-primary">{booking.address}</p>
                {booking.cityLine && (
                  <p className="text-[11px] text-text-tertiary">{booking.cityLine}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Progress Timeline ────────────────────────────────────────── */}
        <Card>
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-4">Progress</p>
          <ProgressTimeline currentPhase={phase} scheduledTimeLabel={timeLabel} />
        </Card>

        {/* ── Job Details (Expandable) ────────────────────────────────── */}
        <Card padding="sm">
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex items-center justify-between w-full p-1.5"
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

              {/* Cost */}
              {booking.estimatedCost != null && (
                <div>
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Estimated Cost</p>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-secondary">
                    <DollarSign size={15} className="text-success shrink-0" />
                    <span className="text-[16px] font-bold text-text-primary">
                      ${booking.estimatedCost}
                    </span>
                    <span className="text-[11px] text-text-tertiary">labor + materials</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

      </div>

      {/* ── Bottom Action Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 lg:left-64 z-30">
        <div className="lg:max-w-3xl lg:mx-auto bg-surface/95 backdrop-blur-md border-t border-border px-5 py-3.5">
          {phase === 0 && (
            <div className="flex gap-3">
              <Link href="/messages" className="flex-1">
                <Button variant="outline" fullWidth icon={<MessageCircle size={16} />}>
                  Message {booking.techName.split(" ")[0]}
                </Button>
              </Link>
              {booking.techPhone ? (
                <a href={`tel:${booking.techPhone}`} className="flex-1">
                  <Button variant="primary" fullWidth icon={<Phone size={16} />}>
                    Call {booking.techName.split(" ")[0]}
                  </Button>
                </a>
              ) : (
                <Button variant="primary" fullWidth icon={<Phone size={16} />}>
                  Call {booking.techName.split(" ")[0]}
                </Button>
              )}
            </div>
          )}

          {phase === 1 && (
            <div className="relative">
              <Button variant="primary" fullWidth size="lg" icon={<Share2 size={16} />} onClick={handleShareEta}>
                {shareToast ?? "Share ETA"}
              </Button>
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
    </div>
  );
}
