"use client";

import { useState, useEffect } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import NotificationPanel from "@/components/NotificationPanel";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  MapPin,
  Wrench,
  ArrowRight,
  Bell,
  ShoppingCart,
  Star,
  TrendingUp,
  AlertTriangle,
  Navigation,
  ChevronRight,
  TrendingDown,
  Settings,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { demoCustomerBy } from "@/lib/demoData";
import { bookingDateToLocalDate, formatBookingTime } from "@/lib/booking-time";

type ScheduleItem = {
  id: string | number;
  time: string;
  duration: string;
  client: string;
  address: string;
  tasks: string[];
  status: "confirmed" | "pending" | "completed" | "in-progress" | "needs-parts" | "scheduled" | "cancelled";
  partsNeeded: boolean;
};

type MonthlyMetric = {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
  icon: typeof Wrench;
  sparkline: number[];
};

type PendingOffer = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  address: string | null;
  scheduledDate: string;
  scheduledTime: string;
  description: string | null;
  categories: string[];
};

type StatsResponse = {
  today: {
    jobs: number;
    hours: number;
    partsToBuy: number;
    schedule: Array<{
      id: string;
      scheduledTime: string;
      durationMinutes: number | null;
      status: string;
      description: string | null;
      tasks: { label: string }[];
      parts: { id: string }[];
      customer: { name: string } | null;
      home: { address: string; city: string | null } | null;
    }>;
  };
  week: { jobs: number; hours: number };
  month: {
    jobs: number;
    completed: number;
    tasksPerVisit: number;
    avgRating: number;
    reviewCount: number;
  };
  partsNeeded: { id: string; item: string; qty: number; bookingId: string; client: string }[];
  pendingOffers: PendingOffer[];
};

type PartsNeededItem = {
  id: string;
  item: string;
  qty: number;
  cost: number;
  bookingId: string;
  customerName: string;
  scheduledDate: string;
};

type PartsNeededResponse = {
  parts: PartsNeededItem[];
};

const demoTodaySchedule: ScheduleItem[] = [
  {
    id: 1,
    time: "9:00 AM",
    duration: "2h",
    client: demoCustomerBy("1")!.name,
    address: "4821 Oak Hollow Dr, Plano",
    tasks: ["Replace kitchen faucet", "Fix garage door sensor"],
    status: "confirmed",
    partsNeeded: true,
  },
  {
    id: 2,
    time: "11:30 AM",
    duration: "1.5h",
    client: demoCustomerBy("2")!.name,
    address: "1205 Elm Creek Ct, Frisco",
    tasks: ["Install smart thermostat", "Replace 3 outlets"],
    status: "confirmed",
    partsNeeded: false,
  },
  {
    id: 3,
    time: "2:00 PM",
    duration: "2h",
    client: demoCustomerBy("3")!.name,
    address: "890 Sunset Ridge, Roanoke",
    tasks: ["Drywall repair (2 holes)", "Touch-up paint"],
    status: "pending",
    partsNeeded: false,
  },
  {
    id: 4,
    time: "4:30 PM",
    duration: "30 min",
    client: "Team Meeting",
    address: "",
    tasks: ["Weekly sync"],
    status: "confirmed",
    partsNeeded: false,
  },
];

const demoPendingOffers = [
  {
    id: "demo-1",
    client: demoCustomerBy("4")!.name,
    service: "Full bathroom wallpaper removal",
    date: "Apr 3",
    area: "McKinney",
  },
  {
    id: "demo-2",
    client: "Lisa Park",
    service: "Ceiling fan install (3 fans)",
    date: "Apr 5",
    area: "Plano",
  },
];

const demoMonthlyMetrics: MonthlyMetric[] = [
  { label: "Tasks / Visit", value: "3.2", trend: "+0.4", positive: true, icon: Wrench, sparkline: [2.8, 3.0, 2.9, 3.1, 3.2] },
  { label: "Avg Rating", value: "4.9", trend: "+0.1", positive: true, icon: Star, sparkline: [4.8, 4.8, 4.9, 4.9, 4.9] },
  { label: "Total Visits", value: "18", trend: "+3", positive: true, icon: Calendar, sparkline: [14, 15, 16, 17, 18] },
];

const demoKpis = {
  jobs: "4",
  hours: "7.5",
  partsToBuy: "2",
};

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 40;
  const h = 16;
  const padding = 1;
  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatHours(h: number) {
  if (!h) return "0";
  return h % 1 === 0 ? String(h) : h.toFixed(1);
}

function formatTime(iso: string) {
  return formatBookingTime(iso);
}

function formatDuration(mins: number | null) {
  if (!mins) return "";
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

function isValidStatus(s: string): s is ScheduleItem["status"] {
  return ["confirmed", "pending", "completed", "in-progress", "needs-parts", "scheduled", "cancelled"].includes(s);
}

function formatOfferDate(iso: string) {
  try {
    return bookingDateToLocalDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [partsNeeded, setPartsNeeded] = useState<PartsNeededItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedOfferIds, setDismissedOfferIds] = useState<Set<string>>(new Set());
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  const { isDemo, mounted } = useDemoMode();
  const { data: session } = useSession();

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/notifications?unread=true").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/parts-needed").then((r) =>
        r.ok ? (r.json() as Promise<PartsNeededResponse>) : { parts: [] }
      ),
    ])
      .then(([statsData, notifications, partsData]) => {
        setStats(statsData);
        if (Array.isArray(notifications)) setUnreadCount(notifications.length);
        setPartsNeeded(partsData?.parts ?? []);
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [isDemo, mounted]);

  const todaySchedule: ScheduleItem[] = isDemo
    ? demoTodaySchedule
    : (stats?.today.schedule ?? []).map((b) => {
        const addressParts = [b.home?.address, b.home?.city].filter(Boolean);
        return {
          id: b.id,
          time: formatTime(b.scheduledTime),
          duration: formatDuration(b.durationMinutes),
          client: b.customer?.name ?? "Unknown",
          address: addressParts.join(", "),
          tasks: b.tasks.map((t) => t.label),
          status: isValidStatus(b.status) ? b.status : "pending",
          partsNeeded: (b.parts?.length ?? 0) > 0,
        };
      });

  const kpis = isDemo
    ? demoKpis
    : {
        jobs: String(stats?.today.jobs ?? 0),
        hours: formatHours(stats?.today.hours ?? 0),
        partsToBuy: String(stats?.today.partsToBuy ?? 0),
      };

  const monthlyMetrics: MonthlyMetric[] = isDemo
    ? demoMonthlyMetrics
    : [
        {
          label: "Tasks / Visit",
          value: (stats?.month.tasksPerVisit ?? 0).toFixed(1),
          trend: "-",
          positive: true,
          icon: Wrench,
          sparkline: [2.8, 3.0, 2.9, 3.1, stats?.month.tasksPerVisit ?? 0],
        },
        {
          label: "Avg Rating",
          value: (stats?.month.avgRating ?? 0).toFixed(1),
          trend: `${stats?.month.reviewCount ?? 0} reviews`,
          positive: true,
          icon: Star,
          sparkline: [4.8, 4.8, 4.9, 4.9, stats?.month.avgRating ?? 0],
        },
        {
          label: "Total Visits",
          value: String(stats?.month.completed ?? 0),
          trend: `${stats?.month.jobs ?? 0} booked`,
          positive: true,
          icon: Calendar,
          sparkline: [14, 15, 16, 17, stats?.month.completed ?? 0],
        },
      ];

  // Demo banner: keep the static "Broan 688 fan motor" message.
  // Real mode: aggregate the live parts-needed list.
  const realPartsAlert = !isDemo && partsNeeded.length > 0
    ? {
        count: partsNeeded.length,
        previewItems: partsNeeded.slice(0, 2).map((p) => p.item),
      }
    : null;
  const demoPartsAlert = isDemo ? { item: "Broan 688 fan motor", count: 2 } : null;

  // Pending offers list
  const realPendingOffers = (stats?.pendingOffers ?? []).filter(
    (o) => !dismissedOfferIds.has(o.id)
  );

  const greetingName = isDemo ? "Anthony" : firstName(session?.user?.name);
  const todayLabel = mounted
    ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";
  const notifBadge = isDemo ? 3 : unreadCount;

  async function handleAccept(id: string) {
    setDismissedOfferIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Roll back optimistic dismissal
      setDismissedOfferIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDecline(id: string) {
    setDismissedOfferIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/bookings/${id}/decline`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setDismissedOfferIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (!mounted || loading) {
    return (
      <div className="px-5 pt-14 lg:pt-8 pb-24 flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 lg:pt-8 pb-24">

      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-text-tertiary">
            {todayLabel}
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold text-text-primary leading-tight">
            Hey {greetingName} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_4px_rgba(0,0,0,0.08)] active:bg-surface-secondary transition-colors"
          >
            <Settings size={18} className="text-text-secondary" />
          </Link>
          <button
            type="button"
            onClick={() => setNotifPanelOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_4px_rgba(0,0,0,0.08)] active:bg-surface-secondary transition-colors"
            aria-label="Notifications"
          >
            <Bell size={19} className="text-text-secondary" />
            {notifBadge > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shadow-sm">
                {notifBadge > 9 ? "9+" : notifBadge}
              </span>
            )}
          </button>
        </div>
      </div>

      <NotificationPanel
        open={notifPanelOpen}
        onClose={() => {
          setNotifPanelOpen(false);
          // Refresh unread count after the user closed the panel - they may
          // have marked things read inside it.
          if (!isDemo) {
            fetch("/api/notifications?unread=true")
              .then((r) => (r.ok ? r.json() : []))
              .then((d) => {
                if (Array.isArray(d)) setUnreadCount(d.length);
              })
              .catch(() => {});
          }
        }}
      />

      {/* ── Pending Confirmation ── */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Pending Confirmation
          </h2>
          {(isDemo ? demoPendingOffers.length : realPendingOffers.length) > 0 && (
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {isDemo ? demoPendingOffers.length : realPendingOffers.length} waiting
            </span>
          )}
        </div>

        {isDemo ? (
          <div className="space-y-2.5">
            {demoPendingOffers.map((offer) => (
              <Card key={offer.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[14px] font-bold text-primary">
                    {offer.client.split(" ").map((n) => n[0]).join("")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary">{offer.client}</p>
                    <p className="text-[12px] text-text-secondary truncate">{offer.service}</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">
                      {offer.date} · {offer.area}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="!bg-success-light !text-success hover:!bg-green-100">
                      Confirm
                    </Button>
                    <Button variant="ghost" size="sm">
                      Decline
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : realPendingOffers.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">
              No bookings waiting for confirmation.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {realPendingOffers.map((offer) => {
              const initials = offer.customerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const dateLabel = formatOfferDate(offer.scheduledDate);
              const timeLabel = formatBookingTime(offer.scheduledTime);
              return (
                <Card key={offer.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[14px] font-bold text-primary">
                      {initials || "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-text-primary">
                        {offer.customerName}
                      </p>
                      <p className="text-[12px] text-text-secondary truncate">
                        {offer.description || offer.categories.join(", ") || "Service request"}
                      </p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        {dateLabel} · {timeLabel}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!bg-success-light !text-success hover:!bg-green-100"
                        onClick={() => handleAccept(offer.id)}
                      >
                        Confirm
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDecline(offer.id)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid grid-cols-3 gap-2.5">
        {[
          { label: "Today's Jobs", value: kpis.jobs, sub: "jobs", icon: Calendar, iconBg: "bg-primary-50", iconColor: "text-primary" },
          { label: "Hours", value: kpis.hours, sub: "booked", icon: Clock, iconBg: "bg-[#EFF9FF]", iconColor: "text-info" },
          { label: "Parts", value: kpis.partsToBuy, sub: "to buy", icon: ShoppingCart, iconBg: "bg-warning-light", iconColor: "text-warning" },
        ].map((stat) => (
          <Card key={stat.label} padding="sm" className="flex flex-col items-center text-center gap-1.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.iconBg}`}>
              <stat.icon size={15} className={stat.iconColor} />
            </div>
            <p className="text-[18px] font-bold text-text-primary leading-none">{stat.value}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Parts Alert Banner ── */}
      {demoPartsAlert && (
        <div className="mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning-light px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15">
              <AlertTriangle size={15} className="text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary">Parts needed before 9 AM</p>
              <p className="text-[11px] text-text-secondary truncate">{demoPartsAlert.item} · Home Depot Plano</p>
            </div>
            <button className="flex items-center gap-1 rounded-lg bg-warning px-2.5 py-1.5 text-[11px] font-semibold text-white shrink-0 active:opacity-80 transition-opacity">
              <Navigation size={11} />
              Go
            </button>
          </div>
        </div>
      )}
      {realPartsAlert && (
        <div className="mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning-light px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15">
              <AlertTriangle size={15} className="text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary">
                {realPartsAlert.count} {realPartsAlert.count === 1 ? "part" : "parts"} needed
              </p>
              <p className="text-[11px] text-text-secondary truncate">
                {realPartsAlert.previewItems.join(", ")}
              </p>
            </div>
            <Link
              href="/jobs?status=confirmed"
              className="flex items-center gap-1 rounded-lg bg-warning px-2.5 py-1.5 text-[11px] font-semibold text-white shrink-0 active:opacity-80 transition-opacity"
            >
              View all
            </Link>
          </div>
        </div>
      )}

      {/* ── Today's Schedule ── */}
      <div className="mb-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Today&apos;s Schedule
          </h2>
          <Link
            href="/schedule"
            className="flex items-center gap-1 text-[12px] font-semibold text-primary active:opacity-70 transition-opacity"
          >
            Full Schedule
            <ArrowRight size={13} />
          </Link>
        </div>

        {todaySchedule.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">
              No jobs scheduled for today.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {todaySchedule.map((job) => (
              <Link key={job.id} href={job.address ? `/jobs/${job.id}` : "/schedule"}>
                <Card
                  padding="sm"
                  className="transition-all active:scale-[0.985] hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)]"
                >
                  <div className="flex items-start gap-3">
                    {/* Time column */}
                    <div className="flex flex-col items-center shrink-0 pt-0.5 w-14">
                      <span className="text-[12px] font-bold text-text-primary">{job.time}</span>
                      <span className="text-[10px] text-text-tertiary">{job.duration}</span>
                    </div>

                    {/* Divider line */}
                    <div className="w-px self-stretch bg-border-light shrink-0" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-semibold text-text-primary truncate">{job.client}</span>
                        <StatusBadge status={job.status} />
                      </div>

                      {job.address && (
                        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
                          <MapPin size={11} className="shrink-0" />
                          <span className="text-[12px] truncate">{job.address}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {job.tasks.map((task) => (
                          <span
                            key={task}
                            className="rounded-md bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                          >
                            {task}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {job.partsNeeded && (
                        <span className="flex items-center gap-1 rounded-full bg-warning-light px-2 py-0.5 text-[10px] font-semibold text-warning">
                          <ShoppingCart size={9} />
                          Parts
                        </span>
                      )}
                      {job.address && (
                        <ChevronRight size={15} className="text-text-tertiary mt-auto" />
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Monthly Metrics ── */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          This Month
        </h2>
        <Card padding="md">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {monthlyMetrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
                  <metric.icon size={16} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[17px] font-bold text-text-primary leading-none">{metric.value}</p>
                    <MiniSparkline data={metric.sparkline} positive={metric.positive} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-text-tertiary">{metric.label}</span>
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-bold ${
                        metric.positive ? "text-success" : "text-error"
                      }`}
                    >
                      {metric.positive ? (
                        <TrendingUp size={9} />
                      ) : (
                        <TrendingDown size={9} />
                      )}
                      {metric.trend}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </Card>
      </div>
    </div>
  );
}
