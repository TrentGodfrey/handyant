"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Calendar,
  MessageCircle,
  DollarSign,
  Star,
  CheckCheck,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import Spinner from "@/components/Spinner";

interface ApiNotification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  read: boolean | null;
  createdAt: string | null;
  link: string | null;
}

interface PanelNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string | null;
  link: string | null;
}

const typeStyles: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  success:  { Icon: CheckCircle2,  bg: "bg-success-light",  color: "text-success" },
  warning:  { Icon: AlertTriangle, bg: "bg-warning-light",  color: "text-warning" },
  error:    { Icon: AlertTriangle, bg: "bg-red-50",         color: "text-red-600" },
  booking:  { Icon: Calendar,      bg: "bg-primary-50",     color: "text-primary" },
  message:  { Icon: MessageCircle, bg: "bg-primary-50",     color: "text-primary" },
  invoice:  { Icon: DollarSign,    bg: "bg-success-light",  color: "text-success" },
  review:   { Icon: Star,          bg: "bg-warning-light",  color: "text-accent-amber" },
  info:     { Icon: Info,          bg: "bg-surface-secondary", color: "text-text-secondary" },
};

function styleFor(type: string) {
  return typeStyles[type] ?? typeStyles.info;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function adapt(n: ApiNotification): PanelNotification {
  return {
    id: n.id,
    title: n.title,
    body: n.body ?? "",
    type: n.type ?? "info",
    read: !!n.read,
    createdAt: n.createdAt,
    link: n.link ?? null,
  };
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const { isDemo, mounted } = useDemoMode();
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (isDemo) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const data = await r.json();
      if (Array.isArray(data)) setNotifications(data.map(adapt));
      else setNotifications([]);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  // Fetch every time the panel opens.
  useEffect(() => {
    if (!open || !mounted) return;
    load();
  }, [open, mounted, load]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (isDemo) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
  }

  function markAllRead() {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (isDemo) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {});
  }

  function handleClick(n: PanelNotification) {
    if (!n.read) markRead(n.id);
    if (n.link) {
      onClose();
      router.push(n.link);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex" aria-modal="true" role="dialog" aria-label="Notifications">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] cursor-default"
      />

      {/* Panel — desktop right slide-over, mobile bottom sheet */}
      <div
        className={[
          "relative ml-auto bg-white border-border shadow-xl flex flex-col",
          // Desktop: full-height right drawer
          "lg:h-full lg:w-96 lg:border-l lg:animate-slide-in-right",
          // Mobile: bottom sheet
          "mt-auto w-full max-h-[85vh] rounded-t-2xl lg:rounded-none lg:mt-0 lg:max-h-full border-t",
          "animate-slide-in-bottom lg:!animate-slide-in-right",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[18px] font-bold text-text-primary">Notifications</h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary-50 transition-colors"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-secondary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="md" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary mb-3">
                <Bell size={24} className="text-text-tertiary" />
              </div>
              <p className="text-[15px] font-semibold text-text-primary">No notifications yet</p>
              <p className="text-[12px] text-text-secondary mt-1">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const { Icon, bg, color } = styleFor(n.type);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-secondary ${
                        !n.read ? "bg-primary-50/40" : "bg-white"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${bg}`}>
                          <Icon size={16} className={color} />
                        </div>
                        {!n.read && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13.5px] leading-snug ${!n.read ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}>
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[10.5px] text-text-tertiary mt-0.5">
                            {relativeTime(n.createdAt)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="mt-1 text-[12px] text-text-secondary leading-relaxed line-clamp-2">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer link */}
        <div className="border-t border-border px-5 py-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/admin-notifications");
            }}
            className="w-full text-center text-[12.5px] font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            View all notifications
          </button>
        </div>
      </div>

    </div>
  );
}
