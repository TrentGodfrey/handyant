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
  DollarSign,
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
  estimatedCost: string | null;
  categories: string[];
};

type WeeklyRevenuePoint = {
  weekStart: string;
  revenue: number;
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
  week: { jobs: number; hours: number; revenue: number };
  month: {
    jobs: number;
    completed: number;
    revenue: number;
    tasksPerVisit: number;
    avgRating: number;
    reviewCount: number;
  };
  partsNeeded: { id: string; item: string; qty: number; bookingId: string; client: string }[];
  weeklyRevenue: WeeklyRevenuePoint[];
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
    est: "$280",
  },
  {
    id: "demo-2",
    client: "Lisa Park",
    service: "Ceiling fan install (3 fans)",
    date: "Apr 5",
    area: "Plano",
    est: "$195",
  },
];

const demoMonthlyMetrics: MonthlyMetric[] = [
  { label: "Tasks / Visit", value: "3.2", trend: "+0.4", positive: true, icon: Wrench, sparkline: [2.8, 3.0, 2.9, 3.1, 3.2] },
  { label: "Avg Rating", value: "4.9", trend: "+0.1", positive: true, icon: Star, sparkline: [4.8, 4.8, 4.9, 4.9, 4.9] },
  { label: "Revenue", value: "$8.2k", trend: "+12%", positive: true, icon: TrendingUp, sparkline: [6800, 7200, 7500, 7800, 8200] },
  { label: "Total Visits", value: "18", trend: "+3", positive: true, icon: Calendar, sparkline: [14, 15, 16, 17, 18] },
];

const demoKpis = {
  jobs: "4",
  hours: "7.5",
  partsToBuy: "2",
  weekRevenue: "$2.4k",
};

const demoWeeklyRevenue: WeeklyRevenuePoint[] = [
  { weekStart: "w1", revenue: 1800 },
  { weekStart: "w2", revenue: 2100 },
  { weekStart: "w3", revenue: 1950 },
  { weekStart: "w4", revenue: 2400 },
  { weekStart: "w5", revenue: 2200 },
  { weekStart: "w6", revenue: 2650 },
  { weekStart: "w7", revenue: 2100 },
  { weekStart: "w8", revenue: 2400 },
];

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

function RevenueTrendChart({
  weeklyRevenue,
  monthlyTotal,
}: {
  weeklyRevenue: WeeklyRevenuePoint[];
  monthlyTotal: number;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const values = weeklyRevenue.map((w) => w.revenue);
  const hasAny = values.some((v) => v > 0);

  if (!hasAny) {
    return (
      <div className="mb-6">
        <Card padding="md">
          <div className="mb-3">
            <h3 className="text-[15px] font-semibold text-text-primary">Revenue Trend</h3>
            <p className="text-[11px] text-text-tertiary">Last 8 weeks</p>
          </div>
          <div className="flex items-center justify-center py-8 text-center">
            <p className="text-[13px] text-text-tertiary max-w-[260px]">
              No revenue data yet — complete a job to see trends
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const chartW = 320;
  const chartH = 160;
  const padLeft = 0;
  const padRight = 0;
  const padTop = 12;
  const padBottom = 24;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxRaw = Math.max(...values, 1);
  // Round up to a clean axis
  const maxVal = Math.ceil(maxRaw / 500) * 500 || 500;
  const minVal = 0;

  const points = values.map((v, i) => {
    const x = padLeft + (i / Math.max(values.length - 1, 1)) * plotW;
    const y = padTop + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const areaPath = `M${points[0].x},${points[0].y} ${points
    .map((p) => `L${p.x},${p.y}`)
    .join(" ")} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${
    padTop + plotH
  } Z`;

  const gridLines = [maxVal / 3, (maxVal / 3) * 2, maxVal].map((val) => {
    const y = padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
    return { val, y };
  });

  const lastPoint = points[points.length - 1];

  const thisWeek = values[values.length - 1] ?? 0;
  const lastWeek = values[values.length - 2] ?? 0;
  const delta = thisWeek - lastWeek;
  const deltaPct = lastWeek > 0 ? Math.round((delta / lastWeek) * 100) : 0;
  const positiveDelta = delta >= 0;

  return (
    <div className="mb-6">
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-text-primary">Revenue Trend</h3>
            <p className="text-[11px] text-text-tertiary">Last 8 weeks</p>
          </div>
          <div className="flex rounded-lg bg-surface-secondary p-0.5">
            <button
              onClick={() => setPeriod("week")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                period === "week"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-tertiary"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                period === "month"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-tertiary"
              }`}
            >
              Month
            </button>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full"
          style={{ height: 160 }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>

          {gridLines.map((g) => (
            <line
              key={g.val}
              x1={padLeft}
              y1={g.y}
              x2={chartW - padRight}
              y2={g.y}
              stroke="currentColor"
              className="text-border-light"
              strokeWidth={0.5}
              strokeDasharray="4 3"
              opacity={0.6}
            />
          ))}

          <path d={areaPath} fill="url(#revGradient)" />

          <polyline
            points={linePoints}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle cx={lastPoint.x} cy={lastPoint.y} r={3.5} fill="#2563EB" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r={6} fill="#2563EB" opacity={0.15} />

          {values.map((_, i) => {
            const x = padLeft + (i / Math.max(values.length - 1, 1)) * plotW;
            return (
              <text
                key={i}
                x={x}
                y={chartH - 4}
                textAnchor="middle"
                className="fill-text-tertiary"
                fontSize={10}
                fontWeight={500}
              >
                W{i + 1}
              </text>
            );
          })}
        </svg>

        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[13px] font-bold text-primary">
              This {period === "week" ? "Week" : "Month"}: ${Math.round(thisWeek).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {positiveDelta ? (
              <TrendingUp size={12} className="text-success" />
            ) : (
              <TrendingDown size={12} className="text-error" />
            )}
            <span
              className={`text-[12px] font-semibold ${
                positiveDelta ? "text-success" : "text-error"
              }`}
            >
              {positiveDelta ? "+" : ""}${Math.round(delta).toLocaleString()}
              {lastWeek > 0 ? ` (${positiveDelta ? "+" : ""}${deltaPct}%)` : ""}
            </span>
            <span className="text-[11px] text-text-tertiary ml-0.5">vs last week</span>
          </div>
          <div className="ml-auto">
            <span className="text-[12px] text-text-secondary font-medium">
              Monthly total: ${Math.round(monthlyTotal).toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function formatHours(h: number) {
  if (!h) return "0";
  return h % 1 === 0 ? String(h) : h.toFixed(1);
}

function formatRevenue(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
        weekRevenue: formatRevenue(stats?.week.revenue ?? 0),
      };

  const monthlyMetrics: MonthlyMetric[] = isDemo
    ? demoMonthlyMetrics
    : [
        {
          label: "Tasks / Visit",
          value: (stats?.month.tasksPerVisit ?? 0).toFixed(1),
          trend: "—",
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
          label: "Revenue",
          value: formatRevenue(stats?.month.revenue ?? 0),
          trend: "—",
          positive: true,
          icon: TrendingUp,
          sparkline: [6800, 7200, 7500, 7800, stats?.month.revenue ?? 0],
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

  // Weekly revenue + monthly total
  const weeklyRevenueData: WeeklyRevenuePoint[] = isDemo
    ? demoWeeklyRevenue
    : stats?.weeklyRevenue ?? [];
  const monthlyTotal = isDemo ? 8200 : stats?.month.revenue ?? 0;

  async function handleAccept(id: string) {
    setDismissedOfferIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/bookings/${id}/accept`, { method: "POST" });
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
          // Refresh unread count after the user closed the panel — they may
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

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid grid-cols-4 gap-2.5">
        {[
          { label: "Today's Jobs", value: kpis.jobs, sub: "jobs", icon: Calendar, iconBg: "bg-primary-50", iconColor: "text-primary" },
          { label: "Hours", value: kpis.hours, sub: "booked", icon: Clock, iconBg: "bg-[#EFF9FF]", iconColor: "text-info" },
          { label: "Parts", value: kpis.partsToBuy, sub: "to buy", icon: ShoppingCart, iconBg: "bg-warning-light", iconColor: "text-warning" },
          { label: "This Week", value: kpis.weekRevenue, sub: "earned", icon: DollarSign, iconBg: "bg-success-light", iconColor: "text-success" },
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

      {/* ── Revenue Trend ── */}
      <RevenueTrendChart weeklyRevenue={weeklyRevenueData} monthlyTotal={monthlyTotal} />

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

      {/* ── Available Offers ── */}
      <div className="mb-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Available Offers
          </h2>
          {(isDemo ? demoPendingOffers.length : realPendingOffers.length) > 0 && (
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {isDemo ? demoPendingOffers.length : realPendingOffers.length} new
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
                      <span className="ml-2 font-semibold text-success">{offer.est}</span>
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="!bg-success-light !text-success hover:!bg-green-100">
                      Accept
                    </Button>
                    <Button variant="ghost" size="sm">
                      Pass
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : realPendingOffers.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">
              No pending offers right now.
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
              const cost = offer.estimatedCost
                ? `$${Math.round(Number(offer.estimatedCost))}`
                : null;
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
                        {formatOfferDate(offer.scheduledDate)}
                        {offer.address ? ` · ${offer.address.split(",")[1]?.trim() || offer.address}` : ""}
                        {cost && <span className="ml-2 font-semibold text-success">{cost}</span>}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!bg-success-light !text-success hover:!bg-green-100"
                        onClick={() => handleAccept(offer.id)}
                      >
                        Accept
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

          {/* Divider + CTA */}
          <div className="mt-5 border-t border-border-light pt-4">
            <Link
              href="/reports"
              className="flex items-center justify-between text-[13px] font-semibold text-primary active:opacity-70 transition-opacity"
            >
              View full report
              <ChevronRight size={15} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
