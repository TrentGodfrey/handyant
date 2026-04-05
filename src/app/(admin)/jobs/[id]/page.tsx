"use client";

import { useState, use } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  ChevronLeft, MapPin, Clock, Phone, MessageCircle, Navigation,
  CheckSquare, Square, ShoppingCart, Camera, FileText, DollarSign,
  ChevronRight, Plus, AlertTriangle, Check, Package, Star,
} from "lucide-react";

const jobData: Record<string, {
  id: string; client: string; address: string; phone: string; date: string; time: string;
  status: "confirmed" | "pending" | "needs-parts" | "in-progress" | "scheduled";
  estimate: string; tasks: { id: string; label: string; done: boolean; notes?: string }[];
  parts: { item: string; qty: number; status: "purchased" | "needed" | "ordered" }[];
  photos: { id: string; label: string }[];
  techNotes: string; customerNotes: string; rating?: number;
}> = {
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

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const job = jobData[id] ?? jobData["1"];
  const [tasks, setTasks] = useState(job.tasks);
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState(job.techNotes);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const completedCount = tasks.filter((t) => t.done).length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function addNote() {
    if (!noteInput.trim()) return;
    setNotes((prev) => prev + (prev ? "\n\n" : "") + noteInput.trim());
    setNoteInput("");
    setShowNoteInput(false);
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
          <Link href="/messages" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-[13px] font-semibold text-text-primary hover:bg-surface-secondary transition-colors">
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
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Checklist</p>
          <Card className="divide-y divide-border-light">
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
          </Card>
        </div>

        {/* Customer Notes */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Customer Notes</p>
          <Card className="bg-warning-light border-warning/20">
            <div className="flex gap-2.5">
              <AlertTriangle size={15} className="text-accent-amber shrink-0 mt-0.5" />
              <p className="text-[13px] text-text-primary leading-relaxed">{job.customerNotes}</p>
            </div>
          </Card>
        </div>

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
        {job.photos.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Photos ({job.photos.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {job.photos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-xl bg-surface-secondary border border-border flex flex-col items-center justify-center gap-1.5">
                  <Camera size={20} className="text-text-tertiary" />
                  <p className="text-[9px] text-text-tertiary px-1 text-center truncate w-full">{photo.label}</p>
                </div>
              ))}
              <button className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 transition-colors">
                <Plus size={18} className="text-text-tertiary" />
                <p className="text-[9px] text-text-tertiary">Add</p>
              </button>
            </div>
          </div>
        )}

        {/* Tech Notes */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Tech Notes</p>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="flex items-center gap-1 text-[12px] font-semibold text-primary"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          <Card>
            <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-line">{notes}</p>
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
        </div>

        {/* Invoice estimate */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Estimate</p>
          <Card>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-text-secondary">Labor (est. 3h)</span>
                <span className="font-medium text-text-primary">$240</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-text-secondary">Materials</span>
                <span className="font-medium text-text-primary">$100</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between">
                <span className="text-[14px] font-semibold text-text-primary">Total</span>
                <span className="text-[16px] font-bold text-primary">{job.estimate}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Complete Job CTA */}
        {completedCount === tasks.length ? (
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
          <Button variant="outline" size="lg" fullWidth>
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
              <p className="mb-2 text-[12px] font-semibold text-text-secondary">Request a review?</p>
              <div className="flex justify-center gap-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={28} className="text-warning fill-warning" />
                ))}
              </div>
              <p className="mt-1.5 text-center text-[11px] text-text-tertiary">A 5-star review request will be sent via text</p>
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={() => setShowCompleteModal(false)}>
              Confirm &amp; Send Invoice
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
