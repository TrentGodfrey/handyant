"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Lock,
  CalendarDays,
  Layers,
  CalendarPlus,
  Sun,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { demoCustomerBy } from "@/lib/demoData";

const demoWeekDays = [
  { day: "Mon", date: 30, month: "Mar", jobs: 4, hours: 7.5 },
  { day: "Tue", date: 31, month: "Mar", jobs: 3, hours: 6 },
  { day: "Wed", date: 1, month: "Apr", jobs: 5, hours: 8 },
  { day: "Thu", date: 2, month: "Apr", jobs: 2, hours: 4 },
  { day: "Fri", date: 3, month: "Apr", jobs: 3, hours: 5.5 },
  { day: "Sat", date: 4, month: "Apr", jobs: 0, hours: 0 },
  { day: "Sun", date: 5, month: "Apr", jobs: 0, hours: 0 },
];

type JobStatus = "confirmed" | "pending" | "in-progress" | "needs-parts" | "scheduled" | "completed" | "cancelled";

interface ScheduleItem {
  time: string;
  label: string;
  type: "job" | "block";
  duration: string;
  address?: string;
  status?: JobStatus;
  tasks?: number;
  details?: string;
  homeId?: number | string;
  bookingId?: string;
}

const demoScheduleByDay: Record<number, ScheduleItem[]> = {
  30: [
    { time: "8:00 AM", label: "Part Shopping", type: "block", duration: "45 min", details: "Home Depot — Broan fan motor, caulk" },
    { time: "9:00 AM", label: demoCustomerBy("1")!.name, type: "job", duration: "2h", address: "4821 Oak Hollow Dr, Plano", status: "confirmed", tasks: 2, homeId: 1 },
    { time: "11:30 AM", label: demoCustomerBy("2")!.name, type: "job", duration: "1.5h", address: "1205 Elm Creek Ct, Frisco", status: "confirmed", tasks: 3, homeId: 2 },
    { time: "1:00 PM", label: "Lunch Break", type: "block", duration: "1h", details: "" },
    { time: "2:00 PM", label: demoCustomerBy("3")!.name, type: "job", duration: "2h", address: "890 Sunset Ridge, Roanoke", status: "pending", tasks: 2, homeId: 3 },
    { time: "4:30 PM", label: "Team Meeting", type: "block", duration: "30 min", details: "Weekly sync — Zoom" },
  ],
  31: [
    { time: "9:00 AM", label: "Tom Brady", type: "job", duration: "1.5h", address: "102 Birchwood Ln, Allen", status: "confirmed", tasks: 2, homeId: 4 },
    { time: "11:00 AM", label: "Drive Time", type: "block", duration: "30 min", details: "" },
    { time: "11:30 AM", label: "Carol White", type: "job", duration: "2h", address: "552 Maple Ave, Prosper", status: "scheduled", tasks: 4, homeId: 5 },
    { time: "2:30 PM", label: "Kevin Nguyen", type: "job", duration: "1h", address: "87 Pine Ct, McKinney", status: "confirmed", tasks: 1, homeId: 6 },
  ],
  1: [
    { time: "8:30 AM", label: "Supply Run", type: "block", duration: "1h", details: "Lowe's — drywall, screws, paint" },
    { time: "9:30 AM", label: "Diana Ross", type: "job", duration: "2.5h", address: "310 Lakeview Dr, Frisco", status: "confirmed", tasks: 3, homeId: 7 },
    { time: "12:00 PM", label: "Lunch", type: "block", duration: "45 min", details: "" },
    { time: "1:00 PM", label: "Marcus Lee", type: "job", duration: "1h", address: "720 Elm St, Plano", status: "needs-parts", tasks: 2, homeId: 8 },
    { time: "2:30 PM", label: "Sandra Kim", type: "job", duration: "2h", address: "450 Redwood Blvd, Frisco", status: "confirmed", tasks: 3, homeId: 9 },
    { time: "5:00 PM", label: "End-of-day debrief", type: "block", duration: "20 min", details: "Notes + photos upload" },
  ],
  2: [
    { time: "10:00 AM", label: "Greg Holt", type: "job", duration: "2h", address: "1800 River Rd, Denton", status: "confirmed", tasks: 3, homeId: 10 },
    { time: "1:00 PM", label: "Jake Turner", type: "job", duration: "2h", address: "99 Cedar Ln, Celina", status: "pending", tasks: 2, homeId: 11 },
  ],
  3: [
    { time: "9:00 AM", label: "Amy Foster", type: "job", duration: "1.5h", address: "215 Sundown Ave, Plano", status: "confirmed", tasks: 2, homeId: 12 },
    { time: "11:00 AM", label: "Peter Hall", type: "job", duration: "2h", address: "640 Willow Ct, Allen", status: "confirmed", tasks: 4, homeId: 13 },
    { time: "2:00 PM", label: "Rita Patel", type: "job", duration: "1h", address: "803 Birch Loop, Frisco", status: "scheduled", tasks: 1, homeId: 14 },
  ],
};

const emptyDay: ScheduleItem[] = [];

interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number | null;
  description: string | null;
  customer: { id: string; name: string } | null;
  home: { id: string; address: string; city: string | null } | null;
  tasks: { id: string }[];
}

interface ApiAvailabilityBlock {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

const STATUS_MAP: Record<string, JobStatus> = {
  confirmed: "confirmed",
  pending: "pending",
  in_progress: "in-progress",
  needs_parts: "needs-parts",
  scheduled: "scheduled",
  completed: "completed",
  cancelled: "cancelled",
};

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setDate(out.getDate() + diff);
  return out;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startStr = weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const endStr = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function formatTime(scheduledTime: string): string {
  // API returns ISO datetime like "1970-01-01T09:00:00.000Z" — extract HH:mm
  const d = new Date(scheduledTime);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDuration(mins: number | null): string {
  const m = mins ?? 120;
  if (m < 60) return `${m} min`;
  const h = m / 60;
  return Number.isInteger(h) ? `${h}h` : `${h}h`;
}

function parseTimeToMinutes(label: string): number {
  // e.g. "9:00 AM" -> 540
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// ── Schedule Empty State ──────────────────────────────────────────────────────

function DayEmptyState({ dayLabel }: { dayLabel: string }) {
  const isWeekend = dayLabel === "Sat" || dayLabel === "Sun";

  return (
    <div className="flex flex-col items-center py-10 text-center">
      {/* Illustration */}
      <div className="relative mb-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]">
          {isWeekend ? (
            <Sun size={34} className="text-warning" />
          ) : (
            <CalendarDays size={34} className="text-text-tertiary" />
          )}
        </div>
        {!isWeekend && (
          <Link href="/schedule/new">
            <div className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-[0_2px_8px_rgba(79,149,152,0.30)] active:bg-primary-dark transition-colors">
              <Plus size={16} className="text-white" />
            </div>
          </Link>
        )}
      </div>

      <h3 className="text-[16px] font-bold text-text-primary">
        {isWeekend ? "Day off" : "Nothing scheduled"}
      </h3>
      <p className="mt-1.5 max-w-[200px] text-[13px] leading-relaxed text-text-secondary">
        {isWeekend
          ? "Enjoy your weekend — no jobs today."
          : "This day is clear. Add an appointment to fill it in."}
      </p>

      {!isWeekend && (
        <Link href="/schedule/new" className="mt-4">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-[13px] font-semibold text-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors">
            <CalendarPlus size={15} className="text-primary" />
            Add Appointment
          </button>
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { isDemo, mounted } = useDemoMode();

  // In demo mode, anchor to Mar 30, 2026 to keep mock alignment.
  const initialAnchor = isDemo ? new Date(2026, 2, 30) : new Date();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(initialAnchor));
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [blocks, setBlocks] = useState<ApiAvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(!isDemo);

  // Build week-day metadata for the header strip from weekStart.
  const weekDays = useMemo(() => {
    if (isDemo) return demoWeekDays;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const iso = isoDate(d);
      const dayBookings = bookings.filter((b) => b.scheduledDate.slice(0, 10) === iso);
      const hours =
        dayBookings.reduce((sum, b) => sum + (b.durationMinutes ?? 120), 0) / 60;
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        jobs: dayBookings.length,
        hours: Math.round(hours * 10) / 10,
      };
    });
  }, [isDemo, weekStart, bookings]);

  // Track which weekday is selected by index (0..6) so that switching weeks
  // keeps the UI on the same day-of-week without needing an effect to reset.
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const selectedDay = weekDays[selectedIndex]?.date ?? weekDays[0].date;

  // Fetch bookings + availability blocks for the visible week (skip in demo mode).
  useEffect(() => {
    if (!mounted) return;
    if (isDemo) return;
    const from = isoDate(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    const to = isoDate(end);
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/bookings?from=${from}&to=${to}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`/api/admin/availability?from=${from}&to=${to}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([b, av]) => {
        setBookings(Array.isArray(b) ? b : []);
        setBlocks(Array.isArray(av) ? av : []);
      })
      .finally(() => setLoading(false));
  }, [isDemo, weekStart, mounted]);

  // Compute schedule items for the selected day.
  const items: ScheduleItem[] = useMemo(() => {
    if (isDemo) return demoScheduleByDay[selectedDay] ?? emptyDay;
    const target = new Date(weekStart);
    target.setDate(weekStart.getDate() + selectedIndex);
    const targetIso = isoDate(target);

    const bookingItems: ScheduleItem[] = bookings
      .filter((b) => b.scheduledDate.slice(0, 10) === targetIso)
      .map((b) => ({
        time: formatTime(b.scheduledTime),
        label: b.customer?.name ?? "Booking",
        type: "job" as const,
        duration: formatDuration(b.durationMinutes),
        address: b.home
          ? `${b.home.address}${b.home.city ? `, ${b.home.city}` : ""}`
          : undefined,
        status: STATUS_MAP[b.status] ?? "scheduled",
        tasks: b.tasks?.length ?? 0,
        homeId: b.home?.id,
        bookingId: b.id,
      }));

    const blockItems: ScheduleItem[] = blocks
      .filter((blk) => {
        const d = new Date(blk.startAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}` === targetIso;
      })
      .map((blk) => {
        const start = new Date(blk.startAt);
        const end = new Date(blk.endAt);
        const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
        const h = start.getHours();
        const m = start.getMinutes();
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        const timeLabel = m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
        return {
          time: timeLabel,
          label: blk.reason || "Blocked",
          type: "block" as const,
          duration: formatDuration(mins),
          details: blk.reason ?? "",
        };
      });

    // Merge then sort by start hour:minute
    const all = [...bookingItems, ...blockItems];
    all.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    return all;
  }, [isDemo, selectedDay, selectedIndex, weekStart, bookings, blocks]);

  const selectedData = weekDays[selectedIndex];
  const selectedDayLabel = selectedData?.day ?? "";

  function shiftWeek(deltaDays: number) {
    if (isDemo) return;
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + deltaDays);
    setWeekStart(next);
  }

  const headerLabel = isDemo ? "March 30 – April 5, 2026" : formatRange(weekStart);

  return (
    <div className="px-5 pt-14 lg:pt-8 pb-24">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-text-tertiary">Week View</p>
          <h1 className="mt-0.5 text-[26px] font-bold text-text-primary leading-tight">Schedule</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/schedule/new?mode=block">
            <Button variant="outline" size="sm" icon={<Lock size={13} />}>
              Block Time
            </Button>
          </Link>
          <Link href="/schedule/new">
            <Button variant="primary" size="sm" icon={<Plus size={13} />}>
              Add Job
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Week Navigation ── */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => shiftWeek(-7)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors"
        >
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} className="text-text-tertiary" />
          <span className="text-[13px] font-semibold text-text-primary">{headerLabel}</span>
        </div>
        <button
          onClick={() => shiftWeek(7)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors"
        >
          <ChevronRight size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* ── Week Strip ── */}
      <div className="mb-5 flex gap-1.5">
        {weekDays.map((d, idx) => {
          const isSelected = selectedIndex === idx;
          const hasJobs = d.jobs > 0;
          return (
            <button
              key={`${d.month}-${d.date}`}
              onClick={() => setSelectedIndex(idx)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all duration-150 ${
                isSelected
                  ? "bg-primary shadow-[0_2px_8px_rgba(79,149,152,0.30)]"
                  : hasJobs
                  ? "bg-surface border border-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] active:bg-surface-secondary"
                  : "bg-surface-secondary active:bg-surface"
              }`}
            >
              <span
                className={`text-[9px] font-semibold uppercase tracking-wider ${
                  isSelected ? "text-white/70" : "text-text-tertiary"
                }`}
              >
                {d.day}
              </span>
              <span
                className={`text-[16px] font-bold leading-none ${
                  isSelected ? "text-white" : hasJobs ? "text-text-primary" : "text-text-tertiary"
                }`}
              >
                {d.date}
              </span>
              {hasJobs ? (
                <span
                  className={`mt-0.5 text-[8px] font-semibold ${
                    isSelected ? "text-white/60" : "text-text-tertiary"
                  }`}
                >
                  {d.jobs} job{d.jobs !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="mt-0.5 text-[8px] text-text-tertiary/40">—</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Day Summary (only when jobs exist) ── */}
      {selectedData && selectedData.jobs > 0 && (
        <div className="mb-5 flex items-center gap-5 px-1">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50">
              <Clock size={12} className="text-primary" />
            </div>
            <span className="text-[13px] font-semibold text-text-secondary">
              {selectedData.hours}h booked
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50">
              <Layers size={12} className="text-primary" />
            </div>
            <span className="text-[13px] font-semibold text-text-secondary">
              {selectedData.jobs} stop{selectedData.jobs !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* ── Loading State ── */}
      {!isDemo && loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      )}

      {/* ── Empty Day State ── */}
      {!loading && items.length === 0 && (
        <DayEmptyState dayLabel={selectedDayLabel} />
      )}

      {/* ── Timeline ── */}
      {!loading && items.length > 0 && (
        <div className="space-y-0">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3">

              {/* Time column */}
              <div className="w-[60px] shrink-0 pt-4 text-right">
                <span className="text-[11px] font-semibold text-text-tertiary leading-none">{item.time}</span>
              </div>

              {/* Spine + dot */}
              <div className="flex flex-col items-center">
                {/* Top connector (hidden for first item) */}
                <div
                  className={`w-px ${i === 0 ? "h-4 opacity-0" : "h-4"} bg-border`}
                />
                {/* Dot */}
                <div
                  className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                    item.type === "job"
                      ? "border-primary bg-white shadow-[0_0_0_3px_rgba(79,149,152,0.12)]"
                      : "border-border bg-surface-secondary"
                  }`}
                />
                {/* Bottom connector (hidden for last item) */}
                <div
                  className={`w-px flex-1 min-h-[8px] ${i === items.length - 1 ? "opacity-0" : "bg-border"}`}
                />
              </div>

              {/* Card */}
              <div className="flex-1 pb-2 pt-2.5">
                {item.type === "job" && (item.bookingId || item.homeId) ? (
                  <Link href={item.bookingId ? `/jobs/${item.bookingId}` : `/homes/${item.homeId}`}>
                    <Card
                      padding="sm"
                      className="transition-all active:scale-[0.985] hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold text-text-primary">{item.label}</span>
                            <StatusBadge status={item.status!} />
                          </div>
                          {item.address && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <MapPin size={11} className="text-text-tertiary shrink-0" />
                              <span className="text-[12px] text-text-secondary truncate">{item.address}</span>
                            </div>
                          )}
                          <div className="mt-1.5 flex items-center gap-3">
                            <span className="text-[11px] text-text-tertiary">
                              {item.tasks} task{item.tasks !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                            {item.duration}
                          </span>
                          <ChevronRight size={14} className="text-text-tertiary mt-1" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                ) : (
                  // Block card — dashed border, flat style
                  <div
                    className={`rounded-xl border border-dashed px-3.5 py-3 ${
                      item.label === "Lunch Break" || item.label === "Lunch"
                        ? "border-border bg-surface-secondary"
                        : "border-border bg-surface"
                    } shadow-[0_1px_4px_rgba(0,0,0,0.04)]`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-text-secondary">{item.label}</span>
                        {item.details ? (
                          <p className="mt-0.5 text-[11px] text-text-tertiary truncate">{item.details}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-border/60 px-2 py-0.5 text-[10px] font-semibold text-text-tertiary shrink-0">
                        {item.duration}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
