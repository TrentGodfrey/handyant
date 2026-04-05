"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  Search, MapPin, Clock, Star, ArrowRight, Camera,
  MessageCircle, Phone, Wrench, Droplets, Lightbulb,
  PaintBucket, Hammer, Zap, Layers, ChevronRight, CheckCircle2,
  CalendarDays, BadgeCheck, Users, CalendarPlus, Sparkles,
} from "lucide-react";

// ─── Static Data (UI config, not mock) ──────────────────────────────────────

const quickCategories = [
  { icon: Wrench, label: "General", color: "text-primary", bg: "bg-primary-50" },
  { icon: Droplets, label: "Plumbing", color: "text-[#0EA5E9]", bg: "bg-[#F0F9FF]" },
  { icon: Lightbulb, label: "Electrical", color: "text-warning", bg: "bg-warning-light" },
  { icon: PaintBucket, label: "Painting", color: "text-accent-purple", bg: "bg-[#F5F3FF]" },
  { icon: Hammer, label: "Carpentry", color: "text-accent-coral", bg: "bg-[#FFF7ED]" },
  { icon: Zap, label: "Smart Home", color: "text-success", bg: "bg-success-light" },
  { icon: Layers, label: "Conversions", color: "text-[#F97316]", bg: "bg-[#FFF7ED]" },
];

const trustStats = [
  { icon: BadgeCheck, label: "Licensed & Insured", sub: "TX Contractor #TXH-2824", color: "text-primary" },
  { icon: Star, label: "4.9 Rating", sub: "86 reviews", color: "text-warning" },
  { icon: Users, label: "DFW Since 2024", sub: "Justin · Plano · Frisco", color: "text-success" },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingData {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  description: string | null;
  tasks: { label: string; done: boolean }[];
  tech: { name: string } | null;
  home: { address: string; city: string | null } | null;
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

  const isDemo = typeof document !== "undefined" && document.cookie.includes("demo_mode=true");

  const userName = isDemo
    ? "Sarah"
    : session?.user?.name?.split(" ")[0] || "there";
  const userInitials = isDemo
    ? "SH"
    : session?.user?.name
      ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?";

  useEffect(() => {
    if (isDemo) {
      setNextBooking(DEMO_BOOKING);
      setLoading(false);
      return;
    }
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((bookings) => {
        const upcoming = Array.isArray(bookings)
          ? bookings.find((b: BookingData) => ["pending", "confirmed", "in_progress"].includes(b.status))
          : null;
        setNextBooking(upcoming || null);
      })
      .catch(() => setNextBooking(null))
      .finally(() => setLoading(false));
  }, [isDemo]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Header + Search ─────────────────────────────────────────── */}
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

        <Link href="/services">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3 active:scale-[0.99] transition-transform">
            <Search size={18} className="text-text-tertiary shrink-0" />
            <span className="text-[14px] text-text-tertiary">Search services…</span>
          </div>
        </Link>
      </div>

      <div className="px-5 pt-4">

        {/* ── Quick Category Chips ────────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {quickCategories.map((cat) => (
              <Link key={cat.label} href="/services">
                <div className="flex flex-col items-center gap-1.5 shrink-0 active:scale-[0.96] transition-transform">
                  <div className={`h-12 w-12 rounded-2xl ${cat.bg} flex items-center justify-center`}>
                    <cat.icon size={22} className={cat.color} />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Track Banner (only if upcoming booking) ────────────────── */}
        {nextBooking && nextBooking.tech && (
          <div className="mb-5">
            <Link href="/track">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-[#1D4ED8] p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-white">
                      {nextBooking.tech.name} is {nextBooking.status === "confirmed" ? "confirmed" : "scheduled"}
                    </p>
                    <p className="text-[12px] text-white/70 mt-0.5">Tap to track on the day of your visit</p>
                  </div>
                  <div className="relative ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shrink-0">
                    <MapPin size={20} className="text-white" />
                    <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
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
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </Card>
          ) : nextBooking ? (
            <Card className="border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
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
                <div className="bg-white/70 rounded-lg px-3.5 py-3 mb-4 border border-border-light space-y-2">
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
                <button className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-text-primary active:bg-surface-secondary transition-colors">
                  <Phone size={15} className="text-success" />
                  Call
                </button>
              </div>
            </Card>
          ) : (
            <Card className="border border-dashed border-border">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                    <CalendarDays size={28} className="text-primary" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-sm">
                    <Sparkles size={12} className="text-white" />
                  </div>
                </div>

                <h3 className="text-[16px] font-bold text-text-primary">Book your first visit</h3>
                <p className="mt-1.5 max-w-[220px] text-[13px] leading-relaxed text-text-secondary">
                  Your home maintenance starts here. Schedule a visit and we&apos;ll handle the rest.
                </p>

                <Link href="/book" className="mt-4 w-full">
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] active:bg-primary-dark transition-colors">
                    <CalendarPlus size={16} />
                    Book a Visit
                  </button>
                </Link>

                <p className="mt-3 text-[11px] text-text-tertiary">
                  DFW Metro · Licensed &amp; Insured
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* ── Quick Actions Row ─────────────────────────────────────── */}
        {nextBooking && (
          <div className="mb-5 flex gap-2.5">
            <Link href="/book" className="flex-1">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 active:bg-surface-secondary transition-colors">
                <CalendarDays size={18} className="text-primary" />
                <span className="text-[11px] font-semibold text-text-secondary">Reschedule</span>
              </div>
            </Link>
            <Link href="/account/home/photos" className="flex-1">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 active:bg-surface-secondary transition-colors">
                <Camera size={18} className="text-primary" />
                <span className="text-[11px] font-semibold text-text-secondary">Add Photos</span>
              </div>
            </Link>
            <Link href="/account/receipts" className="flex-1">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 active:bg-surface-secondary transition-colors">
                <Clock size={18} className="text-primary" />
                <span className="text-[11px] font-semibold text-text-secondary">Past Visits</span>
              </div>
            </Link>
          </div>
        )}

        {/* ── Trust Indicators ───────────────────────────────────────── */}
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2.5">
            Why Choose Us
          </h2>
          <div className="grid grid-cols-3 gap-2">
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-6 active:scale-[0.99] transition-transform">
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/8" />
            <div className="absolute -bottom-8 right-12 h-24 w-24 rounded-full bg-white/5" />
            <div className="absolute top-4 right-24 h-8 w-8 rounded-full bg-white/10" />

            <div className="relative z-10">
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
        <div className="mt-5 mb-2">
          <div className="rounded-2xl bg-gradient-to-r from-primary-50 to-white border border-primary-100 px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-text-primary">Basic Plan · Free</p>
                <Link href="/account/plans" className="text-[12px] font-medium text-primary mt-0.5 inline-block">
                  Upgrade to Pro for priority scheduling →
                </Link>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 shrink-0">
                <Sparkles size={16} className="text-primary" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
