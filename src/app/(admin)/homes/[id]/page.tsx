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
} from "lucide-react";
import Link from "next/link";
import { useDemoMode } from "@/lib/useDemoMode";

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseStatus = "Needs Purchase" | "Purchased" | "Not Needed";
type Priority = "high" | "medium" | "low";
type ItemStatus = "needs-parts" | "in-progress" | "pending" | "completed";

interface TodoItem {
  id: string;
  task: string;
  priority: Priority;
  hasPhoto: boolean;
  status: ItemStatus;
  parts: {
    name: string;
    purchaseStatus: PurchaseStatus;
    responsibleParty: string;
    techFee?: boolean;
  } | null;
  specialist?: string;
}

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

interface ApiHome {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  gateCode: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  bookings: ApiBooking[];
  photos: ApiPhoto[];
}

interface HandymanNote {
  id: string;
  icon: "warning" | "info" | "wrench" | "star";
  note: string;
  date: string;
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

function priorityFromTask(task: ApiTask): Priority {
  // Heuristic: tasks with "urgent" / "asap" in notes → high; else medium.
  const text = `${task.label} ${task.notes ?? ""}`.toLowerCase();
  if (text.includes("urgent") || text.includes("asap") || text.includes("emergency")) return "high";
  if (text.includes("inspect") || text.includes("monitor")) return "low";
  return "medium";
}

function bookingStatusToItemStatus(status: string, taskDone: boolean): ItemStatus {
  if (taskDone) return "completed";
  if (status === "needs-parts" || status === "needs_parts") return "needs-parts";
  if (status === "in-progress" || status === "in_progress") return "in-progress";
  return "pending";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PurchaseStatusPill({ status }: { status: PurchaseStatus }) {
  if (status === "Purchased")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-[10px] font-semibold text-success">
        <CheckCircle2 size={9} />
        Purchased
      </span>
    );
  if (status === "Needs Purchase")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2 py-0.5 text-[10px] font-semibold text-accent-amber">
        <ShoppingCart size={9} />
        Needs Purchase
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-semibold text-text-tertiary">
      Not Needed
    </span>
  );
}

function NoteIcon({ icon }: { icon: HandymanNote["icon"] }) {
  if (icon === "warning") return <AlertTriangle size={13} className="mt-0.5 shrink-0 text-accent-amber" />;
  if (icon === "info") return <Info size={13} className="mt-0.5 shrink-0 text-info" />;
  if (icon === "star") return <Star size={13} className="mt-0.5 shrink-0 text-accent-purple" />;
  return <Wrench size={13} className="mt-0.5 shrink-0 text-text-tertiary" />;
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
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  const [notes, setNotes] = useState<HandymanNote[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [wifiVisible, setWifiVisible] = useState(false);

  const { isDemo, mounted } = useDemoMode();

  // Fetch home detail
  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setHome(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/homes/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(r.status === 404 ? "Home not found" : "Failed to load home");
        }
        return r.json();
      })
      .then((data: ApiHome) => {
        setHome(data);
        // Seed notes from home.notes (single multi-line string in DB).
        if (data.notes) {
          const lines = data.notes
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean);
          setNotes(
            lines.map((line, i) => ({
              id: `n${i}-${Date.now()}`,
              icon: "info",
              note: line,
              date: "",
            }))
          );
        } else {
          setNotes([]);
        }
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load home");
      })
      .finally(() => setLoading(false));
  }, [id, isDemo, mounted]);

  // Derive todo items from non-completed bookings' tasks.
  const todoItems: TodoItem[] = (() => {
    if (!home) return [];
    const items: TodoItem[] = [];
    for (const b of home.bookings) {
      if (b.status === "cancelled") continue;
      for (const t of b.tasks) {
        const taskDone = completedTaskIds.has(t.id) || !!t.done;
        const matchingPart = (b.parts ?? []).find((p) =>
          p.item.toLowerCase().split(/\s+/).some((w) => t.label.toLowerCase().includes(w))
        );
        items.push({
          id: t.id,
          task: t.label,
          priority: priorityFromTask(t),
          hasPhoto: (b.photos ?? []).length > 0,
          status: bookingStatusToItemStatus(b.status, taskDone),
          parts: matchingPart
            ? {
                name: matchingPart.item,
                purchaseStatus:
                  matchingPart.status === "purchased"
                    ? "Purchased"
                    : matchingPart.status === "needed" || matchingPart.status === "ordered"
                    ? "Needs Purchase"
                    : "Not Needed",
                responsibleParty: "Tech",
              }
            : null,
        });
      }
    }
    return items;
  })();

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

  async function addNote() {
    if (!newNoteText.trim() || !home) return;
    const text = newNoteText.trim();
    setSavingNote(true);
    try {
      const newNote: HandymanNote = {
        id: `n${Date.now()}`,
        icon: "info",
        note: text,
        date: formatShortDate(new Date().toISOString()),
      };
      const nextNotes = [newNote, ...notes];
      setNotes(nextNotes);
      setNewNoteText("");
      setShowAddNote(false);

      if (!isDemo) {
        const combined = nextNotes.map((n) => n.note).join("\n");
        await fetch(`/api/homes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: combined }),
        });
      }
    } finally {
      setSavingNote(false);
    }
  }

  function markComplete(taskId: string) {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    if (!isDemo) {
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      }).catch(() => {});
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
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-text-primary leading-tight">{home.customer.name}</h1>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="shrink-0 text-text-tertiary" />
              <span className="text-[12px] text-text-secondary">{fullAddress}</span>
            </div>
          </div>
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
        {[
          {
            icon: Phone,
            label: "Call",
            color: "text-success",
            href: home.customer.phone ? `tel:${home.customer.phone}` : undefined,
          },
          { icon: MessageCircle, label: "Text", color: "text-primary", href: undefined },
          {
            icon: Navigation,
            label: "Navigate",
            color: "text-accent-teal",
            href: `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`,
          },
          { icon: Edit, label: "Edit", color: "text-text-secondary", href: undefined },
        ].map((action) => {
          const inner = (
            <>
              <action.icon size={18} className={action.color} />
              <span className="text-[11px] font-medium text-text-secondary">{action.label}</span>
            </>
          );
          const cls =
            "flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors";
          if (action.href) {
            return (
              <a key={action.label} href={action.href} className={cls}>
                {inner}
              </a>
            );
          }
          return (
            <button key={action.label} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>

      {/* Info Cards: Address Notes + Household */}
      <div className="mb-6 grid grid-cols-2 gap-2.5">
        {/* Gate code / WiFi-style card */}
        <Card padding="sm" variant="default">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wifi size={14} className="text-info" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Access</span>
            </div>
            {home.gateCode && (
              <button
                onClick={() => setWifiVisible((v) => !v)}
                className="text-[10px] font-medium text-primary active:opacity-70"
              >
                {wifiVisible ? "Hide" : "Show"}
              </button>
            )}
          </div>
          <p className="text-[12px] font-semibold text-text-primary">
            {home.gateCode ? "Gate Code" : "No code on file"}
          </p>
          {home.gateCode && (
            <p
              className={`mt-0.5 font-mono text-[11px] transition-all ${
                wifiVisible ? "text-text-secondary" : "text-transparent select-none"
              }`}
              style={wifiVisible ? {} : { textShadow: "0 0 6px rgba(0,0,0,0.3)" }}
            >
              {home.gateCode}
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
              {home.customer.phone && (
                <a
                  href={`tel:${home.customer.phone}`}
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
      {home.photos.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Photos
            <span className="ml-2 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-text-tertiary">
              {home.photos.length}
            </span>
          </h2>
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
        </section>
      )}

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
            <button className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text-secondary active:bg-surface-secondary transition-colors">
              <Camera size={11} />
              Photo
            </button>
            <button className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white active:bg-primary-dark transition-colors shadow-[0_1px_4px_rgba(37,99,235,0.30)]">
              <Plus size={11} />
              Add Task
            </button>
          </div>
        </div>

        {todoItems.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">
              No tasks yet. Tasks from upcoming bookings will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {todoItems.map((item) => (
              <Card key={item.id} padding="sm" variant={item.status === "completed" ? "flat" : "default"}>
                <div className="flex items-start gap-2.5">
                  {/* Priority dot */}
                  <div
                    className={`mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${
                      item.status === "completed" ? "bg-text-tertiary opacity-40" : priorityDot[item.priority]
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    {/* Task name + status */}
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

                    {/* Parts block */}
                    {item.parts && (
                      <div className="mt-2 rounded-lg bg-surface-secondary px-3 py-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] text-text-secondary min-w-0">
                            <ShoppingCart size={10} className="shrink-0 text-text-tertiary" />
                            <span className="truncate">{item.parts.name}</span>
                          </span>
                          <PurchaseStatusPill status={item.parts.purchaseStatus} />
                        </div>
                        <p className="text-[10px] text-text-tertiary">
                          By: {item.parts.responsibleParty}
                          {item.parts.techFee && (
                            <span className="ml-1.5 rounded-full bg-warning-light px-1.5 py-0.5 text-[9px] font-semibold text-accent-amber">
                              +$10 fee
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Specialist flag */}
                    {item.specialist && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-error-light px-3 py-1.5">
                        <AlertTriangle size={11} className="shrink-0 text-error" />
                        <span className="text-[11px] font-semibold text-error">
                          Specialist required: {item.specialist}
                        </span>
                      </div>
                    )}

                    {/* Footer: photo + complete */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.hasPhoto && (
                          <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                            <Camera size={10} />
                            Photo attached
                          </span>
                        )}
                      </div>
                      {item.status !== "completed" && (
                        <button
                          onClick={() => markComplete(item.id)}
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-success bg-success-light active:opacity-70 transition-opacity"
                        >
                          <CheckCircle2 size={10} />
                          Done
                        </button>
                      )}
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
            {/* Total */}
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

        {/* Add note input */}
        {showAddNote && (
          <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50 p-3 animate-fade-in">
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

        {notes.length === 0 ? (
          <Card padding="md" variant="outlined">
            <p className="text-[12px] text-text-tertiary text-center py-2">No notes yet.</p>
          </Card>
        ) : (
          <Card variant="outlined" padding="sm">
            <div className="divide-y divide-border">
              {notes.map((note) => (
                <div key={note.id} className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
                  <NoteIcon icon={note.icon} />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-text-primary leading-relaxed">{note.note}</p>
                    {note.date && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-tertiary">
                        <FileText size={9} />
                        {note.date}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
