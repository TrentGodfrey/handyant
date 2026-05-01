"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check, Calendar, MapPin, DollarSign, MessageCircle,
  Home, ChevronRight, CalendarPlus, Bell, Package, Star,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import { useDemoMode } from "@/lib/useDemoMode";

const steps = [
  {
    icon: Bell,
    iconBg: "bg-primary-50",
    iconColor: "text-primary",
    step: "1",
    title: "Reminder sent 24 hrs before",
    desc: "You'll get a text and email the morning of your appointment.",
  },
  {
    icon: Package,
    iconBg: "bg-warning-light",
    iconColor: "text-accent-amber",
    step: "2",
    title: "Your tech confirms parts",
    desc: "They'll reach out if any parts need to be sourced ahead of your visit.",
  },
  {
    icon: Star,
    iconBg: "bg-[#FFFBEB]",
    iconColor: "text-warning",
    step: "3",
    title: "Rate your experience",
    desc: "After the job, you'll be asked to leave a quick review.",
  },
];

interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string | null;
  estimatedCost: string | number | null;
  durationMinutes: number | null;
  serviceType?: string | null;
  tech: { id: string; name: string; phone: string | null; avatarUrl?: string | null } | null;
  home: { address: string; city: string | null; state?: string | null; zip?: string | null } | null;
  categories?: { category: { id: string; name: string } }[];
}

function refNumber(id: string): string {
  return `MCQ-${id.slice(0, 8).toUpperCase()}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function parseTimeParts(scheduledTime: string): { h: number; m: number } {
  const tIdx = scheduledTime.indexOf("T");
  if (tIdx >= 0) {
    const d = new Date(scheduledTime);
    return { h: d.getHours(), m: d.getMinutes() };
  }
  const [hh, mm] = scheduledTime.split(":");
  return { h: parseInt(hh ?? "0", 10), m: parseInt(mm ?? "0", 10) };
}

function formatTime(scheduledTime: string): string {
  const { h, m } = parseTimeParts(scheduledTime);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeRange(scheduledTime: string, durationMinutes: number | null): string {
  const start = formatTime(scheduledTime);
  if (!durationMinutes) return start;
  const { h, m } = parseTimeParts(scheduledTime);
  const total = h * 60 + m + durationMinutes;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  const ampm = eh >= 12 ? "PM" : "AM";
  const h12 = eh % 12 === 0 ? 12 : eh % 12;
  return `${start} – ${h12}:${String(em).padStart(2, "0")} ${ampm}`;
}

// Build an ICS string for the booking
function buildIcs(booking: ApiBooking): string {
  const date = new Date(booking.scheduledDate);
  const { h, m } = parseTimeParts(booking.scheduledTime);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
  const end = new Date(start.getTime() + (booking.durationMinutes ?? 120) * 60 * 1000);
  const fmt = (d: Date) =>
    d.getUTCFullYear().toString().padStart(4, "0") +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    "Z";
  const addressParts = [booking.home?.address, booking.home?.city, booking.home?.state, booking.home?.zip]
    .filter(Boolean).join(", ");
  const summary = booking.tech?.name
    ? `MCQ Home Co. visit with ${booking.tech.name}`
    : "MCQ Home Co. service visit";
  const description = (booking.description ?? "Scheduled service visit").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MCQ Home Co.//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@mcqhome`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${addressParts}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function downloadIcs(booking: ApiBooking) {
  const ics = buildIcs(booking);
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mcq-home-${refNumber(booking.id)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Demo render (preserved) ─────────────────────────────────────────────────
function DemoConfirmation() {
  const [calendarAdded, setCalendarAdded] = useState(false);

  function handleAddToCalendar() {
    setCalendarAdded(true);
    setTimeout(() => setCalendarAdded(false), 3000);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated success hero */}
      <div className="bg-gradient-to-b from-primary-50 to-background px-5 pt-14 pb-8 flex flex-col items-center">
        <div className="relative mb-6">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-success shadow-[0_4px_24px_rgba(22,163,74,0.3)]"
            style={{ animation: "scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}
          >
            <Check size={42} className="text-white" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-success/20" style={{ animation: "ripple 1.2s ease-out 0.3s infinite" }} />
          <div className="absolute inset-0 rounded-full border-2 border-success/10" style={{ animation: "ripple 1.2s ease-out 0.6s infinite" }} />
        </div>

        <h1 className="text-[28px] font-bold text-text-primary text-center">You&apos;re all set!</h1>
        <p className="text-[15px] text-text-secondary text-center mt-2 leading-relaxed max-w-[280px]">
          Your booking is confirmed. We&apos;ll take it from here.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-surface border border-border px-4 py-2">
          <span className="text-[12px] text-text-secondary">Booking ref:</span>
          <span className="text-[12px] font-bold text-text-primary font-mono">MCQ-2026-0330</span>
        </div>
      </div>

      <style>{`
        @keyframes scale-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ripple { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>

      <div className="px-5 py-5 space-y-5">
        <Card padding="lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-4">Booking Summary</p>
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0"><Home size={16} className="text-primary" /></div>
              <div>
                <p className="text-[11px] text-text-tertiary">Service</p>
                <p className="text-[14px] font-semibold text-text-primary">General Home Maintenance</p>
                <p className="text-[12px] text-text-secondary">Bathroom exhaust fan + misc tasks</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0"><Calendar size={16} className="text-primary" /></div>
              <div>
                <p className="text-[11px] text-text-tertiary">Date & Time</p>
                <p className="text-[14px] font-semibold text-text-primary">Tuesday, April 1, 2026</p>
                <p className="text-[12px] text-text-secondary">10:00 AM – 12:00 PM</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0"><MapPin size={16} className="text-primary" /></div>
              <div>
                <p className="text-[11px] text-text-tertiary">Address</p>
                <p className="text-[14px] font-semibold text-text-primary">4821 Oak Hollow Dr</p>
                <p className="text-[12px] text-text-secondary">Plano, TX 75024</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-light shrink-0"><DollarSign size={16} className="text-success" /></div>
              <div className="flex-1">
                <p className="text-[11px] text-text-tertiary">Estimated Cost</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-text-primary">$0.00</p>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Covered by Pro Plan</span>
                </div>
                <p className="text-[12px] text-text-secondary">Parts billed separately if needed</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md" className="border border-success/20 bg-success-light">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white shadow-[0_2px_10px_rgba(79,149,152,0.25)]">AT</div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-text-primary">Anthony will be there</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Your dedicated tech · 4.9 ★ · 47 jobs</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-bold text-white">
              <Check size={10} strokeWidth={3} />Confirmed
            </span>
          </div>
        </Card>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-3 px-1">What happens next</p>
          <Card padding="md">
            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step.iconBg}`}>
                        <Icon size={18} className={step.iconColor} />
                      </div>
                      <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-text-primary text-[9px] font-bold text-white">{step.step}</div>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[13px] font-semibold text-text-primary leading-snug">{step.title}</p>
                      <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <button
          onClick={handleAddToCalendar}
          className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
            calendarAdded ? "border-success/30 bg-success-light" : "border-border bg-surface hover:border-primary/30 hover:bg-primary-50/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${calendarAdded ? "bg-success/15" : "bg-primary-50"}`}>
              <CalendarPlus size={18} className={calendarAdded ? "text-success" : "text-primary"} />
            </div>
            <span className={`text-[14px] font-semibold ${calendarAdded ? "text-success" : "text-text-primary"}`}>
              {calendarAdded ? "Added to calendar!" : "Add to Calendar"}
            </span>
          </div>
          {!calendarAdded && <ChevronRight size={16} className="text-text-tertiary" />}
          {calendarAdded && <Check size={16} className="text-success" strokeWidth={2.5} />}
        </button>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link href="/messages"><Button variant="outline" fullWidth icon={<MessageCircle size={16} />}>Messages</Button></Link>
          <Link href="/"><Button variant="primary" fullWidth icon={<Home size={16} />}>Back Home</Button></Link>
        </div>

        <p className="text-center text-[11px] text-text-tertiary pb-2">Need to reschedule? Message Anthony or call (972) 555-0100</p>
      </div>
    </div>
  );
}

// ─── Real-mode render ────────────────────────────────────────────────────────
function RealConfirmation() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Booking not found");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/bookings/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Booking not found" : "Failed to load booking");
        return r.json();
      })
      .then((data: ApiBooking) => {
        if (cancelled) return;
        setBooking(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load booking");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-7 w-7" />
          <p className="text-[13px] text-text-secondary">Loading your booking…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <Card padding="lg" className="max-w-sm w-full text-center">
          <p className="text-[16px] font-semibold text-text-primary mb-2">Booking not found</p>
          <p className="text-[13px] text-text-secondary mb-5">
            We couldn&apos;t find a booking for this confirmation link.
          </p>
          <Link href="/"><Button variant="primary" fullWidth>Back Home</Button></Link>
        </Card>
      </div>
    );
  }

  const ref = refNumber(booking.id);
  const dateLabel = formatDateLong(booking.scheduledDate);
  const timeRange = formatTimeRange(booking.scheduledTime, booking.durationMinutes);
  const techName = booking.tech?.name ?? "Pending assignment";
  const techInitials = booking.tech?.name
    ? booking.tech.name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
    : "?";
  const techPhone = booking.tech?.phone ?? null;
  const address = booking.home?.address ?? "Address on file";
  const cityLine = [
    [booking.home?.city, booking.home?.state].filter(Boolean).join(", "),
    booking.home?.zip,
  ].filter(Boolean).join(" ");
  const categoryLabel = booking.categories?.[0]?.category?.name ?? "Service Visit";
  const cost = booking.estimatedCost == null ? null : Number(booking.estimatedCost);

  function handleAddToCalendar() {
    if (!booking) return;
    downloadIcs(booking);
    setCalendarAdded(true);
    setTimeout(() => setCalendarAdded(false), 3000);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-primary-50 to-background px-5 pt-14 pb-8 flex flex-col items-center">
        <div className="relative mb-6">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-success shadow-[0_4px_24px_rgba(22,163,74,0.3)]"
            style={{ animation: "scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}
          >
            <Check size={42} className="text-white" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-success/20" style={{ animation: "ripple 1.2s ease-out 0.3s infinite" }} />
          <div className="absolute inset-0 rounded-full border-2 border-success/10" style={{ animation: "ripple 1.2s ease-out 0.6s infinite" }} />
        </div>

        <h1 className="text-[28px] font-bold text-text-primary text-center">You&apos;re all set!</h1>
        <p className="text-[15px] text-text-secondary text-center mt-2 leading-relaxed max-w-[280px]">
          Your booking is confirmed. We&apos;ll take it from here.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-surface border border-border px-4 py-2">
          <span className="text-[12px] text-text-secondary">Booking ref:</span>
          <span className="text-[12px] font-bold text-text-primary font-mono">{ref}</span>
        </div>
      </div>

      <style>{`
        @keyframes scale-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ripple { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>

      <div className="px-5 py-5 space-y-5">
        <Card padding="lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-4">Booking Summary</p>
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0"><Home size={16} className="text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-tertiary">Service</p>
                <p className="text-[14px] font-semibold text-text-primary">{categoryLabel}</p>
                {booking.description && (
                  <p className="text-[12px] text-text-secondary truncate">{booking.description.split("\n")[0]}</p>
                )}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0"><Calendar size={16} className="text-primary" /></div>
              <div>
                <p className="text-[11px] text-text-tertiary">Date & Time</p>
                <p className="text-[14px] font-semibold text-text-primary">{dateLabel}</p>
                <p className="text-[12px] text-text-secondary">{timeRange}</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0"><MapPin size={16} className="text-primary" /></div>
              <div>
                <p className="text-[11px] text-text-tertiary">Address</p>
                <p className="text-[14px] font-semibold text-text-primary">{address}</p>
                {cityLine && <p className="text-[12px] text-text-secondary">{cityLine}</p>}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-light shrink-0"><DollarSign size={16} className="text-success" /></div>
              <div className="flex-1">
                <p className="text-[11px] text-text-tertiary">Estimated Cost</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-text-primary">
                    {cost == null ? "TBD" : `$${cost.toFixed(2)}`}
                  </p>
                </div>
                <p className="text-[12px] text-text-secondary">Parts billed separately if needed</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md" className="border border-success/20 bg-success-light">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white shadow-[0_2px_10px_rgba(79,149,152,0.25)]">{techInitials}</div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-text-primary">
                {booking.tech ? `${techName} will be there` : "Tech assignment pending"}
              </p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                {booking.tech ? "Your dedicated tech" : "We'll match you with a pro shortly"}
              </p>
            </div>
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-bold text-white">
              <Check size={10} strokeWidth={3} />Confirmed
            </span>
          </div>
        </Card>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-3 px-1">What happens next</p>
          <Card padding="md">
            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step.iconBg}`}>
                        <Icon size={18} className={step.iconColor} />
                      </div>
                      <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-text-primary text-[9px] font-bold text-white">{step.step}</div>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[13px] font-semibold text-text-primary leading-snug">{step.title}</p>
                      <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <button
          onClick={handleAddToCalendar}
          className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
            calendarAdded ? "border-success/30 bg-success-light" : "border-border bg-surface hover:border-primary/30 hover:bg-primary-50/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${calendarAdded ? "bg-success/15" : "bg-primary-50"}`}>
              <CalendarPlus size={18} className={calendarAdded ? "text-success" : "text-primary"} />
            </div>
            <span className={`text-[14px] font-semibold ${calendarAdded ? "text-success" : "text-text-primary"}`}>
              {calendarAdded ? "Calendar file downloaded" : "Add to Calendar"}
            </span>
          </div>
          {!calendarAdded && <ChevronRight size={16} className="text-text-tertiary" />}
          {calendarAdded && <Check size={16} className="text-success" strokeWidth={2.5} />}
        </button>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link href="/messages"><Button variant="outline" fullWidth icon={<MessageCircle size={16} />}>Messages</Button></Link>
          <Link href="/"><Button variant="primary" fullWidth icon={<Home size={16} />}>Back Home</Button></Link>
        </div>

        <p className="text-center text-[11px] text-text-tertiary pb-2">
          Need to reschedule?{" "}
          {techPhone ? (
            <a href={`tel:${techPhone}`} className="underline">Call {techName.split(" ")[0]} at {techPhone}</a>
          ) : (
            <Link href="/messages" className="underline">Message your tech</Link>
          )}
        </p>
      </div>
    </div>
  );
}

function ConfirmationRouter() {
  const { isDemo, mounted } = useDemoMode();
  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }
  return isDemo ? <DemoConfirmation /> : <RealConfirmation />;
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConfirmationRouter />
    </Suspense>
  );
}
