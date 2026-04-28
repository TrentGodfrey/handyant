"use client";

import Card from "@/components/Card";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import {
  Plus, Camera, ShoppingCart, ChevronRight, Info, X,
  Loader2,
} from "lucide-react";
import type { Priority, TodoRecord } from "./types";
import { PRIORITY_CONFIG } from "./types";

interface TodoListProps {
  todos: TodoRecord[];
  highCount: number;

  expandedTodo: string | null;
  setExpandedTodo: (id: string | null) => void;

  showAddTask: boolean;
  setShowAddTask: (v: boolean) => void;
  newTask: string;
  setNewTask: (v: string) => void;
  newPriority: Priority;
  setNewPriority: (p: Priority) => void;
  savingTask: boolean;
  addTodo: () => void;
  removeTodo: (id: string) => void;

  triggerPhotoUpload: (todoId: string) => void;
  photoUploadingId: string | null;
}

const KNOWN_STATUSES = ["confirmed", "pending", "completed", "in-progress", "needs-parts", "scheduled", "cancelled"] as const;
type KnownStatus = typeof KNOWN_STATUSES[number];

export default function TodoList(props: TodoListProps) {
  const {
    todos, highCount,
    expandedTodo, setExpandedTodo,
    showAddTask, setShowAddTask,
    newTask, setNewTask,
    newPriority, setNewPriority,
    savingTask, addTodo, removeTodo,
    triggerPhotoUpload, photoUploadingId,
  } = props;

  return (
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
            const status = (KNOWN_STATUSES as readonly string[]).includes(item.status)
              ? (item.status as KnownStatus)
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
  );
}
