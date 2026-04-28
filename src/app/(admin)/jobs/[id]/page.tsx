"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  ChevronLeft, MapPin, Clock, Phone, MessageCircle, Navigation,
  CheckSquare, Square, Camera,
  Plus, AlertTriangle, Check, Package, Star, Trash2,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { toast } from "@/components/Toaster";

// ── Types ────────────────────────────────────────────────────────────────────

type UiStatus = "confirmed" | "pending" | "needs-parts" | "in-progress" | "scheduled" | "completed" | "cancelled";

interface TechNote {
  id: string;
  text: string;
  createdAt: string;
  authorId?: string;
  authorName: string;
  legacy?: boolean;
}

interface JobDetail {
  id: string;
  customerId?: string;
  client: string;
  address: string;
  phone: string;
  date: string;
  time: string;
  status: UiStatus;
  estimate: string;
  tasks: { id: string; label: string; done: boolean; notes?: string }[];
  parts: { item: string; qty: number; status: "purchased" | "needed" | "ordered" }[];
  photos: { id: string; label: string; url?: string }[];
  techNotes: string;
  customerNotes: string;
  rating?: number;
}

function apiStatusToUi(s: string): UiStatus {
  if (s === "in_progress") return "in-progress";
  if (s === "needs_parts") return "needs-parts";
  return s as UiStatus;
}

// ── Demo data ────────────────────────────────────────────────────────────────

const DEMO_JOBS: Record<string, JobDetail> = {
  "1": {
    id: "1", client: "Sarah Mitchell", address: "4821 Oak Hollow Dr, Plano TX 75024",
    phone: "(972) 555-0142", date: "Today", time: "9:00 AM", status: "confirmed",
    estimate: "$340",
    tasks: [
      { id: "t1", label: "Replace kitchen faucet (Moen brushed nickel)", done: false },
      { id: "t2", label: "Fix garage door sensor alignment", done: false, notes: "Laser level needed" },
      { id: "t3", label: "Check garbage disposal — making noise", done: false },
    ],
    parts: [
      { item: "Moen 7594ESRS Arbor Faucet", qty: 1, status: "purchased" },
      { item: "Garage door sensor bracket", qty: 1, status: "needed" },
    ],
    photos: [
      { id: "p1", label: "kitchen_faucet.jpg" },
      { id: "p2", label: "garage_sensor.jpg" },
      { id: "p3", label: "disposal_unit.jpg" },
    ],
    techNotes: "Gate code is 4821#. Dog is friendly. Faucet shutoffs under sink — need to bring basin wrench.",
    customerNotes: "Kitchen faucet has been leaking worse this week. Garage door closes then reopens immediately.",
  },
  "2": {
    id: "2", client: "Robert Chen", address: "1205 Elm Creek Ct, Frisco TX 75034",
    phone: "(469) 555-0298", date: "Today", time: "11:30 AM", status: "confirmed",
    estimate: "$280",
    tasks: [
      { id: "t1", label: "Install Nest Learning Thermostat (3rd gen)", done: false },
      { id: "t2", label: "Replace 3 duplex outlets — master BR + office + garage", done: false },
    ],
    parts: [],
    photos: [],
    techNotes: "Customer will be home. C-wire confirmed present on existing thermostat.",
    customerNotes: "New construction, outlets have been sparking slightly when plugging in.",
  },
  "3": {
    id: "3", client: "Maria Garcia", address: "890 Sunset Ridge, Roanoke TX 76262",
    phone: "(817) 555-0377", date: "Today", time: "2:00 PM", status: "pending",
    estimate: "$190",
    tasks: [
      { id: "t1", label: "Drywall patch — 2 holes from TV mount removal", done: false },
      { id: "t2", label: "Touch-up paint — living room & hallway", done: false, notes: "Paint color: SW Alabaster" },
    ],
    parts: [],
    photos: [
      { id: "p1", label: "hole_1_living_room.jpg" },
      { id: "p2", label: "hole_2_hallway.jpg" },
    ],
    techNotes: "Bring sanding supplies + joint compound. Paint stored in garage.",
    customerNotes: "Holes are from previous TV mount. Need matching paint — Sherwin Williams Alabaster SW7008.",
  },
};

// ── API booking → JobDetail ──────────────────────────────────────────────────

interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedCost: string | number | null;
  finalCost: string | number | null;
  description: string | null;
  customerNotes: string | null;
  techNotes: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  home: { address: string; city: string | null; state: string | null; zip: string | null } | null;
  tasks: { id: string; label: string; done: boolean | null; notes: string | null }[];
  parts: { id: string; item: string; qty: number | null; status: string | null }[];
  photos: { id: string; label: string | null; url: string }[];
}

function bookingToDetail(b: ApiBooking): JobDetail {
  const cost = b.finalCost ?? b.estimatedCost;
  const numCost = cost == null ? 0 : Number(cost);
  const dateObj = new Date(b.scheduledDate);
  const timeObj = new Date(b.scheduledTime);
  const today = new Date();
  const isToday = dateObj.toDateString() === today.toDateString();
  const dateLabel = isToday
    ? "Today"
    : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeLabel = timeObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const homeStr = b.home
    ? `${b.home.address}${b.home.city ? `, ${b.home.city}` : ""}${b.home.state ? ` ${b.home.state}` : ""}${b.home.zip ? ` ${b.home.zip}` : ""}`
    : "—";

  return {
    id: b.id,
    customerId: b.customer?.id,
    client: b.customer?.name ?? "Customer",
    address: homeStr,
    phone: b.customer?.phone ?? "",
    date: dateLabel,
    time: timeLabel,
    status: apiStatusToUi(b.status),
    estimate: numCost > 0 ? `$${numCost.toFixed(0)}` : "$0",
    tasks: b.tasks.map((t) => ({
      id: t.id,
      label: t.label,
      done: !!t.done,
      notes: t.notes ?? undefined,
    })),
    parts: (b.parts ?? []).map((p) => ({
      item: p.item,
      qty: p.qty ?? 1,
      status: ((p.status ?? "needed") as "purchased" | "needed" | "ordered"),
    })),
    photos: (b.photos ?? []).map((p) => ({ id: p.id, label: p.label ?? "photo", url: p.url })),
    techNotes: b.techNotes ?? "",
    customerNotes: b.customerNotes ?? b.description ?? "",
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isDemo, mounted } = useDemoMode();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [tasks, setTasks] = useState<JobDetail["tasks"]>([]);
  const [photos, setPhotos] = useState<JobDetail["photos"]>([]);
  const [notes, setNotes] = useState("");
  const [bookingNotes, setBookingNotes] = useState<TechNote[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeRating, setCompleteRating] = useState<number>(5);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tasksRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      const demo = DEMO_JOBS[id] ?? DEMO_JOBS["1"];
      setJob(demo);
      setTasks(demo.tasks);
      setPhotos(demo.photos);
      setNotes(demo.techNotes);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/bookings/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/photos?bookingId=${id}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`/api/bookings/${id}/notes`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`/api/me`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([data, photoList, noteList, me]) => {
        if (me?.id) setCurrentUserId(me.id as string);
        if (!data) {
          setJob(null);
          return;
        }
        const detail = bookingToDetail(data as ApiBooking);
        setJob(detail);
        setTasks(detail.tasks);
        setNotes(detail.techNotes);
        if (Array.isArray(photoList) && photoList.length > 0) {
          setPhotos(
            photoList.map((p: { id: string; label: string | null; url: string }) => ({
              id: p.id,
              label: p.label ?? "photo",
              url: p.url,
            }))
          );
        } else {
          setPhotos(detail.photos);
        }
        if (Array.isArray(noteList)) {
          setBookingNotes(
            noteList.map((n: {
              id: string;
              text: string;
              createdAt: string;
              authorId?: string;
              author?: { id?: string; name?: string | null } | null;
            }) => ({
              id: n.id,
              text: n.text,
              createdAt: n.createdAt,
              authorId: n.author?.id ?? n.authorId,
              authorName: n.author?.name ?? "Tech",
            })),
          );
        }
      })
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id, isDemo, mounted]);

  async function refetchBookingNotes() {
    try {
      const res = await fetch(`/api/bookings/${id}/notes`);
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list)) return;
      setBookingNotes(
        list.map((n: {
          id: string;
          text: string;
          createdAt: string;
          authorId?: string;
          author?: { id?: string; name?: string | null } | null;
        }) => ({
          id: n.id,
          text: n.text,
          createdAt: n.createdAt,
          authorId: n.author?.id ?? n.authorId,
          authorName: n.author?.name ?? "Tech",
        })),
      );
    } catch {
      /* swallow */
    }
  }

  const completedCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  function toggleTask(taskId: string) {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const newDone = !target.done;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, done: newDone } : t));
    if (isDemo) return;
    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: newDone }),
    }).catch((e) => {
      toast.error("Failed to update task: " + (e instanceof Error ? e.message : String(e)));
      // revert on failure
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, done: !newDone } : t));
    });
  }

  async function addTask() {
    const label = newTaskLabel.trim();
    if (!label) return;
    const notesValue = newTaskNotes.trim();
    setAddTaskError(null);

    if (isDemo) {
      setTasks((prev) => [
        ...prev,
        {
          id: `demo-${Date.now()}`,
          label,
          done: false,
          notes: notesValue || undefined,
        },
      ]);
      setNewTaskLabel("");
      setNewTaskNotes("");
      setShowAddTask(false);
      return;
    }

    setSavingTask(true);
    try {
      const res = await fetch(`/api/bookings/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          notes: notesValue || undefined,
          sortOrder: tasks.length,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to add task (${res.status})`);
      }
      const created = await res.json();
      setTasks((prev) => [
        ...prev,
        {
          id: created.id,
          label: created.label,
          done: !!created.done,
          notes: created.notes ?? undefined,
        },
      ]);
      setNewTaskLabel("");
      setNewTaskNotes("");
      setShowAddTask(false);
    } catch (err) {
      setAddTaskError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setSavingTask(false);
    }
  }

  function cancelAddTask() {
    setNewTaskLabel("");
    setNewTaskNotes("");
    setAddTaskError(null);
    setShowAddTask(false);
  }

  async function addNote() {
    const text = noteInput.trim();
    if (!text) return;

    // Demo mode: keep the legacy concatenated-string behavior so the demo UI still works.
    if (isDemo) {
      const updated = notes + (notes ? "\n\n" : "") + text;
      setNotes(updated);
      setNoteInput("");
      setShowNoteInput(false);
      return;
    }

    // Real mode: append optimistically as a BookingNote, then POST.
    const tempId = `temp-${Date.now()}`;
    const optimistic: TechNote = {
      id: tempId,
      text,
      createdAt: new Date().toISOString(),
      authorId: currentUserId ?? undefined,
      authorName: "You",
    };
    setBookingNotes((prev) => [optimistic, ...prev]);
    setNoteInput("");
    setShowNoteInput(false);
    setSavingNote(true);

    try {
      const res = await fetch(`/api/bookings/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed (${res.status})`);
      }
      const created = await res.json();
      setBookingNotes((prev) =>
        prev.map((n) =>
          n.id === tempId
            ? {
                id: created.id,
                text: created.text,
                createdAt: created.createdAt,
                authorId: created.author?.id ?? created.authorId,
                authorName: created.author?.name ?? "You",
              }
            : n,
        ),
      );
    } catch (e) {
      toast.error("Failed to save note: " + (e instanceof Error ? e.message : String(e)));
      // Refetch to drop the optimistic entry.
      refetchBookingNotes();
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteBookingNote(noteId: string) {
    if (isDemo) return;
    const prev = bookingNotes;
    // Optimistic remove
    setBookingNotes((p) => p.filter((n) => n.id !== noteId));
    try {
      const res = await fetch(`/api/bookings/${id}/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed (${res.status})`);
      }
    } catch (e) {
      toast.error("Failed to delete note: " + (e instanceof Error ? e.message : String(e)));
      setBookingNotes(prev);
      refetchBookingNotes();
    }
  }

  function formatNoteTimestamp(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today · ${time}`;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${time}`;
  }

  async function completeJob() {
    if (isDemo) {
      setShowCompleteModal(false);
      setJob((prev) => (prev ? { ...prev, status: "completed", rating: completeRating } : prev));
      return;
    }
    setCompleting(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setJob((prev) => (prev ? { ...prev, status: "completed", rating: completeRating } : prev));
        // The status-change handler on the booking PATCH endpoint is responsible
        // for any customer-facing notifications. Nothing more to do client-side.
      }
    } catch {
      /* swallow — UI will reflect non-completed state */
    } finally {
      setCompleting(false);
      setShowCompleteModal(false);
    }
  }

  function scrollToTasks() {
    tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openPhotoPicker() {
    fileInputRef.current?.click();
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow same-file reselect
    if (!file) return;
    setUploadError(null);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    }).catch((err) => {
      setUploadError(err.message);
      return null;
    });
    if (!dataUrl) return;

    if (isDemo) {
      // Append a placeholder entry locally for demo mode.
      setPhotos((prev) => [
        ...prev,
        { id: `demo-${Date.now()}`, label: file.name, url: dataUrl },
      ]);
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: id,
          dataUrl,
          label: file.name,
          type: "after",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }
      const created = await res.json();
      setPhotos((prev) => [
        ...prev,
        { id: created.id, label: created.label ?? file.name, url: created.url },
      ]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center">
        <p className="text-[16px] font-bold text-text-primary">Job not found</p>
        <p className="mt-2 text-[13px] text-text-secondary">This booking may have been removed.</p>
        <Link href="/jobs" className="mt-4 text-[13px] font-semibold text-primary">Back to Jobs</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-white border-b border-border px-5 pt-14 pb-5">
        <Link href="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
          Jobs
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">{job.client}</h1>
            <div className="mt-1 flex items-center gap-1.5">
              <Clock size={13} className="text-text-tertiary" />
              <span className="text-[13px] text-text-secondary">{job.date} · {job.time}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-text-tertiary" />
              <span className="text-[13px] text-text-secondary truncate max-w-[220px]">{job.address}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={job.status} />
            <span className="text-[18px] font-bold text-text-primary">{job.estimate}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <a href={`tel:${job.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-[13px] font-semibold text-text-primary hover:bg-surface-secondary transition-colors">
            <Phone size={14} />
            Call
          </a>
          <Link
            href={
              job.customerId
                ? `/admin-messages?customerId=${encodeURIComponent(job.customerId)}`
                : "/admin-messages"
            }
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-[13px] font-semibold text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <MessageCircle size={14} />
            Message
          </Link>
          <a
            href={`https://maps.apple.com/?q=${encodeURIComponent(job.address)}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white"
          >
            <Navigation size={14} />
            Navigate
          </a>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Progress */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-semibold text-text-primary">Task Progress</p>
            <span className="text-[13px] font-semibold text-primary">{completedCount}/{tasks.length} done</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-text-tertiary">{progress}% complete</p>
        </Card>

        {/* Tasks */}
        <div ref={tasksRef}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Checklist</p>
            {!showAddTask && (
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1 text-[12px] font-semibold text-primary"
              >
                <Plus size={14} />
                Add Task
              </button>
            )}
          </div>
          <Card className="divide-y divide-border-light">
            {tasks.length === 0 && !showAddTask && (
              <p className="py-3 text-[13px] text-text-tertiary text-center">No tasks for this job yet.</p>
            )}
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="flex w-full items-start gap-3 py-3.5 text-left transition-colors"
              >
                {task.done
                  ? <CheckSquare size={20} className="shrink-0 text-primary mt-0.5" />
                  : <Square size={20} className="shrink-0 text-text-tertiary mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium leading-snug ${task.done ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                    {task.label}
                  </p>
                  {task.notes && (
                    <p className="mt-0.5 text-[11px] text-text-tertiary">{task.notes}</p>
                  )}
                </div>
              </button>
            ))}
            {showAddTask && (
              <div className="py-3 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  placeholder="Task label (required)"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                />
                {addTaskError && (
                  <p className="text-[12px] text-error">{addTaskError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={addTask}
                    disabled={savingTask || !newTaskLabel.trim()}
                  >
                    {savingTask ? "Saving…" : "Save Task"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelAddTask} disabled={savingTask}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Customer Notes */}
        {job.customerNotes && (
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Customer Notes</p>
            <Card className="bg-warning-light border-warning/20">
              <div className="flex gap-2.5">
                <AlertTriangle size={15} className="text-accent-amber shrink-0 mt-0.5" />
                <p className="text-[13px] text-text-primary leading-relaxed">{job.customerNotes}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Parts */}
        {job.parts.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Parts</p>
            <Card className="divide-y divide-border-light">
              {job.parts.map((part, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    part.status === "purchased" ? "bg-success-light" :
                    part.status === "ordered" ? "bg-[#EFF6FF]" : "bg-warning-light"
                  }`}>
                    <Package size={15} className={
                      part.status === "purchased" ? "text-success" :
                      part.status === "ordered" ? "text-info" : "text-accent-amber"
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{part.item}</p>
                    <p className="text-[11px] text-text-tertiary">Qty: {part.qty}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                    part.status === "purchased" ? "bg-success-light text-success" :
                    part.status === "ordered" ? "bg-[#EFF6FF] text-info" : "bg-warning-light text-accent-amber"
                  }`}>
                    {part.status}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Photos */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Photos {photos.length > 0 ? `(${photos.length})` : ""}
            </p>
            {uploading && (
              <span className="text-[11px] text-text-tertiary">Uploading…</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-xl bg-surface-secondary border border-border flex flex-col items-center justify-center gap-1.5 overflow-hidden"
              >
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <Camera size={20} className="text-text-tertiary" />
                    <p className="text-[9px] text-text-tertiary px-1 text-center truncate w-full">{photo.label}</p>
                  </>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={openPhotoPicker}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 transition-colors disabled:opacity-60"
            >
              <Plus size={18} className="text-text-tertiary" />
              <p className="text-[9px] text-text-tertiary">{uploading ? "Uploading" : "Add"}</p>
            </button>
          </div>
          {uploadError && (
            <p className="mt-2 text-[12px] text-error">{uploadError}</p>
          )}
        </div>

        {/* Tech Notes */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Tech Notes</p>
            {!showNoteInput && (
              <button
                onClick={() => setShowNoteInput(true)}
                className="flex items-center gap-1 text-[12px] font-semibold text-primary"
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </div>
          {isDemo ? (
            <Card>
              <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-line">{notes || "No notes yet."}</p>
              {showNoteInput && (
                <div className="mt-3 border-t border-border pt-3">
                  <textarea
                    autoFocus
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button variant="primary" size="sm" onClick={addNote}>Save Note</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowNoteInput(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="divide-y divide-border-light">
              {/* Add-note form (real mode) */}
              {showNoteInput && (
                <div className="pb-3 first:pt-0">
                  <textarea
                    autoFocus
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={addNote}
                      disabled={savingNote || !noteInput.trim()}
                    >
                      {savingNote ? "Saving…" : "Save Note"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowNoteInput(false); setNoteInput(""); }}
                      disabled={savingNote}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Legacy note (back-compat) */}
              {notes.trim() && (
                <div className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-text-primary">Previous notes</span>
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
                        Legacy
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-line">{notes}</p>
                </div>
              )}

              {/* Real notes */}
              {bookingNotes.map((note) => {
                const canDelete = !!currentUserId && note.authorId === currentUserId && !note.id.startsWith("temp-");
                return (
                  <div key={note.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[12px] font-semibold text-text-primary truncate">
                          {note.authorName || "Tech"}
                        </span>
                        <span className="text-[11px] text-text-tertiary shrink-0">
                          {formatNoteTimestamp(note.createdAt)}
                        </span>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteBookingNote(note.id)}
                          aria-label="Delete note"
                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-error-light hover:text-error transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-line">{note.text}</p>
                  </div>
                );
              })}

              {/* Empty state */}
              {!showNoteInput && bookingNotes.length === 0 && !notes.trim() && (
                <p className="py-3 text-[13px] text-text-tertiary text-center first:pt-0 last:pb-0">
                  No notes yet.
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Invoice estimate */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Estimate</p>
          <Card>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[14px] font-semibold text-text-primary">Total</span>
                <span className="text-[16px] font-bold text-primary">{job.estimate}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Complete Job CTA */}
        {tasks.length > 0 && completedCount === tasks.length ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Check size={18} />}
            onClick={() => setShowCompleteModal(true)}
          >
            Complete Job & Send Invoice
          </Button>
        ) : (
          <Button variant="outline" size="lg" fullWidth onClick={scrollToTasks}>
            {completedCount}/{tasks.length} Tasks Remaining
          </Button>
        )}
      </div>

      {/* Complete modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCompleteModal(false)}>
          <div className="w-full rounded-t-3xl bg-white px-6 pb-10 pt-6" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
                <Check size={28} className="text-success" />
              </div>
              <h3 className="text-[20px] font-bold text-text-primary">Complete Job?</h3>
              <p className="mt-1.5 text-[13px] text-text-secondary">
                This will mark the job as done and send {job.client} an invoice for {job.estimate}.
              </p>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-[12px] font-semibold text-text-secondary">How would you rate this job?</p>
              <div className="flex justify-center gap-1">
                {[1,2,3,4,5].map((s) => {
                  const active = s <= completeRating;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCompleteRating(s)}
                      aria-label={`${s} star${s !== 1 ? "s" : ""}`}
                      className="p-0.5 transition-transform active:scale-90"
                    >
                      <Star
                        size={28}
                        className={active ? "text-warning fill-warning" : "text-text-tertiary/40"}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-center text-[11px] text-text-tertiary">
                We&apos;ll notify your customer in-app to leave a review.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={completeJob}
              disabled={completing}
            >
              {completing ? "Completing…" : "Confirm & Send Invoice"}
            </Button>
            <button className="mt-3 w-full text-center text-[13px] text-text-tertiary" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
