"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Briefcase,
  TrendingUp,
  Star,
  Users,
  MapPin,
  Calendar,
} from "lucide-react";

/* ── Static Data ── */

const revenueData = [5200, 6100, 6800, 7200, 7500, 8200];
const revenueLabels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const serviceCategories = [
  { name: "Plumbing", value: 2400, pct: 29, color: "#3B82F6" },
  { name: "Electrical", value: 1900, pct: 23, color: "#8B5CF6" },
  { name: "General Repair", value: 1500, pct: 18, color: "#F59E0B" },
  { name: "Smart Home", value: 1200, pct: 15, color: "#10B981" },
  { name: "Painting", value: 800, pct: 10, color: "#EC4899" },
  { name: "Carpentry", value: 400, pct: 5, color: "#6366F1" },
];

const topClients = [
  { name: "Sarah Mitchell", visits: 4, total: 1340, rating: 5.0 },
  { name: "Robert Chen", visits: 3, total: 840, rating: 4.9 },
  { name: "Maria Garcia", visits: 2, total: 380, rating: 5.0 },
  { name: "James Wilson", visits: 2, total: 560, rating: 4.8 },
];

const serviceAreas = [
  { city: "Plano", jobs: 6 },
  { city: "Frisco", jobs: 4 },
  { city: "Allen", jobs: 3 },
  { city: "McKinney", jobs: 2 },
  { city: "Prosper", jobs: 2 },
  { city: "Celina", jobs: 1 },
];

const weeklyBreakdown = [
  { day: "Mon", jobs: 4, revenue: 680 },
  { day: "Tue", jobs: 3, revenue: 520 },
  { day: "Wed", jobs: 5, revenue: 890 },
  { day: "Thu", jobs: 2, revenue: 360 },
  { day: "Fri", jobs: 3, revenue: 540 },
  { day: "Sat", jobs: 1, revenue: 210 },
];

/* ── Revenue Area Chart (SVG) ── */

function RevenueChart() {
  const chartW = 360;
  const chartH = 200;
  const padLeft = 42;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxVal = 10000;
  const minVal = 0;

  const points = revenueData.map((v, i) => {
    const x = padLeft + (i / (revenueData.length - 1)) * plotW;
    const y = padTop + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${points[0].x},${points[0].y} ${points.map((p) => `L${p.x},${p.y}`).join(" ")} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${padTop + plotH} Z`;

  const gridLines = [2000, 4000, 6000, 8000, 10000].map((val) => ({
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
            ${g.val / 1000}k
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

      {/* Month labels */}
      {revenueLabels.map((label, i) => {
        const x = padLeft + (i / (revenueLabels.length - 1)) * plotW;
        return (
          <text
            key={label}
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

/* ── Page Component ── */

export default function ReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  const maxServiceValue = serviceCategories[0].value;
  const maxAreaJobs = serviceAreas[0].jobs;

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
              { key: "week", label: "This Week" },
              { key: "month", label: "This Month" },
              { key: "quarter", label: "This Quarter" },
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
        {[
          {
            label: "Revenue",
            value: "$8,200",
            trend: "+12% vs last month",
            positive: true,
            icon: DollarSign,
            iconBg: "bg-success-light",
            iconColor: "text-success",
          },
          {
            label: "Jobs Completed",
            value: "18",
            trend: "+3 vs last month",
            positive: true,
            icon: Briefcase,
            iconBg: "bg-primary-50",
            iconColor: "text-primary",
          },
          {
            label: "Avg Job Value",
            value: "$456",
            trend: "+$32 vs last month",
            positive: true,
            icon: TrendingUp,
            iconBg: "bg-[#EFF9FF]",
            iconColor: "text-info",
          },
          {
            label: "Client Satisfaction",
            value: "4.9/5.0",
            trend: "stars",
            positive: true,
            icon: Star,
            iconBg: "bg-warning-light",
            iconColor: "text-warning",
          },
        ].map((stat) => (
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
            {stat.trend === "stars" ? (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className="text-warning fill-warning"
                  />
                ))}
              </div>
            ) : (
              <p className="text-[11px] font-semibold text-success">
                {stat.trend}
              </p>
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
              Monthly revenue — last 6 months
            </p>
          </div>
          <RevenueChart />
        </Card>
      </div>

      {/* ── Two Column: Service Categories + Top Clients ── */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Service Category */}
        <Card padding="md">
          <h3 className="text-[15px] font-semibold text-text-primary mb-3">
            Revenue by Service Category
          </h3>
          <div className="space-y-3">
            {serviceCategories.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-text-primary">
                    {cat.name}
                  </span>
                  <span className="text-[12px] font-semibold text-text-secondary">
                    ${cat.value.toLocaleString()}
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
        </Card>

        {/* Top Clients */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-text-secondary" />
            <h3 className="text-[15px] font-semibold text-text-primary">
              Top Clients
            </h3>
          </div>
          <div className="space-y-3">
            {topClients.map((client, i) => (
              <div
                key={client.name}
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
                    {client.visits} visits
                  </p>
                </div>

                {/* Total */}
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-text-primary">
                    ${client.total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-0.5 justify-end">
                    <Star
                      size={10}
                      className="text-warning fill-warning"
                    />
                    <span className="text-[11px] font-semibold text-text-secondary">
                      {client.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <div className="space-y-2.5">
            {serviceAreas.map((area) => (
              <div key={area.city}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-text-primary">
                    {area.city}
                  </span>
                  <span className="text-[11px] font-semibold text-text-secondary">
                    {area.jobs} jobs
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
        </Card>

        {/* Weekly Breakdown */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-text-secondary" />
            <h3 className="text-[15px] font-semibold text-text-primary">
              Weekly Breakdown
            </h3>
          </div>
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
                  {day.jobs} jobs &middot; ${day.revenue}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
