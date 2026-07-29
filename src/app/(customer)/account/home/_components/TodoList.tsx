"use client";

import Card from "@/components/Card";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import AddTaskForm, { type NewTaskPayload } from "@/components/AddTaskForm";
import {
  Plus, Camera, ShoppingCart, ChevronRight, Info, X,
  Loader2, Pencil,
} from "lucide-react";
import type { Priority, TodoRecord } from "./types";
import { PRIORITY_CONFIG } from "./types";
import {
  normalizePartPurchaseStatus,
  normalizePartsBuyer,
} from "@/lib/parts-status";

interface TodoListProps {
  todos: TodoRecord[];
  highCount: number;

  expandedTodo: string | null;
  setExpandedTodo: (id: string | null) => void;

  showAddTask: boolean;
  setShowAddTask: (v: boolean) => void;
  savingTask: boolean;
  /**
   * New unified add handler. The form gives back a full payload (description,
   * priority, parts info, photo IDs). The page is responsible for POSTing it.
   */
  addTodoFull: (payload: NewTaskPayload) => Promise<void> | void;
  removeTodo: (id: string) => void;

  triggerPhotoUpload: (todoId: string) => void;
  photoUploadingId: string | null;

  /**
   * The home id is required for the shared AddTaskForm to upload photos.
   * Pass null in cases where uploads aren't possible.
   */
  homeId: string | null;
}

const KNOWN_STATUSES = ["confirmed", "pending", "completed", "in-progress", "needs-parts", "scheduled", "cancelled"] as const;
type KnownStatus = typeof KNOWN_STATUSES[number];

export default function TodoList(props: TodoListProps) {
  const {
    todos, highCount,
    expandedTodo, setExpandedTodo,
    showAddTask, setShowAddTask,
    savingTask, addTodoFull, removeTodo,
    triggerPhotoUpload, photoUploadingId,
    homeId,
  } = props;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">To-Do List</p>
          <p className="text-[11px] text-text-tertiary mt-0.5">{todos.length} items · {highCount} urgent</p>
        </div>
        <button onClick={() => setShowAddTask(!showAddTask)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm active:opacity-90 transition-opacity">
          <Plus size={14} />
          Add Task
        </button>
      </div>

      <AddTaskForm
        open={showAddTask}
        onCancel={() => setShowAddTask(false)}
        onSubmit={addTodoFull}
        homeId={homeId}
        saving={savingTask}
      />

      {todos.length === 0 ? (
        <Card padding="md">
          <p className="text-[13px] text-text-tertiary text-center">No tasks yet - tap Add Task to get started</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {todos.map((item) => {
            const isExpanded = expandedTodo === item.id;
            const priority = (["high", "medium", "low"] as Priority[]).includes(item.priority as Priority)
              ? (item.priority as Priority)
              : "medium";
            const pCfg = PRIORITY_CONFIG[priority];
            const status = (KNOWN_STATUSES as readonly string[]).includes(item.status)
              ? (item.status as KnownStatus)
              : "pending";
            const partsLabel = item.partsDescription ?? item.parts;
            const partsBuyer = normalizePartsBuyer(item.partsBuyer, item.partStatus);
            const partsPurchase = normalizePartPurchaseStatus(item.partStatus);
            return (
              <Card key={item.id} padding="sm">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-1.5 shrink-0 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ${pCfg.dot} ${pCfg.ring}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/task/${item.id}`} className="inline-flex min-h-11 items-center text-[14px] font-semibold leading-snug text-text-primary hover:text-primary">{item.task}</Link>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.specialist && (
                          <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-semibold text-accent-coral">Specialist</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedTodo(isExpanded ? null : item.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`task-details-${item.id}`}
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.task}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full text-text-tertiary active:bg-surface-secondary"
                        >
                          <ChevronRight size={14} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                      </div>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-[12px] text-text-secondary leading-snug">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <StatusBadge status={status} />
                      {item.hasPhoto && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-text-tertiary">
                          <Camera size={10} />
                          Photo
                        </span>
                      )}
                    </div>
                    {partsLabel && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2">
                        <ShoppingCart size={12} className="shrink-0 text-text-tertiary" />
                        <span className="text-[11px] text-text-secondary flex-1 truncate">{partsLabel}</span>
                        {partsBuyer && (
                          <span className={`text-[10px] font-semibold shrink-0 ${partsBuyer === "tech" ? "text-primary" : "text-accent-amber"}`}>
                            {partsBuyer === "tech" ? "Anthony buys" : "You buy"}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                          partsPurchase === "purchased"
                            ? "bg-success-light text-success"
                            : "bg-warning-light text-accent-amber"
                        }`}>
                          {partsPurchase === "purchased" ? "Purchased" : "Needs purchase"}
                        </span>
                      </div>
                    )}
                    <div id={`task-details-${item.id}`}>
                      {isExpanded && item.notes && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2">
                          <Info size={12} className="mt-0.5 shrink-0 text-accent-amber" />
                          <p className="text-[12px] text-text-secondary">{item.notes}</p>
                        </div>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/task/${item.id}`}
                          className="flex min-h-11 items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-[11px] font-semibold text-primary active:bg-primary-100"
                          aria-label={`Edit ${item.task}`}
                        >
                          <Pencil size={11} />
                          Edit
                        </Link>
                        {isExpanded && (
                        <>
                        <button
                          onClick={() => triggerPhotoUpload(item.id)}
                          disabled={photoUploadingId === item.id}
                          className="flex min-h-11 items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary-100 transition-colors disabled:opacity-50"
                        >
                          {photoUploadingId === item.id ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                          {photoUploadingId === item.id ? "Uploading…" : "Add media"}
                        </button>
                        <button
                          onClick={() => removeTodo(item.id)}
                          className="flex min-h-11 items-center gap-1 rounded-lg bg-error-light px-3 py-1.5 text-[11px] font-semibold text-error hover:bg-red-100 transition-colors"
                        >
                          <X size={11} />
                          Remove
                        </button>
                        </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
