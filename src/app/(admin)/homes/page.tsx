"use client";

import { useState, useMemo, useEffect } from "react";
import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import { Search, MapPin, Calendar, Wrench, Plus, Home, UserPlus, Building2, AlertTriangle, RotateCw } from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { demoCustomerBy } from "@/lib/demoData";

interface ApiHome {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
    subscriptions: Array<{ id: string; plan: string; status: string | null }>;
  };
  bookings: Array<{ id: string; status: string; scheduledDate: string }>;
  photos: unknown[];
  lastVisit: string | null;
  openTasks: number;
  totalVisits: number;
  subscriptionType: string | null;
}

interface HomeRow {
  id: string;
  name: string;
  address: string;
  type: "Subscription" | "One-Time";
  lastVisit: string;
  openTasks: number;
  totalVisits: number;
  initials: string;
}

const DEMO_HOMES: HomeRow[] = [
  {
    id: "1",
    name: demoCustomerBy("1")!.name,
    address: "4821 Oak Hollow Dr, Plano",
    type: "Subscription",
    lastVisit: "Mar 15",
    openTasks: 4,
    totalVisits: 12,
    initials: demoCustomerBy("1")!.initials,
  },
  {
    id: "2",
    name: demoCustomerBy("2")!.name,
    address: "1205 Elm Creek Ct, Frisco",
    type: "Subscription",
    lastVisit: "Mar 20",
    openTasks: 2,
    totalVisits: 8,
    initials: demoCustomerBy("2")!.initials,
  },
  {
    id: "3",
    name: demoCustomerBy("3")!.name,
    address: "890 Sunset Ridge, Roanoke",
    type: "One-Time",
    lastVisit: "Mar 10",
    openTasks: 2,
    totalVisits: 3,
    initials: demoCustomerBy("3")!.initials,
  },
  {
    id: "4",
    name: demoCustomerBy("4")!.name,
    address: "2200 Heritage Trail, McKinney",
    type: "One-Time",
    lastVisit: "Feb 22",
    openTasks: 1,
    totalVisits: 1,
    initials: demoCustomerBy("4")!.initials,
  },
  {
    id: "5",
    name: demoCustomerBy("5")!.name,
    address: "1100 Prairie Creek, Waxahachie",
    type: "Subscription",
    lastVisit: "Mar 25",
    openTasks: 6,
    totalVisits: 15,
    initials: demoCustomerBy("5")!.initials,
  },
  {
    id: "6",
    name: "Derek Nguyen",
    address: "350 Creekside Blvd, Allen",
    type: "Subscription",
    lastVisit: "Mar 28",
    openTasks: 3,
    totalVisits: 9,
    initials: "DN",
  },
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function apiHomeToRow(h: ApiHome): HomeRow {
  const cityPart = h.city ? `, ${h.city}` : "";
  return {
    id: h.id,
    name: h.customer.name,
    address: `${h.address}${cityPart}`,
    type: h.subscriptionType ? "Subscription" : "One-Time",
    lastVisit: formatDateShort(h.lastVisit),
    openTasks: h.openTasks,
    totalVisits: h.totalVisits,
    initials: initialsFor(h.customer.name),
  };
}

export default function HomesPage() {
  const [search, setSearch] = useState("");
  const [homes, setHomes] = useState<HomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const { isDemo, mounted } = useDemoMode();

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setHomes(DEMO_HOMES);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const url = search.trim() ? `/api/admin/homes?q=${encodeURIComponent(search.trim())}` : "/api/admin/homes";
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load homes (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setHomes(data.map(apiHomeToRow));
        } else {
          setHomes([]);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "Failed to load homes");
        setHomes([]);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [isDemo, search, mounted, reloadKey]);

  const filtered = useMemo(() => {
    // For demo mode, do client-side filtering. For API mode, results already filtered server-side.
    if (!isDemo) return homes;
    if (!search.trim()) return homes;
    const q = search.toLowerCase();
    return homes.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q)
    );
  }, [search, homes, isDemo]);

  const hasAnyClients = homes.length > 0 || (search.trim() !== "" && !isDemo);
  const noSearchResults = search.trim() !== "" && filtered.length === 0 && !loading;
  const showClientList = filtered.length > 0;
  const subscriptionsCount = homes.filter((h) => h.type === "Subscription").length;

  return (
    <div className="px-5 pt-14 lg:pt-8 pb-24 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Client Base</p>
          <h1 className="mt-0.5 text-[26px] font-bold text-text-primary leading-tight">Homes</h1>
        </div>
        <Link href="/homes/new">
          <button className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(37,99,235,0.30)] active:bg-primary-dark transition-colors">
            <Plus size={15} />
            Add Home
          </button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Search size={16} className="shrink-0 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients or addresses..."
          className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
        {search.trim() && (
          <button
            onClick={() => setSearch("")}
            className="text-[11px] font-semibold text-text-tertiary active:text-text-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Load error banner */}
      {loadError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-error/30 bg-error-light p-3.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-error">Couldn&rsquo;t load homes</p>
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
      )}

      {/* Summary row — only show when there are results */}
      {showClientList && (
        <div className="mb-4 flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-text-primary">{filtered.length}</span>
          <span className="text-[12px] text-text-tertiary">{filtered.length === 1 ? "home" : "homes"}</span>
          {search.trim() && (
            <span className="text-[12px] text-text-tertiary">matching &ldquo;{search}&rdquo;</span>
          )}
          <span className="ml-auto text-[11px] text-text-tertiary">
            {subscriptionsCount} subscriptions
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && !showClientList && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" />
        </div>
      )}

      {/* ── Empty States ────────────────────────────────────────────────── */}

      {/* No clients at all */}
      {!loading && !hasAnyClients && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          {/* Icon composition */}
          <div className="relative mb-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
              <Home size={36} className="text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-[0_2px_8px_rgba(37,99,235,0.30)]">
              <Plus size={16} className="text-white" />
            </div>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">No clients yet</h3>
          <p className="mt-2 max-w-[220px] text-[13px] leading-relaxed text-text-secondary">
            Add your first client to start managing their home and visits.
          </p>
          <Link href="/homes/new" className="mt-5">
            <button className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14px] font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] active:bg-primary-dark transition-colors">
              <UserPlus size={16} />
              Add Your First Client
            </button>
          </Link>
        </div>
      )}

      {/* No search results */}
      {noSearchResults && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
              <Building2 size={36} className="text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary shadow-sm">
              <Search size={14} className="text-text-tertiary" />
            </div>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">No clients found</h3>
          <p className="mt-2 max-w-[240px] text-[13px] leading-relaxed text-text-secondary">
            No homes match &ldquo;<span className="font-semibold">{search}</span>&rdquo;. Try a different search or add a new client.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setSearch("")}
              className="rounded-xl border border-border bg-surface px-5 py-2.5 text-[13px] font-semibold text-text-primary active:bg-surface-secondary transition-colors"
            >
              Clear Search
            </button>
            <Link href="/homes/new">
              <button className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] active:bg-primary-dark transition-colors">
                <UserPlus size={14} />
                Add Client
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Client Cards ────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {showClientList &&
          filtered.map((home) => (
            <Link key={home.id} href={`/homes/${home.id}`}>
              <Card padding="md" className="flex items-center gap-3.5 transition-colors">
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50">
                  <span className="text-[13px] font-bold text-primary">{home.initials}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-semibold text-text-primary truncate">{home.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${
                        home.type === "Subscription"
                          ? "bg-primary text-white"
                          : "bg-surface-secondary text-text-tertiary"
                      }`}
                    >
                      {home.type === "Subscription" ? "Sub" : "One-Time"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <MapPin size={11} className="shrink-0 text-text-tertiary" />
                    <span className="text-[12px] text-text-secondary truncate">{home.address}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                      <Wrench size={10} />
                      <span className={home.openTasks > 0 ? "font-semibold text-accent-amber" : ""}>
                        {home.openTasks} open
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                      <Calendar size={10} />
                      {home.totalVisits} visit{home.totalVisits !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-text-tertiary">Last: {home.lastVisit}</span>
                  </div>
                </div>

                {/* Chevron */}
                <svg
                  className="shrink-0 text-text-tertiary"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
