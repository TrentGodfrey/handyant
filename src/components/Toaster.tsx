"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  leaving?: boolean;
}

type Listener = (toasts: ToastItem[]) => void;

// ── Singleton store (event emitter) ───────────────────────────────────────────

const listeners = new Set<Listener>();
let toasts: ToastItem[] = [];
let nextId = 1;

const TOAST_DURATION_MS = 4000;
const LEAVE_ANIMATION_MS = 200;

function emit() {
  for (const l of listeners) l(toasts);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

function dismiss(id: number) {
  const target = toasts.find((t) => t.id === id);
  if (!target || target.leaving) return;
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, LEAVE_ANIMATION_MS);
}

function add(message: string, variant: ToastVariant) {
  const id = nextId++;
  toasts = [...toasts, { id, message, variant }];
  emit();
  setTimeout(() => dismiss(id), TOAST_DURATION_MS);
}

// ── Public API ────────────────────────────────────────────────────────────────

export const toast = {
  success: (msg: string) => add(msg, "success"),
  error: (msg: string) => add(msg, "error"),
  info: (msg: string) => add(msg, "info"),
};

// ── Render ────────────────────────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: "bg-success", icon: CheckCircle2 },
  error: { bg: "bg-error", icon: AlertCircle },
  info: { bg: "bg-primary", icon: Info },
};

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribe(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[9998] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((t) => {
        const cfg = variantStyles[t.variant];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl px-4 py-3 text-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all duration-200 ${cfg.bg} ${
              t.leaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            }`}
            role={t.variant === "error" ? "alert" : "status"}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-[13px] font-medium leading-snug break-words">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
