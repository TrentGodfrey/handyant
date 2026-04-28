"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  ChevronLeft,
  Check,
  ChevronRight,
  ChevronDown,
  Search,
  Lock,
  Briefcase,
  UserPlus,
  Package,
  StickyNote,
  Clock,
  CalendarDays,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { DEMO_CUSTOMERS } from "@/lib/demoData";

type Mode = "job" | "block";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  primaryHome: { id: string; address: string; city: string | null } | null;
}

interface ClientView extends Client {
  address: string;
  initials: string;
}

const DEMO_CLIENTS: ClientView[] = DEMO_CUSTOMERS.map((c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  primaryHome: null,
  address: `${c.address}, ${c.city}`,
  initials: c.initials,
}));

const DURATIONS = ["1h", "1.5h", "2h", "2.5h", "3h", "4h+"];
const BLOCK_REASONS = ["Personal", "Supplies Run", "Admin", "Lunch", "Travel", "Other"];
const TIME_SLOTS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM",
];

interface CalendarDay {
  date: Date;
  dayNum: number;
  month: string;
  dayName: string;
}

// Demo calendar anchored to March 29, 2026 (used only when in demo mode).
const DEMO_ANCHOR = new Date(2026, 2, 29);

function buildDemoCalendar(): CalendarDay[] {
  const result: CalendarDay[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(DEMO_ANCHOR);
    d.setDate(DEMO_ANCHOR.getDate() + i);
    result.push({
      date: d,
      dayNum: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }),
      dayName: d.toLocaleString("default", { weekday: "short" }),
    });
  }
  return result;
}

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function buildLiveCalendar(): CalendarDay[] {
  const start = startOfWeekSunday(new Date());
  const result: CalendarDay[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result.push({
      date: d,
      dayNum: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }),
      dayName: d.toLocaleString("default", { weekday: "short" }),
    });
  }
  return result;
}

const DEMO_CALENDAR = buildDemoCalendar();

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";
const labelCls = "block text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function durationToMinutes(d: string): number {
  if (d === "4h+") return 240;
  if (d.endsWith("h")) {
    return Math.round(parseFloat(d.slice(0, -1)) * 60);
  }
  return 120;
}

function timeToHHMM(slot: string): string {
  // "9:00 AM" -> "09:00"
  const [time, ampm] = slot.split(" ");
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mStr}`;
}

function dateToISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ScheduleNewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ScheduleNewPageInner />
    </Suspense>
  );
}

function ScheduleNewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams?.get("mode") === "block" ? "block" : "job";
  const { isDemo, mounted } = useDemoMode();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Calendar: demo mode uses fixed March 2026 grid; live mode anchors to today.
  // Build inside the component so date math uses the current `new Date()`.
  const calendarDays: CalendarDay[] = isDemo ? DEMO_CALENDAR : buildLiveCalendar();
  const calendarAnchor: Date = isDemo ? DEMO_ANCHOR : startOfWeekSunday(new Date());
  const calendarOffset: number = calendarAnchor.getDay();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // Job mode
  const [clients, setClients] = useState<ClientView[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientView | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlot, setTimeSlot] = useState("9:00 AM");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [duration, setDuration] = useState("2h");
  const [description, setDescription] = useState("");
  const [hasParts, setHasParts] = useState(false);
  const [partsList, setPartsList] = useState("");
  const partsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [jobNotes, setJobNotes] = useState("");

  // Focus the parts textarea whenever the toggle flips on.
  useEffect(() => {
    if (hasParts) {
      partsTextareaRef.current?.focus();
    }
  }, [hasParts]);

  // Block mode
  const [blockDate, setBlockDate] = useState<Date | null>(null);
  const [blockStart, setBlockStart] = useState("12:00 PM");
  const [blockEnd, setBlockEnd] = useState("1:00 PM");
  const [blockShowStartDropdown, setBlockShowStartDropdown] = useState(false);
  const [blockShowEndDropdown, setBlockShowEndDropdown] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [blockNotes, setBlockNotes] = useState("");

  // Fetch clients on mount (skip in demo).
  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setClients(DEMO_CLIENTS);
      return;
    }
    fetch("/api/admin/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Client[]) => {
        if (!Array.isArray(data)) return;
        setClients(
          data.map((c) => ({
            ...c,
            address: c.primaryHome
              ? `${c.primaryHome.address}${c.primaryHome.city ? `, ${c.primaryHome.city}` : ""}`
              : "No address on file",
            initials: initialsOf(c.name),
          }))
        );
      })
      .catch(() => {
        // leave empty list
      });
  }, [isDemo, mounted]);

  const filteredClients = clientSearch.trim()
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.address.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients;

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  async function handleSubmitBlock() {
    if (!blockDate) {
      setSubmitError("Please pick a date.");
      return;
    }
    if (isDemo) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const dateIso = dateToISODate(blockDate);
      const startIso = `${dateIso}T${timeToHHMM(blockStart)}:00`;
      const endIso = `${dateIso}T${timeToHHMM(blockEnd)}:00`;
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
        throw new Error("Invalid time selection.");
      }
      if (endMs <= startMs) {
        throw new Error("End time must be after start time.");
      }
      const reasonParts = [blockReason ?? "", blockNotes].filter(Boolean);
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: new Date(startIso).toISOString(),
          endAt: new Date(endIso).toISOString(),
          reason: reasonParts.join(" — ") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not block time.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitJob() {
    if (!selectedClient || !selectedDate) {
      setSubmitError("Please pick a client and a date.");
      return;
    }
    if (isDemo) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Only send parts when the toggle is on AND the textarea has content.
      // Split on newlines so each line becomes its own Part row.
      const partItems =
        hasParts && partsList.trim()
          ? partsList
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
          : [];
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedClient.id,
          homeId: selectedClient.primaryHome?.id ?? null,
          scheduledDate: dateToISODate(selectedDate),
          scheduledTime: timeToHHMM(timeSlot),
          description: description || null,
          durationMinutes: durationToMinutes(duration),
          categoryIds: [],
          customerNotes: jobNotes || null,
          parts: partItems,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const created = await res.json();
      router.push(`/jobs/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not create booking.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background px-5 pt-14 pb-24 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-success-light">
            <Check size={38} className="text-success" strokeWidth={2.5} />
          </div>
          <h2 className="text-[26px] font-bold text-text-primary">
            {mode === "job" ? "Job Added!" : "Time Blocked!"}
          </h2>
          <p className="mt-2 text-[15px] text-text-secondary">
            {mode === "job"
              ? `${selectedClient?.name ?? "Client"} · ${timeSlot} · ${selectedDate ? formatDate(selectedDate) : ""}`
              : `${blockReason ?? "Block"} · ${blockStart}–${blockEnd} · ${blockDate ? formatDate(blockDate) : ""}`}
          </p>
          <div className="mt-8 space-y-3">
            <Link href="/schedule">
              <Button variant="primary" size="lg" fullWidth icon={<CalendarDays size={17} />}>
                View Schedule
              </Button>
            </Link>
            <Button variant="outline" size="lg" fullWidth onClick={() => { setSubmitted(false); setSelectedClient(null); setSelectedDate(null); setDescription(""); }}>
              Add Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/schedule"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Schedule
        </Link>
        <h1 className="text-[22px] font-bold text-text-primary mb-4">
          {mode === "job" ? "Add Job" : "Block Time"}
        </h1>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-surface-secondary p-1 gap-1">
          <button
            onClick={() => setMode("job")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition-all duration-150 ${
              mode === "job"
                ? "bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Briefcase size={14} />
            New Job
          </button>
          <button
            onClick={() => setMode("block")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition-all duration-150 ${
              mode === "block"
                ? "bg-text-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Lock size={14} />
            Block Time
          </button>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* ─────────── NEW JOB MODE ─────────── */}
        {mode === "job" && (
          <>
            {/* Client selector */}
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <Search size={11} />
                  Client
                </span>
              </label>
              <div className="relative">
                {selectedClient ? (
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                    className="w-full flex items-center gap-3 rounded-xl border border-primary bg-primary-50 px-4 py-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
                      <span className="text-[12px] font-bold text-white">{selectedClient.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-text-primary">{selectedClient.name}</p>
                      <p className="text-[11px] text-text-tertiary truncate">{selectedClient.address}</p>
                    </div>
                    <Check size={16} className="text-primary shrink-0" />
                  </button>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search size={15} className="text-text-tertiary" />
                    </div>
                    <input
                      className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                      placeholder="Search existing clients..."
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                    />
                  </div>
                )}

                {/* Dropdown */}
                {showClientDropdown && !selectedClient && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl border border-border bg-surface shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border last:border-0"
                          onMouseDown={() => { setSelectedClient(c); setShowClientDropdown(false); setClientSearch(""); }}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50">
                            <span className="text-[12px] font-bold text-primary">{c.initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-text-primary">{c.name}</p>
                            <p className="text-[11px] text-text-tertiary truncate">{c.address}</p>
                          </div>
                          <ChevronRight size={14} className="text-text-tertiary shrink-0" />
                        </button>
                      ))}
                    </div>
                    <Link
                      href="/homes/new"
                      className="flex items-center gap-2 px-4 py-3 border-t border-border bg-primary-50 text-[13px] font-semibold text-primary hover:bg-primary-100 transition-colors"
                    >
                      <UserPlus size={15} />
                      Add New Client
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar */}
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={11} />
                  Date
                </span>
              </label>
              <Card padding="sm">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-center text-[10px] font-bold text-text-tertiary py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calendarOffset }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {calendarDays.map((day) => {
                    const isSelected =
                      selectedDate?.toDateString() === day.date.toDateString();
                    const isToday = isDemo
                      ? day.date.toDateString() === DEMO_ANCHOR.toDateString()
                      : day.date.toDateString() === todayMidnight.toDateString();
                    const isPast = !isDemo && day.date < todayMidnight;
                    return (
                      <button
                        key={day.date.toDateString()}
                        onClick={() => !isPast && setSelectedDate(day.date)}
                        disabled={isPast}
                        className={`aspect-square rounded-xl text-[13px] font-semibold transition-all duration-150 flex flex-col items-center justify-center ${
                          isPast
                            ? "text-text-tertiary/40 cursor-not-allowed"
                            : isSelected
                            ? "bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.30)]"
                            : isToday
                            ? "border-2 border-primary text-primary bg-primary-50"
                            : "text-text-primary hover:bg-surface-secondary active:bg-border"
                        }`}
                      >
                        <span>{day.dayNum}</span>
                        {isToday && !isSelected && (
                          <span className="text-[7px] font-bold text-primary leading-none">today</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedDate && (
                  <p className="mt-3 text-center text-[12px] font-semibold text-primary border-t border-border pt-3">
                    {formatDate(selectedDate)}
                  </p>
                )}
              </Card>
            </div>

            {/* Time slot */}
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={11} />
                  Start Time
                </span>
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTimeDropdown((v) => !v)}
                  className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-[15px] font-semibold text-text-primary focus:outline-none"
                >
                  <span>{timeSlot}</span>
                  <ChevronDown size={16} className="text-text-tertiary" />
                </button>
                {showTimeDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl border border-border bg-surface shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="max-h-52 overflow-y-auto">
                      {TIME_SLOTS.map((t) => (
                        <button
                          key={t}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-[14px] transition-colors border-b border-border last:border-0 ${
                            timeSlot === t
                              ? "bg-primary-50 text-primary font-semibold"
                              : "text-text-primary hover:bg-surface-secondary"
                          }`}
                          onClick={() => { setTimeSlot(t); setShowTimeDropdown(false); }}
                        >
                          {t}
                          {timeSlot === t && <Check size={14} className="text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className={labelCls}>Estimated Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`rounded-xl border-2 px-4 py-2 text-[13px] font-semibold transition-all duration-150 ${
                      duration === d
                        ? "border-primary bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.20)]"
                        : "border-border bg-surface text-text-secondary hover:border-primary/30"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Task description */}
            <div>
              <label className={labelCls}>Task Description</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Describe the work to be done..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Parts toggle */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`${labelCls} mb-0`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Package size={11} />
                    Parts Needed?
                  </span>
                </label>
                <button
                  onClick={() => setHasParts((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                    hasParts ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      hasParts ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {hasParts && (
                <textarea
                  ref={partsTextareaRef}
                  className={`${inputCls} resize-none animate-fade-in`}
                  rows={2}
                  placeholder="List parts needed, one per line — e.g. Moen 7594ESRS faucet"
                  value={partsList}
                  onChange={(e) => setPartsList(e.target.value)}
                />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <StickyNote size={11} />
                  Notes
                </span>
              </label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Gate code, access instructions, anything to remember..."
                value={jobNotes}
                onChange={(e) => setJobNotes(e.target.value)}
              />
            </div>

            {submitError && (
              <p className="text-[13px] font-medium text-error">{submitError}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<CalendarDays size={17} />}
              onClick={handleSubmitJob}
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add to Schedule"}
            </Button>
          </>
        )}

        {/* ─────────── BLOCK TIME MODE ─────────── */}
        {mode === "block" && (
          <>
            {/* Calendar */}
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={11} />
                  Date
                </span>
              </label>
              <Card padding="sm">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-center text-[10px] font-bold text-text-tertiary py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calendarOffset }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {calendarDays.map((day) => {
                    const isSelected = blockDate?.toDateString() === day.date.toDateString();
                    const isToday = isDemo
                      ? day.date.toDateString() === DEMO_ANCHOR.toDateString()
                      : day.date.toDateString() === todayMidnight.toDateString();
                    const isPast = !isDemo && day.date < todayMidnight;
                    return (
                      <button
                        key={day.date.toDateString()}
                        onClick={() => !isPast && setBlockDate(day.date)}
                        disabled={isPast}
                        className={`aspect-square rounded-xl text-[13px] font-semibold transition-all duration-150 flex flex-col items-center justify-center ${
                          isPast
                            ? "text-text-tertiary/40 cursor-not-allowed"
                            : isSelected
                            ? "bg-text-primary text-white shadow-sm"
                            : isToday
                            ? "border-2 border-border text-text-primary bg-surface-secondary"
                            : "text-text-primary hover:bg-surface-secondary active:bg-border"
                        }`}
                      >
                        <span>{day.dayNum}</span>
                        {isToday && !isSelected && (
                          <span className="text-[7px] font-bold text-text-tertiary leading-none">today</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {blockDate && (
                  <p className="mt-3 text-center text-[12px] font-semibold text-text-primary border-t border-border pt-3">
                    {formatDate(blockDate)}
                  </p>
                )}
              </Card>
            </div>

            {/* Time range */}
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={11} />
                  Time Range
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Start time */}
                <div className="relative">
                  <p className="text-[11px] font-semibold text-text-tertiary mb-1">From</p>
                  <button
                    onClick={() => { setBlockShowStartDropdown((v) => !v); setBlockShowEndDropdown(false); }}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-3 text-[14px] font-semibold text-text-primary"
                  >
                    {blockStart}
                    <ChevronDown size={14} className="text-text-tertiary" />
                  </button>
                  {blockShowStartDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-surface shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden">
                      <div className="max-h-44 overflow-y-auto">
                        {TIME_SLOTS.map((t) => (
                          <button
                            key={t}
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-[13px] border-b border-border last:border-0 ${
                              blockStart === t ? "bg-primary-50 text-primary font-semibold" : "text-text-primary hover:bg-surface-secondary"
                            }`}
                            onClick={() => { setBlockStart(t); setBlockShowStartDropdown(false); }}
                          >
                            {t}
                            {blockStart === t && <Check size={12} className="text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* End time */}
                <div className="relative">
                  <p className="text-[11px] font-semibold text-text-tertiary mb-1">To</p>
                  <button
                    onClick={() => { setBlockShowEndDropdown((v) => !v); setBlockShowStartDropdown(false); }}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-3 text-[14px] font-semibold text-text-primary"
                  >
                    {blockEnd}
                    <ChevronDown size={14} className="text-text-tertiary" />
                  </button>
                  {blockShowEndDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-surface shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden">
                      <div className="max-h-44 overflow-y-auto">
                        {TIME_SLOTS.map((t) => (
                          <button
                            key={t}
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-[13px] border-b border-border last:border-0 ${
                              blockEnd === t ? "bg-primary-50 text-primary font-semibold" : "text-text-primary hover:bg-surface-secondary"
                            }`}
                            onClick={() => { setBlockEnd(t); setBlockShowEndDropdown(false); }}
                          >
                            {t}
                            {blockEnd === t && <Check size={12} className="text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reason chips */}
            <div>
              <label className={labelCls}>Reason</label>
              <div className="flex flex-wrap gap-2">
                {BLOCK_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setBlockReason(blockReason === r ? null : r)}
                    className={`rounded-full border-2 px-4 py-1.5 text-[13px] font-semibold transition-all duration-150 ${
                      blockReason === r
                        ? "border-text-primary bg-text-primary text-white"
                        : "border-border bg-surface text-text-secondary hover:border-text-secondary/30"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes (Optional)</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Any details about this blocked time..."
                value={blockNotes}
                onChange={(e) => setBlockNotes(e.target.value)}
              />
            </div>

            {submitError && (
              <p className="text-[13px] font-medium text-error">{submitError}</p>
            )}

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              icon={<Lock size={17} />}
              onClick={handleSubmitBlock}
              disabled={submitting}
            >
              {submitting ? "Blocking…" : "Block Time"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
