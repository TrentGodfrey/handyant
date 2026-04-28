"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { toast } from "@/components/Toaster";
import Spinner from "@/components/Spinner";

import type { ApiHome, EditFormState, ItemStatus, Priority } from "./_components/types";
import {
  formatLongDate, normalizePriority, normalizeStatus,
} from "./_components/types";

import EditHomeModal from "./_components/EditHomeModal";
import HomeOverview from "./_components/HomeOverview";
import Photos from "./_components/Photos";
import TodoList from "./_components/TodoList";
import {
  HandymanNotes, Receipts, VisitHistory,
  type ReceiptRow, type VisitRow,
} from "./_components/HistoryAndNotes";

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
  const [editForm, setEditForm] = useState<EditFormState>({
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

  const visitHistory: VisitRow[] = (home?.bookings ?? [])
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

  const receipts: ReceiptRow[] = (home?.bookings ?? [])
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
      await fetch(`/api/homes/${id}/notes/${noteId}`, { method: "DELETE" }).catch((e) => {
        toast.error("Failed to delete note: " + (e instanceof Error ? e.message : String(e)));
      });
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
      }).catch((e) => {
        toast.error("Failed to update task: " + (e instanceof Error ? e.message : String(e)));
      });
    }
  }

  async function deleteTask(todoId: string) {
    if (!home) return;
    setHome({ ...home, todos: home.todos.filter((t) => t.id !== todoId) });
    if (!isDemo) {
      await fetch(`/api/homes/${id}/todos/${todoId}`, { method: "DELETE" }).catch((e) => {
        toast.error("Failed to delete task: " + (e instanceof Error ? e.message : String(e)));
      });
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
        <Spinner className="h-8 w-8" />
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

      <HomeOverview
        home={home}
        openTasks={openTasks}
        totalVisits={totalVisits}
        totalSpent={totalSpent}
        fullAddress={fullAddress}
        gateCodeVisible={gateCodeVisible}
        setGateCodeVisible={setGateCodeVisible}
        onOpenEdit={() => setShowEdit(true)}
      />

      <Photos
        photos={home.photos}
        showAddPhoto={showAddPhoto}
        setShowAddPhoto={setShowAddPhoto}
        newPhotoUrl={newPhotoUrl}
        setNewPhotoUrl={setNewPhotoUrl}
        newPhotoLabel={newPhotoLabel}
        setNewPhotoLabel={setNewPhotoLabel}
        savingPhoto={savingPhoto}
        addPhoto={addPhoto}
      />

      <TodoList
        items={todoItems}
        openTasks={openTasks}
        onTogglePhotoForm={() => setShowAddPhoto((v) => !v)}
        showAddTask={showAddTask}
        setShowAddTask={setShowAddTask}
        newTaskText={newTaskText}
        setNewTaskText={setNewTaskText}
        newTaskPriority={newTaskPriority}
        setNewTaskPriority={setNewTaskPriority}
        savingTask={savingTask}
        addTask={addTask}
        toggleTaskComplete={toggleTaskComplete}
        deleteTask={deleteTask}
      />

      <VisitHistory visits={visitHistory} />

      <Receipts receipts={receipts} totalSpent={totalSpent} />

      <HandymanNotes
        notes={home.techNotes}
        showAddNote={showAddNote}
        setShowAddNote={setShowAddNote}
        newNoteText={newNoteText}
        setNewNoteText={setNewNoteText}
        savingNote={savingNote}
        addNote={addNote}
        deleteNote={deleteNote}
      />

      <EditHomeModal
        open={showEdit}
        editForm={editForm}
        setEditForm={setEditForm}
        savingEdit={savingEdit}
        onClose={() => setShowEdit(false)}
        onSave={saveEdit}
      />
    </div>
  );
}
