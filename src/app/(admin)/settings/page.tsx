"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  ChevronLeft,
  Check,
  Pencil,
  X,
  Phone,
  Mail,
  User,
  Building2,
  MapPin,
  Clock,
  Bell,
  CreditCard,
  Info,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

// ── DFW City Zones (x, y within 420x310 SVG viewport) ──
// Geographically accurate layout — min 42px between any two city centers (r=20)
const DFW_CITIES = [
  { id: "denton",       name: "Denton",       x: 82,  y: 28  },
  { id: "justin",       name: "Justin",        x: 82,  y: 78  }, // Anthony's base
  { id: "keller",       name: "Keller",        x: 108, y: 128 },
  { id: "southlake",    name: "Southlake",     x: 158, y: 118 },
  { id: "fort-worth",   name: "Fort Worth",    x: 95,  y: 205 },
  { id: "grapevine",    name: "Grapevine",     x: 178, y: 162 },
  { id: "arlington",    name: "Arlington",     x: 168, y: 220 },
  { id: "irving",       name: "Irving",        x: 220, y: 192 },
  { id: "frisco",       name: "Frisco",        x: 248, y: 44  },
  { id: "mckinney",     name: "McKinney",      x: 335, y: 36  },
  { id: "allen",        name: "Allen",         x: 322, y: 86  },
  { id: "plano",        name: "Plano",         x: 262, y: 96  },
  { id: "richardson",   name: "Richardson",    x: 300, y: 140 },
  { id: "garland",      name: "Garland",       x: 350, y: 168 },
  { id: "dallas",       name: "Dallas",        x: 268, y: 188 },
  { id: "mesquite",     name: "Mesquite",      x: 362, y: 212 },
  { id: "waxahachie",   name: "Waxahachie",    x: 248, y: 282 },
];

const DEFAULT_ACTIVE = ["justin", "plano", "frisco", "allen", "mckinney", "richardson", "southlake", "keller"];

const WEEK_DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const START_TIMES = ["6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM"];
const END_TIMES   = ["4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "8:00 PM"];

type EditableField = "name" | "owner" | "phone" | "email" | null;

// Map DFW city display names to lookup ids — used to hydrate active set from server response.
const cityNameToId = new Map(DFW_CITIES.map((c) => [c.name.toLowerCase(), c.id]));

export default function SettingsPage() {
  const { isDemo, mounted } = useDemoMode();

  // Business info — bizName is UI-only (not on User model). TODO: add a Business model or extend User.
  const [bizName, setBizName]   = useState("HandyAnt");
  const [owner, setOwner]       = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [editing, setEditing]   = useState<EditableField>(null);
  const [draft, setDraft]       = useState("");
  const [savedField, setSavedField] = useState<EditableField>(null);
  const [loading, setLoading]   = useState(true);

  // Service area
  const [activeCities, setActiveCities] = useState<Set<string>>(new Set());
  const [showMapTooltip, setShowMapTooltip] = useState(false);

  // Availability — UI-only state (no backing schema yet). TODO.
  const [activeDays, setActiveDays] = useState<Set<string>>(
    new Set(["mon", "tue", "wed", "thu", "fri", "sat"])
  );
  const [startTime, setStartTime] = useState("8:00 AM");
  const [endTime, setEndTime]     = useState("6:00 PM");

  // Notifications — UI-only state. TODO: add prefs schema.
  const [notifSMS, setNotifSMS]         = useState(true);
  const [notifEmail, setNotifEmail]     = useState(true);
  const [notifNewBook, setNotifNewBook] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setOwner("Anthony Morales");
      setPhone("(214) 555-0199");
      setEmail("anthony@handyant.com");
      setActiveCities(new Set(DEFAULT_ACTIVE));
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/service-areas").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([me, areas]) => {
        if (me) {
          setOwner(me.name ?? "");
          setPhone(me.phone ?? "");
          setEmail(me.email ?? "");
        }
        if (Array.isArray(areas)) {
          const ids = new Set<string>();
          for (const a of areas) {
            if (!a.active) continue;
            const id = cityNameToId.get(String(a.city ?? "").toLowerCase());
            if (id) ids.add(id);
          }
          setActiveCities(ids);
        }
      })
      .catch(() => {
        /* leave defaults blank */
      })
      .finally(() => setLoading(false));
  }, [isDemo, mounted]);

  function startEdit(field: EditableField, current: string) {
    setEditing(field);
    setDraft(current);
  }

  async function saveEdit() {
    const field = editing;
    const value = draft;
    if (!field) return;

    // Optimistic update
    if (field === "name")  setBizName(value);
    if (field === "owner") setOwner(value);
    if (field === "phone") setPhone(value);
    if (field === "email") setEmail(value);
    setEditing(null);

    if (!isDemo && field !== "name") {
      // Map editor field to User column
      const patchKey = field === "owner" ? "name" : field; // phone/email pass through
      try {
        await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [patchKey]: value }),
        });
      } catch {
        /* swallow — UI keeps optimistic value */
      }
    }

    setSavedField(field);
    setTimeout(() => setSavedField(null), 1800);
  }

  async function toggleCity(id: string) {
    const cityName = DFW_CITIES.find((c) => c.id === id)?.name;
    const wasActive = activeCities.has(id);

    setActiveCities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (isDemo || !cityName) return;
    try {
      if (wasActive) {
        await fetch(`/api/admin/service-areas?city=${encodeURIComponent(cityName)}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/admin/service-areas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: cityName }),
        });
      }
    } catch {
      /* keep optimistic state */
    }
  }

  async function removeCity(id: string) {
    const cityName = DFW_CITIES.find((c) => c.id === id)?.name;
    setActiveCities((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (isDemo || !cityName) return;
    try {
      await fetch(`/api/admin/service-areas?city=${encodeURIComponent(cityName)}`, {
        method: "DELETE",
      });
    } catch {
      /* keep optimistic state */
    }
  }

  function toggleDay(key: string) {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const labelCls = "block text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5";
  const activeCityList = DFW_CITIES.filter((c) => activeCities.has(c.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <h1 className="text-[22px] font-bold text-text-primary">Settings</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">Manage your business preferences</p>
      </div>

      <div className="px-5 py-5 space-y-6">

        {/* ── SECTION: Business Info ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={15} className="text-text-tertiary" />
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Business Info</h2>
          </div>
          <Card padding="md" className="space-y-0 divide-y divide-border">
            {[
              { field: "name" as const,  label: "Business Name", value: bizName,  icon: Building2, placeholder: "Business name" },
              { field: "owner" as const, label: "Owner",          value: owner,   icon: User,      placeholder: "Your name" },
              { field: "phone" as const, label: "Phone",          value: phone,   icon: Phone,     placeholder: "(214) 555-0000" },
              { field: "email" as const, label: "Email",          value: email,   icon: Mail,      placeholder: "you@example.com" },
            ].map(({ field, label, value, icon: Icon, placeholder }) => (
              <div key={field} className="py-3.5 first:pt-0 last:pb-0">
                {editing === field ? (
                  <div className="animate-fade-in">
                    <label className={labelCls}>{label}</label>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 rounded-xl border border-primary bg-primary-50 px-3 py-2.5 text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={placeholder}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                      />
                      <button onClick={saveEdit} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shrink-0">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditing(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary text-text-secondary shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                      <Icon size={14} className="text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-text-tertiary">{label}</p>
                      <p className="text-[14px] font-semibold text-text-primary truncate">{value || "—"}</p>
                    </div>
                    <button
                      onClick={() => startEdit(field, value)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary hover:bg-border active:bg-border transition-colors shrink-0"
                    >
                      {savedField === field ? (
                        <Check size={13} className="text-success" />
                      ) : (
                        <Pencil size={13} className="text-text-secondary" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </section>

        {/* ── SECTION: Service Area ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} className="text-text-tertiary" />
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Service Area</h2>
          </div>

          <Card padding="md">
            <p className="text-[12px] text-text-secondary mb-3">
              Tap cities to toggle them on/off.{" "}
              <span className="font-semibold text-primary">{activeCities.size} active</span>
            </p>

            {/* SVG Map */}
            <div className="rounded-xl overflow-hidden border border-border bg-[#F0F4F8]">
              <svg
                viewBox="0 0 420 310"
                className="w-full"
                style={{ touchAction: "manipulation", maxHeight: "310px" }}
              >
                {/* DFW metro background */}
                <rect x="18" y="12" width="386" height="286" rx="14" fill="#E8EDF2" stroke="#C8D0DA" strokeWidth="1" />

                {/* I-35W / I-35E corridor — vertical through Justin/Fort Worth */}
                <line x1="88" y1="12" x2="88" y2="298" stroke="#C8D0DA" strokeWidth="1.5" strokeDasharray="5 4" />
                {/* I-35E corridor — through Plano/Richardson/Dallas */}
                <line x1="265" y1="12" x2="265" y2="298" stroke="#C8D0DA" strokeWidth="1.5" strokeDasharray="5 4" />
                {/* I-30 corridor — horizontal Fort Worth → Dallas → Mesquite */}
                <line x1="18" y1="195" x2="404" y2="195" stroke="#C8D0DA" strokeWidth="1.5" strokeDasharray="5 4" />
                {/* SH-121 / Sam Rayburn Tollway — diagonal NW to NE */}
                <line x1="108" y1="128" x2="340" y2="86" stroke="#C8D0DA" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />

                {/* "Home base" star for Justin */}
                <circle cx="82" cy="78" r="28" fill="#EEF2FF" stroke="#A5B4FC" strokeWidth="1.5" opacity="0.6" />

                {/* City nodes */}
                {DFW_CITIES.map((city) => {
                  const active = activeCities.has(city.id);
                  const r = 20;
                  const words = city.name.split(" ");
                  return (
                    <g key={city.id} onClick={() => toggleCity(city.id)} style={{ cursor: "pointer" }}>
                      {/* Invisible larger hit area for easier tapping */}
                      <circle cx={city.x} cy={city.y} r={r + 6} fill="transparent" />
                      <circle
                        cx={city.x}
                        cy={city.y}
                        r={r}
                        fill={active ? "#2563EB" : "#E5E7EB"}
                        stroke={active ? "#1D4ED8" : "#D1D5DB"}
                        strokeWidth={active ? "2" : "1"}
                        style={{ filter: active ? "drop-shadow(0 2px 4px rgba(37,99,235,0.4))" : "none", transition: "fill 0.15s" }}
                      />
                      {words.length === 1 ? (
                        <text x={city.x} y={city.y + 1} textAnchor="middle" dominantBaseline="middle"
                          fontSize="7.5" fontWeight="700" fill={active ? "white" : "#6B7280"}
                          style={{ userSelect: "none", pointerEvents: "none" }}>
                          {city.name}
                        </text>
                      ) : (
                        <>
                          <text x={city.x} y={city.y - 3} textAnchor="middle" dominantBaseline="middle"
                            fontSize="7" fontWeight="700" fill={active ? "white" : "#6B7280"}
                            style={{ userSelect: "none", pointerEvents: "none" }}>
                            {words[0]}
                          </text>
                          <text x={city.x} y={city.y + 6} textAnchor="middle" dominantBaseline="middle"
                            fontSize="7" fontWeight="700" fill={active ? "white" : "#6B7280"}
                            style={{ userSelect: "none", pointerEvents: "none" }}>
                            {words[1]}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Active city chips */}
            {activeCityList.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeCityList.map((city) => (
                  <span
                    key={city.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary/20 px-2.5 py-1 text-[12px] font-semibold text-primary"
                  >
                    {city.name}
                    <button
                      onClick={() => removeCity(city.id)}
                      className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/20 hover:bg-primary/40 transition-colors"
                    >
                      <X size={9} className="text-primary" strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Draw custom zone button */}
            <div className="mt-3 relative">
              <button
                onClick={() => setShowMapTooltip((v) => !v)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface py-2.5 text-[13px] font-semibold text-text-secondary hover:border-primary/30 hover:text-primary transition-colors"
              >
                <MapPin size={14} />
                Draw Custom Zone
              </button>
              {showMapTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl bg-text-primary px-3 py-2 text-center shadow-lg animate-fade-in">
                  <p className="text-[12px] font-medium text-white">
                    Custom polygon drawing coming soon
                  </p>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-text-primary" />
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* ── SECTION: Availability ── */}
        {/* TODO: persist working days/hours — no schema yet for tech availability. */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-text-tertiary" />
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Availability</h2>
          </div>
          <Card padding="md" className="space-y-4">
            {/* Days of week */}
            <div>
              <label className={labelCls}>Working Days</label>
              <div className="flex gap-1.5">
                {WEEK_DAYS.map(({ key, label }) => {
                  const on = activeDays.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDay(key)}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 text-center transition-all duration-150 border-2 ${
                        on
                          ? "border-primary bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.22)]"
                          : "border-border bg-surface text-text-tertiary"
                      }`}
                    >
                      <span className="text-[10px] font-bold leading-none">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Work hours */}
            <div>
              <label className={labelCls}>Work Hours</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-text-tertiary mb-1">Start</p>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary focus:outline-none focus:border-primary"
                  >
                    {START_TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] text-text-tertiary mb-1">End</p>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary focus:outline-none focus:border-primary"
                  >
                    {END_TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-text-tertiary">
                Customers can only book within these hours
              </p>
            </div>
          </Card>
        </section>

        {/* ── SECTION: Notifications ── */}
        {/* TODO: persist notification prefs — no schema yet. */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-text-tertiary" />
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Notifications</h2>
          </div>
          <Card padding="md" className="divide-y divide-border space-y-0">
            {[
              {
                key: "sms",
                label: "SMS Reminders",
                sub: "Get a text 1 hour before each job",
                value: notifSMS,
                set: setNotifSMS,
              },
              {
                key: "email",
                label: "Email Summaries",
                sub: "Daily recap of jobs and revenue",
                value: notifEmail,
                set: setNotifEmail,
              },
              {
                key: "book",
                label: "New Booking Alerts",
                sub: "Instant notification when a client books",
                value: notifNewBook,
                set: setNotifNewBook,
              },
            ].map(({ key, label, sub, value, set }) => (
              <div key={key} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text-primary">{label}</p>
                  <p className="text-[12px] text-text-tertiary mt-0.5">{sub}</p>
                </div>
                <button onClick={() => set((v) => !v)} className="shrink-0 transition-colors">
                  {value ? (
                    <ToggleRight size={32} className="text-primary" />
                  ) : (
                    <ToggleLeft size={32} className="text-text-tertiary" />
                  )}
                </button>
              </div>
            ))}
          </Card>
        </section>

        {/* ── SECTION: Subscription / Billing ── */}
        {/* TODO: read from /api/me subscriptions[0] once billing UI is wired. */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={15} className="text-text-tertiary" />
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Subscription</h2>
          </div>
          <Card padding="md">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-bold text-text-primary">Pro Plan</span>
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">$49 / month · Billed monthly</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 shrink-0">
                <CreditCard size={20} className="text-primary" />
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "Next billing date", value: "April 15, 2026" },
                { label: "Payment method", value: "Visa ···· 4242" },
                { label: "Plan includes", value: "Unlimited clients, invoicing, scheduling" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-[12px] text-text-tertiary shrink-0">{label}</span>
                  <span className="text-[12px] font-medium text-text-primary text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-border pt-4 flex gap-2">
              <Button variant="outline" size="sm" icon={<ChevronRight size={13} />}>
                Manage Plan
              </Button>
              <Button variant="ghost" size="sm" icon={<Info size={13} />}>
                View Invoices
              </Button>
            </div>
          </Card>
        </section>

        {/* ── Danger zone ── */}
        <section>
          <Card padding="md" variant="outlined" className="border-error/20">
            <p className="text-[13px] font-semibold text-error mb-0.5">Danger Zone</p>
            <p className="text-[12px] text-text-tertiary mb-3">
              These actions are permanent and cannot be undone.
            </p>
            <Button variant="danger" size="sm">
              Delete Account
            </Button>
          </Card>
        </section>
      </div>
    </div>
  );
}
