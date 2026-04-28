"use client";

import Card from "@/components/Card";
import {
  Plus, AlertTriangle, CheckCircle2, Receipt, FileText, Info, Star, X, Wrench, Trash2,
} from "lucide-react";
import type { ApiTechNote } from "./types";
import { formatShortDate } from "./types";

// ─── Visit row data shape (computed in parent) ─────────────────────────────────

export interface VisitRow {
  id: string;
  date: string;
  tasks: number;
  hours: string;
  notes: string;
}

export interface ReceiptRow {
  id: string;
  date: string;
  desc: string;
  amount: string;
}

// ─── NoteIcon ──────────────────────────────────────────────────────────────────

function NoteIcon({ severity }: { severity: string | null }) {
  if (severity === "warning") return <AlertTriangle size={13} className="mt-0.5 shrink-0 text-accent-amber" />;
  if (severity === "star") return <Star size={13} className="mt-0.5 shrink-0 text-accent-purple" />;
  if (severity === "wrench") return <Wrench size={13} className="mt-0.5 shrink-0 text-text-tertiary" />;
  return <Info size={13} className="mt-0.5 shrink-0 text-info" />;
}

// ─── Visit history ─────────────────────────────────────────────────────────────

export function VisitHistory({ visits }: { visits: VisitRow[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Visit History
      </h2>
      {visits.length === 0 ? (
        <Card padding="md" variant="outlined">
          <p className="text-[12px] text-text-tertiary text-center py-2">No completed visits yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visits.map((visit) => (
            <Card key={visit.id} padding="sm" variant="outlined">
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
      )}
    </section>
  );
}

// ─── Receipts ──────────────────────────────────────────────────────────────────

export function Receipts({ receipts, totalSpent }: { receipts: ReceiptRow[]; totalSpent: number }) {
  if (receipts.length === 0) return null;
  return (
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
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2.5">
          <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wide">Total</span>
          <span className="text-[15px] font-bold text-text-primary">${totalSpent.toFixed(2)}</span>
        </div>
      </Card>
    </section>
  );
}

// ─── Handyman notes ────────────────────────────────────────────────────────────

interface NotesProps {
  notes: ApiTechNote[];
  showAddNote: boolean;
  setShowAddNote: (v: boolean | ((p: boolean) => boolean)) => void;
  newNoteText: string;
  setNewNoteText: (v: string) => void;
  savingNote: boolean;
  addNote: () => void;
  deleteNote: (id: string) => void;
}

export function HandymanNotes({
  notes, showAddNote, setShowAddNote,
  newNoteText, setNewNoteText, savingNote, addNote, deleteNote,
}: NotesProps) {
  return (
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

      {showAddNote && (
        <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
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
              disabled={!newNoteText.trim() || savingNote}
              className="rounded-lg bg-primary px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
            >
              {savingNote ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <Card padding="md" variant="outlined">
          <p className="text-[12px] text-text-tertiary text-center py-2">No notes yet.</p>
        </Card>
      ) : (
        <Card variant="outlined" padding="sm">
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <div key={note.id} className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
                <NoteIcon severity={note.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-text-primary leading-relaxed">{note.title}</p>
                  {note.body && (
                    <p className="mt-0.5 text-[11px] text-text-secondary leading-relaxed">{note.body}</p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-tertiary">
                    <FileText size={9} />
                    {formatShortDate(note.createdAt)}
                    {note.authorName && <span>· {note.authorName}</span>}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary active:bg-error-light active:text-error transition-colors"
                  title="Delete note"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

