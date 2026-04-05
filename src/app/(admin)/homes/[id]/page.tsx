"use client";

import { useState } from "react";
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

// ─── Data ─────────────────────────────────────────────────────────────────────

const homeData = {
  name: "Sarah Mitchell",
  address: "4821 Oak Hollow Dr, Plano TX 75024",
  type: "Subscription",
  wifi: { network: "MitchellHome5G", password: "oakhome2024!" },
  members: [
    { name: "Sarah Mitchell", role: "Primary", phone: "(972) 555-0142" },
    { name: "David Mitchell", role: "Spouse", phone: "(972) 555-0198" },
  ],
};

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

const initialTodoItems: TodoItem[] = [
  {
    id: "1",
    task: "Fix bathroom exhaust fan",
    priority: "high",
    hasPhoto: true,
    status: "needs-parts",
    parts: {
      name: "Broan 688 Fan Motor",
      purchaseStatus: "Needs Purchase",
      responsibleParty: "Tech",
      techFee: true,
    },
  },
  {
    id: "2",
    task: "Install smart thermostat",
    priority: "medium",
    hasPhoto: false,
    status: "in-progress",
    parts: {
      name: "Ecobee SmartThermostat Premium",
      purchaseStatus: "Purchased",
      responsibleParty: "Customer",
    },
  },
  {
    id: "3",
    task: "Patch drywall in hallway",
    priority: "low",
    hasPhoto: true,
    status: "pending",
    parts: null,
  },
  {
    id: "4",
    task: "Rewire outdoor landscape lighting",
    priority: "medium",
    hasPhoto: false,
    status: "pending",
    parts: {
      name: "VOLT 12V low-voltage wire (50ft)",
      purchaseStatus: "Not Needed",
      responsibleParty: "Customer",
    },
    specialist: "Licensed Electrician",
  },
  {
    id: "5",
    task: "Replace master bath towel bar set",
    priority: "low",
    hasPhoto: false,
    status: "pending",
    parts: {
      name: "Moen Genta 3-piece towel bar",
      purchaseStatus: "Needs Purchase",
      responsibleParty: "Customer",
    },
  },
];

const visitHistory = [
  {
    date: "Mar 15, 2026",
    tasks: 3,
    hours: "2.5h",
    notes: "Replaced kitchen faucet, adjusted garage door sensor, re-sealed master window frame",
  },
  {
    date: "Feb 28, 2026",
    tasks: 2,
    hours: "1.5h",
    notes: "Smart thermostat pre-wire, inspected water heater anode rod",
  },
  {
    date: "Feb 10, 2026",
    tasks: 4,
    hours: "3.0h",
    notes: "Drywall patch ×2, interior paint touch-up, swapped dining room light fixture",
  },
  {
    date: "Jan 22, 2026",
    tasks: 2,
    hours: "1.0h",
    notes: "GFCI outlet replacement in kitchen, tightened deck railing posts",
  },
];

const receipts = [
  { id: "r1", date: "Mar 15, 2026", desc: "Moen kitchen faucet + labor", amount: "$285.00" },
  { id: "r2", date: "Feb 28, 2026", desc: "Thermostat pre-wire labor", amount: "$85.00" },
  { id: "r3", date: "Feb 10, 2026", desc: "Drywall repair + paint materials", amount: "$190.00" },
  { id: "r4", date: "Jan 22, 2026", desc: "GFCI outlets (2) + installation", amount: "$95.00" },
];

interface HandymanNote {
  id: string;
  icon: "warning" | "info" | "wrench" | "star";
  note: string;
  date: string;
}

const initialNotes: HandymanNote[] = [
  {
    id: "n1",
    icon: "warning",
    note: "Water heater is 12+ years old — recommend replacement within 1–2 years. Brand: Rheem 50gal.",
    date: "Feb 28",
  },
  {
    id: "n2",
    icon: "wrench",
    note: "Garage door spring has noticeable play on the right side. Monitoring — may need specialist if it worsens.",
    date: "Mar 15",
  },
  {
    id: "n3",
    icon: "info",
    note: "Dead WiFi zone in master bathroom — extender between bedroom and bath would help.",
    date: "Feb 10",
  },
  {
    id: "n4",
    icon: "star",
    note: "Customer prefers morning appointments (before noon). Always text 30 min before arrival.",
    date: "Jan 22",
  },
];

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

export default function HomeDetailPage() {
  const [todoItems, setTodoItems] = useState<TodoItem[]>(initialTodoItems);
  const [notes, setNotes] = useState<HandymanNote[]>(initialNotes);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [wifiVisible, setWifiVisible] = useState(false);

  const openTasks = todoItems.filter((t) => t.status !== "completed").length;

  function addNote() {
    if (!newNoteText.trim()) return;
    const note: HandymanNote = {
      id: `n${Date.now()}`,
      icon: "info",
      note: newNoteText.trim(),
      date: "Mar 29",
    };
    setNotes((prev) => [note, ...prev]);
    setNewNoteText("");
    setShowAddNote(false);
  }

  function markComplete(id: string) {
    setTodoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "completed" } : item))
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
            <span className="text-[13px] font-bold text-primary">SM</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-text-primary leading-tight">{homeData.name}</h1>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-white">
                {homeData.type}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="shrink-0 text-text-tertiary" />
              <span className="text-[12px] text-text-secondary">{homeData.address}</span>
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
            <span className="text-[17px] font-bold text-text-primary">12</span>
            <span className="text-[10px] text-text-tertiary">Total Visits</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-xl bg-surface border border-border py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">$655</span>
            <span className="text-[10px] text-text-tertiary">Total Spent</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {[
          { icon: Phone, label: "Call", color: "text-success" },
          { icon: MessageCircle, label: "Text", color: "text-primary" },
          { icon: Navigation, label: "Navigate", color: "text-accent-teal" },
          { icon: Edit, label: "Edit", color: "text-text-secondary" },
        ].map((action) => (
          <button
            key={action.label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors"
          >
            <action.icon size={18} className={action.color} />
            <span className="text-[11px] font-medium text-text-secondary">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Info Cards: WiFi + Household */}
      <div className="mb-6 grid grid-cols-2 gap-2.5">
        {/* WiFi */}
        <Card padding="sm" variant="default">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wifi size={14} className="text-info" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi</span>
            </div>
            <button
              onClick={() => setWifiVisible((v) => !v)}
              className="text-[10px] font-medium text-primary active:opacity-70"
            >
              {wifiVisible ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-[12px] font-semibold text-text-primary">{homeData.wifi.network}</p>
          <p className={`mt-0.5 font-mono text-[11px] transition-all ${wifiVisible ? "text-text-secondary" : "text-transparent select-none"}`}
            style={wifiVisible ? {} : { textShadow: "0 0 6px rgba(0,0,0,0.3)" }}>
            {homeData.wifi.password}
          </p>
        </Card>

        {/* Household */}
        <Card padding="sm" variant="default">
          <div className="mb-2 flex items-center gap-1.5">
            <Users size={14} className="text-accent-purple" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Household</span>
          </div>
          <div className="space-y-1.5">
            {homeData.members.map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-text-primary">{m.name.split(" ")[0]}</p>
                  <p className="text-[10px] text-text-tertiary">{m.role}</p>
                </div>
                <a
                  href={`tel:${m.phone}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-success-light active:bg-success transition-colors"
                >
                  <Phone size={12} className="text-success" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      </div>

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
      </section>

      {/* ── Visit History ───────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Visit History
        </h2>
        <div className="space-y-2">
          {visitHistory.map((visit, i) => (
            <Card key={i} padding="sm" variant="outlined">
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
      </section>

      {/* ── Receipts ────────────────────────────────────────────────────── */}
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
            <span className="text-[15px] font-bold text-text-primary">$655.00</span>
          </div>
        </Card>
      </section>

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
                disabled={!newNoteText.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        )}

        <Card variant="outlined" padding="sm">
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <div key={note.id} className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
                <NoteIcon icon={note.icon} />
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-text-primary leading-relaxed">{note.note}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-tertiary">
                    <FileText size={9} />
                    {note.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
