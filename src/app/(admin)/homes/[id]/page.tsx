"use client";

import { useState, useEffect, use } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  ChevronLeft,
  Plus,
  Camera,
  Wifi,
  Users,
  Phone,
  MapPin,
  MessageCircle,
  Wrench,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Edit,
  Navigation,
  FileText,
  Info,
  Star,
  X,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useDemoMode } from "@/lib/useDemoMode";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";
type ItemStatus = "needs-parts" | "in-progress" | "pending" | "completed";

interface ApiTask {
  id: string;
  label: string;
  done: boolean | null;
  notes: string | null;
}

interface ApiPart {
  id: string;
  item: string;
  qty: number | null;
  cost: string | null;
  status: string | null;
}

interface ApiPhoto {
  id: string;
  url: string;
  label: string | null;
  type: string | null;
}

interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number | null;
  description: string | null;
  techNotes: string | null;
  customerNotes: string | null;
  finalCost: string | null;
  estimatedCost: string | null;
  tasks: ApiTask[];
  parts?: ApiPart[];
  photos?: ApiPhoto[];
}

interface ApiTodo {
  id: string;
  task: string;
  priority: string;
  status: string;
  parts: string | null;
  partStatus: string | null;
  specialist: boolean | null;
  hasPhoto: boolean | null;
  notes: string | null;
}

interface ApiTechNote {
  id: string;
  title: string;
  body: string | null;
  severity: string | null;
  authorName: string | null;
  createdAt: string;
}

interface ApiHome {
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
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  bookings: ApiBooking[];
  photos: ApiPhoto[];
  todos: ApiTodo[];
  techNotes: ApiTechNote[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function normalizeStatus(s: string): ItemStatus {
  if (s === "completed" || s === "done") return "completed";
  if (s === "needs-parts" || s === "needs_parts") return "needs-parts";
  if (s === "in-progress" || s === "in_progress") return "in-progress";
  return "pending";
}

function normalizePriority(p: string): Priority {
  if (p === "high" || p === "low") return p;
  return "medium";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NoteIcon({ severity }: { severity: string | null }) {
  if (severity === "warning") return <AlertTriangle size={13} className="mt-0.5 shrink-0 text-accent-amber" />;
  if (severity === "star") return <Star size={13} className="mt-0.5 shrink-0 text-accent-purple" />;
  if (severity === "wrench") return <Wrench size={13} className="mt-0.5 shrink-0 text-text-tertiary" />;
  return <Info size={13} className="mt-0.5 shrink-0 text-info" />;
}

const priorityDot: Record<Priority, string> = {
  high: "bg-error",
  medium: "bg-warning",
  low: "bg-text-tertiary",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [home, setHome] = useState<ApiHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Note inline form
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Add Task inline form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [savingTask, setSavingTask] = useState(false);

  // Add Photo inline form
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoLabel, setNewPhotoLabel] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Show/hide gate code
  const [gateCodeVisible, setGateCodeVisible] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    address: "",
    city: "",
    state: "",
    zip: "",
    gateCode: "",
    wifiName: "",
    wifiPassword: "",
    notes: "",
    yearBuilt: "",
    waterHeaterYear: "",
    panelAmps: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const { isDemo, mounted } = useDemoMode();

  async function loadHome() {
    try {
      const r = await fetch(`/api/homes/${id}`);
      if (!r.ok) {
        throw new Error(r.status === 404 ? "Home not found" : "Failed to load home");
      }
      const data: ApiHome = await r.json();
      setHome(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load home");
    } finally {
      setLoading(false);
    }
  }

  // Fetch home detail
  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setHome(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isDemo, mounted]);

  // Sync edit form whenever home loads/changes
  useEffect(() => {
    if (!home) return;
    setEditForm({
      address: home.address ?? "",
      city: home.city ?? "",
      state: home.state ?? "",
      zip: home.zip ?? "",
      gateCode: home.gateCode ?? "",
      wifiName: home.wifiName ?? "",
      wifiPassword: home.wifiPassword ?? "",
      notes: home.notes ?? "",
      yearBuilt: home.yearBuilt ? String(home.yearBuilt) : "",
      waterHeaterYear: home.waterHeaterYear ? String(home.waterHeaterYear) : "",
      panelAmps: home.panelAmps ? String(home.panelAmps) : "",
    });
  }, [home]);

  const todoItems = (home?.todos ?? []).map((t) => ({
    id: t.id,
    task: t.task,
    priority: normalizePriority(t.priority),
    status: normalizeStatus(t.status),
    parts: t.parts,
    partStatus: t.partStatus,
    specialist: !!t.specialist,
    hasPhoto: !!t.hasPhoto,
  }));

  const openTasks = todoItems.filter((t) => t.status !== "completed").length;
  const totalVisits = home?.bookings.filter((b) => b.status === "completed").length ?? 0;
  const totalSpent = (home?.bookings ?? []).reduce(
    (sum, b) => sum + (b.finalCost ? Number(b.finalCost) : 0),
    0
  );

  const visitHistory = (home?.bookings ?? [])
    .filter((b) => b.status === "completed")
    .map((b) => {
      const mins = b.durationMinutes ?? 120;
      const hrs = mins / 60;
      const hrLabel = Number.isInteger(hrs) ? `${hrs}h` : `${hrs.toFixed(1)}h`;
      return {
        id: b.id,
        date: formatLongDate(b.scheduledDate),
        tasks: b.tasks.length,
        hours: hrLabel,
        notes: b.techNotes || b.description || "Service visit completed",
      };
    });

  const receipts = (home?.bookings ?? [])
    .filter((b) => b.status === "completed" && (b.finalCost || b.estimatedCost))
    .map((b) => {
      const amount = b.finalCost ? Number(b.finalCost) : Number(b.estimatedCost ?? 0);
      return {
        id: b.id,
        date: formatLongDate(b.scheduledDate),
        desc: b.description || "Service visit",
        amount: `$${amount.toFixed(2)}`,
      };
    });

  const customerInitials = home ? initialsFor(home.customer.name) : "??";
  const fullAddress = home
    ? [home.address, [home.city, home.state, home.zip].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ")
    : "";

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async function saveEdit() {
    if (!home) return;
    setSavingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        address: editForm.address,
        city: editForm.city || null,
        state: editForm.state || null,
        zip: editForm.zip || null,
        gateCode: editForm.gateCode || null,
        wifiName: editForm.wifiName || null,
        wifiPassword: editForm.wifiPassword || null,
        notes: editForm.notes || null,
        yearBuilt: editForm.yearBuilt ? Number(editForm.yearBuilt) : null,
        waterHeaterYear: editForm.waterHeaterYear ? Number(editForm.waterHeaterYear) : null,
        panelAmps: editForm.panelAmps ? Number(editForm.panelAmps) : null,
      };
      if (!isDemo) {
        const r = await fetch(`/api/homes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Failed to save");
        await loadHome();
      } else {
        // Optimistic update for demo mode
        setHome({
          ...home,
          address: editForm.address,
          city: editForm.city || null,
          state: editForm.state || null,
          zip: editForm.zip || null,
          gateCode: editForm.gateCode || null,
          wifiName: editForm.wifiName || null,
          wifiPassword: editForm.wifiPassword || null,
          notes: editForm.notes || null,
          yearBuilt: editForm.yearBuilt ? Number(editForm.yearBuilt) : null,
          waterHeaterYear: editForm.waterHeaterYear ? Number(editForm.waterHeaterYear) : null,
          panelAmps: editForm.panelAmps ? Number(editForm.panelAmps) : null,
        });
      }
      setShowEdit(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function addNote() {
    if (!newNoteText.trim() || !home) return;
    const title = newNoteText.trim();
    setSavingNote(true);
    try {
      if (!isDemo) {
        const r = await fetch(`/api/homes/${id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, severity: "info" }),
        });
        if (r.ok) await loadHome();
      } else {
        setHome({
          ...home,
          techNotes: [
            {
              id: `n${Date.now()}`,
              title,
              body: null,
              severity: "info",
              authorName: null,
              createdAt: new Date().toISOString(),
            },
            ...home.techNotes,
          ],
        });
      }
      setNewNoteText("");
      setShowAddNote(false);
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!home) return;
    // Optimistic
    setHome({ ...home, techNotes: home.techNotes.filter((n) => n.id !== noteId) });
    if (!isDemo) {
      await fetch(`/api/homes/${id}/notes/${noteId}`, { method: "DELETE" }).catch(() => {});
    }
  }

  async function addTask() {
    if (!newTaskText.trim() || !home) return;
    const task = newTaskText.trim();
    setSavingTask(true);
    try {
      if (!isDemo) {
        const r = await fetch(`/api/homes/${id}/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, priority: newTaskPriority, status: "pending" }),
        });
        if (r.ok) await loadHome();
      } else {
        setHome({
          ...home,
          todos: [
            ...home.todos,
            {
              id: `t${Date.now()}`,
              task,
              priority: newTaskPriority,
              status: "pending",
              parts: null,
              partStatus: null,
              specialist: false,
              hasPhoto: false,
              notes: null,
            },
          ],
        });
      }
      setNewTaskText("");
      setNewTaskPriority("medium");
      setShowAddTask(false);
    } finally {
      setSavingTask(false);
    }
  }

  async function toggleTaskComplete(todoId: string, currentStatus: ItemStatus) {
    if (!home) return;
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    // Optimistic
    setHome({
      ...home,
      todos: home.todos.map((t) => (t.id === todoId ? { ...t, status: newStatus } : t)),
    });
    if (!isDemo) {
      await fetch(`/api/homes/${id}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => {});
    }
  }

  async function deleteTask(todoId: string) {
    if (!home) return;
    setHome({ ...home, todos: home.todos.filter((t) => t.id !== todoId) });
    if (!isDemo) {
      await fetch(`/api/homes/${id}/todos/${todoId}`, { method: "DELETE" }).catch(() => {});
    }
  }

  async function addPhoto() {
    if (!newPhotoUrl.trim() || !home) return;
    const url = newPhotoUrl.trim();
    const label = newPhotoLabel.trim() || null;
    setSavingPhoto(true);
    try {
      if (!isDemo) {
        const r = await fetch(`/api/homes/${id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, label, type: "home" }),
        });
        if (r.ok) await loadHome();
      } else {
        setHome({
          ...home,
          photos: [
            ...home.photos,
            { id: `p${Date.now()}`, url, label, type: "home" },
          ],
        });
      }
      setNewPhotoUrl("");
      setNewPhotoLabel("");
      setShowAddPhoto(false);
    } finally {
      setSavingPhoto(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-5 pt-12 pb-24 bg-background min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !home) {
    return (
      <div className="px-5 pt-12 pb-24 bg-background min-h-screen">
        <Link
          href="/homes"
          className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-primary active:opacity-70 transition-opacity"
        >
          <ChevronLeft size={16} />
          Homes
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-light">
            <AlertTriangle size={26} className="text-error" />
          </div>
          <h2 className="text-[18px] font-bold text-text-primary">{error || "Home not found"}</h2>
          <p className="mt-2 text-[13px] text-text-secondary">
            Check the link or return to your homes list.
          </p>
        </div>
      </div>
    );
  }

  const phoneHref = home.customer.phone ? `tel:${home.customer.phone}` : undefined;
  const smsHref = home.customer.phone ? `sms:${home.customer.phone}` : undefined;
  const navHref = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;

  return (
    <div className="px-5 pt-12 pb-24 bg-background min-h-screen">
      {/* Back Nav */}
      <Link
        href="/homes"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-primary active:opacity-70 transition-opacity"
      >
        <ChevronLeft size={16} />
        Homes
      </Link>

      {/* Client Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50">
            <span className="text-[13px] font-bold text-primary">{customerInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-text-primary leading-tight">{home.customer.name}</h1>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="shrink-0 text-text-tertiary" />
              <span className="text-[12px] text-text-secondary truncate">{fullAddress}</span>
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary active:bg-surface-secondary transition-colors flex items-center gap-1"
          >
            <Edit size={11} />
            Edit
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-3 flex items-center gap-1.5">
          <div className="flex flex-1 flex-col items-center rounded-xl bg-surface border border-border py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">{openTasks}</span>
            <span className="text-[10px] text-text-tertiary">Open Tasks</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-xl bg-surface border border-border py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">{totalVisits}</span>
            <span className="text-[10px] text-text-tertiary">Total Visits</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-xl bg-surface border border-border py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">${Math.round(totalSpent)}</span>
            <span className="text-[10px] text-text-tertiary">Total Spent</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {/* Call */}
        {phoneHref ? (
          <a href={phoneHref} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors">
            <Phone size={18} className="text-success" />
            <span className="text-[11px] font-medium text-text-secondary">Call</span>
          </a>
        ) : (
          <button
            disabled
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] opacity-40"
          >
            <Phone size={18} className="text-success" />
            <span className="text-[11px] font-medium text-text-secondary">Call</span>
          </button>
        )}

        {/* Text */}
        {smsHref ? (
          <a href={smsHref} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors">
            <MessageCircle size={18} className="text-primary" />
            <span className="text-[11px] font-medium text-text-secondary">Text</span>
          </a>
        ) : (
          <button
            disabled
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] opacity-40"
          >
            <MessageCircle size={18} className="text-primary" />
            <span className="text-[11px] font-medium text-text-secondary">Text</span>
          </button>
        )}

        {/* Navigate */}
        <a
          href={navHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors"
        >
          <Navigation size={18} className="text-accent-teal" />
          <span className="text-[11px] font-medium text-text-secondary">Navigate</span>
        </a>

        {/* Edit */}
        <button
          onClick={() => setShowEdit(true)}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors"
        >
          <Edit size={18} className="text-text-secondary" />
          <span className="text-[11px] font-medium text-text-secondary">Edit</span>
        </button>
      </div>

      {/* Info Cards: Access + Contact */}
      <div className="mb-6 grid grid-cols-2 gap-2.5">
        {/* Access (Gate Code) */}
        <Card padding="sm" variant="default">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wifi size={14} className="text-info" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Access</span>
            </div>
            {home.gateCode && (
              <button
                onClick={() => setGateCodeVisible((v) => !v)}
                className="text-[10px] font-medium text-primary active:opacity-70"
              >
                {gateCodeVisible ? "Hide" : "Show"}
              </button>
            )}
          </div>
          <p className="text-[12px] font-semibold text-text-primary">
            {home.gateCode ? "Gate Code" : "No code on file"}
          </p>
          {home.gateCode && (
            <p
              className={`mt-0.5 font-mono text-[11px] transition-all ${
                gateCodeVisible ? "text-text-secondary" : "text-transparent select-none"
              }`}
              style={gateCodeVisible ? {} : { textShadow: "0 0 6px rgba(0,0,0,0.3)" }}
            >
              {home.gateCode}
            </p>
          )}
          {home.wifiName && (
            <p className="mt-1.5 text-[10px] text-text-tertiary truncate">
              WiFi: <span className="font-medium text-text-secondary">{home.wifiName}</span>
            </p>
          )}
        </Card>

        {/* Customer */}
        <Card padding="sm" variant="default">
          <div className="mb-2 flex items-center gap-1.5">
            <Users size={14} className="text-accent-purple" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Contact</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-text-primary">{home.customer.name.split(" ")[0]}</p>
                <p className="text-[10px] text-text-tertiary">Primary</p>
              </div>
              {phoneHref && (
                <a
                  href={phoneHref}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-success-light active:bg-success transition-colors"
                >
                  <Phone size={12} className="text-success" />
                </a>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Photos */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Photos
            <span className="ml-2 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-text-tertiary">
              {home.photos.length}
            </span>
          </h2>
          <button
            onClick={() => setShowAddPhoto((v) => !v)}
            className="flex items-center gap-1 text-[12px] font-semibold text-primary active:opacity-70 transition-opacity"
          >
            {showAddPhoto ? <X size={13} /> : <Plus size={13} />}
            {showAddPhoto ? "Cancel" : "Add Photo"}
          </button>
        </div>

        {showAddPhoto && (
          <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50 p-3 space-y-2">
            <input
              type="url"
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
              placeholder="Photo URL (https://...)"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              value={newPhotoLabel}
              onChange={(e) => setNewPhotoLabel(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end">
              <button
                onClick={addPhoto}
                disabled={!newPhotoUrl.trim() || savingPhoto}
                className="rounded-lg bg-primary px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
              >
                {savingPhoto ? "Saving…" : "Save Photo"}
              </button>
            </div>
          </div>
        )}

        {home.photos.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">No photos yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {home.photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square overflow-hidden rounded-xl border border-border bg-surface-secondary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.label || "Home photo"}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── To-Do List ──────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            To-Do List
            <span className="ml-2 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-text-tertiary">
              {openTasks}
            </span>
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAddPhoto((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text-secondary active:bg-surface-secondary transition-colors"
            >
              <Camera size={11} />
              Photo
            </button>
            <button
              onClick={() => setShowAddTask((v) => !v)}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white active:bg-primary-dark transition-colors shadow-[0_1px_4px_rgba(37,99,235,0.30)]"
            >
              {showAddTask ? <X size={11} /> : <Plus size={11} />}
              {showAddTask ? "Cancel" : "Add Task"}
            </button>
          </div>
        </div>

        {showAddTask && (
          <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50 p-3 space-y-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="What needs to get done?"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-text-secondary">Priority:</span>
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setNewTaskPriority(p)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize transition-colors ${
                    newTaskPriority === p
                      ? "bg-primary text-white"
                      : "bg-white border border-border text-text-secondary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={addTask}
                disabled={!newTaskText.trim() || savingTask}
                className="rounded-lg bg-primary px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
              >
                {savingTask ? "Saving…" : "Save Task"}
              </button>
            </div>
          </div>
        )}

        {todoItems.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">
              No tasks yet. Add one above.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {todoItems.map((item) => (
              <Card key={item.id} padding="sm" variant={item.status === "completed" ? "flat" : "default"}>
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${
                      item.status === "completed" ? "bg-text-tertiary opacity-40" : priorityDot[item.priority]
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-[13px] font-semibold leading-snug ${
                          item.status === "completed"
                            ? "line-through text-text-tertiary"
                            : "text-text-primary"
                        }`}
                      >
                        {item.task}
                      </p>
                      <div className="shrink-0">
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    {item.parts && (
                      <div className="mt-2 rounded-lg bg-surface-secondary px-3 py-2">
                        <span className="flex items-center gap-1.5 text-[11px] text-text-secondary min-w-0">
                          <ShoppingCart size={10} className="shrink-0 text-text-tertiary" />
                          <span className="truncate">{item.parts}</span>
                        </span>
                      </div>
                    )}

                    {item.specialist && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-error-light px-3 py-1.5">
                        <AlertTriangle size={11} className="shrink-0 text-error" />
                        <span className="text-[11px] font-semibold text-error">Specialist required</span>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.hasPhoto && (
                          <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                            <Camera size={10} />
                            Photo attached
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => deleteTask(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary active:bg-error-light active:text-error transition-colors"
                          title="Delete task"
                        >
                          <Trash2 size={11} />
                        </button>
                        <button
                          onClick={() => toggleTaskComplete(item.id, item.status)}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold active:opacity-70 transition-opacity ${
                            item.status === "completed"
                              ? "bg-surface-secondary text-text-secondary"
                              : "bg-success-light text-success"
                          }`}
                        >
                          <CheckCircle2 size={10} />
                          {item.status === "completed" ? "Reopen" : "Done"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Visit History ───────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Visit History
        </h2>
        {visitHistory.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">No completed visits yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {visitHistory.map((visit) => (
              <Card key={visit.id} padding="sm" variant="outlined">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-light">
                      <CheckCircle2 size={13} className="text-success" />
                    </div>
                    <span className="text-[13px] font-semibold text-text-primary">{visit.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                    <span>{visit.tasks} tasks</span>
                    <span className="h-3 w-px bg-border" />
                    <span>{visit.hours}</span>
                  </div>
                </div>
                <p className="mt-1.5 pl-9 text-[12px] text-text-secondary leading-relaxed">{visit.notes}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Receipts ────────────────────────────────────────────────────── */}
      {receipts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Receipts
          </h2>
          <Card variant="outlined" padding="sm">
            <div className="divide-y divide-border">
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
                    <Receipt size={13} className="text-text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{r.desc}</p>
                    <p className="text-[11px] text-text-tertiary">{r.date}</p>
                  </div>
                  <span className="shrink-0 text-[14px] font-bold text-text-primary">{r.amount}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wide">Total</span>
              <span className="text-[15px] font-bold text-text-primary">${totalSpent.toFixed(2)}</span>
            </div>
          </Card>
        </section>
      )}

      {/* ── Handyman Notes ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Handyman Notes
          </h2>
          <button
            onClick={() => setShowAddNote((v) => !v)}
            className="flex items-center gap-1 text-[12px] font-semibold text-primary active:opacity-70 transition-opacity"
          >
            {showAddNote ? <X size={13} /> : <Plus size={13} />}
            {showAddNote ? "Cancel" : "Add Note"}
          </button>
        </div>

        {showAddNote && (
          <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Type a note about this home..."
              className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={addNote}
                disabled={!newNoteText.trim() || savingNote}
                className="rounded-lg bg-primary px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
              >
                {savingNote ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        )}

        {home.techNotes.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">No notes yet.</p>
          </Card>
        ) : (
          <Card variant="outlined" padding="sm">
            <div className="divide-y divide-border">
              {home.techNotes.map((note) => (
                <div key={note.id} className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
                  <NoteIcon severity={note.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary leading-relaxed">{note.title}</p>
                    {note.body && (
                      <p className="mt-0.5 text-[11px] text-text-secondary leading-relaxed">{note.body}</p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-tertiary">
                      <FileText size={9} />
                      {formatShortDate(note.createdAt)}
                      {note.authorName && <span>· {note.authorName}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary active:bg-error-light active:text-error transition-colors"
                    title="Delete note"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-4">
              <h2 className="text-[16px] font-bold text-text-primary">Edit Home</h2>
              <button
                onClick={() => setShowEdit(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary active:bg-surface-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Address */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Street Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                    maxLength={2}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">ZIP</label>
                <input
                  type="text"
                  value={editForm.zip}
                  onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Access */}
              <div className="border-t border-border pt-4">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Gate Code
                </label>
                <input
                  type="text"
                  value={editForm.gateCode}
                  onChange={(e) => setEditForm((f) => ({ ...f, gateCode: e.target.value }))}
                  placeholder="e.g. 1234#"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi Name</label>
                <input
                  type="text"
                  value={editForm.wifiName}
                  onChange={(e) => setEditForm((f) => ({ ...f, wifiName: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi Password</label>
                <input
                  type="text"
                  value={editForm.wifiPassword}
                  onChange={(e) => setEditForm((f) => ({ ...f, wifiPassword: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Home details */}
              <div className="border-t border-border pt-4 grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Year Built</label>
                  <input
                    type="number"
                    value={editForm.yearBuilt}
                    onChange={(e) => setEditForm((f) => ({ ...f, yearBuilt: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">WH Year</label>
                  <input
                    type="number"
                    value={editForm.waterHeaterYear}
                    onChange={(e) => setEditForm((f) => ({ ...f, waterHeaterYear: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Amps</label>
                  <input
                    type="number"
                    value={editForm.panelAmps}
                    onChange={(e) => setEditForm((f) => ({ ...f, panelAmps: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="border-t border-border pt-4">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-white px-5 py-4">
              <button
                onClick={() => setShowEdit(false)}
                className="rounded-lg border border-border bg-white px-4 py-2 text-[13px] font-semibold text-text-secondary active:bg-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white active:bg-primary-dark transition-colors disabled:opacity-40"
              >
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
