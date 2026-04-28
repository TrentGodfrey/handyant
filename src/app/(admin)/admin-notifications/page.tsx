"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Bell,
  BellOff,
  Calendar,
  MessageCircle,
  DollarSign,
  Star,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import Spinner from "@/components/Spinner";

type FilterType = "all" | "unread" | "bookings" | "messages" | "updates";

interface ApiNotification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  read: boolean | null;
  createdAt: string | null;
  link: string | null;
}

interface StaffNotification {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  link: string | null;
}

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "bookings", label: "Bookings" },
  { id: "messages", label: "Messages" },
  { id: "updates", label: "Updates" },
];

const typeIconMap: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  success: { Icon: CheckCircle2, bg: "bg-success-light", color: "text-success" },
  warning: { Icon: AlertTriangle, bg: "bg-warning-light", color: "text-warning" },
  error:   { Icon: AlertTriangle, bg: "bg-red-50", color: "text-red-600" },
  booking: { Icon: Calendar, bg: "bg-primary-50", color: "text-primary" },
  message: { Icon: MessageCircle, bg: "bg-primary-50", color: "text-primary" },
  invoice: { Icon: DollarSign, bg: "bg-success-light", color: "text-success" },
  review:  { Icon: Star, bg: "bg-warning-light", color: "text-accent-amber" },
  info:    { Icon: Info, bg: "bg-surface-secondary", color: "text-text-secondary" },
};

function styleFor(type: string) {
  return typeIconMap[type] ?? typeIconMap.info;
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

function adapt(n: ApiNotification): StaffNotification {
  return {
    id: n.id,
    type: n.type ?? "info",
    title: n.title,
    description: n.body ?? "",
    time: relativeTime(n.createdAt),
    read: !!n.read,
    link: n.link ?? null,
  };
}

function matchesFilter(n: StaffNotification, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !n.read;
  if (filter === "bookings") return n.type === "booking";
  if (filter === "messages") return n.type === "message";
  if (filter === "updates") return ["invoice", "review", "success", "warning", "error", "info"].includes(n.type);
  return true;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { isDemo, mounted } = useDemoMode();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data.map(adapt));
        else setNotifications([]);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [isDemo, mounted]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (isDemo) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
  }

  function handleClick(n: StaffNotification) {
    if (!n.read) markRead(n.id);
    if (n.link) router.push(n.link);
  }

  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter));

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-bold text-text-primary">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              <BellOff size={14} />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 no-scrollbar -mx-5 px-5">
          {filters.map((f) => {
            const count = f.id === "unread"
              ? notifications.filter((n) => !n.read).length
              : notifications.filter((n) => matchesFilter(n, f.id)).length;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold border transition-all ${
                  activeFilter === f.id
                    ? "bg-primary border-primary text-white"
                    : "bg-surface border-border text-text-secondary hover:border-primary/40"
                }`}
              >
                {f.label}
                {f.id !== "all" && count > 0 && (
                  <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                    activeFilter === f.id ? "bg-white/25 text-white" : "bg-surface-secondary text-text-tertiary"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="py-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary mb-4">
              <Bell size={28} className="text-text-tertiary" />
            </div>
            <p className="text-[16px] font-semibold text-text-primary">
              {notifications.length === 0 ? "No notifications yet" : "All caught up"}
            </p>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
              {notifications.length === 0
                ? "Heads-ups from the system will show up here."
                : `No ${activeFilter === "all" ? "" : activeFilter + " "}notifications to show right now.`}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((n, i) => {
              const { Icon, bg, color } = styleFor(n.type);
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors active:bg-surface-secondary ${
                    !n.read ? "bg-primary-50/40" : "bg-surface"
                  } ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="shrink-0 mt-1 w-2 flex justify-center">
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[14px] leading-snug ${!n.read ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}>
                        {n.title}
                      </p>
                      <span className="text-[11px] text-text-tertiary shrink-0 mt-0.5">{n.time}</span>
                    </div>
                    {n.description && (
                      <p className="text-[12px] text-text-secondary mt-1 leading-relaxed line-clamp-2">
                        {n.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
