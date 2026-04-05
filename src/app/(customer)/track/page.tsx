"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  ArrowLeft, Phone, MessageCircle, Star, ChevronDown, ChevronUp,
  CheckCircle2, Circle, MapPin, Clock, Share2, Truck, Check,
  Wrench, Package, DollarSign,
} from "lucide-react";

// ─── Types & Data ──────────────────────────────────────────────────────────

type Phase = 0 | 1 | 2 | 3;

const phases = [
  { label: "Confirmed", time: "9:00 AM", description: "Appointment confirmed" },
  { label: "On the Way", time: "9:12 AM", description: "Anthony is headed to you" },
  { label: "In Progress", time: "9:24 AM", description: "Work has started" },
  { label: "Complete", time: "10:48 AM", description: "All tasks finished" },
] as const;

const tasks = [
  { label: "Replace kitchen faucet", done: false },
  { label: "Fix garage door sensor", done: false },
];

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
      <div className="absolute bottom-0 left-2 text-[10px] text-text-tertiary font-medium">Anthony</div>
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

function ProgressTimeline({ currentPhase }: { currentPhase: Phase }) {
  return (
    <div className="relative pl-8">
      {phases.map((step, i) => {
        const isComplete = i < currentPhase;
        const isCurrent = i === currentPhase;
        const isFuture = i > currentPhase;
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
                {(isComplete || isCurrent) && (
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
  const [phase, setPhase] = useState<Phase>(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const advancePhase = () => setPhase((p) => (p < 3 ? ((p + 1) as Phase) : 0));

  const statusConfig = {
    0: { label: "Confirmed", sub: "Tuesday, April 1 · 9:00 AM – 12:00 PM", color: "bg-primary", textColor: "text-white", pulse: false },
    1: { label: "On the Way", sub: "Anthony is heading to your location", color: "bg-primary", textColor: "text-white", pulse: true },
    2: { label: "In Progress", sub: "Anthony is working at your home", color: "bg-success", textColor: "text-white", pulse: false },
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
          onClick={advancePhase}
          className="w-full active:scale-[0.985] transition-all duration-200"
          aria-label="Advance demo phase"
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

            {/* Demo hint */}
            <div className="relative z-10 mt-3 flex items-center justify-center">
              <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">
                Demo: tap to advance
              </span>
            </div>
          </div>
        </button>

        {/* ── Tech Card ───────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[17px] font-bold text-white">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary">Anthony B.</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Your Handyman</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={12} className="text-warning fill-warning" />
                <span className="text-[12px] font-semibold text-text-primary">4.9</span>
                <span className="text-[11px] text-text-tertiary">(127 reviews)</span>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <button className="h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center active:scale-95 active:bg-surface-secondary transition-all">
                <MessageCircle size={17} className="text-primary" />
              </button>
              <button className="h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center active:scale-95 active:bg-surface-secondary transition-all">
                <Phone size={17} className="text-success" />
              </button>
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
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[40px] font-extrabold text-primary leading-none tracking-tight">12</span>
                  <span className="text-[16px] font-semibold text-primary">min</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Clock size={13} />
                  <span className="text-[12px]">Arriving ~9:24 AM</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary mt-1">
                  <MapPin size={13} />
                  <span className="text-[12px]">3.2 miles away</span>
                </div>
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
                <p className="text-[13px] font-semibold text-text-primary">4821 Oak Hollow Dr</p>
                <p className="text-[11px] text-text-tertiary">Plano, TX 75024</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Progress Timeline ────────────────────────────────────────── */}
        <Card>
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-4">Progress</p>
          <ProgressTimeline currentPhase={phase} />
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
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Tasks</p>
                <div className="space-y-2.5">
                  {tasks.map((task, i) => {
                    const checked = phase >= 2;
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

              {/* Parts */}
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Parts</p>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-secondary">
                  <Package size={15} className="text-text-tertiary shrink-0" />
                  <span className="text-[13px] text-text-primary">Moen 7594ESRS Arbor Faucet</span>
                </div>
              </div>

              {/* Cost */}
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Estimated Cost</p>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-secondary">
                  <DollarSign size={15} className="text-success shrink-0" />
                  <span className="text-[16px] font-bold text-text-primary">$340</span>
                  <span className="text-[11px] text-text-tertiary">labor + materials</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

      </div>

      {/* ── Bottom Action Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 lg:left-64 z-30">
        <div className="lg:max-w-3xl lg:mx-auto bg-surface/95 backdrop-blur-md border-t border-border px-5 py-3.5">
          {phase === 0 && (
            <div className="flex gap-3">
              <Button variant="outline" fullWidth icon={<MessageCircle size={16} />}>
                Message Anthony
              </Button>
              <Button variant="primary" fullWidth icon={<Phone size={16} />}>
                Call Anthony
              </Button>
            </div>
          )}

          {phase === 1 && (
            <Button variant="primary" fullWidth size="lg" icon={<Share2 size={16} />}>
              Share ETA
            </Button>
          )}

          {phase === 2 && (
            <Button variant="primary" fullWidth size="lg" icon={<MessageCircle size={16} />}>
              Message Anthony
            </Button>
          )}

          {phase === 3 && (
            <Link href="/account/rate/1" className="block">
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
