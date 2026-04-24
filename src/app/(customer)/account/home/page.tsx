"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import { useDemoMode } from "@/lib/useDemoMode";
import { initialsOf } from "@/lib/initials";
import {
  ChevronLeft, Plus, Camera, Wifi, Users, Phone, MapPin,
  ShoppingCart, AlertTriangle, Check, ChevronRight,
  Eye, EyeOff, Home, Droplets, Zap, Info, Star, X,
  CheckCircle2, Flag, Loader2, Pencil,
} from "lucide-react";

type Priority = "high" | "medium" | "low";
type PartStatus = "Purchased" | "Needs Purchase" | "Tech to Purchase" | null;

// =====================================================================
// DEMO DATA — preserved from previous version
// =====================================================================

interface DemoTodoItem {
  id: string;
  task: string;
  priority: Priority;
  hasPhoto: boolean;
  status: "needs-parts" | "pending" | "confirmed" | "in-progress" | "scheduled";
  parts: string | null;
  partStatus: PartStatus;
  specialist: boolean;
  notes?: string;
}

const DEMO_INITIAL_TODOS: DemoTodoItem[] = [
  { id: "1", task: "Fix bathroom exhaust fan", priority: "high", hasPhoto: true, status: "needs-parts", parts: "Broan 688 Fan Motor", partStatus: "Needs Purchase", specialist: false, notes: "Rattling sound, intermittent power" },
  { id: "2", task: "Install smart thermostat", priority: "medium", hasPhoto: false, status: "pending", parts: "Ecobee Smart Thermostat", partStatus: "Purchased", specialist: false },
  { id: "3", task: "Patch drywall in hallway", priority: "low", hasPhoto: true, status: "pending", parts: null, partStatus: null, specialist: false },
  { id: "4", task: "Replace garage door weatherstrip", priority: "low", hasPhoto: false, status: "confirmed", parts: null, partStatus: null, specialist: false },
  { id: "5", task: "Electrical panel inspection", priority: "high", hasPhoto: false, status: "pending", parts: null, partStatus: null, specialist: true, notes: "Breaker trips on circuit 4 — licensed electrician needed" },
];

const DEMO_HOUSEHOLD = [
  { name: "Sarah Mitchell", role: "Primary", phone: "(972) 555-0142", initials: "SM" },
  { name: "David Mitchell", role: "Spouse", phone: "(972) 555-0198", initials: "DM" },
];

const DEMO_VISITS = [
  { date: "Mar 15, 2026", tech: "Anthony", tasks: ["Replaced kitchen faucet", "Fixed garbage disposal", "Caulked kitchen sink"], hours: "2.5h", rating: 5 },
  { date: "Feb 28, 2026", tech: "Anthony", tasks: ["Mounted TV in living room", "Smart thermostat install"], hours: "1.5h", rating: 5 },
  { date: "Feb 10, 2026", tech: "Anthony", tasks: ["Drywall patch (2 areas)", "Paint touch-up", "Door hinge tightening", "Curtain rod install"], hours: "3h", rating: 4 },
];

const DEMO_HOME_DETAILS = [
  { icon: Home, label: "Built", value: "2008", color: "text-primary" },
  { icon: Droplets, label: "Water Heater", value: "2012", color: "text-info" },
  { icon: Zap, label: "Panel", value: "200A", color: "text-accent-amber" },
];

const PRIORITY_CONFIG: Record<Priority, { dot: string; label: string; ring: string }> = {
  high: { dot: "bg-error", label: "High", ring: "ring-error/20" },
  medium: { dot: "bg-warning", label: "Medium", ring: "ring-warning/20" },
  low: { dot: "bg-text-tertiary", label: "Low", ring: "ring-border" },
};

// =====================================================================
// Types for real-mode data
// =====================================================================

interface HomeRecord {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  gateCode: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  yearBuilt: number | null;
  waterHeaterYear: number | null;
  panelAmps: number | null;
}

interface HomeFull extends HomeRecord {
  householdMembers: MemberRecord[];
  todos: TodoRecord[];
  techNotes: NoteRecord[];
  bookings: BookingRecord[];
}

interface MemberRecord {
  id: string;
  homeId: string;
  name: string;
  role: string | null;
  phone: string | null;
}

interface TodoRecord {
  id: string;
  homeId: string;
  task: string;
  priority: string;
  status: string;
  parts: string | null;
  partStatus: string | null;
  specialist: boolean | null;
  hasPhoto: boolean | null;
  notes: string | null;
}

interface NoteRecord {
  id: string;
  homeId: string;
  title: string;
  body: string | null;
  severity: string | null;
  authorName: string | null;
  createdAt: string | null;
}

interface BookingRecord {
  id: string;
  status: string;
  scheduledDate: string;
  durationMinutes: number | null;
  tech: { id: string; name: string; avatarUrl: string | null } | null;
  tasks: { id: string; label: string; done: boolean | null }[];
  reviews: { id: string; rating: number }[];
}

// =====================================================================
// Helpers
// =====================================================================

function formatVisitDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatHours(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.round((minutes / 60) * 10) / 10;
  return `${h}h`;
}

function formatNoteDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtAddress(h: { address: string; city: string | null; state: string | null; zip: string | null }): string {
  const parts = [h.address];
  const cityState = [h.city, h.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (h.zip) parts.push(h.zip);
  return parts.join(", ");
}

// =====================================================================
// Page
// =====================================================================

export default function HomeProfilePage() {
  const { isDemo, mounted } = useDemoMode();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background pb-28 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  return isDemo ? <DemoHomeProfile /> : <RealHomeProfile />;
}

// =====================================================================
// Demo (preserved old UI)
// =====================================================================

function DemoHomeProfile() {
  const [todos, setTodos] = useState<DemoTodoItem[]>(DEMO_INITIAL_TODOS);
  const [showWifiPw, setShowWifiPw] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  function removeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function addTask() {
    if (!newTask.trim()) return;
    const id = Math.random().toString(36).slice(2);
    setTodos((prev) => [
      ...prev,
      { id, task: newTask.trim(), priority: newPriority, hasPhoto: false, status: "pending", parts: null, partStatus: null, specialist: false },
    ]);
    setNewTask("");
    setNewPriority("medium");
    setShowAddTask(false);
  }

  const highCount = todos.filter((t) => t.priority === "high").length;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
          Account
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-text-primary">Home Profile</h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-text-tertiary">
              <MapPin size={13} className="shrink-0" />
              <span className="text-[13px]">4821 Oak Hollow Dr, Plano TX 75024</span>
            </div>
          </div>
          {highCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-error-light px-3 py-1.5 text-[11px] font-semibold text-error">
              <Flag size={11} />
              {highCount} urgent
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {DEMO_HOME_DETAILS.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5">
              <Icon size={12} className={color} />
              <span className="text-[11px] text-text-tertiary">{label}:</span>
              <span className="text-[11px] font-semibold text-text-primary">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Card padding="sm" className="border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF9FF]">
                <Wifi size={14} className="text-[#0EA5E9]" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi</span>
            </div>
            <p className="text-[13px] font-semibold text-text-primary">MitchellHome5G</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={`text-[12px] font-mono text-text-secondary tracking-wider ${!showWifiPw ? "blur-[3px] select-none" : ""}`}>
                Sunfl0wer88!
              </span>
              <button onClick={() => setShowWifiPw(!showWifiPw)} className="text-text-tertiary hover:text-text-secondary transition-colors">
                {showWifiPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </Card>

          <Card padding="sm" className="border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F3FF]">
                <Users size={14} className="text-accent-purple" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Household</span>
            </div>
            <p className="text-[13px] font-semibold text-text-primary">{DEMO_HOUSEHOLD.length} members</p>
            <div className="mt-1.5 flex -space-x-1.5">
              {DEMO_HOUSEHOLD.map((m) => (
                <div key={m.name} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-[9px] font-bold text-white">
                  {m.initials}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Household Members</p>
          <div className="space-y-2">
            {DEMO_HOUSEHOLD.map((member) => (
              <Card key={member.name} padding="sm" className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
                  {member.initials}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-text-primary">{member.name}</p>
                  <p className="text-[12px] text-text-tertiary">{member.role} · {member.phone}</p>
                </div>
                <a href={`tel:${member.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-success-light active:bg-success/20 transition-colors">
                  <Phone size={15} className="text-success" />
                </a>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">To-Do List</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">{todos.length} items · {highCount} urgent</p>
            </div>
            <button onClick={() => setShowAddTask(!showAddTask)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm active:opacity-90 transition-opacity">
              <Plus size={14} />
              Add Task
            </button>
          </div>

          {showAddTask && (
            <Card padding="md" className="mb-3 border border-primary-100 bg-primary-50 animate-fade-in">
              <p className="text-[13px] font-semibold text-text-primary mb-3">New Task</p>
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Describe the task…"
                autoFocus
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none mb-3"
              />
              <div className="flex gap-2 mb-3">
                {(["high", "medium", "low"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all ${newPriority === p ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary"}`}
                  >
                    <div className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddTask(false)}>Cancel</Button>
                <Button variant="primary" size="sm" fullWidth disabled={!newTask.trim()} onClick={addTask}>Add Task</Button>
              </div>
            </Card>
          )}

          <div className="space-y-2">
            {todos.map((item) => {
              const isExpanded = expandedTodo === item.id;
              const pCfg = PRIORITY_CONFIG[item.priority];
              return (
                <Card key={item.id} padding="sm" onClick={() => setExpandedTodo(isExpanded ? null : item.id)} className="cursor-pointer">
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-1.5 shrink-0 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ${pCfg.dot} ${pCfg.ring}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-semibold text-text-primary leading-snug">{item.task}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.specialist && (
                            <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-semibold text-accent-coral">Specialist</span>
                          )}
                          <ChevronRight size={14} className={`text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <StatusBadge status={item.status} />
                        {item.hasPhoto && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-text-tertiary">
                            <Camera size={10} />
                            Photo
                          </span>
                        )}
                      </div>
                      {item.parts && (
                        <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2">
                          <ShoppingCart size={12} className="shrink-0 text-text-tertiary" />
                          <span className="text-[11px] text-text-secondary flex-1 truncate">{item.parts}</span>
                          <span className={`text-[10px] font-semibold shrink-0 ${item.partStatus === "Purchased" ? "text-success" : item.partStatus === "Tech to Purchase" ? "text-primary" : "text-accent-amber"}`}>
                            {item.partStatus}
                            {item.partStatus === "Tech to Purchase" && " (+$10)"}
                          </span>
                        </div>
                      )}
                      {isExpanded && item.notes && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2">
                          <Info size={12} className="mt-0.5 shrink-0 text-accent-amber" />
                          <p className="text-[12px] text-text-secondary">{item.notes}</p>
                        </div>
                      )}
                      {isExpanded && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button className="flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary-100 transition-colors">
                            <Camera size={11} />
                            Add Photo
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeTodo(item.id); }} className="flex items-center gap-1 rounded-lg bg-error-light px-3 py-1.5 text-[11px] font-semibold text-error hover:bg-red-100 transition-colors">
                            <X size={11} />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Visit History</p>
          <div className="space-y-2">
            {DEMO_VISITS.map((visit) => {
              const isExpanded = expandedVisit === visit.date;
              return (
                <Card key={visit.date} padding="sm" onClick={() => setExpandedVisit(isExpanded ? null : visit.date)} className="cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-light">
                      <CheckCircle2 size={18} className="text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-text-primary">{visit.date} · {visit.tech}</p>
                        <ChevronRight size={14} className={`text-text-tertiary transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-text-tertiary">{visit.tasks.length} tasks · {visit.hours}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={9} className={i < visit.rating ? "fill-warning text-warning" : "fill-border text-border"} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 pl-1 border-l-2 border-border ml-[52px]">
                      {visit.tasks.map((task) => (
                        <div key={task} className="flex items-center gap-2">
                          <Check size={11} className="shrink-0 text-success" />
                          <span className="text-[12px] text-text-secondary">{task}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Tech Notes</p>
          <Card padding="md" className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-light">
                <AlertTriangle size={15} className="text-accent-amber" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-text-primary">Water heater is 14+ years old</p>
                <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">Recommend replacement within 1–2 years. Risk of failure increases after 15 years.</p>
                <p className="text-[10px] text-text-tertiary mt-1">Noted Feb 28, 2026 · Anthony</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF7ED]">
                <AlertTriangle size={15} className="text-accent-coral" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-text-primary">Garage door spring has play</p>
                <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">Monitoring — may need specialist. Lubrication applied, check in 3 months.</p>
                <p className="text-[10px] text-text-tertiary mt-1">Noted Mar 15, 2026 · Anthony</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Info size={15} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-text-primary">HVAC filter due for replacement</p>
                <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">Last replaced Feb 10. Recommend replacing every 90 days (Merv 11 or higher).</p>
                <p className="text-[10px] text-text-tertiary mt-1">Noted Mar 15, 2026 · Anthony</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Real-mode UI
// =====================================================================

function RealHomeProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [home, setHome] = useState<HomeFull | null>(null);
  const [hasNoHome, setHasNoHome] = useState(false);

  // Edit state
  const [editingAddress, setEditingAddress] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressToast, setAddressToast] = useState<string | null>(null);

  const [editingDetails, setEditingDetails] = useState(false);
  const [editYearBuilt, setEditYearBuilt] = useState<string>("");
  const [editWaterHeaterYear, setEditWaterHeaterYear] = useState<string>("");
  const [editPanelAmps, setEditPanelAmps] = useState<string>("");
  const [savingDetails, setSavingDetails] = useState(false);

  // WiFi
  const [showWifiPw, setShowWifiPw] = useState(false);
  const [editingWifi, setEditingWifi] = useState(false);
  const [editWifiName, setEditWifiName] = useState("");
  const [editWifiPassword, setEditWifiPassword] = useState("");
  const [savingWifi, setSavingWifi] = useState(false);

  // Members
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  // Todos
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [savingTask, setSavingTask] = useState(false);
  const [photoUploadingId, setPhotoUploadingId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoTargetTodoRef = useRef<string | null>(null);

  // Visits
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  // Add-home form (when no home exists)
  const [addHome, setAddHome] = useState({ address: "", city: "", state: "TX", zip: "", gateCode: "", notes: "" });
  const [addHomeBusy, setAddHomeBusy] = useState(false);
  const [addHomeError, setAddHomeError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const homesRes = await fetch("/api/homes");
      if (!homesRes.ok) throw new Error("Failed to load homes");
      const homes = (await homesRes.json()) as { id: string }[];
      if (!Array.isArray(homes) || homes.length === 0) {
        setHome(null);
        setHasNoHome(true);
        return;
      }
      setHasNoHome(false);
      const homeId = homes[0].id;
      const detailRes = await fetch(`/api/homes/${homeId}`);
      if (!detailRes.ok) throw new Error("Failed to load home detail");
      const detail = (await detailRes.json()) as HomeFull;
      setHome(detail);

      // Sync edit fields
      setEditAddress(detail.address ?? "");
      setEditCity(detail.city ?? "");
      setEditState(detail.state ?? "");
      setEditZip(detail.zip ?? "");
      setEditYearBuilt(detail.yearBuilt != null ? String(detail.yearBuilt) : "");
      setEditWaterHeaterYear(detail.waterHeaterYear != null ? String(detail.waterHeaterYear) : "");
      setEditPanelAmps(detail.panelAmps != null ? String(detail.panelAmps) : "");
      setEditWifiName(detail.wifiName ?? "");
      setEditWifiPassword(detail.wifiPassword ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ============ Actions ============

  async function handleCreateHome(e: React.FormEvent) {
    e.preventDefault();
    if (!addHome.address.trim()) {
      setAddHomeError("Address is required");
      return;
    }
    setAddHomeBusy(true);
    setAddHomeError(null);
    try {
      const res = await fetch("/api/homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addHome),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create home");
      }
      await refresh();
    } catch (err: unknown) {
      setAddHomeError(err instanceof Error ? err.message : "Failed to create home");
    } finally {
      setAddHomeBusy(false);
    }
  }

  async function patchHome(payload: Record<string, unknown>) {
    if (!home) return null;
    const res = await fetch(`/api/homes/${home.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to save");
    }
    return await res.json();
  }

  async function saveAddress() {
    if (!editAddress.trim()) {
      setAddressToast("Address is required");
      setTimeout(() => setAddressToast(null), 2500);
      return;
    }
    setSavingAddress(true);
    try {
      await patchHome({
        address: editAddress.trim(),
        city: editCity.trim() || null,
        state: editState.trim() || null,
        zip: editZip.trim() || null,
      });
      setEditingAddress(false);
      setAddressToast("Address saved");
      setTimeout(() => setAddressToast(null), 2500);
      await refresh();
    } catch (e: unknown) {
      setAddressToast(e instanceof Error ? e.message : "Failed to save");
      setTimeout(() => setAddressToast(null), 3500);
    } finally {
      setSavingAddress(false);
    }
  }

  async function saveDetails() {
    setSavingDetails(true);
    try {
      const yb = editYearBuilt.trim();
      const wy = editWaterHeaterYear.trim();
      const pa = editPanelAmps.trim();
      await patchHome({
        yearBuilt: yb ? Number(yb) : null,
        waterHeaterYear: wy ? Number(wy) : null,
        panelAmps: pa ? Number(pa) : null,
      });
      setEditingDetails(false);
      await refresh();
    } catch {
      // surfaced via address toast pattern not great here; refresh to revert state
    } finally {
      setSavingDetails(false);
    }
  }

  async function saveWifi() {
    setSavingWifi(true);
    try {
      await patchHome({
        wifiName: editWifiName.trim() || null,
        wifiPassword: editWifiPassword || null,
      });
      setEditingWifi(false);
      await refresh();
    } catch {
      /* noop */
    } finally {
      setSavingWifi(false);
    }
  }

  async function addMember() {
    if (!home || !newMemberName.trim()) return;
    setSavingMember(true);
    try {
      const res = await fetch(`/api/homes/${home.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          role: newMemberRole.trim() || null,
          phone: newMemberPhone.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      setNewMemberName("");
      setNewMemberRole("");
      setNewMemberPhone("");
      setShowAddMember(false);
      await refresh();
    } catch {
      /* noop */
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!home) return;
    try {
      await fetch(`/api/homes/${home.id}/members/${memberId}`, { method: "DELETE" });
      await refresh();
    } catch {
      /* noop */
    }
  }

  async function addTodo() {
    if (!home || !newTask.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/homes/${home.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: newTask.trim(), priority: newPriority }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      setNewTask("");
      setNewPriority("medium");
      setShowAddTask(false);
      await refresh();
    } catch {
      /* noop */
    } finally {
      setSavingTask(false);
    }
  }

  async function removeTodo(todoId: string) {
    if (!home) return;
    try {
      await fetch(`/api/homes/${home.id}/todos/${todoId}`, { method: "DELETE" });
      await refresh();
    } catch {
      /* noop */
    }
  }

  function triggerPhotoUpload(todoId: string) {
    photoTargetTodoRef.current = todoId;
    photoInputRef.current?.click();
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !home) return;
    const todoId = photoTargetTodoRef.current;
    if (!todoId) return;
    setPhotoUploadingId(todoId);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const photoRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeId: home.id, dataUrl, type: "before" }),
      });
      if (!photoRes.ok) throw new Error("Photo upload failed");
      await fetch(`/api/homes/${home.id}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasPhoto: true }),
      });
      await refresh();
    } catch {
      /* noop */
    } finally {
      setPhotoUploadingId(null);
      photoTargetTodoRef.current = null;
    }
  }

  // ============ Render ============

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-28 px-5 pt-14">
        <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">
          <ChevronLeft size={16} />
          Account
        </Link>
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-error mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-text-primary">Could not load home profile</p>
              <p className="text-[12px] text-text-secondary mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>Retry</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (hasNoHome || !home) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
          <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
            Account
          </Link>
          <h1 className="text-[24px] font-bold text-text-primary">Add Your Home</h1>
          <p className="mt-1 text-[13px] text-text-secondary">Set up your home so we can schedule visits and track work.</p>
        </div>
        <div className="px-5 py-5">
          <Card>
            <form onSubmit={handleCreateHome} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Street Address</label>
                <input
                  type="text"
                  value={addHome.address}
                  onChange={(e) => setAddHome((s) => ({ ...s, address: e.target.value }))}
                  placeholder="123 Main St"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">City</label>
                  <input
                    type="text"
                    value={addHome.city}
                    onChange={(e) => setAddHome((s) => ({ ...s, city: e.target.value }))}
                    placeholder="Plano"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">State</label>
                    <input
                      type="text"
                      value={addHome.state}
                      onChange={(e) => setAddHome((s) => ({ ...s, state: e.target.value }))}
                      placeholder="TX"
                      maxLength={2}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">ZIP</label>
                    <input
                      type="text"
                      value={addHome.zip}
                      onChange={(e) => setAddHome((s) => ({ ...s, zip: e.target.value }))}
                      placeholder="75024"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Gate Code (optional)</label>
                <input
                  type="text"
                  value={addHome.gateCode}
                  onChange={(e) => setAddHome((s) => ({ ...s, gateCode: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Notes (optional)</label>
                <textarea
                  value={addHome.notes}
                  onChange={(e) => setAddHome((s) => ({ ...s, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                />
              </div>
              {addHomeError && <p className="text-[12px] text-error">{addHomeError}</p>}
              <Button size="md" fullWidth disabled={addHomeBusy}>
                {addHomeBusy ? "Saving…" : "Save home"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  const completedVisits = (home.bookings ?? []).filter((b) => b.status === "completed");
  const todos = home.todos ?? [];
  const members = home.householdMembers ?? [];
  const techNotes = home.techNotes ?? [];
  const highCount = todos.filter((t) => t.priority === "high").length;

  return (
    <div className="min-h-screen bg-background pb-28">
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />

      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
          Account
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-bold text-text-primary">Home Profile</h1>

            {!editingAddress ? (
              <button
                type="button"
                onClick={() => setEditingAddress(true)}
                className="mt-1.5 flex items-start gap-1.5 text-left text-text-tertiary hover:text-text-secondary transition-colors group"
              >
                <MapPin size={13} className="mt-0.5 shrink-0" />
                <span className="text-[13px]">{fmtAddress(home)}</span>
                <Pencil size={11} className="mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="City"
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    placeholder="State"
                    maxLength={2}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                    placeholder="ZIP"
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" disabled={savingAddress} onClick={saveAddress}>
                    {savingAddress ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditingAddress(false); setEditAddress(home.address); setEditCity(home.city ?? ""); setEditState(home.state ?? ""); setEditZip(home.zip ?? ""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {addressToast && <p className="mt-1 text-[11px] font-medium text-success">{addressToast}</p>}
          </div>
          {highCount > 0 && !editingAddress && (
            <span className="flex items-center gap-1 rounded-full bg-error-light px-3 py-1.5 text-[11px] font-semibold text-error shrink-0">
              <Flag size={11} />
              {highCount} urgent
            </span>
          )}
        </div>

        {/* Home detail pills (editable) */}
        <div className="mt-4">
          {!editingDetails ? (
            <div className="flex flex-wrap gap-2">
              {home.yearBuilt != null && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5">
                  <Home size={12} className="text-primary" />
                  <span className="text-[11px] text-text-tertiary">Built:</span>
                  <span className="text-[11px] font-semibold text-text-primary">{home.yearBuilt}</span>
                </div>
              )}
              {home.waterHeaterYear != null && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5">
                  <Droplets size={12} className="text-info" />
                  <span className="text-[11px] text-text-tertiary">Water Heater:</span>
                  <span className="text-[11px] font-semibold text-text-primary">{home.waterHeaterYear}</span>
                </div>
              )}
              {home.panelAmps != null && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5">
                  <Zap size={12} className="text-accent-amber" />
                  <span className="text-[11px] text-text-tertiary">Panel:</span>
                  <span className="text-[11px] font-semibold text-text-primary">{home.panelAmps}A</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setEditingDetails(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-surface-secondary"
              >
                <Plus size={11} />
                {home.yearBuilt == null && home.waterHeaterYear == null && home.panelAmps == null ? "Add details" : "Edit"}
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Built</label>
                  <input
                    type="number"
                    value={editYearBuilt}
                    onChange={(e) => setEditYearBuilt(e.target.value)}
                    placeholder="2008"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">WH Year</label>
                  <input
                    type="number"
                    value={editWaterHeaterYear}
                    onChange={(e) => setEditWaterHeaterYear(e.target.value)}
                    placeholder="2012"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Panel A</label>
                  <input
                    type="number"
                    value={editPanelAmps}
                    onChange={(e) => setEditPanelAmps(e.target.value)}
                    placeholder="200"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" disabled={savingDetails} onClick={saveDetails}>
                  {savingDetails ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingDetails(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* WiFi + Household quick cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card padding="sm" className="border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF9FF]">
                  <Wifi size={14} className="text-[#0EA5E9]" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi</span>
              </div>
              {!editingWifi && (
                <button onClick={() => setEditingWifi(true)} className="text-[11px] font-semibold text-primary">
                  {home.wifiName ? "Edit" : "Add"}
                </button>
              )}
            </div>
            {!editingWifi ? (
              home.wifiName ? (
                <>
                  <p className="text-[13px] font-semibold text-text-primary truncate">{home.wifiName}</p>
                  {home.wifiPassword && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`text-[12px] font-mono text-text-secondary tracking-wider truncate ${!showWifiPw ? "blur-[3px] select-none" : ""}`}>
                        {home.wifiPassword}
                      </span>
                      <button onClick={() => setShowWifiPw(!showWifiPw)} className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0">
                        {showWifiPw ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-text-tertiary">Not set</p>
              )
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editWifiName}
                  onChange={(e) => setEditWifiName(e.target.value)}
                  placeholder="Network name"
                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={editWifiPassword}
                  onChange={(e) => setEditWifiPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] font-mono outline-none focus:border-primary"
                />
                <div className="flex gap-1">
                  <Button variant="primary" size="sm" disabled={savingWifi} onClick={saveWifi}>
                    {savingWifi ? "…" : "Save"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditingWifi(false); setEditWifiName(home.wifiName ?? ""); setEditWifiPassword(home.wifiPassword ?? ""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card padding="sm" className="border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F3FF]">
                <Users size={14} className="text-accent-purple" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Household</span>
            </div>
            <p className="text-[13px] font-semibold text-text-primary">{members.length} {members.length === 1 ? "member" : "members"}</p>
            {members.length > 0 && (
              <div className="mt-1.5 flex -space-x-1.5">
                {members.slice(0, 4).map((m) => (
                  <div key={m.id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-[9px] font-bold text-white">
                    {initialsOf(m.name)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Household members full */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Household Members</p>
            <button
              onClick={() => setShowAddMember((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-primary"
            >
              <Plus size={12} />
              Add member
            </button>
          </div>

          {showAddMember && (
            <Card padding="md" className="mb-3 border border-primary-100 bg-primary-50">
              <p className="text-[13px] font-semibold text-text-primary mb-3">New Member</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Full name"
                  autoFocus
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="Role (e.g. Spouse, Child)"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="tel"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => { setShowAddMember(false); setNewMemberName(""); setNewMemberRole(""); setNewMemberPhone(""); }}>Cancel</Button>
                  <Button variant="primary" size="sm" fullWidth disabled={!newMemberName.trim() || savingMember} onClick={addMember}>
                    {savingMember ? "Adding…" : "Add"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {members.length === 0 && !showAddMember ? (
            <Card padding="md">
              <p className="text-[13px] text-text-tertiary text-center">No household members yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <Card key={member.id} padding="sm" className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
                    {initialsOf(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary truncate">{member.name}</p>
                    <p className="text-[12px] text-text-tertiary truncate">
                      {[member.role, member.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {member.phone && (
                    <a href={`tel:${member.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-success-light active:bg-success/20 transition-colors">
                      <Phone size={15} className="text-success" />
                    </a>
                  )}
                  <button
                    onClick={() => removeMember(member.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-error-light transition-colors"
                    aria-label="Remove member"
                  >
                    <X size={14} className="text-text-tertiary" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* To-Do List */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">To-Do List</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">{todos.length} items · {highCount} urgent</p>
            </div>
            <button onClick={() => setShowAddTask(!showAddTask)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm active:opacity-90 transition-opacity">
              <Plus size={14} />
              Add Task
            </button>
          </div>

          {showAddTask && (
            <Card padding="md" className="mb-3 border border-primary-100 bg-primary-50">
              <p className="text-[13px] font-semibold text-text-primary mb-3">New Task</p>
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                placeholder="Describe the task…"
                autoFocus
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none mb-3"
              />
              <div className="flex gap-2 mb-3">
                {(["high", "medium", "low"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all ${newPriority === p ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary"}`}
                  >
                    <div className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAddTask(false); setNewTask(""); }}>Cancel</Button>
                <Button variant="primary" size="sm" fullWidth disabled={!newTask.trim() || savingTask} onClick={addTodo}>
                  {savingTask ? "Adding…" : "Add Task"}
                </Button>
              </div>
            </Card>
          )}

          {todos.length === 0 ? (
            <Card padding="md">
              <p className="text-[13px] text-text-tertiary text-center">No tasks yet — tap Add Task to get started</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {todos.map((item) => {
                const isExpanded = expandedTodo === item.id;
                const priority = (["high", "medium", "low"] as Priority[]).includes(item.priority as Priority)
                  ? (item.priority as Priority)
                  : "medium";
                const pCfg = PRIORITY_CONFIG[priority];
                const status = (
                  ["confirmed", "pending", "completed", "in-progress", "needs-parts", "scheduled", "cancelled"] as const
                ).includes(item.status as never)
                  ? (item.status as "confirmed" | "pending" | "completed" | "in-progress" | "needs-parts" | "scheduled" | "cancelled")
                  : "pending";
                return (
                  <Card key={item.id} padding="sm" onClick={() => setExpandedTodo(isExpanded ? null : item.id)} className="cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-1.5 shrink-0 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ${pCfg.dot} ${pCfg.ring}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14px] font-semibold text-text-primary leading-snug">{item.task}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.specialist && (
                              <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-semibold text-accent-coral">Specialist</span>
                            )}
                            <ChevronRight size={14} className={`text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <StatusBadge status={status} />
                          {item.hasPhoto && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-text-tertiary">
                              <Camera size={10} />
                              Photo
                            </span>
                          )}
                        </div>
                        {item.parts && (
                          <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2">
                            <ShoppingCart size={12} className="shrink-0 text-text-tertiary" />
                            <span className="text-[11px] text-text-secondary flex-1 truncate">{item.parts}</span>
                            {item.partStatus && (
                              <span className={`text-[10px] font-semibold shrink-0 ${item.partStatus === "Purchased" ? "text-success" : item.partStatus === "Tech to Purchase" ? "text-primary" : "text-accent-amber"}`}>
                                {item.partStatus}
                              </span>
                            )}
                          </div>
                        )}
                        {isExpanded && item.notes && (
                          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2">
                            <Info size={12} className="mt-0.5 shrink-0 text-accent-amber" />
                            <p className="text-[12px] text-text-secondary">{item.notes}</p>
                          </div>
                        )}
                        {isExpanded && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); triggerPhotoUpload(item.id); }}
                              disabled={photoUploadingId === item.id}
                              className="flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary-100 transition-colors disabled:opacity-50"
                            >
                              {photoUploadingId === item.id ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                              {photoUploadingId === item.id ? "Uploading…" : "Add Photo"}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeTodo(item.id); }}
                              className="flex items-center gap-1 rounded-lg bg-error-light px-3 py-1.5 text-[11px] font-semibold text-error hover:bg-red-100 transition-colors"
                            >
                              <X size={11} />
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Visit History */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Visit History</p>
          {completedVisits.length === 0 ? (
            <Card padding="md">
              <p className="text-[13px] text-text-tertiary text-center">No visits yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {completedVisits.map((visit) => {
                const isExpanded = expandedVisit === visit.id;
                const rating = visit.reviews?.[0]?.rating ?? 0;
                return (
                  <Card key={visit.id} padding="sm" onClick={() => setExpandedVisit(isExpanded ? null : visit.id)} className="cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-light">
                        <CheckCircle2 size={18} className="text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-semibold text-text-primary truncate">
                            {formatVisitDate(visit.scheduledDate)}{visit.tech?.name ? ` · ${visit.tech.name}` : ""}
                          </p>
                          <ChevronRight size={14} className={`text-text-tertiary transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-text-tertiary">
                            {visit.tasks.length} {visit.tasks.length === 1 ? "task" : "tasks"} · {formatHours(visit.durationMinutes)}
                          </span>
                          {rating > 0 && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} size={9} className={i < rating ? "fill-warning text-warning" : "fill-border text-border"} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && visit.tasks.length > 0 && (
                      <div className="mt-3 space-y-1.5 pl-1 border-l-2 border-border ml-[52px]">
                        {visit.tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2">
                            <Check size={11} className="shrink-0 text-success" />
                            <span className="text-[12px] text-text-secondary">{task.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Tech Notes */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Tech Notes</p>
          {techNotes.length === 0 ? (
            <Card padding="md">
              <p className="text-[13px] text-text-tertiary text-center">No tech notes yet — your handyman will add observations after visits</p>
            </Card>
          ) : (
            <Card padding="md" className="space-y-4">
              {techNotes.map((note, idx) => {
                const severity = note.severity ?? "info";
                const cfg =
                  severity === "critical"
                    ? { bg: "bg-[#FFF7ED]", color: "text-accent-coral", Icon: AlertTriangle }
                    : severity === "warning"
                      ? { bg: "bg-warning-light", color: "text-accent-amber", Icon: AlertTriangle }
                      : { bg: "bg-primary-50", color: "text-primary", Icon: Info };
                const Icon = cfg.Icon;
                return (
                  <div key={note.id}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                        <Icon size={15} className={cfg.color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-text-primary">{note.title}</p>
                        {note.body && (
                          <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{note.body}</p>
                        )}
                        {(note.authorName || note.createdAt) && (
                          <p className="text-[10px] text-text-tertiary mt-1">
                            Noted {formatNoteDate(note.createdAt)}{note.authorName ? ` · ${note.authorName}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    {idx < techNotes.length - 1 && <div className="h-px bg-border mt-4" />}
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
