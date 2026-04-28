"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Camera, Paperclip, ArrowLeft, MoreVertical, Search, Plus, X } from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

interface Message {
  id: string;
  text: string;
  sender: "tech" | "customer";
  timestamp: string;
  type: "text" | "photo" | "system";
}

interface Conversation {
  id: string;
  customerId?: string;
  client: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  nextVisit: string;
  address: string;
  online: boolean;
  messages: Message[];
}

// ─── Demo Data ─────────────────────────────────────────────────────────────

const demoConversations: Conversation[] = [
  {
    id: "c1",
    client: "Sarah Mitchell",
    initials: "SM",
    lastMessage: "Can't wait! Also, the faucet is dripping from the base now too",
    time: "11:20 AM",
    unread: 2,
    nextVisit: "Tue, Apr 1 · 9:00 AM",
    address: "4821 Oak Hollow Dr",
    online: true,
    messages: [
      { id: "1", text: "Hi Sarah! Just confirming our appointment for Tuesday. I'll be there around 9 AM.", sender: "tech", timestamp: "Mar 28, 10:30 AM", type: "text" },
      { id: "2", text: "Sounds great! The kitchen faucet has been leaking worse this week.", sender: "customer", timestamp: "Mar 28, 10:45 AM", type: "text" },
      { id: "3", text: "Got it, I'll bring a Moen cartridge. Any preference on finish?", sender: "tech", timestamp: "Mar 28, 11:02 AM", type: "text" },
      { id: "4", text: "Brushed nickel if possible! Also the garage door sensor has been acting up.", sender: "customer", timestamp: "Mar 28, 11:15 AM", type: "text" },
      { id: "5", text: "Classic alignment issue. I'll bring my laser level. See you Tuesday! 👍", sender: "tech", timestamp: "Mar 28, 11:20 AM", type: "text" },
      { id: "s1", text: "Appointment confirmed for Tue, Apr 1 at 9:00 AM", sender: "tech", timestamp: "Mar 28, 11:21 AM", type: "system" },
      { id: "6", text: "Can't wait! Also, the faucet is dripping from the base now too", sender: "customer", timestamp: "Just now", type: "text" },
    ],
  },
  {
    id: "c2",
    client: "Robert Chen",
    initials: "RC",
    lastMessage: "Perfect, I'll make sure someone is home",
    time: "9:15 AM",
    unread: 0,
    nextVisit: "Today · 11:30 AM",
    address: "1205 Elm Creek Ct",
    online: true,
    messages: [
      { id: "1", text: "Hey Robert, heading your way around 11:30 for the thermostat install.", sender: "tech", timestamp: "9:10 AM", type: "text" },
      { id: "2", text: "Perfect, I'll make sure someone is home", sender: "customer", timestamp: "9:15 AM", type: "text" },
    ],
  },
  {
    id: "c3",
    client: "Maria Garcia",
    initials: "MG",
    lastMessage: "The paint color is SW Alabaster from the garage shelf",
    time: "Yesterday",
    unread: 0,
    nextVisit: "Today · 2:00 PM",
    address: "890 Sunset Ridge",
    online: false,
    messages: [
      { id: "1", text: "Quick question — do you have the paint or should I pick it up?", sender: "tech", timestamp: "Yesterday, 3:00 PM", type: "text" },
      { id: "2", text: "The paint color is SW Alabaster from the garage shelf", sender: "customer", timestamp: "Yesterday, 4:30 PM", type: "text" },
    ],
  },
  {
    id: "c4",
    client: "James Wilson",
    initials: "JW",
    lastMessage: "Confirmed for April 1st, thanks!",
    time: "Mar 27",
    unread: 0,
    nextVisit: "Apr 1 · 10:00 AM",
    address: "2200 Heritage Trail",
    online: false,
    messages: [
      { id: "1", text: "Hi James, just sent over a booking confirmation for the wallpaper removal.", sender: "tech", timestamp: "Mar 27, 2:00 PM", type: "text" },
      { id: "2", text: "Confirmed for April 1st, thanks!", sender: "customer", timestamp: "Mar 27, 2:15 PM", type: "text" },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function initialsOf(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── API shapes ─────────────────────────────────────────────────────────────

type ApiConvo = {
  id: string;
  customer: { id: string; name: string | null; avatarUrl?: string | null; lastSeenAt?: string | null } | null;
  tech: { id: string; name: string | null; avatarUrl?: string | null; lastSeenAt?: string | null } | null;
  lastMessage: { id: string; text: string; createdAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_THRESHOLD_MS;
}

type ApiMessage = {
  id: string;
  text: string;
  type: string | null;
  createdAt: string;
  senderId: string;
  sender?: { id: string; name: string | null };
};

type ApiBooking = {
  id: string;
  customerId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  home: { address: string | null; city: string | null } | null;
};

type ApiClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

function formatVisit(dateStr: string, timeStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  // scheduledTime arrives as ISO; format the time-of-day portion only.
  const t = new Date(timeStr);
  const timeLabel = Number.isNaN(t.getTime())
    ? ""
    : t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return timeLabel ? `${dayLabel} · ${timeLabel}` : dayLabel;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AdminMessagesPageInner />
    </Suspense>
  );
}

function AdminMessagesPageInner() {
  const { isDemo, mounted } = useDemoMode();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messagesByConvo, setMessagesByConvo] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [hiddenConvoIds, setHiddenConvoIds] = useState<Set<string>>(new Set());
  const [convoMenuOpen, setConvoMenuOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setConversations(demoConversations);
      setMessagesByConvo(
        Object.fromEntries(demoConversations.map((c) => [c.id, c.messages]))
      );
      setLoadingList(false);
      return;
    }

    Promise.all([
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/conversations").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([me, convos, bookings]: [
        { id: string } | null,
        ApiConvo[],
        ApiBooking[],
      ]) => {
        if (me) setCurrentUserId(me.id);

        // Group bookings by customer; pick the soonest upcoming visit for each.
        const todayStr = new Date().toISOString().slice(0, 10);
        const bookingList: ApiBooking[] = Array.isArray(bookings) ? bookings : [];
        const visitByCustomer = new Map<string, ApiBooking>();
        for (const b of bookingList) {
          if (!["pending", "confirmed", "in_progress"].includes(b.status)) continue;
          if (b.scheduledDate < todayStr) continue;
          const existing = visitByCustomer.get(b.customerId);
          if (!existing || b.scheduledDate < existing.scheduledDate) {
            visitByCustomer.set(b.customerId, b);
          }
        }

        const mapped: Conversation[] = (Array.isArray(convos) ? convos : []).map((c) => {
          const clientName = c.customer?.name ?? "Unknown";
          const visit = c.customer ? visitByCustomer.get(c.customer.id) : undefined;
          return {
            id: c.id,
            customerId: c.customer?.id,
            client: clientName,
            initials: initialsOf(clientName),
            lastMessage: c.lastMessage?.text ?? "",
            time: formatRelative(c.lastMessageAt),
            unread: c.unreadCount ?? 0,
            nextVisit: visit ? formatVisit(visit.scheduledDate, visit.scheduledTime) : "",
            address: visit?.home?.address ?? "",
            online: isOnline(c.customer?.lastSeenAt),
            messages: [],
          };
        });
        setConversations(mapped);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoadingList(false));
  }, [isDemo, mounted]);

  // ── Load thread when a convo opens ──────────────────────────────────────
  const loadThread = useCallback(
    async (convoId: string) => {
      if (isDemo) return;
      if (messagesByConvo[convoId]) return; // cache hit
      setLoadingThread(true);
      try {
        const r = await fetch(`/api/messages?conversationId=${convoId}`);
        if (!r.ok) throw new Error("fetch failed");
        const raw: ApiMessage[] = await r.json();
        const mapped: Message[] = raw.map((m) => ({
          id: m.id,
          text: m.text,
          sender: m.senderId === currentUserId ? "tech" : "customer",
          timestamp: formatTimestamp(m.createdAt),
          type: (m.type === "system" || m.type === "photo" ? m.type : "text") as Message["type"],
        }));
        setMessagesByConvo((prev) => ({ ...prev, [convoId]: mapped }));
        // Mark this convo as read locally now that we've fetched (server marked them too).
        setConversations((prev) =>
          prev.map((c) => (c.id === convoId ? { ...c, unread: 0 } : c))
        );
      } catch {
        setMessagesByConvo((prev) => ({ ...prev, [convoId]: [] }));
      } finally {
        setLoadingThread(false);
      }
    },
    [isDemo, currentUserId, messagesByConvo]
  );

  useEffect(() => {
    if (activeConvo) loadThread(activeConvo.id);
  }, [activeConvo, loadThread]);

  // Deep-link: ?customerId=<id> auto-opens that customer's thread, creating one if needed.
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || !customerIdParam || loadingList) return;
    const existing = conversations.find((c) => c.customerId === customerIdParam);
    if (existing) {
      setActiveConvo(existing);
      setAutoOpened(true);
      return;
    }
    if (isDemo) {
      // Demo: nothing to look up — just bail.
      setAutoOpened(true);
      return;
    }
    // No existing conversation — create one. The POST response is just the raw
    // Conversation row (no customer object), so we refetch the list to get the
    // enriched form including customer name.
    setAutoOpened(true);
    fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otherUserId: customerIdParam }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((convo: { id: string } | null) => {
        if (!convo) return;
        return fetch("/api/conversations")
          .then((r) => (r.ok ? r.json() : []))
          .then((list: ApiConvo[]) => {
            const found = list.find((c) => c.id === convo.id);
            if (!found) return;
            const clientName = found.customer?.name ?? "Customer";
            const fresh: Conversation = {
              id: found.id,
              customerId: found.customer?.id,
              client: clientName,
              initials: initialsOf(clientName),
              lastMessage: found.lastMessage?.text ?? "",
              time: formatRelative(found.lastMessageAt),
              unread: found.unreadCount ?? 0,
              nextVisit: "",
              address: "",
              online: isOnline(found.customer?.lastSeenAt),
              messages: [],
            };
            setConversations((prev) =>
              prev.some((c) => c.id === fresh.id) ? prev : [fresh, ...prev]
            );
            setMessagesByConvo((prev) => ({ ...prev, [fresh.id]: [] }));
            setActiveConvo(fresh);
          });
      })
      .catch(() => {});
  }, [customerIdParam, conversations, loadingList, isDemo, autoOpened]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvo, messagesByConvo]);

  async function sendMessage() {
    if (!input.trim() || !activeConvo) return;
    const text = input.trim();
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      text,
      sender: "tech",
      timestamp: "Just now",
      type: "text",
    };
    setMessagesByConvo((prev) => ({
      ...prev,
      [activeConvo.id]: [...(prev[activeConvo.id] || []), optimistic],
    }));
    setInput("");

    if (isDemo) {
      // Old demo behavior: simulate a customer reply.
      setTimeout(() => {
        setMessagesByConvo((prev) => ({
          ...prev,
          [activeConvo.id]: [
            ...(prev[activeConvo.id] || []),
            {
              id: (Date.now() + 1).toString(),
              text: "Got it, thanks for the update! 👍",
              sender: "customer",
              timestamp: "Just now",
              type: "text",
            },
          ],
        }));
      }, 1500);
      return;
    }

    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvo.id, text }),
      });
      if (r.ok) {
        const saved: ApiMessage = await r.json();
        setMessagesByConvo((prev) => ({
          ...prev,
          [activeConvo.id]: (prev[activeConvo.id] || []).map((m) =>
            m.id === optimistic.id
              ? {
                  id: saved.id,
                  text: saved.text,
                  sender: "tech",
                  timestamp: formatTimestamp(saved.createdAt),
                  type: "text",
                }
              : m
          ),
        }));
      }
    } catch {
      /* keep optimistic message */
    }
  }

  // ── New-conversation picker ─────────────────────────────────────────────
  async function openPicker() {
    setPickerOpen(true);
    setPickerSearch("");
    if (clients.length > 0 || isDemo) return;
    setClientsLoading(true);
    try {
      const r = await fetch("/api/admin/clients");
      if (r.ok) {
        const data: ApiClient[] = await r.json();
        setClients(Array.isArray(data) ? data : []);
      }
    } catch {
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }

  async function startConversationWith(client: ApiClient) {
    if (creating) return;

    // Demo mode: just spin up an in-memory conversation.
    if (isDemo) {
      const fake: Conversation = {
        id: `demo-${Date.now()}`,
        client: client.name,
        initials: initialsOf(client.name),
        lastMessage: "",
        time: "",
        unread: 0,
        nextVisit: "",
        address: "",
        online: false,
        messages: [],
      };
      setConversations((prev) => [fake, ...prev]);
      setMessagesByConvo((prev) => ({ ...prev, [fake.id]: [] }));
      setActiveConvo(fake);
      setPickerOpen(false);
      return;
    }

    // If a conversation with this client already exists, just open it.
    const existing = conversations.find((c) => c.client === client.name);
    if (existing) {
      setActiveConvo(existing);
      setPickerOpen(false);
      return;
    }

    setCreating(true);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: client.id }),
      });
      if (!r.ok) return;
      const convo: { id: string } = await r.json();
      const fresh: Conversation = {
        id: convo.id,
        client: client.name,
        initials: initialsOf(client.name),
        lastMessage: "",
        time: "",
        unread: 0,
        nextVisit: "",
        address: "",
        online: false,
        messages: [],
      };
      setConversations((prev) => {
        // Don't double-insert if a refresh raced us.
        if (prev.some((c) => c.id === fresh.id)) return prev;
        return [fresh, ...prev];
      });
      setMessagesByConvo((prev) => ({ ...prev, [fresh.id]: [] }));
      setActiveConvo(fresh);
      setPickerOpen(false);
    } finally {
      setCreating(false);
    }
  }

  // Photo upload from paperclip / camera buttons.
  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || !activeConvo) return;
    setUploadingPhoto(true);

    try {
      if (isDemo) {
        // Demo mode: append a local data-URL message.
        const dataUrl = await readFileAsDataUrl(file);
        setMessagesByConvo((prev) => ({
          ...prev,
          [activeConvo.id]: [
            ...(prev[activeConvo.id] || []),
            {
              id: `tmp-${Date.now()}`,
              text: `[photo] ${dataUrl}`,
              sender: "tech",
              timestamp: "Just now",
              type: "photo",
            },
          ],
        }));
        return;
      }

      // Real mode: upload to /api/photos, then send the URL inline as a message.
      // (Real attachments would need Message.attachmentUrl in the schema — out of scope.)
      const dataUrl = await readFileAsDataUrl(file);
      const photoRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, label: file.name }),
      });
      if (!photoRes.ok) return;
      const photo = await photoRes.json();
      const url: string | undefined = photo?.url;
      if (!url) return;

      const text = `[photo] ${url}`;
      const optimistic: Message = {
        id: `tmp-${Date.now()}`,
        text,
        sender: "tech",
        timestamp: "Just now",
        type: "photo",
      };
      setMessagesByConvo((prev) => ({
        ...prev,
        [activeConvo.id]: [...(prev[activeConvo.id] || []), optimistic],
      }));
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvo.id, text }),
      });
      if (r.ok) {
        const saved: ApiMessage = await r.json();
        setMessagesByConvo((prev) => ({
          ...prev,
          [activeConvo.id]: (prev[activeConvo.id] || []).map((m) =>
            m.id === optimistic.id
              ? {
                  id: saved.id,
                  text: saved.text,
                  sender: "tech",
                  timestamp: formatTimestamp(saved.createdAt),
                  type: "photo",
                }
              : m
          ),
        }));
      }
    } catch {
      /* swallow — UI keeps optimistic state */
    } finally {
      setUploadingPhoto(false);
    }
  }

  function archiveActiveConvo() {
    if (!activeConvo) return;
    // Local-only hide for now — the schema has no `archived` field on Conversation.
    // TODO: when schema adds Conversation.archived, PATCH the conversation here.
    setHiddenConvoIds((prev) => new Set(prev).add(activeConvo.id));
    setActiveConvo(null);
    setConvoMenuOpen(false);
  }

  function blockActiveConvo() {
    if (!activeConvo) return;
    if (typeof window !== "undefined" && !window.confirm(`Block ${activeConvo.client}? They won't be able to message you.`)) {
      return;
    }
    // Local-only hide for now — same schema caveat as archive.
    setHiddenConvoIds((prev) => new Set(prev).add(activeConvo.id));
    setActiveConvo(null);
    setConvoMenuOpen(false);
  }

  const filtered = conversations
    .filter((c) => !hiddenConvoIds.has(c.id))
    .filter((c) =>
      !search.trim() || c.client.toLowerCase().includes(search.toLowerCase())
    );

  const filteredClients = clients.filter((c) =>
    !pickerSearch.trim() ||
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(pickerSearch.toLowerCase())
  );

  // Thread view
  if (activeConvo) {
    const messages = messagesByConvo[activeConvo.id] || [];
    return (
      <div className="fixed inset-0 lg:left-64 flex flex-col bg-background">
        {/* Header */}
        <div className="bg-white border-b border-border px-4 pt-14 pb-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveConvo(null)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[13px] font-bold text-white">{activeConvo.initials}</span>
              </div>
              {activeConvo.online && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success" />
              )}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-text-primary">{activeConvo.client}</p>
              <p className={`text-[11px] font-medium ${activeConvo.online ? "text-success" : "text-text-tertiary"}`}>
                {activeConvo.online ? "Online now" : "Offline"}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setConvoMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
              aria-label="Conversation options"
            >
              <MoreVertical size={18} className="text-text-secondary" />
            </button>
            {convoMenuOpen && (
              <>
                <button
                  aria-label="Close menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setConvoMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={archiveActiveConvo}
                    className="block w-full px-4 py-2.5 text-left text-[13px] text-text-primary hover:bg-surface-secondary transition-colors"
                  >
                    Archive conversation
                  </button>
                  <button
                    type="button"
                    onClick={blockActiveConvo}
                    className="block w-full px-4 py-2.5 text-left text-[13px] text-error hover:bg-surface-secondary transition-colors"
                  >
                    Block client
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pinned Context */}
        {(activeConvo.nextVisit || activeConvo.address) && (
          <div className="bg-primary-50 border-b border-primary-100 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold text-primary">
                {activeConvo.nextVisit ? `Next: ${activeConvo.nextVisit}` : ""}
              </span>
            </div>
            <span className="text-[11px] text-text-tertiary">{activeConvo.address}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loadingThread && messages.length === 0 ? (
            <div className="flex items-center justify-center pt-12">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="rounded-full bg-surface-secondary px-4 py-1.5 text-[11px] font-medium text-text-tertiary">
                      {msg.text}
                    </span>
                  </div>
                );
              }
              const isTech = msg.sender === "tech";
              return (
                <div key={msg.id} className={`flex ${isTech ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isTech
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-white border border-border text-text-primary rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  }`}>
                    <p className="text-[14px] leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${isTech ? "text-white/50" : "text-text-tertiary"}`}>{msg.timestamp}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-border px-4 py-3 pb-[env(safe-area-inset-bottom)] shrink-0">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-50"
              aria-label="Attach file"
            >
              <Paperclip size={20} className="text-text-tertiary" />
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-50"
              aria-label="Take photo"
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
              disabled={!input.trim()}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                input.trim() ? "bg-primary text-white shadow-sm" : "bg-surface-secondary text-text-tertiary"
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conversation list
  const unreadCount = conversations.filter((c) => c.unread > 0).length;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-white border-b border-border px-5 pt-14 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-text-primary">Messages</h1>
          <p className="mt-0.5 text-[13px] text-text-secondary">{unreadCount} unread</p>
        </div>
        <button
          onClick={openPicker}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>New</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Search size={16} className="shrink-0 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="px-5 py-2 space-y-1">
        {loadingList ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[14px] text-text-secondary">No conversations yet</p>
          </div>
        ) : (
          filtered.map((convo) => (
            <button
              key={convo.id}
              className="flex w-full items-center gap-3.5 rounded-xl bg-white border border-border px-4 py-3.5 text-left hover:bg-surface-secondary transition-colors"
              onClick={() => setActiveConvo(convo)}
            >
              <div className="relative shrink-0">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[14px] font-bold text-white">{convo.initials}</span>
                </div>
                {convo.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-success" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[14px] font-semibold text-text-primary">{convo.client}</p>
                  <span className="text-[11px] text-text-tertiary shrink-0">{convo.time}</span>
                </div>
                <p className="text-[12px] text-text-secondary truncate">{convo.lastMessage}</p>
                {convo.nextVisit && (
                  <p className="text-[10px] text-text-tertiary mt-0.5">{convo.nextVisit}</p>
                )}
              </div>
              {convo.unread > 0 && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                  <span className="text-[10px] font-bold text-white">{convo.unread}</span>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* New-conversation picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <button
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => setPickerOpen(false)}
          />
          <div className="relative w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-[16px] font-bold text-text-primary">New message</h2>
              <button
                onClick={() => setPickerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
              >
                <X size={18} className="text-text-secondary" />
              </button>
            </div>
            <div className="px-5 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                <Search size={16} className="shrink-0 text-text-tertiary" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search clients..."
                  autoFocus
                  className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {clientsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[13px] text-text-secondary">
                    {clients.length === 0 ? "No clients yet" : "No matches"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      disabled={creating}
                      onClick={() => startConversationWith(c)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors disabled:opacity-50"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[13px] font-bold text-white">{initialsOf(c.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-text-primary truncate">{c.name}</p>
                        {(c.email || c.phone) && (
                          <p className="text-[11px] text-text-tertiary truncate">
                            {c.email ?? c.phone}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
