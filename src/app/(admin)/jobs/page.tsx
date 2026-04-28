"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Clock,
  MapPin,
  Camera,
  ShoppingCart,
  Wrench,
  Plus,
  LayoutGrid,
  List,
  ChevronDown,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { toast } from "@/components/Toaster";

// ── Types ────────────────────────────────────────────────────────────────────

type PipelineStage = "pending" | "confirmed" | "in-progress" | "completed";
type JobStatus = PipelineStage | "needs-parts" | "scheduled";

interface Job {
  id: string;
  client: string;
  address: string;
  date: string;
  dateGroup: "today" | "this-week" | "future" | "past";
  tasks: string[];
  status: JobStatus;
  partsNeeded: boolean;
  photos: number;
  estimate: string;
}

// API booking shape (subset used here)
interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedCost: string | number | null;
  finalCost: string | number | null;
  customer: { id: string; name: string } | null;
  home: { address: string; city: string | null } | null;
  tasks: { id: string; label: string; done: boolean | null }[];
  parts: { id: string; status: string | null }[];
  photos: { id: string }[];
}

// API status (snake_case) → UI status (kebab-case)
function apiStatusToUi(status: string): JobStatus {
  if (status === "in_progress") return "in-progress";
  if (status === "needs_parts") return "needs-parts";
  return status as JobStatus;
}

// UI status (kebab-case) → API status (snake_case)
function uiStatusToApi(status: PipelineStage): string {
  if (status === "in-progress") return "in_progress";
  return status;
}

function bucketDate(date: Date): "today" | "this-week" | "future" | "past" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays > 0 && diffDays <= 7) return "this-week";
  if (diffDays > 7) return "future";
  return "past";
}

function formatJobDate(dateIso: string, timeIso: string): string {
  const d = new Date(dateIso);
  const t = new Date(timeIso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${timeStr}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`;
}

function bookingToJob(b: ApiBooking): Job {
  const cost = b.finalCost ?? b.estimatedCost;
  const numCost = cost == null ? 0 : Number(cost);
  return {
    id: b.id,
    client: b.customer?.name ?? "Customer",
    address: b.home ? `${b.home.address}${b.home.city ? `, ${b.home.city}` : ""}` : "—",
    date: formatJobDate(b.scheduledDate, b.scheduledTime),
    dateGroup: bucketDate(new Date(b.scheduledDate)),
    tasks: b.tasks.map((t) => t.label),
    status: apiStatusToUi(b.status),
    partsNeeded: (b.parts ?? []).some((p) => p.status === "needed" || p.status === "ordered"),
    photos: (b.photos ?? []).length,
    estimate: numCost > 0 ? `$${numCost.toFixed(0)}` : "$0",
  };
}

// ── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { key: PipelineStage; label: string; color: string; dotClass: string; borderClass: string; bgClass: string }[] = [
  { key: "pending", label: "Pending", color: "#F59E0B", dotClass: "bg-accent-amber", borderClass: "border-l-amber-400", bgClass: "bg-amber-50" },
  { key: "confirmed", label: "Confirmed", color: "#2563EB", dotClass: "bg-primary", borderClass: "border-l-primary", bgClass: "bg-primary-50" },
  { key: "in-progress", label: "In Progress", color: "#8B5CF6", dotClass: "bg-[#8B5CF6]", borderClass: "border-l-[#8B5CF6]", bgClass: "bg-[#F5F3FF]" },
  { key: "completed", label: "Complete", color: "#16A34A", dotClass: "bg-success", borderClass: "border-l-success", bgClass: "bg-success-light" },
];

/** Map any job status to its pipeline stage */
function toPipelineStage(status: JobStatus): PipelineStage {
  if (status === "needs-parts" || status === "scheduled") return "pending";
  return status;
}

/** Parse dollar string to number */
function parseDollars(s: string): number {
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
}

// ── Demo data (used only when demo_mode cookie is set) ──────────────────────

const DEMO_JOBS: Job[] = [
  {
    id: "1",
    client: "Sarah Mitchell",
    address: "4821 Oak Hollow Dr, Plano",
    date: "Today, 9:00 AM",
    dateGroup: "today",
    tasks: ["Replace kitchen faucet", "Fix garage door sensor"],
    status: "confirmed",
    partsNeeded: true,
    photos: 3,
    estimate: "$340",
  },
  {
    id: "2",
    client: "Robert Chen",
    address: "1205 Elm Creek Ct, Frisco",
    date: "Today, 11:30 AM",
    dateGroup: "today",
    tasks: ["Install smart thermostat", "Replace 3 outlets"],
    status: "confirmed",
    partsNeeded: false,
    photos: 0,
    estimate: "$280",
  },
  {
    id: "3",
    client: "Maria Garcia",
    address: "890 Sunset Ridge, Roanoke",
    date: "Today, 2:00 PM",
    dateGroup: "today",
    tasks: ["Drywall repair (2 holes)", "Touch-up paint"],
    status: "pending",
    partsNeeded: false,
    photos: 2,
    estimate: "$190",
  },
  {
    id: "4",
    client: "James Wilson",
    address: "2200 Heritage Trail, McKinney",
    date: "Apr 1, 10:00 AM",
    dateGroup: "this-week",
    tasks: ["Full bathroom wallpaper removal", "Tile grout repair"],
    status: "pending",
    partsNeeded: true,
    photos: 5,
    estimate: "$620",
  },
  {
    id: "5",
    client: "Angela Torres",
    address: "1100 Prairie Creek, Waxahachie",
    date: "Apr 2, 8:30 AM",
    dateGroup: "this-week",
    tasks: ["Ceiling fan install", "Caulk master bath"],
    status: "needs-parts",
    partsNeeded: true,
    photos: 1,
    estimate: "$175",
  },
  {
    id: "6",
    client: "Derek Nguyen",
    address: "350 Creekside Blvd, Allen",
    date: "Apr 5, 9:00 AM",
    dateGroup: "future",
    tasks: ["Fence gate repair", "Power wash driveway"],
    status: "scheduled",
    partsNeeded: false,
    photos: 0,
    estimate: "$230",
  },
  // In-progress job
  {
    id: "7",
    client: "Patricia Holmes",
    address: "710 Magnolia Ln, Denton",
    date: "Today, 7:30 AM",
    dateGroup: "today",
    tasks: ["Deck railing replacement", "Stain & seal deck"],
    status: "in-progress",
    partsNeeded: false,
    photos: 4,
    estimate: "$480",
  },
  // Completed jobs
  {
    id: "8",
    client: "Kevin Bradley",
    address: "2905 Pecan Valley Dr, Plano",
    date: "Mar 28, 9:00 AM",
    dateGroup: "past",
    tasks: ["Garbage disposal install", "Fix leaky P-trap"],
    status: "completed",
    partsNeeded: false,
    photos: 2,
    estimate: "$215",
  },
  {
    id: "9",
    client: "Linda Chow",
    address: "445 Birchwood Ct, Frisco",
    date: "Mar 28, 1:00 PM",
    dateGroup: "past",
    tasks: ["Closet shelf system install"],
    status: "completed",
    partsNeeded: false,
    photos: 3,
    estimate: "$310",
  },
];

// ── Empty state ──────────────────────────────────────────────────────────────

function JobsEmptyState({ hasSearch, searchQuery }: { hasSearch: boolean; searchQuery: string }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
          <Search size={26} className="text-text-tertiary" />
        </div>
        <p className="text-[16px] font-bold text-text-primary">No jobs found</p>
        <p className="mt-1.5 text-[13px] text-text-secondary">
          Nothing matched &ldquo;<span className="font-semibold">{searchQuery}</span>&rdquo;
        </p>
        <p className="mt-0.5 text-[12px] text-text-tertiary">Try a different client name, address, or task.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-5">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-50">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
            <rect x="8" y="14" width="36" height="30" rx="4" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
            <rect x="8" y="14" width="36" height="9" rx="4" fill="#2563EB" />
            <rect x="18" y="10" width="3" height="8" rx="1.5" fill="#2563EB" />
            <rect x="31" y="10" width="3" height="8" rx="1.5" fill="#2563EB" />
            <circle cx="19" cy="30" r="2" fill="#93C5FD" />
            <circle cx="28" cy="30" r="2" fill="#93C5FD" />
            <circle cx="37" cy="30" r="2" fill="#93C5FD" />
            <circle cx="19" cy="37" r="2" fill="#BFDBFE" />
            <circle cx="28" cy="37" r="2" fill="#2563EB" />
            <circle cx="37" cy="37" r="2" fill="#BFDBFE" />
          </svg>
        </div>
        <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <Wrench size={16} className="text-primary" />
        </div>
        <div className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 rounded-full bg-primary opacity-30" />
      </div>
      <h3 className="text-[18px] font-bold text-text-primary">No jobs scheduled</h3>
      <p className="mt-2 max-w-[220px] text-[13px] leading-relaxed text-text-secondary">
        Create your first job to start tracking visits and tasks.
      </p>
      <Link href="/schedule/new" className="mt-5">
        <button className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14px] font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] active:bg-primary-dark transition-colors">
          <Plus size={16} />
          Add New Job
        </button>
      </Link>
      <p className="mt-4 text-[11px] text-text-tertiary">Jobs appear here once scheduled on the calendar.</p>
    </div>
  );
}

// ── Move-to dropdown ─────────────────────────────────────────────────────────

function MoveToDropdown({
  currentStage,
  onMove,
  align = "right",
}: {
  currentStage: PipelineStage;
  onMove: (stage: PipelineStage) => void;
  align?: "right" | "left";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const targets = STAGES.filter((s) => s.key !== currentStage);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:bg-surface-secondary hover:border-gray-300 transition-colors"
      >
        Move
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} bottom-full z-30 mb-1 min-w-[150px] rounded-xl border border-border bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.15)]`}
        >
          {targets.map((stage) => (
            <button
              key={stage.key}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMove(stage.key);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <span className={`h-2 w-2 rounded-full ${stage.dotClass}`} />
              {stage.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pipeline summary (filter pills + compact total) ──────────────────────────

function PipelineSummary({
  stageCounts,
  activeStage,
  onStageClick,
  totalRevenue,
  showTotal,
}: {
  stageCounts: Record<PipelineStage, number>;
  activeStage: PipelineStage | "all";
  onStageClick: (stage: PipelineStage | "all") => void;
  totalRevenue: number;
  showTotal: boolean;
}) {
  const totalJobs = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => onStageClick("all")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
            activeStage === "all"
              ? "bg-text-primary text-white shadow-sm"
              : "border border-border bg-surface text-text-secondary hover:border-gray-300"
          }`}
        >
          All
          <span className={`ml-0.5 text-[11px] ${activeStage === "all" ? "text-white/70" : "text-text-tertiary"}`}>
            {totalJobs}
          </span>
        </button>

        {STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => onStageClick(stage.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
              activeStage === stage.key
                ? "text-white shadow-sm"
                : "border border-border bg-surface text-text-secondary hover:border-gray-300"
            }`}
            style={activeStage === stage.key ? { backgroundColor: stage.color } : undefined}
          >
            <span
              className={`h-2 w-2 rounded-full ${activeStage === stage.key ? "bg-white/60" : ""}`}
              style={activeStage !== stage.key ? { backgroundColor: stage.color } : undefined}
            />
            {stage.label}
            <span className={`ml-0.5 text-[11px] ${activeStage === stage.key ? "text-white/70" : "text-text-tertiary"}`}>
              {stageCounts[stage.key]}
            </span>
          </button>
        ))}
      </div>

      {showTotal && totalRevenue > 0 && (
        <div className="hidden shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-text-secondary lg:block">
          <span className="text-text-tertiary">Pipeline:</span>{" "}
          <span className="text-text-primary">${totalRevenue.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── Job card (list view) ─────────────────────────────────────────────────────

function JobCardList({
  job,
  onMove,
}: {
  job: Job;
  onMove: (jobId: string, stage: PipelineStage) => void;
}) {
  const stage = toPipelineStage(job.status);
  const stageConfig = STAGES.find((s) => s.key === stage)!;

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card padding="md" className={`border-l-[3px] ${stageConfig.borderClass}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-semibold text-text-primary">{job.client}</h3>
              <StatusBadge status={job.status === "scheduled" || job.status === "needs-parts" ? job.status : stage} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0 text-text-tertiary" />
              <span className="text-[12px] text-text-secondary truncate">{job.address}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Clock size={12} className="shrink-0 text-text-tertiary" />
              <span className="text-[12px] text-text-secondary">{job.date}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[16px] font-bold text-text-primary">{job.estimate}</span>
          </div>
        </div>

        {/* Task chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.tasks.map((task) => (
            <span key={task} className="rounded-md bg-surface-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
              {task}
            </span>
          ))}
        </div>

        {/* Meta row + Move to */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-4">
            {job.photos > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                <Camera size={12} />
                {job.photos} photo{job.photos !== 1 ? "s" : ""}
              </span>
            )}
            {job.partsNeeded && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent-amber">
                <ShoppingCart size={12} />
                Parts needed
              </span>
            )}
          </div>
          <MoveToDropdown currentStage={stage} onMove={(newStage) => onMove(job.id, newStage)} />
        </div>
      </Card>
    </Link>
  );
}

// ── Compact card (board view) ────────────────────────────────────────────────

function JobCardCompact({
  job,
  onMove,
}: {
  job: Job;
  onMove: (jobId: string, stage: PipelineStage) => void;
}) {
  const router = useRouter();
  const stage = toPipelineStage(job.status);
  const stageConfig = STAGES.find((s) => s.key === stage)!;
  const taskSummary = job.tasks[0] ?? "No tasks";
  const extraTasks = job.tasks.length > 1 ? job.tasks.length - 1 : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/jobs/${job.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/jobs/${job.id}`);
        }
      }}
      className="group relative cursor-pointer rounded-xl border border-border bg-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {/* Client + address */}
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-text-primary truncate">{job.client}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <MapPin size={11} className="shrink-0 text-text-tertiary" />
          <span className="text-[11px] text-text-secondary truncate">{job.address}</span>
        </div>
      </div>

      {/* Job description */}
      <div className="mt-2">
        <p className="text-[12px] text-text-secondary leading-snug line-clamp-2">
          {taskSummary}
          {extraTasks > 0 && (
            <span className="text-text-tertiary"> +{extraTasks} more</span>
          )}
        </p>
      </div>

      {/* Meta */}
      {(job.partsNeeded || job.photos > 0) && (
        <div className="mt-2 flex items-center gap-3">
          {job.partsNeeded && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-accent-amber">
              <ShoppingCart size={10} />
              Parts
            </span>
          )}
          {job.photos > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
              <Camera size={10} />
              {job.photos}
            </span>
          )}
        </div>
      )}

      {/* Footer: status chip + amount + move */}
      <div className="mt-3 flex items-center justify-between border-t border-border-light pt-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: `${stageConfig.color}15`, color: stageConfig.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stageConfig.color }} />
            {stageConfig.label}
          </span>
          <span className="text-[13px] font-bold text-text-primary">{job.estimate}</span>
        </div>
        <MoveToDropdown currentStage={stage} onMove={(newStage) => onMove(job.id, newStage)} />
      </div>
    </div>
  );
}

// ── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  jobs: columnJobs,
  revenue,
  onMove,
}: {
  stage: (typeof STAGES)[number];
  jobs: Job[];
  revenue: number;
  onMove: (jobId: string, stage: PipelineStage) => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-secondary/40">
      {/* Column header */}
      <div
        className="rounded-t-xl border-t-2 bg-surface px-3.5 py-2.5"
        style={{ borderTopColor: stage.color }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 shrink-0 rounded-full ${stage.dotClass}`} />
            <span className="text-[12px] font-bold uppercase tracking-wide text-text-primary truncate">
              {stage.label}
            </span>
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-surface-secondary px-1.5 text-[11px] font-semibold text-text-secondary">
              {columnJobs.length}
            </span>
          </div>
          {revenue > 0 && (
            <span className="text-[11px] font-semibold text-text-tertiary shrink-0">
              ${revenue.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Column body — grows with content, page scrolls; dropdown stays unclipped */}
      <div className="flex-1 space-y-2.5 p-2.5 min-h-[120px]">
        {columnJobs.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-[12px] text-text-tertiary">No jobs</p>
          </div>
        ) : (
          columnJobs.map((job) => (
            <JobCardCompact key={job.id} job={job} onMove={onMove} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

// Multi-select filter set
type FilterStatus = "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "needs-parts" | "scheduled";

const FILTER_STATUSES: { key: FilterStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in-progress", label: "In Progress" },
  { key: "needs-parts", label: "Needs Parts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const DATE_BUCKETS: { key: "today" | "this-week" | "future" | "past"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This Week" },
  { key: "future", label: "Future" },
  { key: "past", label: "Past" },
];

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<PipelineStage | "all">("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [jobData, setJobData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<Set<FilterStatus>>(new Set());
  const [filterDateBuckets, setFilterDateBuckets] = useState<Set<"today" | "this-week" | "future" | "past">>(new Set());
  const [filterPartsOnly, setFilterPartsOnly] = useState(false);

  const { isDemo, mounted } = useDemoMode();

  // Default to board on desktop
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    if (mql.matches) setView("board");
    const handler = (e: MediaQueryListEvent) => setView(e.matches ? "board" : "list");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Fetch bookings (or load demo data)
  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setJobData(DEMO_JOBS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const url =
      activeStage === "all"
        ? "/api/admin/bookings"
        : `/api/admin/bookings?status=${uiStatusToApi(activeStage)}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load jobs (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setJobData(data.map(bookingToJob));
        } else {
          setJobData([]);
        }
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load jobs");
        setJobData([]);
      })
      .finally(() => setLoading(false));
  }, [isDemo, activeStage, mounted, reloadKey]);

  // Move handler — optimistic update + PATCH (with revert on failure)
  const handleMove = (jobId: string, newStage: PipelineStage) => {
    let prevSnapshot: Job[] = [];
    setJobData((prev) => {
      prevSnapshot = prev;
      return prev.map((j) =>
        j.id === jobId
          ? { ...j, status: newStage as JobStatus, partsNeeded: newStage === "pending" ? j.partsNeeded : false }
          : j
      );
    });
    if (isDemo) return;
    fetch(`/api/bookings/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: uiStatusToApi(newStage) }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      })
      .catch((e) => {
        toast.error("Couldn't move job: " + (e instanceof Error ? e.message : String(e)));
        setJobData(prevSnapshot);
      });
  };

  // Compute stage counts & revenue from full data (before search filter)
  const { stageCounts, stageRevenue, totalRevenue } = useMemo(() => {
    const counts: Record<PipelineStage, number> = { pending: 0, confirmed: 0, "in-progress": 0, completed: 0 };
    const revenue: Record<PipelineStage, number> = { pending: 0, confirmed: 0, "in-progress": 0, completed: 0 };
    let total = 0;
    for (const j of jobData) {
      const s = toPipelineStage(j.status);
      counts[s]++;
      const amt = parseDollars(j.estimate);
      revenue[s] += amt;
      total += amt;
    }
    return { stageCounts: counts, stageRevenue: revenue, totalRevenue: total };
  }, [jobData]);

  // Filtered jobs
  const filtered = useMemo(() => {
    let result = jobData;

    // Stage filter (pipeline pills)
    if (activeStage !== "all") {
      result = result.filter((j) => toPipelineStage(j.status) === activeStage);
    }

    // Filter-panel: status (multi)
    if (filterStatuses.size > 0) {
      result = result.filter((j) => filterStatuses.has(j.status as FilterStatus));
    }

    // Filter-panel: date bucket (multi)
    if (filterDateBuckets.size > 0) {
      result = result.filter((j) => filterDateBuckets.has(j.dateGroup));
    }

    // Filter-panel: parts only
    if (filterPartsOnly) {
      result = result.filter((j) => j.partsNeeded);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.client.toLowerCase().includes(q) ||
          j.tasks.some((t) => t.toLowerCase().includes(q)) ||
          j.address.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activeStage, search, jobData, filterStatuses, filterDateBuckets, filterPartsOnly]);

  const activeFilterCount =
    filterStatuses.size + filterDateBuckets.size + (filterPartsOnly ? 1 : 0);

  function toggleFilterStatus(s: FilterStatus) {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleFilterDateBucket(b: "today" | "this-week" | "future" | "past") {
    setFilterDateBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }

  function clearAllFilters() {
    setFilterStatuses(new Set());
    setFilterDateBuckets(new Set());
    setFilterPartsOnly(false);
  }

  // Group by stage for board view
  const groupedByStage = useMemo(() => {
    const groups: Record<PipelineStage, Job[]> = { pending: [], confirmed: [], "in-progress": [], completed: [] };
    for (const j of filtered) {
      groups[toPipelineStage(j.status)].push(j);
    }
    return groups;
  }, [filtered]);

  const showEmpty = filtered.length === 0;

  return (
    <div className="px-5 pt-14 lg:pt-8 pb-24 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Manage</p>
          <h1 className="mt-0.5 text-[26px] font-bold text-text-primary leading-tight">Jobs</h1>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
              view === "list" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
            }`}
          >
            <List size={14} />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
              view === "board" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
            }`}
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Board</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-3 flex gap-2">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Search size={16} className="shrink-0 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients, tasks, addresses..."
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilterPanel((v) => !v)}
          className={`relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-surface-secondary transition-colors ${
            showFilterPanel || activeFilterCount > 0
              ? "border-primary bg-primary-50"
              : "border-border bg-surface"
          }`}
          aria-label="Filters"
        >
          <Filter size={17} className={showFilterPanel || activeFilterCount > 0 ? "text-primary" : "text-text-secondary"} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <Card padding="md" className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-text-primary">Filters</p>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-[12px] font-semibold text-text-secondary hover:text-text-primary"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilterPanel(false)}
                className="text-[12px] font-semibold text-primary"
              >
                Done
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_STATUSES.map((s) => {
                  const active = filterStatuses.has(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleFilterStatus(s.key)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Date Range</p>
              <div className="flex flex-wrap gap-1.5">
                {DATE_BUCKETS.map((b) => {
                  const active = filterDateBuckets.has(b.key);
                  return (
                    <button
                      key={b.key}
                      onClick={() => toggleFilterDateBucket(b.key)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Other</p>
              <button
                onClick={() => setFilterPartsOnly((v) => !v)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                  filterPartsOnly
                    ? "border-accent-amber bg-accent-amber text-white"
                    : "border-border bg-surface text-text-secondary hover:border-accent-amber/40"
                }`}
              >
                Parts needed only
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Load error banner */}
      {loadError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-error/30 bg-error-light p-3.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-error">Couldn&rsquo;t load jobs</p>
            <p className="mt-0.5 text-[12px] text-error/80 break-words">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-error px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <RotateCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Pipeline summary (visible in both views) */}
      <PipelineSummary
        stageCounts={stageCounts}
        activeStage={activeStage}
        onStageClick={setActiveStage}
        totalRevenue={totalRevenue}
        showTotal={view === "board"}
      />

      {/* Results count */}
      {search.trim() && filtered.length > 0 && (
        <p className="mb-3 text-[12px] text-text-tertiary">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* ── Loading state ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────────────────────── */}
      {!loading && view === "list" && (
        <div className="space-y-3">
          {showEmpty ? (
            <JobsEmptyState hasSearch={search.trim() !== "" || activeStage !== "all"} searchQuery={search} />
          ) : (
            filtered.map((job) => <JobCardList key={job.id} job={job} onMove={handleMove} />)
          )}
        </div>
      )}

      {/* ── Board view ────────────────────────────────────────────────────────── */}
      {!loading && view === "board" && (
        <>
          {showEmpty && activeStage !== "all" ? (
            <JobsEmptyState hasSearch={true} searchQuery={search} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  jobs={groupedByStage[stage.key]}
                  revenue={stageRevenue[stage.key]}
                  onMove={handleMove}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
