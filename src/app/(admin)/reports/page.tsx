"use client";

import { useEffect, useState, useMemo } from "react";
import Card from "@/components/Card";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Users,
  MapPin,
  Calendar,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

/* ── Demo data ── */

const demoRevenueData = [5200, 6100, 6800, 7200, 7500, 8200];
const demoRevenueLabels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const demoServiceCategories = [
  { name: "Plumbing", value: 2400, pct: 29, color: "#3B82F6" },
  { name: "Electrical", value: 1900, pct: 23, color: "#8B5CF6" },
  { name: "General Repair", value: 1500, pct: 18, color: "#F59E0B" },
  { name: "Smart Home", value: 1200, pct: 15, color: "#10B981" },
  { name: "Painting", value: 800, pct: 10, color: "#EC4899" },
  { name: "Carpentry", value: 400, pct: 5, color: "#6366F1" },
];

const demoTopClients = [
  { name: "Sarah Mitchell", visits: 4, total: 1340, rating: 5.0 },
  { name: "Robert Chen", visits: 3, total: 840, rating: 4.9 },
  { name: "Maria Garcia", visits: 2, total: 380, rating: 5.0 },
  { name: "James Wilson", visits: 2, total: 560, rating: 4.8 },
];

const demoServiceAreas = [
  { city: "Plano", jobs: 6 },
  { city: "Frisco", jobs: 4 },
  { city: "Allen", jobs: 3 },
  { city: "McKinney", jobs: 2 },
  { city: "Prosper", jobs: 2 },
  { city: "Celina", jobs: 1 },
];

const demoWeeklyBreakdown = [
  { day: "Mon", jobs: 4, revenue: 680 },
  { day: "Tue", jobs: 3, revenue: 520 },
  { day: "Wed", jobs: 5, revenue: 890 },
  { day: "Thu", jobs: 2, revenue: 360 },
  { day: "Fri", jobs: 3, revenue: 540 },
  { day: "Sat", jobs: 1, revenue: 210 },
];

const CATEGORY_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#6366F1", "#14B8A6", "#F43F5E"];

/* ── Types ── */

type TrendDirection = "up" | "down" | "flat";
type TrendData = {
  current: number;
  prior: number;
  deltaAbs: number;
  deltaPct: number;
  direction: TrendDirection;
};

type StatsResponse = {
  today: { jobs: number; hours: number; partsToBuy: number };
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
  weeklyRevenue: { weekStart: string; revenue: number }[];
  topClients: {
    id: string;
    name: string;
    avatarUrl: string | null;
    count: number;
    revenue: number;
  }[];
  revenueByCategory: { category: string; revenue: number }[];
  period?: {
    key: "week" | "month" | "quarter" | "year";
    current: {
      revenue: number;
      jobsCompleted: number;
      avgJobValue: number;
      activeCustomers: number;
    };
    prior: {
      revenue: number;
      jobsCompleted: number;
      avgJobValue: number;
      activeCustomers: number;
    };
    trends: {
      revenue: TrendData;
      jobsCompleted: TrendData;
      avgJobValue: TrendData;
      activeCustomers: TrendData;
    };
  };
};

type AdminBooking = {
  id: string;
  status: string;
  scheduledDate: string;
  finalCost: string | null;
  estimatedCost: string | null;
  home: { city: string | null } | null;
};

/* ── Revenue Area Chart (SVG) ── */

function RevenueChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const chartW = 360;
  const chartH = 200;
  const padLeft = 42;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const safeValues = values.length > 0 ? values : [0];
  const maxRaw = Math.max(...safeValues, 1);
  const maxVal = Math.ceil(maxRaw / 1000) * 1000 || 1000;
  const minVal = 0;

  const points = safeValues.map((v, i) => {
    const x = padLeft + (i / Math.max(safeValues.length - 1, 1)) * plotW;
    const y = padTop + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${points[0].x},${points[0].y} ${points
    .map((p) => `L${p.x},${p.y}`)
    .join(" ")} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${
    padTop + plotH
  } Z`;

  const step = maxVal / 5;
  const gridLines = [step, step * 2, step * 3, step * 4, step * 5].map((val) => ({
    val,
    y: padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH,
  }));

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((g) => (
        <g key={g.val}>
          <line
            x1={padLeft}
            y1={g.y}
            x2={chartW - padRight}
            y2={g.y}
            stroke="#E5E7EB"
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />
          <text
            x={padLeft - 6}
            y={g.y + 3}
            textAnchor="end"
            className="fill-text-tertiary"
            fontSize={9}
            fontWeight={500}
          >
            ${Math.round(g.val / 1000)}k
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#revGradient)" />

      {/* Line */}
      <polyline
        points={linePoints}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#3B82F6" />
      ))}

      {/* Labels */}
      {labels.map((label, i) => {
        const x = padLeft + (i / Math.max(labels.length - 1, 1)) * plotW;
        return (
          <text
            key={label + i}
            x={x}
            y={chartH - 6}
            textAnchor="middle"
            className="fill-text-tertiary"
            fontSize={10}
            fontWeight={500}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Helpers ── */

function formatCurrency(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function shortMonth(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short" });
  } catch {
    return iso;
  }
}

function shortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  } catch {
    return iso;
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── Trend delta badge ── */

function TrendDeltaBadge({
  trend,
  format,
  priorLabel,
}: {
  trend: TrendData;
  format: "currency" | "count";
  priorLabel: string;
}) {
  const { direction, deltaAbs, deltaPct } = trend;

  if (direction === "flat") {
    return (
      <div className="flex items-center gap-1">
        <Minus size={11} className="text-text-tertiary" />
        <span className="text-[11px] font-semibold text-text-tertiary">
          — {priorLabel}
        </span>
      </div>
    );
  }

  const positive = direction === "up";
  const sign = positive ? "+" : "-";
  const absVal = Math.abs(deltaAbs);
  const absPct = Math.abs(Math.round(deltaPct));

  const valueText =
    format === "currency"
      ? `${sign}$${Math.round(absVal).toLocaleString()}`
      : `${sign}${Math.round(absVal)}`;

  const Icon = positive ? TrendingUp : TrendingDown;
  const colorClass = positive ? "text-success" : "text-error";

  return (
    <div className="flex items-center gap-1">
      <Icon size={11} className={colorClass} />
      <span className={`text-[11px] font-semibold ${colorClass}`}>
        {valueText} ({sign}{absPct}%)
      </span>
      <span className="text-[10px] font-medium text-text-tertiary">
        {priorLabel}
      </span>
    </div>
  );
}

/* ── Page Component ── */

export default function ReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const { isDemo, mounted } = useDemoMode();

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/stats?period=${period}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/bookings").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([statsData, bookingsData]) => {
        setStats(statsData);
        if (Array.isArray(bookingsData)) setBookings(bookingsData);
      })
      .catch(() => {
        setStats(null);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }, [isDemo, mounted, period]);

  /* ─ Time-series chart data based on period ─ */
  const chartData = useMemo(() => {
    if (isDemo) {
      return { values: demoRevenueData, labels: demoRevenueLabels };
    }
    const weekly = stats?.weeklyRevenue ?? [];
    if (period === "week") {
      // Show the 8 weekly buckets
      return {
        values: weekly.map((w) => w.revenue),
        labels: weekly.map((w) => shortDate(w.weekStart)),
      };
    }
    if (period === "month") {
      // Group 8 weeks into ~2 month buckets
      const months = new Map<string, number>();
      for (const w of weekly) {
        const key = shortMonth(w.weekStart);
        months.set(key, (months.get(key) ?? 0) + w.revenue);
      }
      return {
        values: [...months.values()],
        labels: [...months.keys()],
      };
    }
    if (period === "quarter") {
      // group 8 weeks into ~3-month buckets
      const quarters = new Map<string, number>();
      for (const w of weekly) {
        const date = new Date(w.weekStart);
        const q = Math.floor(date.getMonth() / 3) + 1;
        const key = `Q${q} ${date.getFullYear()}`;
        quarters.set(key, (quarters.get(key) ?? 0) + w.revenue);
      }
      return {
        values: [...quarters.values()],
        labels: [...quarters.keys()],
      };
    }
    // year — bucket by year
    const years = new Map<string, number>();
    for (const w of weekly) {
      const date = new Date(w.weekStart);
      const key = String(date.getFullYear());
      years.set(key, (years.get(key) ?? 0) + w.revenue);
    }
    return {
      values: [...years.values()],
      labels: [...years.keys()],
    };
  }, [isDemo, period, stats]);

  /* ─ Service categories from real data ─ */
  const serviceCategories = useMemo(() => {
    if (isDemo) return demoServiceCategories;
    const list = stats?.revenueByCategory ?? [];
    if (list.length === 0) return [];
    const total = list.reduce((acc, c) => acc + c.revenue, 0);
    return list.map((c, i) => ({
      name: c.category,
      value: c.revenue,
      pct: total > 0 ? Math.round((c.revenue / total) * 100) : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [isDemo, stats]);

  /* ─ Top clients from real data ─ */
  const topClients = useMemo(() => {
    if (isDemo) return demoTopClients;
    return (stats?.topClients ?? []).map((c) => ({
      name: c.name,
      visits: c.count,
      total: Math.round(c.revenue),
      rating: 0,
    }));
  }, [isDemo, stats]);

  /* ─ Service area aggregation from bookings ─ */
  const serviceAreas = useMemo(() => {
    if (isDemo) return demoServiceAreas;
    const counts = new Map<string, number>();
    for (const b of bookings) {
      const city = b.home?.city?.trim();
      if (!city) continue;
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([city, jobs]) => ({ city, jobs }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 8);
  }, [isDemo, bookings]);

  /* ─ Weekly breakdown (this week, by day, from bookings) ─ */
  const weeklyBreakdown = useMemo(() => {
    if (isDemo) return demoWeeklyBreakdown;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const buckets: { day: string; jobs: number; revenue: number }[] = WEEKDAYS.map((d) => ({
      day: d,
      jobs: 0,
      revenue: 0,
    }));

    for (const b of bookings) {
      const date = new Date(b.scheduledDate);
      if (date < startOfWeek || date >= endOfWeek) continue;
      const idx = date.getDay();
      buckets[idx].jobs += 1;
      const cost = b.finalCost ?? b.estimatedCost;
      buckets[idx].revenue += cost ? Number(cost) : 0;
    }
    return buckets;
  }, [isDemo, bookings]);

  const maxServiceValue = serviceCategories[0]?.value ?? 1;
  const maxAreaJobs = serviceAreas[0]?.jobs ?? 1;

  /* ─ KPIs ─ */
  // In real mode the API computes period+prior+trends so we use those directly.
  const apiPeriod = stats?.period;

  const periodRevenue = isDemo
    ? 8200
    : apiPeriod?.current.revenue ?? 0;

  const periodJobs = isDemo
    ? 18
    : apiPeriod?.current.jobsCompleted ?? 0;

  const avgJobValue = isDemo
    ? 456
    : Math.round(apiPeriod?.current.avgJobValue ?? 0);

  const rating = isDemo ? 4.9 : stats?.month.avgRating ?? 0;
  const reviewCount = isDemo ? null : stats?.month.reviewCount ?? 0;

  const priorLabel =
    period === "week"
      ? "vs last week"
      : period === "month"
        ? "vs last month"
        : period === "quarter"
          ? "vs last quarter"
          : "vs last year";

  type KpiTrend =
    | { kind: "stars" }
    | { kind: "demo"; text: string }
    | { kind: "real"; trend: TrendData; format: "currency" | "count" };

  const kpiCards: Array<{
    label: string;
    value: string;
    trend: KpiTrend;
    icon: typeof DollarSign;
    iconBg: string;
    iconColor: string;
    reviewCount?: number | null;
  }> = [
    {
      label: "Revenue",
      value: formatCurrency(periodRevenue),
      trend: isDemo
        ? { kind: "demo", text: "+12% vs last month" }
        : apiPeriod
          ? { kind: "real", trend: apiPeriod.trends.revenue, format: "currency" }
          : { kind: "demo", text: priorLabel },
      icon: DollarSign,
      iconBg: "bg-success-light",
      iconColor: "text-success",
    },
    {
      label: "Jobs Completed",
      value: String(periodJobs),
      trend: isDemo
        ? { kind: "demo", text: "+3 vs last month" }
        : apiPeriod
          ? { kind: "real", trend: apiPeriod.trends.jobsCompleted, format: "count" }
          : { kind: "demo", text: priorLabel },
      icon: Briefcase,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
    },
    {
      label: "Avg Job Value",
      value: avgJobValue ? `$${avgJobValue}` : "$0",
      trend: isDemo
        ? { kind: "demo", text: "+$32 vs last month" }
        : apiPeriod
          ? { kind: "real", trend: apiPeriod.trends.avgJobValue, format: "currency" }
          : { kind: "demo", text: "per completed job" },
      icon: TrendingUp,
      iconBg: "bg-[#EFF9FF]",
      iconColor: "text-info",
    },
    {
      label: "Client Satisfaction",
      value: `${rating ? rating.toFixed(1) : "—"}/5.0`,
      trend: { kind: "stars" },
      icon: Star,
      iconBg: "bg-warning-light",
      iconColor: "text-warning",
      reviewCount,
    },
  ];

  const chartHasData = chartData.values.some((v) => v > 0);

  if (!mounted || loading) {
    return (
      <div className="px-5 pt-14 lg:pt-8 pb-28 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 lg:pt-8 pb-28">
      {/* ── Back Link ── */}
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary active:opacity-70 transition-opacity"
      >
        <ArrowLeft size={15} />
        Dashboard
      </Link>

      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-text-primary leading-tight">
            Reports
          </h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            Business Performance
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex rounded-lg bg-surface-secondary p-0.5">
          {(
            [
              { key: "week", label: "Week" },
              { key: "month", label: "Month" },
              { key: "quarter", label: "Quarter" },
              { key: "year", label: "Year" },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                period === p.key
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-tertiary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {kpiCards.map((stat) => (
          <Card key={stat.label} padding="sm" className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.iconBg}`}
              >
                <stat.icon size={15} className={stat.iconColor} />
              </div>
              <span className="text-[11px] font-semibold text-text-secondary">
                {stat.label}
              </span>
            </div>
            <p className="text-[22px] font-bold text-text-primary leading-none">
              {stat.value}
            </p>
            {stat.trend.kind === "stars" ? (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className={
                      s <= Math.round(rating)
                        ? "text-warning fill-warning"
                        : "text-warning/30"
                    }
                  />
                ))}
                {stat.reviewCount != null && stat.reviewCount > 0 && (
                  <span className="text-[10px] font-semibold text-text-tertiary ml-1">
                    {stat.reviewCount} reviews
                  </span>
                )}
              </div>
            ) : stat.trend.kind === "demo" ? (
              <p className="text-[11px] font-semibold text-success">
                {stat.trend.text}
              </p>
            ) : (
              <TrendDeltaBadge
                trend={stat.trend.trend}
                format={stat.trend.format}
                priorLabel={priorLabel}
              />
            )}
          </Card>
        ))}
      </div>

      {/* ── Revenue Chart ── */}
      <div className="mb-6">
        <Card padding="md">
          <div className="mb-3">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Revenue Trend
            </h3>
            <p className="text-[11px] text-text-tertiary">
              {period === "week"
                ? "Weekly revenue — last 8 weeks"
                : period === "month"
                  ? "Monthly revenue"
                  : period === "quarter"
                    ? "Quarterly revenue"
                    : "Yearly revenue"}
            </p>
          </div>
          {chartHasData ? (
            <RevenueChart values={chartData.values} labels={chartData.labels} />
          ) : (
            <p className="text-[12px] text-text-tertiary text-center py-12">
              No data yet — complete jobs to see reports
            </p>
          )}
        </Card>
      </div>

      {/* ── Two Column: Service Categories + Top Clients ── */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Service Category */}
        <Card padding="md">
          <h3 className="text-[15px] font-semibold text-text-primary mb-3">
            Revenue by Service Category
          </h3>
          {serviceCategories.length === 0 ? (
            <p className="text-[12px] text-text-tertiary text-center py-6">
              No data yet — complete jobs to see reports
            </p>
          ) : (
            <div className="space-y-3">
              {serviceCategories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium text-text-primary">
                      {cat.name}
                    </span>
                    <span className="text-[12px] font-semibold text-text-secondary">
                      ${Math.round(cat.value).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(cat.value / maxServiceValue) * 100}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {cat.pct}% of total
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Clients */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-text-secondary" />
            <h3 className="text-[15px] font-semibold text-text-primary">
              Top Clients
            </h3>
          </div>
          {topClients.length === 0 ? (
            <p className="text-[12px] text-text-tertiary text-center py-6">
              No data yet — complete jobs to see reports
            </p>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, i) => (
                <div
                  key={client.name + i}
                  className="flex items-center gap-3 py-2 border-b border-border-light last:border-0"
                >
                  {/* Rank */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-bold text-primary">
                    {i + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">
                      {client.name}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      {client.visits} {client.visits === 1 ? "visit" : "visits"}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-text-primary">
                      ${client.total.toLocaleString()}
                    </p>
                    {client.rating > 0 && (
                      <div className="flex items-center gap-0.5 justify-end">
                        <Star size={10} className="text-warning fill-warning" />
                        <span className="text-[11px] font-semibold text-text-secondary">
                          {client.rating}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Two Column: Service Area Heatmap + Weekly Breakdown ── */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service Area Heatmap */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-text-secondary" />
            <h3 className="text-[15px] font-semibold text-text-primary">
              Service Area Heatmap
            </h3>
          </div>
          {serviceAreas.length === 0 ? (
            <p className="text-[12px] text-text-tertiary text-center py-6">
              No data yet — complete jobs to see reports
            </p>
          ) : (
            <div className="space-y-2.5">
              {serviceAreas.map((area) => (
                <div key={area.city}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium text-text-primary">
                      {area.city}
                    </span>
                    <span className="text-[11px] font-semibold text-text-secondary">
                      {area.jobs} {area.jobs === 1 ? "job" : "jobs"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(area.jobs / maxAreaJobs) * 100}%`,
                        opacity: 0.4 + (area.jobs / maxAreaJobs) * 0.6,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Weekly Breakdown */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-text-secondary" />
            <h3 className="text-[15px] font-semibold text-text-primary">
              Weekly Breakdown
            </h3>
          </div>
          {weeklyBreakdown.every((d) => d.jobs === 0) && !isDemo ? (
            <p className="text-[12px] text-text-tertiary text-center py-6">
              No data yet — complete jobs to see reports
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {weeklyBreakdown.map((day) => (
                <div
                  key={day.day}
                  className="rounded-lg bg-surface-secondary px-3 py-2.5"
                >
                  <p className="text-[13px] font-bold text-text-primary">
                    {day.day}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {day.jobs} {day.jobs === 1 ? "job" : "jobs"} &middot; ${Math.round(day.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
