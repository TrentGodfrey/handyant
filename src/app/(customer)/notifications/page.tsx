"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Calendar, MessageCircle, Package, CheckCircle2,
  DollarSign, CreditCard, Bell, BellOff, AlertTriangle, RotateCw,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import Spinner from "@/components/Spinner";

type NotifType = "appointment" | "message" | "parts" | "completed" | "invoice" | "billing";
type FilterType = "all" | "unread" | "appointments" | "messages" | "updates";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  link: string | null;
}

interface ApiNotification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  read: boolean | null;
  createdAt: string | null;
  link: string | null;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "appointment",
    title: "Appointment Tomorrow",
    description: "Anthony is coming tomorrow, March 30 at 10:00 AM. Don't forget to leave the gate open.",
    time: "2h ago",
    read: false,
    link: null,
  },
  {
    id: "2",
    type: "message",
    title: "Message from Anthony",
    description: "\"Hey Sarah, just confirming — I'll have the exhaust fan motor by Thursday. Sound good?\"",
    time: "3h ago",
    read: false,
    link: "/messages",
  },
  {
    id: "3",
    type: "parts",
    title: "Part Has Arrived",
    description: "Broan 688 Fan Motor arrived at our warehouse. Bringing it to your appointment on Thursday.",
    time: "5h ago",
    read: false,
    link: null,
  },
  {
    id: "4",
    type: "completed",
    title: "Job Completed",
    description: "Kitchen faucet repair + garbage disposal completed on Mar 15. How did Anthony do?",
    time: "14d ago",
    read: true,
    link: null,
  },
  {
    id: "5",
    type: "invoice",
    title: "Invoice Ready",
    description: "Your invoice for $0 (covered by Pro plan) is ready. Parts: $42.00 billed separately.",
    time: "14d ago",
    read: true,
    link: "/account/receipts",
  },
  {
    id: "6",
    type: "appointment",
    title: "Appointment Reminder",
    description: "Your appointment with Anthony is in 24 hours — Mar 15 at 10:00 AM.",
    time: "15d ago",
    read: true,
    link: null,
  },
  {
    id: "7",
    type: "parts",
    title: "Parts Ordered",
    description: "Anthony ordered the Moen kitchen faucet cartridge for your repair. Est. arrival 2 days.",
    time: "17d ago",
    read: true,
    link: null,
  },
  {
    id: "8",
    type: "billing",
    title: "Subscription Renewed",
    description: "Your Pro plan renewed for March. $89.00 charged to Visa •••• 4242.",
    time: "28d ago",
    read: true,
    link: null,
  },
  {
    id: "9",
    type: "message",
    title: "Message from Anthony",
    description: "\"Smart thermostat install went great! I left the old one in the closet in case you need it.\"",
    time: "29d ago",
    read: true,
    link: "/messages",
  },
  {
    id: "10",
    type: "completed",
    title: "Job Completed",
    description: "Smart thermostat installation completed on Feb 28. Tap to leave a review.",
    time: "29d ago",
    read: true,
    link: null,
  },
];

const typeConfig: Record<NotifType, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}> = {
  appointment: { icon: Calendar, iconBg: "bg-primary-50", iconColor: "text-primary" },
  message: { icon: MessageCircle, iconBg: "bg-primary-50", iconColor: "text-primary" },
  parts: { icon: Package, iconBg: "bg-warning-light", iconColor: "text-accent-amber" },
  completed: { icon: CheckCircle2, iconBg: "bg-success-light", iconColor: "text-success" },
  invoice: { icon: DollarSign, iconBg: "bg-success-light", iconColor: "text-success" },
  billing: { icon: CreditCard, iconBg: "bg-surface-secondary", iconColor: "text-text-secondary" },
};

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "appointments", label: "Appointments" },
  { id: "messages", label: "Messages" },
  { id: "updates", label: "Updates" },
];

const ALLOWED_TYPES = new Set<NotifType>([
  "appointment", "message", "parts", "completed", "invoice", "billing",
]);

function normalizeType(type: string | null): NotifType {
  if (type && ALLOWED_TYPES.has(type as NotifType)) return type as NotifType;
  return "appointment";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function adapt(api: ApiNotification): Notification {
  return {
    id: api.id,
    type: normalizeType(api.type),
    title: api.title,
    description: api.body ?? "",
    time: relativeTime(api.createdAt),
    read: !!api.read,
    link: api.link ?? null,
  };
}

function matchesFilter(n: Notification, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !n.read;
  if (filter === "appointments") return n.type === "appointment";
  if (filter === "messages") return n.type === "message";
  if (filter === "updates") return ["parts", "completed", "invoice", "billing"].includes(n.type);
  return true;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isDemo, mounted } = useDemoMode();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetch("/api/notifications")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load notifications (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data.map(adapt));
        } else {
          setNotifications([]);
        }
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load notifications");
        setNotifications([]);
      })
      .finally(() => setLoading(false));
  }, [isDemo, mounted, reloadKey]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (isDemo) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {});
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (isDemo) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
  }

  function handleNotifClick(notif: Notification) {
    markRead(notif.id);
    if (notif.link) router.push(notif.link);
  }

  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Home
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
        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-5 px-5">
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

      {loadError && (
        <div className="px-5 pt-4">
          <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-light p-3.5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-error">Couldn&rsquo;t load notifications</p>
              <p className="mt-0.5 text-[12px] text-error/80 break-words">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-error px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <RotateCw size={12} />
              Retry
            </button>
          </div>
        </div>
      )}

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
              {notifications.length === 0 ? "No notifications" : "All caught up"}
            </p>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
              No {activeFilter === "all" ? "" : activeFilter + " "}notifications to show right now.
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((notif, i) => {
              const cfg = typeConfig[notif.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors active:bg-surface-secondary ${
                    !notif.read ? "bg-primary-50/40" : "bg-surface"
                  } ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
                >
                  {/* Unread dot */}
                  <div className="shrink-0 mt-1 w-2 flex justify-center">
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${cfg.iconBg}`}>
                    <Icon size={18} className={cfg.iconColor} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[14px] leading-snug ${!notif.read ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[11px] text-text-tertiary shrink-0 mt-0.5">{notif.time}</span>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-1 leading-relaxed line-clamp-2">
                      {notif.description}
                    </p>
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
