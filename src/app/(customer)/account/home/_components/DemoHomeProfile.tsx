"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import {
  ChevronLeft, Plus, Camera, Wifi, Users, Phone, MapPin,
  ShoppingCart, AlertTriangle, Check, ChevronRight,
  Eye, EyeOff, Home, Droplets, Zap, Info, Star, X,
  CheckCircle2, Flag,
} from "lucide-react";
import type { DemoTodoItem, Priority } from "./types";
import { PRIORITY_CONFIG } from "./types";
import { demoCustomerBy, DEMO_TECH } from "@/lib/demoData";

// =====================================================================
// Demo data — preserved from previous version
// =====================================================================

const DEMO_INITIAL_TODOS: DemoTodoItem[] = [
  { id: "1", task: "Fix bathroom exhaust fan", priority: "high", hasPhoto: true, status: "needs-parts", parts: "Broan 688 Fan Motor", partStatus: "Needs Purchase", specialist: false, notes: "Rattling sound, intermittent power" },
  { id: "2", task: "Install smart thermostat", priority: "medium", hasPhoto: false, status: "pending", parts: "Ecobee Smart Thermostat", partStatus: "Purchased", specialist: false },
  { id: "3", task: "Patch drywall in hallway", priority: "low", hasPhoto: true, status: "pending", parts: null, partStatus: null, specialist: false },
  { id: "4", task: "Replace garage door weatherstrip", priority: "low", hasPhoto: false, status: "confirmed", parts: null, partStatus: null, specialist: false },
  { id: "5", task: "Electrical panel inspection", priority: "high", hasPhoto: false, status: "pending", parts: null, partStatus: null, specialist: true, notes: "Breaker trips on circuit 4 — licensed electrician needed" },
];

const PRIMARY_DEMO_CUSTOMER = demoCustomerBy("Sarah Mitchell")!;
const DEMO_VISIT_TECH_FIRST_NAME = DEMO_TECH.name.split(" ")[0];

const DEMO_HOUSEHOLD = [
  { name: PRIMARY_DEMO_CUSTOMER.name, role: "Primary", phone: PRIMARY_DEMO_CUSTOMER.phone ?? "", initials: PRIMARY_DEMO_CUSTOMER.initials },
  { name: "David Mitchell", role: "Spouse", phone: "(972) 555-0198", initials: "DM" },
];

const DEMO_VISITS = [
  { date: "Mar 15, 2026", tech: DEMO_VISIT_TECH_FIRST_NAME, tasks: ["Replaced kitchen faucet", "Fixed garbage disposal", "Caulked kitchen sink"], hours: "2.5h", rating: 5 },
  { date: "Feb 28, 2026", tech: DEMO_VISIT_TECH_FIRST_NAME, tasks: ["Mounted TV in living room", "Smart thermostat install"], hours: "1.5h", rating: 5 },
  { date: "Feb 10, 2026", tech: DEMO_VISIT_TECH_FIRST_NAME, tasks: ["Drywall patch (2 areas)", "Paint touch-up", "Door hinge tightening", "Curtain rod install"], hours: "3h", rating: 4 },
];

const DEMO_HOME_DETAILS = [
  { icon: Home, label: "Built", value: "2008", color: "text-primary" },
  { icon: Droplets, label: "Water Heater", value: "2012", color: "text-info" },
  { icon: Zap, label: "Panel", value: "200A", color: "text-accent-amber" },
];

export default function DemoHomeProfile() {
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
