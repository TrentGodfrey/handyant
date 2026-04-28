"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, Camera, Paperclip, ArrowLeft, Phone, MoreVertical, MessageSquare } from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { toast as appToast } from "@/components/Toaster";

interface Message {
  id: string;
  text: string;
  sender: "customer" | "tech";
  timestamp: string;
  type: "text" | "photo" | "system";
}

interface Thread {
  id: string;                 // conversation id (or "new:<techUserId>" placeholder)
  techUserId?: string;        // for lazy-creating a conversation
  name: string;
  role: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  nextVisit: string;
  address: string;
  phone: string;
  messages: Message[];
}

interface ApiMessage {
  id: string;
  text: string;
  type: string | null;
  createdAt: string | null;
  senderId: string;
  sender?: { id: string; name: string | null };
}

interface ApiConversationUser {
  id: string;
  name: string | null;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_THRESHOLD_MS;
}

interface ApiConversation {
  id: string;
  // Optional because /api/conversations nests these inside customer/tech objects.
  customerId?: string;
  techId?: string;
  customer: ApiConversationUser | null;
  tech: ApiConversationUser | null;
  // /api/messages returns a `messages` array; /api/conversations returns a single
  // `lastMessage` object instead. Support both.
  messages?: Array<ApiMessage & { sender?: { id: string; name: string | null } }>;
  lastMessage?: { id: string; text: string; createdAt: string; senderId: string } | null;
  lastMessageAt?: string | null;
}

interface ApiBookingLite {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  techId: string | null;
  tech: { id: string; name: string | null; phone: string | null } | null;
  home: { address: string | null; city: string | null } | null;
}

const DEMO_THREADS: Thread[] = [
  {
    id: "anthony",
    name: "Anthony B.",
    role: "Your Handyman",
    initials: "A",
    lastMessage: "Classic alignment issue. I'll bring my laser level. See you Tuesday! 👍",
    time: "11:20 AM",
    unread: 0,
    online: true,
    nextVisit: "Tue, Apr 1 · 9:00 AM",
    address: "4821 Oak Hollow Dr",
    phone: "(214) 555-0199",
    messages: [
      { id: "1", text: "Hi Sarah! Just confirming our appointment for Tuesday. I'll be there around 9 AM.", sender: "tech", timestamp: "Mar 28, 10:30 AM", type: "text" },
      { id: "2", text: "Sounds great! The kitchen faucet has been leaking worse this week.", sender: "customer", timestamp: "Mar 28, 10:45 AM", type: "text" },
      { id: "3", text: "Got it, I'll bring a Moen cartridge. Any preference on finish?", sender: "tech", timestamp: "Mar 28, 11:02 AM", type: "text" },
      { id: "4", text: "Brushed nickel if possible! Also the garage door sensor has been acting up — it closes then reopens immediately.", sender: "customer", timestamp: "Mar 28, 11:15 AM", type: "text" },
      { id: "5", text: "Classic alignment issue. I'll bring my laser level. See you Tuesday! 👍", sender: "tech", timestamp: "Mar 28, 11:20 AM", type: "text" },
      { id: "s1", text: "Appointment confirmed for Tue, Apr 1 at 9:00 AM", sender: "tech", timestamp: "Mar 28, 11:21 AM", type: "system" },
    ],
  },
  {
    id: "support",
    name: "HandyAnt Support",
    role: "Customer Support",
    initials: "HA",
    lastMessage: "Welcome to HandyAnt! Tap to say hi or ask us anything.",
    time: "Mar 27",
    unread: 1,
    online: true,
    nextVisit: "",
    address: "",
    phone: "",
    messages: [
      { id: "s1", text: "Welcome to HandyAnt! 🏡 We're here if you ever need help with your account, scheduling, or anything else. How can we help?", sender: "tech", timestamp: "Mar 27", type: "text" },
    ],
  },
];

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtMessageTime(iso: string | null): string {
  if (!iso) return "Just now";
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function adaptMessage(m: ApiMessage, customerUserId: string): Message {
  const isCustomer = m.senderId === customerUserId;
  const t = (m.type ?? "text") as Message["type"];
  return {
    id: m.id,
    text: m.text,
    sender: isCustomer ? "customer" : "tech",
    timestamp: fmtMessageTime(m.createdAt),
    type: t === "photo" || t === "system" ? t : "text",
  };
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const { isDemo, mounted } = useDemoMode();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  const loadThreads = useCallback(async () => {
    if (isDemo) {
      setThreads(DEMO_THREADS);
      setMessagesByThread(Object.fromEntries(DEMO_THREADS.map((t) => [t.id, t.messages])));
      setLoading(false);
      return;
    }
    if (!userId) return;

    try {
      const [convoRes, bookingsRes, defaultTechRes] = await Promise.all([
        fetch("/api/conversations").then((r) => r.json()),
        fetch("/api/bookings").then((r) => r.json()).catch(() => []),
        // Always look up a default tech so customers without bookings can still
        // initiate a conversation. Falls back gracefully if route 404s.
        fetch("/api/tech/default").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const conversations: ApiConversation[] = Array.isArray(convoRes) ? convoRes : [];
      const bookings: ApiBookingLite[] = Array.isArray(bookingsRes) ? bookingsRes : [];
      const defaultTech: { id: string; name: string | null; phone: string | null } | null =
        defaultTechRes && typeof defaultTechRes === "object" && "id" in defaultTechRes
          ? defaultTechRes
          : null;

      // Build a map of techId → upcoming visit info
      const visitsByTech = new Map<string, ApiBookingLite>();
      for (const b of bookings) {
        if (!b.techId) continue;
        if (!["pending", "confirmed", "in_progress"].includes(b.status)) continue;
        const existing = visitsByTech.get(b.techId);
        if (!existing || b.scheduledDate < existing.scheduledDate) {
          visitsByTech.set(b.techId, b);
        }
      }

      const mapped: Thread[] = conversations.map((c) => {
        // The /api/conversations response shape differs slightly: customer/tech
        // are nested objects; customerId/techId may not be top-level.
        const customerId = c.customerId ?? c.customer?.id ?? "";
        const techId = c.techId ?? c.tech?.id ?? "";
        const other = customerId === userId ? c.tech : c.customer;
        const lastMsg = c.messages?.[0] ?? (c.lastMessage
          ? { id: c.lastMessage.id, text: c.lastMessage.text, type: null, createdAt: c.lastMessage.createdAt, senderId: c.lastMessage.senderId }
          : undefined);
        const visit = other ? visitsByTech.get(other.id) : undefined;
        return {
          id: c.id,
          techUserId: techId,
          name: other?.name ?? "Unknown",
          role: "Your Handyman",
          initials: (other?.name?.[0] ?? "?").toUpperCase(),
          lastMessage: lastMsg?.text ?? "",
          time: fmtTime(lastMsg?.createdAt ?? null),
          unread: 0,
          online: isOnline(other?.lastSeenAt),
          nextVisit: visit
            ? `${new Date(visit.scheduledDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}`
            : "",
          address: visit?.home?.address ?? "",
          phone: visit?.tech?.phone ?? "",
          messages: [],
        };
      });

      // If the customer has no conversation yet, surface a placeholder so they
      // can start one. Prefer a tech tied to an upcoming booking; otherwise use
      // the default tech (so even brand-new customers can message).
      if (mapped.length === 0) {
        const bookingWithTech = bookings.find((b) => b.tech);
        const fallback = bookingWithTech?.tech ?? defaultTech;
        if (fallback) {
          mapped.push({
            id: `new:${fallback.id}`,
            techUserId: fallback.id,
            name: fallback.name ?? "Your Handyman",
            role: "Your Handyman",
            initials: (fallback.name?.[0] ?? "A").toUpperCase(),
            lastMessage: "Start a conversation",
            time: "",
            unread: 0,
            online: false,
            nextVisit: bookingWithTech?.scheduledDate
              ? new Date(bookingWithTech.scheduledDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
              : "",
            address: bookingWithTech?.home?.address ?? "",
            phone: fallback.phone ?? "",
            messages: [],
          });
        }
      }

      setThreads(mapped);
      setMessagesByThread((prev) => {
        const next = { ...prev };
        for (const t of mapped) if (!next[t.id]) next[t.id] = [];
        return next;
      });
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [isDemo, userId]);

  useEffect(() => {
    if (!mounted) return;
    loadThreads();
  }, [loadThreads, mounted]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread, messagesByThread]);

  // Load messages whenever a thread is opened (real mode only).
  useEffect(() => {
    if (!activeThread || isDemo) return;
    if (activeThread.id.startsWith("new:")) return; // nothing to fetch yet
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/messages?conversationId=${activeThread.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setMessagesByThread((prev) => ({
          ...prev,
          [activeThread.id]: data.map((m: ApiMessage) => adaptMessage(m, userId)),
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        appToast.error("Couldn't load messages: " + (e instanceof Error ? e.message : String(e)));
      });
    return () => { cancelled = true; };
  }, [activeThread, isDemo, userId]);

  async function sendMessage() {
    if (!input.trim() || !activeThread || sending) return;
    const text = input.trim();
    setInput("");

    if (isDemo) {
      const msg: Message = {
        id: Date.now().toString(),
        text,
        sender: "customer",
        timestamp: "Just now",
        type: "text",
      };
      setMessagesByThread((prev) => ({
        ...prev,
        [activeThread.id]: [...(prev[activeThread.id] || []), msg],
      }));
      // Echo back a faux reply for the demo experience.
      setTimeout(() => {
        setMessagesByThread((prev) => ({
          ...prev,
          [activeThread.id]: [...(prev[activeThread.id] || []), {
            id: (Date.now() + 1).toString(),
            text: activeThread.id === "support"
              ? "Thanks for reaching out! Someone from our team will follow up shortly."
              : "Got it, thanks for the heads up! See you Tuesday 👍",
            sender: "tech",
            timestamp: "Just now",
            type: "text",
          }],
        }));
      }, 1500);
      return;
    }

    setSending(true);
    try {
      let conversationId = activeThread.id;

      // Lazy-create the conversation if this is a placeholder.
      if (conversationId.startsWith("new:")) {
        if (!activeThread.techUserId) throw new Error("No tech to message");
        const createRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otherUserId: activeThread.techUserId,
            firstMessage: text,
          }),
        });
        const created = await createRes.json();
        if (!createRes.ok || !created?.id) throw new Error(created?.error ?? "Create failed");
        conversationId = created.id;

        // Replace the placeholder thread with the real one and re-point activeThread.
        const upgraded: Thread = { ...activeThread, id: conversationId };
        setThreads((prev) => prev.map((t) => (t.id === activeThread.id ? upgraded : t)));
        setActiveThread(upgraded);
        setMessagesByThread((prev) => {
          const next = { ...prev };
          next[conversationId] = next[activeThread.id] ?? [];
          delete next[activeThread.id];
          return next;
        });

        // Refetch the canonical message list (includes the firstMessage).
        const msgs = await fetch(`/api/messages?conversationId=${conversationId}`).then((r) => r.json());
        if (Array.isArray(msgs) && userId) {
          setMessagesByThread((prev) => ({
            ...prev,
            [conversationId]: msgs.map((m: ApiMessage) => adaptMessage(m, userId)),
          }));
        }
        return;
      }

      // Optimistic append.
      const tempId = `tmp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        text,
        sender: "customer",
        timestamp: "Just now",
        type: "text",
      };
      setMessagesByThread((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), optimistic],
      }));

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, text }),
      });
      const created: ApiMessage | { error: string } = await res.json();

      if (!res.ok || !("id" in created) || !userId) {
        // Roll back the optimistic message on failure.
        setMessagesByThread((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).filter((m) => m.id !== tempId),
        }));
        return;
      }

      setMessagesByThread((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) =>
          m.id === tempId ? adaptMessage(created, userId) : m
        ),
      }));
    } catch {
      // Best-effort: silent on error in this UI layer.
    } finally {
      setSending(false);
    }
  }

  // ── Thread view ──────────────────────────────────────────────────────────────
  if (activeThread) {
    const messages = messagesByThread[activeThread.id] || [];
    return (
      <div className="fixed inset-0 lg:left-64 flex flex-col bg-background">
        {/* Header */}
        <div className="bg-white border-b border-border px-4 pt-14 lg:pt-4 pb-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveThread(null)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[13px] font-bold text-white">{activeThread.initials}</span>
              </div>
              {activeThread.online && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success" />
              )}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-text-primary">{activeThread.name}</p>
              <p className={`text-[11px] font-medium ${activeThread.online ? "text-success" : "text-text-tertiary"}`}>
                {activeThread.online ? "Online now" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            {activeThread.phone && (
              <a href={`tel:${activeThread.phone.replace(/[^+\d]/g, "")}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors">
                <Phone size={18} className="text-text-secondary" />
              </a>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
            >
              <MoreVertical size={18} className="text-text-secondary" />
            </button>
            {menuOpen && (
              <>
                <button
                  aria-label="Close menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      // Mark all messages in this thread as read (no-op in demo).
                      if (!isDemo && activeThread && !activeThread.id.startsWith("new:")) {
                        fetch(`/api/messages?conversationId=${activeThread.id}`).catch(() => {});
                      }
                      setThreads((prev) => prev.map((t) => t.id === activeThread.id ? { ...t, unread: 0 } : t));
                      showToast("Marked as read");
                    }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-text-primary hover:bg-surface-secondary transition-colors"
                  >
                    Mark as read
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      showToast("Profile coming soon");
                    }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-text-primary hover:bg-surface-secondary transition-colors border-t border-border"
                  >
                    View profile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pinned visit bar */}
        {activeThread.nextVisit && (
          <div className="bg-primary-50 border-b border-primary-100 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold text-primary">Next: {activeThread.nextVisit}</span>
            </div>
            <span className="text-[11px] text-text-tertiary">{activeThread.address}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="rounded-full bg-surface-secondary px-4 py-1.5 text-[11px] font-medium text-text-tertiary">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isCustomer = msg.sender === "customer";
            return (
              <div key={msg.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isCustomer
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-white border border-border text-text-primary rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                }`}>
                  <p className="text-[14px] leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isCustomer ? "text-white/50" : "text-text-tertiary"}`}>{msg.timestamp}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-border px-4 py-3 shrink-0" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="flex items-end gap-2">
            <button
              onClick={() => showToast("Attachments coming soon")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
            >
              <Paperclip size={20} className="text-text-tertiary" />
            </button>
            <button
              onClick={() => showToast("Photo upload coming soon")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
            >
              <Camera size={20} className="text-text-tertiary" />
            </button>
            <div className="flex-1 flex items-end gap-2 rounded-2xl border border-border bg-surface-secondary px-4 py-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message…"
                className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary outline-none"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                input.trim() && !sending ? "bg-primary text-white shadow-sm" : "bg-surface-secondary text-text-tertiary"
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 rounded-full bg-text-primary text-white text-[12px] font-medium px-4 py-2 shadow-lg">
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ── Inbox list ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-white border-b border-border px-5 pt-14 lg:pt-8 pb-5">
        <h1 className="text-[26px] font-bold text-text-primary">Messages</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          {loading
            ? "Loading..."
            : threads.filter(t => t.unread > 0).length > 0
              ? `${threads.filter(t => t.unread > 0).length} unread`
              : threads.length > 0
                ? "All caught up"
                : "No conversations yet"}
        </p>
      </div>

      {!loading && threads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 mb-4">
            <MessageSquare size={28} className="text-primary" />
          </div>
          <h3 className="text-[16px] font-bold text-text-primary">No messages yet</h3>
          <p className="mt-1.5 max-w-[240px] text-[13px] text-text-secondary leading-relaxed">
            Once you book a visit, you&apos;ll be able to message your handyman here.
          </p>
        </div>
      )}

      <div className="px-5 pt-4 space-y-2">
        {threads.map((thread) => (
          <button
            key={thread.id}
            className="flex w-full items-center gap-3.5 rounded-2xl bg-white border border-border px-4 py-4 text-left hover:bg-surface-secondary transition-colors active:scale-[0.99]"
            onClick={() => setActiveThread(thread)}
          >
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[14px] font-bold text-white">{thread.initials}</span>
              </div>
              {thread.online && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-success" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[15px] font-semibold text-text-primary">{thread.name}</p>
                <span className="text-[11px] text-text-tertiary shrink-0 ml-2">{thread.time}</span>
              </div>
              <p className="text-[12px] text-text-secondary truncate pr-2">{thread.lastMessage}</p>
              {thread.nextVisit && (
                <p className="text-[11px] text-primary font-medium mt-1">📅 {thread.nextVisit}</p>
              )}
            </div>
            {thread.unread > 0 && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                <span className="text-[10px] font-bold text-white">{thread.unread}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
