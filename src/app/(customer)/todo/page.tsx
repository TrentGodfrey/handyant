"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { useDemoMode } from "@/lib/useDemoMode";
import { toast } from "@/components/Toaster";
import AddTaskForm, { type NewTaskPayload } from "@/components/AddTaskForm";
import {
  Loader2, ListChecks, Plus, Trash2, ShoppingCart,
  Camera, AlertCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiHome {
  id: string;
  address: string;
  city?: string | null;
}

interface ApiTodo {
  id: string;
  homeId: string;
  task: string;
  description?: string | null;
  priority: string;
  status: string;
  parts: string | null;
  partStatus: string | null;
  partsDescription?: string | null;
  partsBuyer?: string | null;
  specialist: boolean | null;
  hasPhoto: boolean | null;
  photoIds?: string[] | null;
  notes: string | null;
}

interface ApiPhoto {
  id: string;
  url: string;
}

interface EnrichedTodo extends ApiTodo {
  homeAddress: string;
  done: boolean;
  photos: ApiPhoto[];
}

type FilterMode = "all" | "open" | "done";

// ── Demo data ────────────────────────────────────────────────────────────────

const DEMO_TODOS: EnrichedTodo[] = [
  {
    id: "d1", homeId: "demo", task: "Fix bathroom exhaust fan",
    description: "Rattling sound, intermittent power on the upstairs bath fan",
    priority: "high", status: "needs-parts",
    parts: "Broan 688 Fan Motor", partStatus: "Customer to Purchase",
    partsDescription: "Broan 688 Fan Motor", partsBuyer: "customer",
    specialist: false, hasPhoto: true, photoIds: ["demo-p1"],
    notes: null,
    homeAddress: "4821 Oak Hollow Dr",
    done: false,
    photos: [{ id: "demo-p1", url: "/placeholder-photo.svg" }],
  },
  {
    id: "d2", homeId: "demo", task: "Install smart thermostat",
    description: null,
    priority: "medium", status: "pending",
    parts: "Ecobee Smart Thermostat", partStatus: "Anthony to Purchase",
    partsDescription: "Ecobee Smart Thermostat", partsBuyer: "tech",
    specialist: false, hasPhoto: false, photoIds: [],
    notes: null,
    homeAddress: "4821 Oak Hollow Dr",
    done: false,
    photos: [],
  },
  {
    id: "d3", homeId: "demo", task: "Patch drywall in hallway",
    description: "Small hole near the light switch from when we moved the bookshelf",
    priority: "low", status: "pending",
    parts: null, partStatus: null,
    partsDescription: null, partsBuyer: null,
    specialist: false, hasPhoto: false, photoIds: [],
    notes: null,
    homeAddress: "4821 Oak Hollow Dr",
    done: false,
    photos: [],
  },
  {
    id: "d4", homeId: "demo", task: "Replace garage door weatherstrip",
    description: null,
    priority: "low", status: "confirmed",
    parts: null, partStatus: null,
    partsDescription: null, partsBuyer: null,
    specialist: false, hasPhoto: false, photoIds: [],
    notes: null,
    homeAddress: "4821 Oak Hollow Dr",
    done: false,
    photos: [],
  },
  {
    id: "d5", homeId: "demo", task: "Tighten loose deck rail",
    description: null,
    priority: "medium", status: "completed",
    parts: null, partStatus: null,
    partsDescription: null, partsBuyer: null,
    specialist: false, hasPhoto: false, photoIds: [],
    notes: null,
    homeAddress: "4821 Oak Hollow Dr",
    done: true,
    photos: [],
  },
];

// ── Page entry ───────────────────────────────────────────────────────────────

export default function TodoPage() {
  const { isDemo, mounted } = useDemoMode();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background pb-28 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  return isDemo ? <DemoTodoPage /> : <RealTodoPage />;
}

// ── Real mode ────────────────────────────────────────────────────────────────

function RealTodoPage() {
  const [homes, setHomes] = useState<ApiHome[]>([]);
  const [todos, setTodos] = useState<EnrichedTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("open");
  const [savingTask, setSavingTask] = useState(false);

  const primaryHome = homes[0] ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const homesRes = await fetch("/api/homes");
      if (!homesRes.ok) throw new Error("Failed to load homes");
      const homesData = (await homesRes.json()) as ApiHome[];
      setHomes(homesData);

      if (!homesData.length) {
        setTodos([]);
        return;
      }

      // Fetch each home's full detail (which includes todos + photos)
      const detailReqs = homesData.map((h) =>
        fetch(`/api/homes/${h.id}`).then((r) => (r.ok ? r.json() : null)),
      );
      const details = await Promise.all(detailReqs);

      const all: EnrichedTodo[] = [];
      for (let i = 0; i < details.length; i++) {
        const d = details[i];
        if (!d) continue;
        const homeAddress = d.address as string;
        const photosByHome = (d.photos ?? []) as ApiPhoto[];
        const rawTodos = (d.todos ?? []) as ApiTodo[];
        for (const t of rawTodos) {
          const ids = Array.isArray(t.photoIds) ? t.photoIds : [];
          const photos = photosByHome.filter((p) => ids.includes(p.id));
          all.push({
            ...t,
            homeAddress,
            done: t.status === "completed",
            photos,
          });
        }
      }
      // Sort: open first, by priority high>medium>low, then by created order (already in API order).
      const priorityWeight: Record<string, number> = { high: 0, medium: 1, low: 2 };
      all.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const aw = priorityWeight[a.priority] ?? 1;
        const bw = priorityWeight[b.priority] ?? 1;
        return aw - bw;
      });
      setTodos(all);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleDone(todo: EnrichedTodo) {
    const newDone = !todo.done;
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, done: newDone, status: newDone ? "completed" : "pending" }
          : t,
      ),
    );
    try {
      const res = await fetch(`/api/homes/${todo.homeId}/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newDone ? "completed" : "pending" }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      // Revert
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id
            ? { ...t, done: todo.done, status: todo.status }
            : t,
        ),
      );
      toast.error("Could not update task");
    }
  }

  async function deleteTodo(todo: EnrichedTodo) {
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    try {
      const res = await fetch(`/api/homes/${todo.homeId}/todos/${todo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Task deleted");
    } catch {
      setTodos(snapshot);
      toast.error("Could not delete task");
    }
  }

  async function handleAddTask(payload: NewTaskPayload) {
    if (!primaryHome) {
      toast.error("Add a home first");
      return;
    }
    setSavingTask(true);
    try {
      const res = await fetch(`/api/homes/${primaryHome.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add task");
      }
      toast.success("Task added");
      setShowAdd(false);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add task");
    } finally {
      setSavingTask(false);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "open") return todos.filter((t) => !t.done);
    if (filter === "done") return todos.filter((t) => t.done);
    return todos;
  }, [todos, filter]);

  const openCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

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
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-error mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-text-primary">Could not load tasks</p>
              <p className="text-[12px] text-text-secondary mt-1">{error}</p>
              <button
                onClick={refresh}
                className="mt-3 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-text-primary hover:bg-surface-secondary"
              >
                Retry
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <TodoPageView
      todos={filtered}
      totalCount={todos.length}
      openCount={openCount}
      doneCount={doneCount}
      filter={filter}
      setFilter={setFilter}
      showAdd={showAdd}
      setShowAdd={setShowAdd}
      handleAddTask={handleAddTask}
      homeIdForUpload={primaryHome?.id ?? null}
      savingTask={savingTask}
      onToggleDone={toggleDone}
      onDelete={deleteTodo}
      hasHome={!!primaryHome}
      demoMode={false}
    />
  );
}

// ── Demo mode ────────────────────────────────────────────────────────────────

function DemoTodoPage() {
  const [todos, setTodos] = useState<EnrichedTodo[]>(DEMO_TODOS);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("open");

  function toggleDone(todo: EnrichedTodo) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, done: !t.done, status: !t.done ? "completed" : "pending" }
          : t,
      ),
    );
  }

  function deleteTodo(todo: EnrichedTodo) {
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    toast.success("Task deleted");
  }

  function handleAddTask(payload: NewTaskPayload) {
    const id = `demo-${Date.now()}`;
    setTodos((prev) => [
      {
        id,
        homeId: "demo",
        task: payload.task,
        description: payload.description,
        priority: payload.priority,
        status: "pending",
        parts: payload.parts,
        partStatus: payload.partStatus,
        partsDescription: payload.partsDescription,
        partsBuyer: payload.partsBuyer,
        specialist: false,
        hasPhoto: payload.photoIds.length > 0,
        photoIds: payload.photoIds,
        notes: null,
        homeAddress: "4821 Oak Hollow Dr",
        done: false,
        photos: payload.photoIds.map((pid) => ({ id: pid, url: "/placeholder-photo.svg" })),
      },
      ...prev,
    ]);
    setShowAdd(false);
    toast.success("Task added");
  }

  const filtered = useMemo(() => {
    if (filter === "open") return todos.filter((t) => !t.done);
    if (filter === "done") return todos.filter((t) => t.done);
    return todos;
  }, [todos, filter]);

  const openCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <TodoPageView
      todos={filtered}
      totalCount={todos.length}
      openCount={openCount}
      doneCount={doneCount}
      filter={filter}
      setFilter={setFilter}
      showAdd={showAdd}
      setShowAdd={setShowAdd}
      handleAddTask={handleAddTask}
      homeIdForUpload={null}
      savingTask={false}
      onToggleDone={toggleDone}
      onDelete={deleteTodo}
      hasHome
      demoMode
    />
  );
}

// ── Presentational view ──────────────────────────────────────────────────────

interface ViewProps {
  todos: EnrichedTodo[];
  totalCount: number;
  openCount: number;
  doneCount: number;
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  handleAddTask: (p: NewTaskPayload) => Promise<void> | void;
  homeIdForUpload: string | null;
  savingTask: boolean;
  onToggleDone: (t: EnrichedTodo) => void;
  onDelete: (t: EnrichedTodo) => void;
  hasHome: boolean;
  demoMode: boolean;
}

function TodoPageView(props: ViewProps) {
  const {
    todos, totalCount, openCount, doneCount,
    filter, setFilter,
    showAdd, setShowAdd, handleAddTask, homeIdForUpload, savingTask,
    onToggleDone, onDelete,
    hasHome, demoMode,
  } = props;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
              <ListChecks size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-text-primary leading-tight">To-Do</h1>
              <p className="text-[11px] text-text-tertiary">
                {openCount} open
                {doneCount > 0 ? ` · ${doneCount} done` : ""}
              </p>
            </div>
          </div>
          {!showAdd && hasHome && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm active:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Add Task
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="inline-flex rounded-full bg-surface-secondary p-1">
          {(["all", "open", "done"] as FilterMode[]).map((f) => {
            const label = f === "all" ? "All" : f === "open" ? "Open" : "Done";
            const count = f === "all" ? totalCount : f === "open" ? openCount : doneCount;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  filter === f
                    ? "bg-white text-primary shadow-sm"
                    : "text-text-secondary"
                }`}
              >
                {label} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-5">
        {!hasHome ? (
          <Card padding="md">
            <p className="text-[13px] text-text-secondary text-center">
              Add a home first to start tracking tasks.
            </p>
          </Card>
        ) : (
          <>
            <AddTaskForm
              open={showAdd}
              onCancel={() => setShowAdd(false)}
              onSubmit={handleAddTask}
              homeId={homeIdForUpload}
              demoMode={demoMode}
              saving={savingTask}
            />

            {todos.length === 0 ? (
              <Card padding="lg">
                <div className="text-center py-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 mb-3">
                    <ListChecks size={20} className="text-primary" />
                  </div>
                  <p className="text-[14px] font-semibold text-text-primary mb-1">
                    {filter === "done" ? "Nothing checked off yet" : "Nothing on your list yet"}
                  </p>
                  <p className="text-[12px] text-text-tertiary">
                    {filter === "done"
                      ? "Mark a task done to see it here."
                      : "Add a task to get started."}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {todos.map((t) => (
                  <TodoRow
                    key={t.id}
                    todo={t}
                    onToggleDone={() => onToggleDone(t)}
                    onDelete={() => onDelete(t)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-error",
  medium: "bg-warning",
  low: "bg-text-tertiary",
};

function TodoRow({
  todo, onToggleDone, onDelete,
}: {
  todo: EnrichedTodo;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const photos = todo.photos ?? [];
  const inlinePhotos = photos.slice(0, 3);
  const remaining = photos.length - inlinePhotos.length;

  return (
    <Card padding="sm" variant={todo.done ? "flat" : "default"}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggleDone}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
            todo.done
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface hover:border-primary"
          }`}
          aria-label={todo.done ? "Mark as not done" : "Mark as done"}
        >
          {todo.done && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              {!todo.done && (
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[todo.priority] ?? "bg-text-tertiary"}`} />
              )}
              <p
                className={`text-[14px] font-semibold leading-snug ${
                  todo.done ? "line-through text-text-tertiary" : "text-text-primary"
                }`}
              >
                {todo.task}
              </p>
            </div>
            <button
              onClick={onDelete}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-error-light hover:text-error transition-colors"
              aria-label="Delete task"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {todo.description && (
            <p className={`mt-1 text-[12px] leading-snug ${todo.done ? "text-text-tertiary" : "text-text-secondary"}`}>
              {todo.description}
            </p>
          )}

          {(todo.partsDescription || todo.parts) && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-secondary px-2.5 py-1.5">
              <ShoppingCart size={11} className="shrink-0 text-text-tertiary" />
              <span className="text-[11px] text-text-secondary flex-1 truncate">
                <span className="font-semibold">Parts:</span>{" "}
                {todo.partsDescription ?? todo.parts}
              </span>
              {todo.partStatus && (
                <span className={`text-[10px] font-semibold shrink-0 ${
                  todo.partsBuyer === "tech" || todo.partStatus.includes("Anthony")
                    ? "text-primary"
                    : "text-accent-amber"
                }`}>
                  {todo.partsBuyer === "tech"
                    ? "Anthony"
                    : todo.partsBuyer === "customer"
                    ? "Me"
                    : todo.partStatus}
                </span>
              )}
            </div>
          )}

          {inlinePhotos.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {inlinePhotos.map((p) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={p.id}
                  src={p.url}
                  alt="Task photo"
                  className="h-10 w-10 rounded-md object-cover border border-border"
                />
              ))}
              {remaining > 0 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-secondary text-[10px] font-semibold text-text-secondary border border-border">
                  +{remaining}
                </div>
              )}
              {photos.length === 0 && todo.hasPhoto && (
                <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                  <Camera size={10} />
                  Photo
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
