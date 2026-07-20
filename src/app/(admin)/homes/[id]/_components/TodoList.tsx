"use client";

import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import AddTaskForm, { type NewTaskPayload } from "@/components/AddTaskForm";
import Link from "next/link";
import {
  Plus, Camera, ShoppingCart, AlertTriangle, CheckCircle2, X, Trash2,
} from "lucide-react";
import type { ItemStatus, NormalizedTodo } from "./types";
import { priorityDot } from "./types";

interface TodoListProps {
  items: NormalizedTodo[];
  openTasks: number;

  // Photo button (toggles the Photos add form upstream)
  onTogglePhotoForm: () => void;

  // Add task form
  showAddTask: boolean;
  setShowAddTask: (v: boolean | ((p: boolean) => boolean)) => void;
  savingTask: boolean;
  addTask: (payload: NewTaskPayload) => Promise<void> | void;
  homeId: string;

  // Per-task actions
  toggleTaskComplete: (id: string, status: ItemStatus) => void;
  deleteTask: (id: string) => void;
}

export default function TodoList({
  items, openTasks, onTogglePhotoForm,
  showAddTask, setShowAddTask,
  savingTask, addTask, homeId,
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

      <AddTaskForm
        open={showAddTask}
        onCancel={() => setShowAddTask(false)}
        onSubmit={addTask}
        homeId={homeId}
        saving={savingTask}
        partsBuyerLabels={{ customer: "Customer", tech: "Anthony" }}
      />

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
                    <Link
                      href={`/task/${item.id}`}
                      className={`text-[13px] font-semibold leading-snug ${
                        item.status === "completed"
                          ? "line-through text-text-tertiary"
                          : "text-text-primary"
                      }`}
                    >
                      {item.task}
                    </Link>
                    <div className="shrink-0">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  {item.description && (
                    <p className={`mt-1 text-[12px] leading-snug ${
                      item.status === "completed" ? "text-text-tertiary" : "text-text-secondary"
                    }`}>
                      {item.description}
                    </p>
                  )}

                  {item.parts && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2">
                      <ShoppingCart size={10} className="shrink-0 text-text-tertiary" />
                      <span className="flex-1 truncate text-[11px] text-text-secondary">{item.parts}</span>
                      {(item.partsBuyer || item.partStatus) && (
                        <span className={`text-[10px] font-semibold shrink-0 ${
                          item.partsBuyer === "tech" || (item.partStatus ?? "").includes("Anthony") || item.partStatus === "Tech to Purchase"
                            ? "text-primary"
                            : "text-accent-amber"
                        }`}>
                          {item.partsBuyer === "tech"
                            ? "Anthony buys"
                            : item.partsBuyer === "customer"
                            ? "Customer buys"
                            : item.partStatus}
                        </span>
                      )}
                    </div>
                  )}

                  {item.photoUrls.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {item.photoUrls.slice(0, 3).map((url, idx) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={idx}
                          src={url}
                          alt="Task photo"
                          className="h-10 w-10 rounded-md object-cover border border-border"
                        />
                      ))}
                      {item.photoUrls.length > 3 && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-secondary text-[10px] font-semibold text-text-secondary border border-border">
                          +{item.photoUrls.length - 3}
                        </div>
                      )}
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
                      {item.hasPhoto && item.photoUrls.length === 0 && (
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
