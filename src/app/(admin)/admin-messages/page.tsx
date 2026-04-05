"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Camera, Paperclip, ArrowLeft, MoreVertical, Search } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "tech" | "customer";
  timestamp: string;
  type: "text" | "photo" | "system";
}

interface Conversation {
  id: string;
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

const conversations: Conversation[] = [
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

export default function AdminMessagesPage() {
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messagesByConvo, setMessagesByConvo] = useState<Record<string, Message[]>>(
    Object.fromEntries(conversations.map((c) => [c.id, c.messages]))
  );
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvo, messagesByConvo]);

  function sendMessage() {
    if (!input.trim() || !activeConvo) return;
    const msg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: "tech",
      timestamp: "Just now",
      type: "text",
    };
    setMessagesByConvo((prev) => ({
      ...prev,
      [activeConvo.id]: [...(prev[activeConvo.id] || []), msg],
    }));
    setInput("");

    setTimeout(() => {
      setMessagesByConvo((prev) => ({
        ...prev,
        [activeConvo.id]: [...(prev[activeConvo.id] || []), {
          id: (Date.now() + 1).toString(),
          text: "Got it, thanks for the update! 👍",
          sender: "customer",
          timestamp: "Just now",
          type: "text",
        }],
      }));
    }, 1500);
  }

  const filtered = conversations.filter((c) =>
    !search.trim() || c.client.toLowerCase().includes(search.toLowerCase())
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
          <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors">
            <MoreVertical size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Pinned Context */}
        <div className="bg-primary-50 border-b border-primary-100 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold text-primary">Next: {activeConvo.nextVisit}</span>
          </div>
          <span className="text-[11px] text-text-tertiary">{activeConvo.address}</span>
        </div>

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
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-border px-4 py-3 pb-[env(safe-area-inset-bottom)] shrink-0">
          <div className="flex items-end gap-2">
            <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors">
              <Paperclip size={20} className="text-text-tertiary" />
            </button>
            <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors">
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
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-white border-b border-border px-5 pt-14 pb-4">
        <h1 className="text-[26px] font-bold text-text-primary">Messages</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">{conversations.filter((c) => c.unread > 0).length} unread</p>
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
        {filtered.map((convo) => (
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
              <p className="text-[10px] text-text-tertiary mt-0.5">{convo.nextVisit}</p>
            </div>
            {convo.unread > 0 && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                <span className="text-[10px] font-bold text-white">{convo.unread}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
