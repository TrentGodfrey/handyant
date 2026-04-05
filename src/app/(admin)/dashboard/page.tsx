"use client";

import { useState } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Link from "next/link";
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

const todaySchedule = [
  {
    id: 1,
    time: "9:00 AM",
    duration: "2h",
    client: "Sarah Mitchell",
    address: "4821 Oak Hollow Dr, Plano",
    tasks: ["Replace kitchen faucet", "Fix garage door sensor"],
    status: "confirmed" as const,
    partsNeeded: true,
  },
  {
    id: 2,
    time: "11:30 AM",
    duration: "1.5h",
    client: "Robert Chen",
    address: "1205 Elm Creek Ct, Frisco",
    tasks: ["Install smart thermostat", "Replace 3 outlets"],
    status: "confirmed" as const,
    partsNeeded: false,
  },
  {
    id: 3,
    time: "2:00 PM",
    duration: "2h",
    client: "Maria Garcia",
    address: "890 Sunset Ridge, Roanoke",
    tasks: ["Drywall repair (2 holes)", "Touch-up paint"],
    status: "pending" as const,
    partsNeeded: false,
  },
  {
    id: 4,
    time: "4:30 PM",
    duration: "30 min",
    client: "Team Meeting",
    address: "",
    tasks: ["Weekly sync"],
    status: "confirmed" as const,
    partsNeeded: false,
  },
];

const pendingOffers = [
  {
    client: "James Wilson",
    service: "Full bathroom wallpaper removal",
    date: "Apr 3",
    area: "McKinney",
    est: "$280",
  },
  {
    client: "Lisa Park",
    service: "Ceiling fan install (3 fans)",
    date: "Apr 5",
    area: "Plano",
    est: "$195",
  },
];

const monthlyMetrics = [
  { label: "Tasks / Visit", value: "3.2", trend: "+0.4", positive: true, icon: Wrench, sparkline: [2.8, 3.0, 2.9, 3.1, 3.2] },
  { label: "Avg Rating", value: "4.9", trend: "+0.1", positive: true, icon: Star, sparkline: [4.8, 4.8, 4.9, 4.9, 4.9] },
  { label: "Revenue", value: "$8.2k", trend: "+12%", positive: true, icon: TrendingUp, sparkline: [6800, 7200, 7500, 7800, 8200] },
  { label: "Total Visits", value: "18", trend: "+3", positive: true, icon: Calendar, sparkline: [14, 15, 16, 17, 18] },
];

/* ── Mini Sparkline for Monthly Metrics ── */
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

/* ── Revenue Trend Chart ── */
function RevenueTrendChart() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const weeklyRevenue = [1800, 2100, 1950, 2400, 2200, 2650, 2100, 2400];

  const chartW = 320;
  const chartH = 160;
  const padLeft = 0;
  const padRight = 0;
  const padTop = 12;
  const padBottom = 24;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxVal = 3000;
  const minVal = 0;

  const points = weeklyRevenue.map((v, i) => {
    const x = padLeft + (i / (weeklyRevenue.length - 1)) * plotW;
    const y = padTop + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Area path: line + close to bottom
  const areaPath = `M${points[0].x},${points[0].y} ${points.map((p) => `L${p.x},${p.y}`).join(" ")} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${padTop + plotH} Z`;

  // Grid lines at $1k, $2k, $3k
  const gridLines = [1000, 2000, 3000].map((val) => {
    const y = padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
    return { val, y };
  });

  const lastPoint = points[points.length - 1];

  return (
    <div className="mb-6">
      <Card padding="md">
        {/* Header */}
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

        {/* SVG Chart */}
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

          {/* Grid lines */}
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

          {/* Area fill */}
          <path d={areaPath} fill="url(#revGradient)" />

          {/* Line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Latest data point dot */}
          <circle cx={lastPoint.x} cy={lastPoint.y} r={3.5} fill="#2563EB" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r={6} fill="#2563EB" opacity={0.15} />

          {/* X-axis labels */}
          {weeklyRevenue.map((_, i) => {
            const x = padLeft + (i / (weeklyRevenue.length - 1)) * plotW;
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

        {/* Summary stats */}
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[13px] font-bold text-primary">This Week: $2,400</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-success" />
            <span className="text-[12px] font-semibold text-success">+$300 (+14%)</span>
            <span className="text-[11px] text-text-tertiary ml-0.5">vs last week</span>
          </div>
          <div className="ml-auto">
            <span className="text-[12px] text-text-secondary font-medium">Monthly total: $8,200</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="px-5 pt-14 lg:pt-8 pb-24">

      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-text-tertiary">
            Monday, March 30
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold text-text-primary leading-tight">
            Hey Anthony 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_4px_rgba(0,0,0,0.08)] active:bg-surface-secondary transition-colors"
          >
            <Settings size={18} className="text-text-secondary" />
          </Link>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-[0_1px_4px_rgba(0,0,0,0.08)] active:bg-surface-secondary transition-colors">
            <Bell size={19} className="text-text-secondary" />
            <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-sm">
              3
            </span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid grid-cols-4 gap-2.5">
        {[
          { label: "Today's Jobs", value: "4", sub: "jobs", icon: Calendar, iconBg: "bg-primary-50", iconColor: "text-primary" },
          { label: "Hours", value: "7.5", sub: "booked", icon: Clock, iconBg: "bg-[#EFF9FF]", iconColor: "text-info" },
          { label: "Parts", value: "2", sub: "to buy", icon: ShoppingCart, iconBg: "bg-warning-light", iconColor: "text-warning" },
          { label: "This Week", value: "$2.4k", sub: "earned", icon: DollarSign, iconBg: "bg-success-light", iconColor: "text-success" },
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
      <RevenueTrendChart />

      {/* ── Alert Banner ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning-light px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15">
            <AlertTriangle size={15} className="text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-text-primary">Parts needed before 9 AM</p>
            <p className="text-[11px] text-text-secondary truncate">Broan 688 fan motor · Home Depot Plano</p>
          </div>
          <button className="flex items-center gap-1 rounded-lg bg-warning px-2.5 py-1.5 text-[11px] font-semibold text-white shrink-0 active:opacity-80 transition-opacity">
            <Navigation size={11} />
            Go
          </button>
        </div>
      </div>

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
      </div>

      {/* ── Available Offers ── */}
      <div className="mb-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Available Offers
          </h2>
          <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            {pendingOffers.length} new
          </span>
        </div>

        <div className="space-y-2.5">
          {pendingOffers.map((offer) => (
            <Card key={offer.client} padding="sm">
              <div className="flex items-center gap-3">
                {/* Avatar placeholder */}
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
