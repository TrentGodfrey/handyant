"use client";

import Card from "@/components/Card";
import {
  CheckCircle2, ChevronRight, Star, Check, AlertTriangle, Info,
} from "lucide-react";
import type { BookingRecord, NoteRecord } from "./types";
import { formatVisitDate, formatHours, formatNoteDate } from "./types";

interface VisitsAndNotesProps {
  completedVisits: BookingRecord[];
  techNotes: NoteRecord[];
  expandedVisit: string | null;
  setExpandedVisit: (id: string | null) => void;
}

export default function VisitsAndNotes({
  completedVisits, techNotes, expandedVisit, setExpandedVisit,
}: VisitsAndNotesProps) {
  return (
    <>
      {/* Visit History */}
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Visit History</p>
        {completedVisits.length === 0 ? (
          <Card padding="md">
            <p className="text-[13px] text-text-tertiary text-center">No visits yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {completedVisits.map((visit) => {
              const isExpanded = expandedVisit === visit.id;
              const rating = visit.reviews?.[0]?.rating ?? 0;
              return (
                <Card key={visit.id} padding="sm" onClick={() => setExpandedVisit(isExpanded ? null : visit.id)} className="cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-light">
                      <CheckCircle2 size={18} className="text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-text-primary truncate">
                          {formatVisitDate(visit.scheduledDate)}{visit.tech?.name ? ` · ${visit.tech.name}` : ""}
                        </p>
                        <ChevronRight size={14} className={`text-text-tertiary transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-text-tertiary">
                          {visit.tasks.length} {visit.tasks.length === 1 ? "task" : "tasks"} · {formatHours(visit.durationMinutes)}
                        </span>
                        {rating > 0 && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={9} className={i < rating ? "fill-warning text-warning" : "fill-border text-border"} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && visit.tasks.length > 0 && (
                    <div className="mt-3 space-y-1.5 pl-1 border-l-2 border-border ml-[52px]">
                      {visit.tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2">
                          <Check size={11} className="shrink-0 text-success" />
                          <span className="text-[12px] text-text-secondary">{task.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Tech Notes */}
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Tech Notes</p>
        {techNotes.length === 0 ? (
          <Card padding="md">
            <p className="text-[13px] text-text-tertiary text-center">No tech notes yet - your handyman will add observations after visits</p>
          </Card>
        ) : (
          <Card padding="md" className="space-y-4">
            {techNotes.map((note, idx) => {
              const severity = note.severity ?? "info";
              const cfg =
                severity === "critical"
                  ? { bg: "bg-[#FFF7ED]", color: "text-accent-coral", Icon: AlertTriangle }
                  : severity === "warning"
                    ? { bg: "bg-warning-light", color: "text-accent-amber", Icon: AlertTriangle }
                    : { bg: "bg-primary-50", color: "text-primary", Icon: Info };
              const Icon = cfg.Icon;
              return (
                <div key={note.id}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                      <Icon size={15} className={cfg.color} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-text-primary">{note.title}</p>
                      {note.body && (
                        <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{note.body}</p>
                      )}
                      {(note.authorName || note.createdAt) && (
                        <p className="text-[10px] text-text-tertiary mt-1">
                          Noted {formatNoteDate(note.createdAt)}{note.authorName ? ` · ${note.authorName}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {idx < techNotes.length - 1 && <div className="h-px bg-border mt-4" />}
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </>
  );
}
