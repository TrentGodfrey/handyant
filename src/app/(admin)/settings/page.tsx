"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
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
  Coffee,
  Search,
  Plus,
  Crosshair,
  DollarSign,
  Smartphone,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import type { ServiceCity } from "@/components/ServiceAreaMap";
import { toast } from "@/components/Toaster";

// Lazy-loaded Leaflet map (no SSR — Leaflet needs `window`)
const ServiceAreaMap = dynamic(() => import("@/components/ServiceAreaMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center bg-[#E8EDF2] rounded-xl">
      <Spinner size="md" />
    </div>
  ),
});

// ── DFW City Zones (real lat/lng) ──
const DFW_CITIES = [
  { id: "denton",       name: "Denton",      lat: 33.2148, lng: -97.1331 },
  { id: "justin",       name: "Justin",      lat: 33.0848, lng: -97.2961 },
  { id: "keller",       name: "Keller",      lat: 32.9346, lng: -97.2289 },
  { id: "southlake",    name: "Southlake",   lat: 32.9412, lng: -97.1342 },
  { id: "fort-worth",   name: "Fort Worth",  lat: 32.7555, lng: -97.3308 },
  { id: "grapevine",    name: "Grapevine",   lat: 32.9343, lng: -97.0780 },
  { id: "arlington",    name: "Arlington",   lat: 32.7357, lng: -97.1081 },
  { id: "irving",       name: "Irving",      lat: 32.8140, lng: -96.9489 },
  { id: "frisco",       name: "Frisco",      lat: 33.1507, lng: -96.8236 },
  { id: "mckinney",     name: "McKinney",    lat: 33.1972, lng: -96.6398 },
  { id: "allen",        name: "Allen",       lat: 33.1031, lng: -96.6705 },
  { id: "plano",        name: "Plano",       lat: 33.0198, lng: -96.6989 },
  { id: "richardson",   name: "Richardson",  lat: 32.9483, lng: -96.7299 },
  { id: "garland",      name: "Garland",     lat: 32.9126, lng: -96.6389 },
  { id: "dallas",       name: "Dallas",      lat: 32.7767, lng: -96.7970 },
  { id: "mesquite",     name: "Mesquite",    lat: 32.7668, lng: -96.5992 },
  { id: "waxahachie",   name: "Waxahachie",  lat: 32.3865, lng: -96.8485 },
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

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00",
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "20:00",
];

type EditableField = "name" | "owner" | "phone" | "email" | null;

type DayHours = { start: string; end: string; enabled: boolean };
type LunchBreak = { enabled: boolean; start: string; end: string };
type WorkingHours = Record<string, DayHours> & { lunch?: LunchBreak };
type NotifyPrefs = {
  jobReminders?: boolean;
  leadAlerts?: boolean;
  sms?: boolean;
  email?: boolean;
  // back-compat with default schema
  newBookings?: boolean;
};

const cityNameToId = new Map(DFW_CITIES.map((c) => [c.name.toLowerCase(), c.id]));

const DEFAULT_LUNCH: LunchBreak = { enabled: true, start: "12:00", end: "13:00" };

const DEFAULT_HOURS: WorkingHours = {
  mon: { start: "08:00", end: "17:00", enabled: true },
  tue: { start: "08:00", end: "17:00", enabled: true },
  wed: { start: "08:00", end: "17:00", enabled: true },
  thu: { start: "08:00", end: "17:00", enabled: true },
  fri: { start: "08:00", end: "17:00", enabled: true },
  sat: { start: "09:00", end: "13:00", enabled: false },
  sun: { start: "09:00", end: "13:00", enabled: false },
  lunch: DEFAULT_LUNCH,
};

function format12h(h24: string): string {
  const [hStr, m] = h24.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return h24;
  const period = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${m} ${period}`;
}

export default function SettingsPage() {
  const { isDemo, mounted } = useDemoMode();

  // Business info
  const [bizName, setBizName]   = useState("MCQ Home Co.");
  const [owner, setOwner]       = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [editing, setEditing]   = useState<EditableField>(null);
  const [draft, setDraft]       = useState("");
  const [savedField, setSavedField] = useState<EditableField>(null);
  const [loading, setLoading]   = useState(true);

  // Service area
  const [activeCities, setActiveCities] = useState<Set<string>>(new Set());
  const [customCities, setCustomCities] = useState<ServiceCity[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropPinMode, setDropPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingPinName, setPendingPinName] = useState("");
  const lastSearchAt = useRef(0);

  // Availability — backed by BusinessProfile.workingHours
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_HOURS);

  // Notifications — backed by BusinessProfile.notifyPrefs
  const [notifyPrefs, setNotifyPrefs] = useState<NotifyPrefs>({
    jobReminders: true,
    leadAlerts: true,
    sms: true,
    email: true,
  });

  // Payment methods — backed by BusinessProfile
  const [venmoHandle, setVenmoHandle] = useState("");
  const [zelleHandle, setZelleHandle] = useState("");
  const [cashappHandle, setCashappHandle] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const venmoSavedRef = useRef("");
  const zelleSavedRef = useRef("");
  const cashappSavedRef = useRef("");
  const paypalSavedRef = useRef("");
  const [savedPayment, setSavedPayment] = useState<"venmo" | "zelle" | "cashapp" | "paypal" | null>(null);

  // Delete-account flow
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDeleteAccount() {
    if (deleteConfirmText.trim() !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed (${res.status})`);
      }
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete account");
      setDeleting(false);
    }
  }

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
      fetch("/api/admin/business").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([me, areas, business]) => {
        if (me) {
          setOwner(me.name ?? "");
          setEmail(me.email ?? "");
        }
        if (Array.isArray(areas)) {
          const ids = new Set<string>();
          const customs: ServiceCity[] = [];
          for (const a of areas) {
            if (!a.active) continue;
            const cityName = String(a.city ?? "");
            const id = cityNameToId.get(cityName.toLowerCase());
            if (id) {
              ids.add(id);
            } else if (typeof a.lat === "number" && typeof a.lng === "number") {
              const customId = `custom-${cityName.toLowerCase().replace(/\s+/g, "-")}`;
              customs.push({
                id: customId,
                name: cityName,
                lat: a.lat,
                lng: a.lng,
                custom: true,
              });
              ids.add(customId);
            }
          }
          setActiveCities(ids);
          setCustomCities(customs);
        }
        if (business) {
          if (business.businessName) setBizName(business.businessName);
          if (business.phone) setPhone(business.phone);
          else if (me?.phone) setPhone(me.phone);
          if (business.workingHours && typeof business.workingHours === "object") {
            setWorkingHours({ ...DEFAULT_HOURS, ...(business.workingHours as WorkingHours) });
          }
          if (business.notifyPrefs && typeof business.notifyPrefs === "object") {
            setNotifyPrefs((prev) => ({ ...prev, ...(business.notifyPrefs as NotifyPrefs) }));
          }
          const v = business.venmoHandle ?? "";
          const z = business.zelleHandle ?? "";
          const c = business.cashappHandle ?? "";
          const p = business.paypalEmail ?? "";
          setVenmoHandle(v); venmoSavedRef.current = v;
          setZelleHandle(z); zelleSavedRef.current = z;
          setCashappHandle(c); cashappSavedRef.current = c;
          setPaypalEmail(p); paypalSavedRef.current = p;
        } else if (me?.phone) {
          setPhone(me.phone);
        }
      })
      .catch(() => {
        /* leave defaults */
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

    if (field === "name")  setBizName(value);
    if (field === "owner") setOwner(value);
    if (field === "phone") setPhone(value);
    if (field === "email") setEmail(value);
    setEditing(null);

    if (!isDemo) {
      try {
        if (field === "name") {
          await fetch("/api/admin/business", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessName: value }),
          });
        } else if (field === "phone") {
          // Persist to both User.phone and BusinessProfile.phone
          await Promise.all([
            fetch("/api/me", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: value }),
            }),
            fetch("/api/admin/business", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: value }),
            }),
          ]);
        } else {
          const patchKey = field === "owner" ? "name" : field;
          await fetch("/api/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [patchKey]: value }),
          });
        }
      } catch {
        /* swallow — UI keeps optimistic value */
      }
    }

    setSavedField(field);
    setTimeout(() => setSavedField(null), 1800);
  }

  function findCityById(id: string): ServiceCity | undefined {
    const fixed = DFW_CITIES.find((c) => c.id === id);
    if (fixed) return fixed;
    return customCities.find((c) => c.id === id);
  }

  async function toggleCity(id: string) {
    const city = findCityById(id);
    if (!city) return;
    const wasActive = activeCities.has(id);

    setActiveCities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (isDemo) return;
    try {
      if (wasActive) {
        await fetch(`/api/admin/service-areas?city=${encodeURIComponent(city.name)}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/admin/service-areas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: city.name, lat: city.lat, lng: city.lng }),
        });
      }
    } catch {
      /* keep optimistic state */
    }
  }

  async function removeCity(id: string) {
    const city = findCityById(id);
    if (!city) return;
    setActiveCities((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // If it's a custom city, drop it from the custom list too
    if (city.custom) {
      setCustomCities((prev) => prev.filter((c) => c.id !== id));
    }
    if (isDemo) return;
    try {
      await fetch(`/api/admin/service-areas?city=${encodeURIComponent(city.name)}`, {
        method: "DELETE",
      });
    } catch {
      /* keep optimistic state */
    }
  }

  async function addCustomCity(name: string, lat: number, lng: number) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const customId = `custom-${trimmed.toLowerCase().replace(/\s+/g, "-")}`;

    // Avoid duplicates with existing predefined cities
    const existingFixed = DFW_CITIES.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existingFixed) {
      setActiveCities((prev) => new Set(prev).add(existingFixed.id));
      if (!isDemo) {
        try {
          await fetch("/api/admin/service-areas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: existingFixed.name,
              lat: existingFixed.lat,
              lng: existingFixed.lng,
            }),
          });
        } catch {
          /* swallow */
        }
      }
      return;
    }

    setCustomCities((prev) => {
      if (prev.some((c) => c.id === customId)) return prev;
      return [...prev, { id: customId, name: trimmed, lat, lng, custom: true }];
    });
    setActiveCities((prev) => new Set(prev).add(customId));

    if (isDemo) return;
    try {
      await fetch("/api/admin/service-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: trimmed, lat, lng }),
      });
    } catch {
      /* swallow — keep optimistic state */
    }
  }

  async function handleSearchCity(e?: React.FormEvent) {
    e?.preventDefault();
    const query = citySearch.trim();
    if (!query) return;

    // Simple rate-limit guard: at most one Nominatim hit per 1.2s
    const now = Date.now();
    if (now - lastSearchAt.current < 1200) {
      setSearchError("Please wait a moment before searching again.");
      return;
    }
    lastSearchAt.current = now;

    setSearching(true);
    setSearchError(null);

    if (isDemo) {
      // In demo mode, just fake a TX-area pin near Dallas
      await addCustomCity(query, 32.85 + (Math.random() - 0.5) * 0.4, -96.95 + (Math.random() - 0.5) * 0.4);
      setCitySearch("");
      setSearching(false);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${query} TX`)}&format=json&limit=1`,
        {
          headers: {
            // Nominatim policy requires identifying User-Agent; browsers
            // forbid setting it directly so use a Referer-style header.
            "Accept-Language": "en",
          },
        },
      );
      if (!res.ok) {
        setSearchError("Search failed. Try again.");
        return;
      }
      const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
      if (!data.length) {
        setSearchError(`Couldn't find "${query}". Try a more specific name.`);
        return;
      }
      const hit = data[0];
      const lat = parseFloat(hit.lat);
      const lng = parseFloat(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSearchError("Invalid result from geocoder.");
        return;
      }
      // Use the user's friendly query as the city name (capitalized)
      const cityName = query.replace(/\b\w/g, (c) => c.toUpperCase());
      await addCustomCity(cityName, lat, lng);
      setCitySearch("");
    } catch {
      setSearchError("Network error. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleMapClick(lat: number, lng: number) {
    setPendingPin({ lat, lng });
    setPendingPinName("");
    setDropPinMode(false);
  }

  async function confirmPendingPin() {
    if (!pendingPin) return;
    const name = pendingPinName.trim();
    if (!name) return;
    await addCustomCity(name, pendingPin.lat, pendingPin.lng);
    setPendingPin(null);
    setPendingPinName("");
  }

  function cancelPendingPin() {
    setPendingPin(null);
    setPendingPinName("");
  }

  async function persistWorkingHours(next: WorkingHours) {
    if (isDemo) return;
    try {
      const res = await fetch("/api/admin/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      toast.error("Couldn't save working hours: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function toggleDay(key: string) {
    setWorkingHours((prev) => {
      const day = prev[key] ?? DEFAULT_HOURS[key] ?? { start: "08:00", end: "17:00", enabled: true };
      const next: WorkingHours = { ...prev, [key]: { ...day, enabled: !day.enabled } };
      void persistWorkingHours(next);
      return next;
    });
  }

  function updateAllStartTimes(time: string) {
    setWorkingHours((prev) => {
      const next: WorkingHours = { ...prev };
      for (const { key } of WEEK_DAYS) {
        const day = next[key] ?? DEFAULT_HOURS[key];
        next[key] = { ...day, start: time };
      }
      void persistWorkingHours(next);
      return next;
    });
  }

  function updateAllEndTimes(time: string) {
    setWorkingHours((prev) => {
      const next: WorkingHours = { ...prev };
      for (const { key } of WEEK_DAYS) {
        const day = next[key] ?? DEFAULT_HOURS[key];
        next[key] = { ...day, end: time };
      }
      void persistWorkingHours(next);
      return next;
    });
  }

  function toggleLunch() {
    setWorkingHours((prev) => {
      const cur = prev.lunch ?? DEFAULT_LUNCH;
      const next: WorkingHours = { ...prev, lunch: { ...cur, enabled: !cur.enabled } };
      void persistWorkingHours(next);
      return next;
    });
  }

  function updateLunchTime(which: "start" | "end", time: string) {
    setWorkingHours((prev) => {
      const cur = prev.lunch ?? DEFAULT_LUNCH;
      const next: WorkingHours = { ...prev, lunch: { ...cur, [which]: time } };
      void persistWorkingHours(next);
      return next;
    });
  }

  async function persistNotifyPrefs(next: NotifyPrefs) {
    if (isDemo) return;
    try {
      const res = await fetch("/api/admin/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyPrefs: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      toast.error("Couldn't save preferences: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function toggleNotifPref(key: keyof NotifyPrefs) {
    setNotifyPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      void persistNotifyPrefs(next);
      return next;
    });
  }

  async function savePaymentField(
    key: "venmo" | "zelle" | "cashapp" | "paypal",
    raw: string,
  ) {
    const trimmed = raw.trim();
    const refMap = {
      venmo: venmoSavedRef,
      zelle: zelleSavedRef,
      cashapp: cashappSavedRef,
      paypal: paypalSavedRef,
    } as const;
    const apiKey =
      key === "venmo" ? "venmoHandle"
      : key === "zelle" ? "zelleHandle"
      : key === "cashapp" ? "cashappHandle"
      : "paypalEmail";

    if (refMap[key].current === trimmed) return; // no-op
    if (isDemo) {
      refMap[key].current = trimmed;
      setSavedPayment(key);
      setTimeout(() => setSavedPayment(null), 1800);
      return;
    }
    try {
      const res = await fetch("/api/admin/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiKey]: trimmed || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      refMap[key].current = trimmed;
      setSavedPayment(key);
      setTimeout(() => setSavedPayment(null), 1800);
    } catch (e) {
      toast.error("Couldn't save payment handle: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  const labelCls = "block text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5";
  const allMapCities: ServiceCity[] = [...DFW_CITIES, ...customCities];
  const activeCityList = allMapCities.filter((c) => activeCities.has(c.id));

  // Working day set / shared start/end derived from workingHours
  const activeDayKeys = WEEK_DAYS.filter(({ key }) => workingHours[key]?.enabled).map((d) => d.key);
  // Pick start/end from first enabled day (or default mon)
  const sharedStart =
    workingHours[activeDayKeys[0] ?? "mon"]?.start ?? DEFAULT_HOURS.mon.start;
  const sharedEnd =
    workingHours[activeDayKeys[0] ?? "mon"]?.end ?? DEFAULT_HOURS.mon.end;
  const lunch = workingHours.lunch ?? DEFAULT_LUNCH;

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-8 w-8" />
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
              {dropPinMode && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                  <Crosshair size={10} /> Click map to drop pin
                </span>
              )}
            </p>

            {/* Interactive Leaflet map */}
            <div className={`rounded-xl overflow-hidden border ${dropPinMode ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
              <ServiceAreaMap
                cities={allMapCities}
                activeIds={activeCities}
                onToggle={toggleCity}
                dropPinMode={dropPinMode}
                onMapClick={handleMapClick}
              />
            </div>

            {/* Active city chips */}
            {activeCityList.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeCityList.map((city) => (
                  <span
                    key={city.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
                      city.custom
                        ? "bg-purple-50 border-purple-300 text-purple-700"
                        : "bg-primary-50 border-primary/20 text-primary"
                    }`}
                  >
                    {city.name}
                    {city.custom && <span className="text-[9px] opacity-70">(custom)</span>}
                    <button
                      onClick={() => removeCity(city.id)}
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors ${
                        city.custom
                          ? "bg-purple-300/40 hover:bg-purple-300/70"
                          : "bg-primary/20 hover:bg-primary/40"
                      }`}
                    >
                      <X size={9} className={city.custom ? "text-purple-700" : "text-primary"} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom city by name */}
            <form onSubmit={handleSearchCity} className="mt-3 flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => { setCitySearch(e.target.value); setSearchError(null); }}
                  placeholder="Add a city (e.g. Lewisville)"
                  className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-primary"
                  disabled={searching}
                />
              </div>
              <button
                type="submit"
                disabled={searching || !citySearch.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searching ? (
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Add
              </button>
            </form>
            {searchError && (
              <p className="mt-1.5 text-[12px] text-error">{searchError}</p>
            )}

            {/* Drop-pin button (replaces Draw Custom Zone) */}
            <button
              type="button"
              onClick={() => {
                setDropPinMode((v) => !v);
                setSearchError(null);
              }}
              className={`mt-2 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-[13px] font-semibold transition-colors ${
                dropPinMode
                  ? "border-primary bg-primary-50 text-primary"
                  : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-primary"
              }`}
            >
              <Crosshair size={14} />
              {dropPinMode ? "Click on map to drop pin (or tap to cancel)" : "Drop a Custom Pin"}
            </button>
          </Card>

          {/* Pending pin naming dialog */}
          {pendingPin && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 animate-fade-in"
              onClick={cancelPendingPin}
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                    <MapPin size={15} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-text-primary leading-none">Name this area</p>
                    <p className="text-[11px] text-text-tertiary mt-1">
                      {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                <input
                  autoFocus
                  type="text"
                  value={pendingPinName}
                  onChange={(e) => setPendingPinName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmPendingPin();
                    if (e.key === "Escape") cancelPendingPin();
                  }}
                  placeholder="e.g. North Dallas"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] text-text-primary focus:outline-none focus:border-primary"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={cancelPendingPin}
                    className="flex-1 rounded-xl bg-surface-secondary px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:bg-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPendingPin}
                    disabled={!pendingPinName.trim()}
                    className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Pin
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── SECTION: Payment Methods ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={15} className="text-text-tertiary" />
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Payment Methods</h2>
          </div>
          <Card padding="md" className="space-y-4">
            <p className="text-[12px] text-text-secondary -mt-1">
              These appear on invoices so customers know how to pay you. Leave blank to hide.
            </p>

            {/* Venmo */}
            <div>
              <label className={labelCls}>Venmo</label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F4FC] text-[#3D95CE]">
                  <Smartphone size={16} />
                </div>
                <div className="flex-1 relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-tertiary">@</span>
                  <input
                    type="text"
                    value={venmoHandle.replace(/^@/, "")}
                    onChange={(e) => setVenmoHandle(e.target.value.replace(/^@/, ""))}
                    onBlur={(e) => savePaymentField("venmo", e.target.value.replace(/^@/, ""))}
                    placeholder="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-border bg-surface pl-7 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                  />
                  {savedPayment === "venmo" && (
                    <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                  )}
                </div>
              </div>
            </div>

            {/* Zelle */}
            <div>
              <label className={labelCls}>Zelle</label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3EAFD] text-[#6D1ED4]">
                  <DollarSign size={16} />
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={zelleHandle}
                    onChange={(e) => setZelleHandle(e.target.value)}
                    onBlur={(e) => savePaymentField("zelle", e.target.value)}
                    placeholder="email or phone"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-border bg-surface px-3 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                  />
                  {savedPayment === "zelle" && (
                    <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                  )}
                </div>
              </div>
            </div>

            {/* Cash App */}
            <div>
              <label className={labelCls}>Cash App</label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-light text-success">
                  <DollarSign size={16} />
                </div>
                <div className="flex-1 relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-tertiary">$</span>
                  <input
                    type="text"
                    value={cashappHandle.replace(/^\$/, "")}
                    onChange={(e) => setCashappHandle(e.target.value.replace(/^\$/, ""))}
                    onBlur={(e) => savePaymentField("cashapp", e.target.value.replace(/^\$/, ""))}
                    placeholder="cashtag"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-border bg-surface pl-7 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                  />
                  {savedPayment === "cashapp" && (
                    <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                  )}
                </div>
              </div>
            </div>

            {/* PayPal */}
            <div>
              <label className={labelCls}>PayPal</label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F4FC] text-[#0070BA]">
                  <Mail size={16} />
                </div>
                <div className="flex-1 relative">
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    onBlur={(e) => savePaymentField("paypal", e.target.value)}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-border bg-surface px-3 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                  />
                  {savedPayment === "paypal" && (
                    <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ── SECTION: Availability ── */}
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
                  const day = workingHours[key];
                  const on = day?.enabled ?? false;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDay(key)}
                      aria-pressed={on}
                      title={on ? `${label}: ${format12h(day?.start ?? "08:00")} – ${format12h(day?.end ?? "17:00")}` : `${label}: off`}
                      className={`group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-3 text-center transition-all duration-200 border ${
                        on
                          ? "border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-[0_4px_12px_rgba(79,149,152,0.32)] scale-[1.04]"
                          : "border-border bg-surface text-text-tertiary opacity-70 hover:opacity-100 hover:border-primary/40 hover:bg-primary-50 hover:text-primary"
                      }`}
                    >
                      {on && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success ring-2 ring-surface">
                          <Check size={8} className="text-white" strokeWidth={3.5} />
                        </span>
                      )}
                      <span className="text-[11px] font-bold leading-none uppercase tracking-wide">
                        {label}
                      </span>
                      <span className={`text-[9px] font-medium leading-none mt-1 ${on ? "text-white/85" : "text-text-tertiary/70"}`}>
                        {on ? format12h(day?.start ?? "08:00").replace(":00 ", " ") : "Off"}
                      </span>
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
                    value={sharedStart}
                    onChange={(e) => updateAllStartTimes(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary focus:outline-none focus:border-primary"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{format12h(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] text-text-tertiary mb-1">End</p>
                  <select
                    value={sharedEnd}
                    onChange={(e) => updateAllEndTimes(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary focus:outline-none focus:border-primary"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{format12h(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-text-tertiary">
                Customers can only book within these hours
              </p>
            </div>

            {/* Lunch Break */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-light">
                    <Coffee size={13} className="text-warning" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary leading-none">Lunch Break</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">Block time for a midday break</p>
                  </div>
                </div>
                <button
                  onClick={toggleLunch}
                  className="shrink-0 transition-colors"
                  aria-label="Toggle lunch break"
                >
                  {lunch.enabled ? (
                    <ToggleRight size={32} className="text-primary" />
                  ) : (
                    <ToggleLeft size={32} className="text-text-tertiary" />
                  )}
                </button>
              </div>

              {lunch.enabled && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <p className="text-[11px] text-text-tertiary mb-1">Start</p>
                    <select
                      value={lunch.start}
                      onChange={(e) => updateLunchTime("start", e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary focus:outline-none focus:border-primary"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{format12h(t)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[11px] text-text-tertiary mb-1">End</p>
                    <select
                      value={lunch.end}
                      onChange={(e) => updateLunchTime("end", e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary focus:outline-none focus:border-primary"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{format12h(t)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* ── SECTION: Notifications ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-text-tertiary" />
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Notifications</h2>
          </div>
          <Card padding="md" className="divide-y divide-border space-y-0">
            {[
              {
                key: "sms" as const,
                label: "SMS Reminders",
                sub: "Get a text 1 hour before each job",
              },
              {
                key: "email" as const,
                label: "Email Summaries",
                sub: "Daily recap of jobs and revenue",
              },
              {
                key: "leadAlerts" as const,
                label: "New Booking Alerts",
                sub: "Instant notification when a client books",
              },
              {
                key: "jobReminders" as const,
                label: "Job Reminders",
                sub: "Pre-shift reminders and prep alerts",
              },
            ].map(({ key, label, sub }) => {
              const value = !!notifyPrefs[key];
              return (
                <div key={key} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary">{label}</p>
                    <p className="text-[12px] text-text-tertiary mt-0.5">{sub}</p>
                  </div>
                  <button onClick={() => toggleNotifPref(key)} className="shrink-0 transition-colors">
                    {value ? (
                      <ToggleRight size={32} className="text-primary" />
                    ) : (
                      <ToggleLeft size={32} className="text-text-tertiary" />
                    )}
                  </button>
                </div>
              );
            })}
          </Card>
        </section>

        {/* ── SECTION: Subscription / Billing — demo only ── */}
        {isDemo && (
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
        )}

        {/* ── Danger zone ── */}
        <section>
          <Card padding="md" variant="outlined" className="border-error/20">
            <p className="text-[13px] font-semibold text-error mb-0.5">Danger Zone</p>
            <p className="text-[12px] text-text-tertiary mb-3">
              These actions are permanent and cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteConfirmText("");
                setDeleteError(null);
              }}
            >
              Delete Account
            </Button>
          </Card>
        </section>
      </div>

      {/* Delete-account confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <button
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => !deleting && setDeleteOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <h2 className="text-[18px] font-bold text-text-primary">Delete Account</h2>
            <p className="mt-2 text-[13px] text-text-secondary">
              This permanently removes your account and signs you out. To confirm, type
              <span className="font-bold text-error"> DELETE </span>
              below.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoFocus
              placeholder="Type DELETE to confirm"
              className="mt-4 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-error focus:outline-none"
            />
            {deleteError && (
              <p className="mt-2 text-[12px] text-error">{deleteError}</p>
            )}
            <div className="mt-5 flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDeleteAccount}
                disabled={deleting || deleteConfirmText.trim() !== "DELETE"}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
