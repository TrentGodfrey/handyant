"use client";

import { useState } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
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

const weekDays = [
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
  homeId?: number;
}

const scheduleByDay: Record<number, ScheduleItem[]> = {
  30: [
    { time: "8:00 AM", label: "Part Shopping", type: "block", duration: "45 min", details: "Home Depot — Broan fan motor, caulk" },
    { time: "9:00 AM", label: "Sarah Mitchell", type: "job", duration: "2h", address: "4821 Oak Hollow Dr, Plano", status: "confirmed", tasks: 2, homeId: 1 },
    { time: "11:30 AM", label: "Robert Chen", type: "job", duration: "1.5h", address: "1205 Elm Creek Ct, Frisco", status: "confirmed", tasks: 3, homeId: 2 },
    { time: "1:00 PM", label: "Lunch Break", type: "block", duration: "1h", details: "" },
    { time: "2:00 PM", label: "Maria Garcia", type: "job", duration: "2h", address: "890 Sunset Ridge, Roanoke", status: "pending", tasks: 2, homeId: 3 },
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
            <div className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-[0_2px_8px_rgba(37,99,235,0.30)] active:bg-primary-dark transition-colors">
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
  const [selectedDay, setSelectedDay] = useState(30);

  const selectedData = weekDays.find((d) => d.date === selectedDay);
  const selectedDayLabel = selectedData?.day ?? "";
  const items = scheduleByDay[selectedDay] ?? emptyDay;

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
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors">
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} className="text-text-tertiary" />
          <span className="text-[13px] font-semibold text-text-primary">March 30 – April 5, 2026</span>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors">
          <ChevronRight size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* ── Week Strip ── */}
      <div className="mb-5 flex gap-1.5">
        {weekDays.map((d) => {
          const isSelected = selectedDay === d.date;
          const hasJobs = d.jobs > 0;
          return (
            <button
              key={d.date}
              onClick={() => setSelectedDay(d.date)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all duration-150 ${
                isSelected
                  ? "bg-primary shadow-[0_2px_8px_rgba(37,99,235,0.30)]"
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

      {/* ── Empty Day State ── */}
      {items.length === 0 && (
        <DayEmptyState dayLabel={selectedDayLabel} />
      )}

      {/* ── Timeline ── */}
      {items.length > 0 && (
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
                      ? "border-primary bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
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
                {item.type === "job" && item.homeId ? (
                  <Link href={`/homes/${item.homeId}`}>
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
