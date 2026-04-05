"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, Calendar, Clock, MapPin, DollarSign, MessageCircle,
  Home, ChevronRight, CalendarPlus, Bell, Package, Star,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";

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
    title: "Anthony confirms parts",
    desc: "He'll reach out if any parts need to be sourced ahead of your visit.",
  },
  {
    icon: Star,
    iconBg: "bg-[#FFFBEB]",
    iconColor: "text-warning",
    step: "3",
    title: "Rate your experience",
    desc: "After the job, you'll be asked to leave a quick review for Anthony.",
  },
];

export default function BookingConfirmationPage() {
  const [calendarAdded, setCalendarAdded] = useState(false);

  function handleAddToCalendar() {
    setCalendarAdded(true);
    setTimeout(() => setCalendarAdded(false), 3000);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated success hero */}
      <div className="bg-gradient-to-b from-primary-50 to-background px-5 pt-14 pb-8 flex flex-col items-center">
        {/* Animated checkmark */}
        <div className="relative mb-6">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-success shadow-[0_4px_24px_rgba(22,163,74,0.3)]"
            style={{
              animation: "scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            }}
          >
            <Check size={42} className="text-white" strokeWidth={3} />
          </div>
          {/* Ripple rings */}
          <div
            className="absolute inset-0 rounded-full border-4 border-success/20"
            style={{ animation: "ripple 1.2s ease-out 0.3s infinite" }}
          />
          <div
            className="absolute inset-0 rounded-full border-2 border-success/10"
            style={{ animation: "ripple 1.2s ease-out 0.6s infinite" }}
          />
        </div>

        <h1 className="text-[28px] font-bold text-text-primary text-center">You're all set!</h1>
        <p className="text-[15px] text-text-secondary text-center mt-2 leading-relaxed max-w-[280px]">
          Your booking is confirmed. We'll take it from here.
        </p>

        {/* Booking ref */}
        <div className="mt-4 flex items-center gap-2 rounded-full bg-surface border border-border px-4 py-2">
          <span className="text-[12px] text-text-secondary">Booking ref:</span>
          <span className="text-[12px] font-bold text-text-primary font-mono">HA-2026-0330</span>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <div className="px-5 py-5 space-y-5">
        {/* Booking summary */}
        <Card padding="lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-4">
            Booking Summary
          </p>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                <Home size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary">Service</p>
                <p className="text-[14px] font-semibold text-text-primary">General Home Maintenance</p>
                <p className="text-[12px] text-text-secondary">Bathroom exhaust fan + misc tasks</p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                <Calendar size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary">Date & Time</p>
                <p className="text-[14px] font-semibold text-text-primary">Tuesday, April 1, 2026</p>
                <p className="text-[12px] text-text-secondary">10:00 AM – 12:00 PM</p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                <MapPin size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary">Address</p>
                <p className="text-[14px] font-semibold text-text-primary">4821 Oak Hollow Dr</p>
                <p className="text-[12px] text-text-secondary">Plano, TX 75024</p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-light shrink-0">
                <DollarSign size={16} className="text-success" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-text-tertiary">Estimated Cost</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-text-primary">$0.00</p>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                    Covered by Pro Plan
                  </span>
                </div>
                <p className="text-[12px] text-text-secondary">Parts billed separately if needed</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tech confirmation */}
        <Card padding="md" className="border border-success/20 bg-success-light">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white shadow-[0_2px_10px_rgba(37,99,235,0.25)]">
                AT
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-text-primary">Anthony will be there</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Your dedicated tech · 4.9 ★ · 47 jobs</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-bold text-white">
              <Check size={10} strokeWidth={3} />
              Confirmed
            </span>
          </div>
        </Card>

        {/* What happens next */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-3 px-1">
            What happens next
          </p>
          <Card padding="md">
            <div className="space-y-4">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step.iconBg}`}>
                        <Icon size={18} className={step.iconColor} />
                      </div>
                      <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-text-primary text-[9px] font-bold text-white">
                        {step.step}
                      </div>
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

        {/* Add to calendar */}
        <button
          onClick={handleAddToCalendar}
          className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
            calendarAdded
              ? "border-success/30 bg-success-light"
              : "border-border bg-surface hover:border-primary/30 hover:bg-primary-50/40"
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

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link href="/messages">
            <Button variant="outline" fullWidth icon={<MessageCircle size={16} />}>
              Messages
            </Button>
          </Link>
          <Link href="/">
            <Button variant="primary" fullWidth icon={<Home size={16} />}>
              Back Home
            </Button>
          </Link>
        </div>

        <p className="text-center text-[11px] text-text-tertiary pb-2">
          Need to reschedule? Message Anthony or call (972) 555-0100
        </p>
      </div>
    </div>
  );
}
