"use client";

import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  Plus, Camera, ShoppingCart, AlertTriangle, CheckCircle2, X, Trash2,
} from "lucide-react";
import type { ItemStatus, NormalizedTodo, Priority } from "./types";
import { priorityDot } from "./types";

interface TodoListProps {
  items: NormalizedTodo[];
  openTasks: number;

  // Photo button (toggles the Photos add form upstream)
  onTogglePhotoForm: () => void;

  // Add task form
  showAddTask: boolean;
  setShowAddTask: (v: boolean | ((p: boolean) => boolean)) => void;
  newTaskText: string;
  setNewTaskText: (v: string) => void;
  newTaskPriority: Priority;
  setNewTaskPriority: (p: Priority) => void;
  savingTask: boolean;
  addTask: () => void;

  // Per-task actions
  toggleTaskComplete: (id: string, status: ItemStatus) => void;
  deleteTask: (id: string) => void;
}

export default function TodoList({
  items, openTasks, onTogglePhotoForm,
  showAddTask, setShowAddTask,
  newTaskText, setNewTaskText,
  newTaskPriority, setNewTaskPriority,
  savingTask, addTask,
  toggleTaskComplete, deleteTask,
}: TodoListProps) {
  return (
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
            onClick={onTogglePhotoForm}
            className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text-secondary active:bg-surface-secondary transition-colors"
          >
            <Camera size={11} />
            Photo
          </button>
          <button
            onClick={() => setShowAddTask((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white active:bg-primary-dark transition-colors shadow-[0_1px_4px_rgba(79,149,152,0.30)]"
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

      {items.length === 0 ? (
        <Card padding="md" variant="outlined">
          <p className="text-[12px] text-text-tertiary text-center py-2">
            No tasks yet. Add one above.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
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
  );
}
