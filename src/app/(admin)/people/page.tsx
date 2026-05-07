"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Search, Users, UserPlus, Mail, Phone, Building2, ClipboardList,
  Copy, X, AlertTriangle, Trash2, ShieldCheck,
} from "lucide-react";

import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import { toast } from "@/components/Toaster";
import { useDemoMode } from "@/lib/useDemoMode";
import { DEMO_CUSTOMERS, DEMO_TECH } from "@/lib/demoData";
import { initialsOf } from "@/lib/initials";

// ── Types ────────────────────────────────────────────────────────────────────

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  primaryHomeId: string | null;
  _count: { homes: number; bookings: number };
};

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
};

// ── Demo data ────────────────────────────────────────────────────────────────

const DEMO_CUSTOMER_ROWS: CustomerRow[] = [
  ...DEMO_CUSTOMERS.map((c, i) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    avatarUrl: null,
    createdAt: new Date(2025, 9 - i, 12 - i).toISOString(),
    primaryHomeId: c.id,
    _count: { homes: 1, bookings: 12 - i * 2 },
  })),
  {
    id: "demo-c-6",
    name: "Derek Nguyen",
    email: "derek.nguyen@example.com",
    phone: "(214) 555-0186",
    avatarUrl: null,
    createdAt: new Date(2025, 7, 4).toISOString(),
    primaryHomeId: "demo-c-6",
    _count: { homes: 1, bookings: 9 },
  },
  {
    id: "demo-c-7",
    name: "Priya Patel",
    email: "priya@example.com",
    phone: "(469) 555-0231",
    avatarUrl: null,
    createdAt: new Date(2025, 5, 17).toISOString(),
    primaryHomeId: "demo-c-7",
    _count: { homes: 2, bookings: 6 },
  },
  {
    id: "demo-c-8",
    name: "Marcus Davis",
    email: "marcus.d@example.com",
    phone: "(972) 555-0190",
    avatarUrl: null,
    createdAt: new Date(2025, 3, 22).toISOString(),
    primaryHomeId: "demo-c-8",
    _count: { homes: 1, bookings: 3 },
  },
];

const DEMO_STAFF_ROWS: StaffRow[] = [
  {
    id: DEMO_TECH.id,
    name: DEMO_TECH.name,
    email: DEMO_TECH.email,
    phone: DEMO_TECH.phone,
    avatarUrl: null,
    createdAt: new Date(2024, 0, 10).toISOString(),
  },
  {
    id: "demo-tech-2",
    name: "Jamie Rivera",
    email: "jamie@mcqhomeco.com",
    phone: "(972) 555-0177",
    avatarUrl: null,
    createdAt: new Date(2024, 6, 1).toISOString(),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const { isDemo, mounted } = useDemoMode();

  const [tab, setTab] = useState<"customers" | "staff">("customers");
  const [search, setSearch] = useState("");

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);

  // Remove confirm state - track id so we can disable buttons during request
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;

    if (isDemo) {
      setCustomers(DEMO_CUSTOMER_ROWS);
      setStaff(DEMO_STAFF_ROWS);
      setLoading(false);
      setLoadError(null);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/admin/customers", { signal: ctrl.signal }).then((r) => {
        if (!r.ok) throw new Error(`Customers (${r.status})`);
        return r.json();
      }),
      fetch("/api/admin/staff", { signal: ctrl.signal }).then((r) => {
        if (!r.ok) throw new Error(`Staff (${r.status})`);
        return r.json();
      }),
    ])
      .then(([c, s]) => {
        setCustomers(Array.isArray(c) ? c : []);
        setStaff(Array.isArray(s) ? s : []);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "Failed to load people");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [isDemo, mounted]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q)
    );
  }, [staff, search]);

  // ── Staff actions ──────────────────────────────────────────────────────────

  async function handleInviteSuccess(newStaff: StaffRow) {
    setStaff((prev) => {
      const without = prev.filter((s) => s.id !== newStaff.id);
      return [newStaff, ...without];
    });
  }

  async function handleRemoveStaff(id: string, name: string) {
    if (id === currentUserId) {
      toast.error("You can't remove yourself.");
      return;
    }
    const ok = window.confirm(
      `Remove ${name} from staff? They'll keep their account but lose admin access.`
    );
    if (!ok) return;

    setRemovingId(id);

    if (isDemo) {
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setRemovingId(null);
      toast.success(`${name} removed from staff`);
      return;
    }

    try {
      const res = await fetch(`/api/admin/staff?userId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Remove failed (${res.status})`);
      }
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success(`${name} removed from staff`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove staff");
    } finally {
      setRemovingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-5 pt-14 lg:pt-8 pb-24 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Roster
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold text-text-primary leading-tight">
            People
          </h1>
        </div>
        {tab === "staff" && (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(79,149,152,0.30)] active:bg-primary-dark transition-colors"
          >
            <UserPlus size={15} />
            Invite Staff
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-full bg-surface-secondary p-1">
        <button
          onClick={() => setTab("customers")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
            tab === "customers"
              ? "bg-white text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <Users size={12} />
          Customers
          <span className="ml-1 text-[10px] opacity-70">{customers.length}</span>
        </button>
        <button
          onClick={() => setTab("staff")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
            tab === "staff"
              ? "bg-white text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <ShieldCheck size={12} />
          Staff
          <span className="ml-1 text-[10px] opacity-70">{staff.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Search size={16} className="shrink-0 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            tab === "customers"
              ? "Search by name, email, or phone..."
              : "Search staff..."
          }
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

      {/* Load error */}
      {loadError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-error/30 bg-error-light p-3.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-error">Couldn&rsquo;t load people</p>
            <p className="mt-0.5 text-[12px] text-error/80 break-words">{loadError}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" />
        </div>
      )}

      {/* ── Customers tab ─────────────────────────────────────────────────── */}
      {!loading && tab === "customers" && (
        <>
          {filteredCustomers.length === 0 ? (
            <EmptyState
              icon={<Users size={36} className="text-primary" />}
              title={search.trim() ? "No customers found" : "No customers yet"}
              body={
                search.trim()
                  ? `No customers match "${search}". Try a different search.`
                  : "Customers will appear here when they sign up or you add them."
              }
            />
          ) : (
            <div className="space-y-2.5">
              {filteredCustomers.map((c) => (
                <Link
                  key={c.id}
                  href={c.primaryHomeId ? `/homes/${c.primaryHomeId}` : `/people`}
                  className="block"
                >
                  <Card padding="md" className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50">
                      <span className="text-[13px] font-bold text-primary">
                        {initialsOf(c.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-text-primary truncate">
                          {c.name}
                        </p>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-text-secondary">
                        {c.email && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                            <Mail size={11} className="shrink-0 text-text-tertiary" />
                            <span className="truncate">{c.email}</span>
                          </span>
                        )}
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} className="shrink-0 text-text-tertiary" />
                            {c.phone}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                          <Building2 size={10} />
                          {c._count.homes} home{c._count.homes !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                          <ClipboardList size={10} />
                          {c._count.bookings} booking
                          {c._count.bookings !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] text-text-tertiary">
                          Joined {formatJoinedDate(c.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Staff tab ─────────────────────────────────────────────────────── */}
      {!loading && tab === "staff" && (
        <>
          {filteredStaff.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={36} className="text-primary" />}
              title={search.trim() ? "No staff found" : "No staff yet"}
              body={
                search.trim()
                  ? `No staff match "${search}".`
                  : "Invite your first staff member to give them admin access."
              }
            />
          ) : (
            <div className="space-y-2.5">
              {filteredStaff.map((s) => {
                const isSelf = s.id === currentUserId;
                return (
                  <Card key={s.id} padding="md" className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50">
                      <span className="text-[13px] font-bold text-primary">
                        {initialsOf(s.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-text-primary truncate">
                          {s.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                          Tech
                        </span>
                        {isSelf && (
                          <span className="shrink-0 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                            You
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-text-secondary">
                        {s.email && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                            <Mail size={11} className="shrink-0 text-text-tertiary" />
                            <span className="truncate">{s.email}</span>
                          </span>
                        )}
                        {s.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} className="shrink-0 text-text-tertiary" />
                            {s.phone}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-text-tertiary">
                        Joined {formatJoinedDate(s.createdAt)}
                      </p>
                    </div>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(s.id, s.name)}
                        disabled={removingId === s.id}
                        title="Remove from staff"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-error-light hover:text-error transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {inviteOpen && (
        <InviteStaffModal
          isDemo={isDemo}
          existingEmails={staff.map((s) => s.email).filter(Boolean) as string[]}
          onClose={() => setInviteOpen(false)}
          onInvited={handleInviteSuccess}
        />
      )}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
        {icon}
      </div>
      <h3 className="text-[18px] font-bold text-text-primary">{title}</h3>
      <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-text-secondary">
        {body}
      </p>
    </div>
  );
}

// ── Invite modal ─────────────────────────────────────────────────────────────

function InviteStaffModal({
  isDemo,
  existingEmails,
  onClose,
  onInvited,
}: {
  isDemo: boolean;
  existingEmails: string[];
  onClose: () => void;
  onInvited: (s: StaffRow) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [invitedName, setInvitedName] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!name.trim() || !trimmedEmail || !phone.trim()) {
      setError("All fields are required.");
      return;
    }

    if (existingEmails.includes(trimmedEmail)) {
      setError("That email is already on staff.");
      return;
    }

    setSubmitting(true);

    if (isDemo) {
      // Generate a fake temp password for the demo flow.
      const fakePassword = "Demo" + Math.random().toString(36).slice(2, 8);
      const newStaff: StaffRow = {
        id: `demo-tech-${Date.now()}`,
        name: name.trim(),
        email: trimmedEmail,
        phone: phone.trim(),
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };
      setTimeout(() => {
        onInvited(newStaff);
        setInvitedName(newStaff.name);
        setTempPassword(fakePassword);
        toast.success("Staff member invited");
        setSubmitting(false);
      }, 250);
      return;
    }

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: trimmedEmail, phone: phone.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Invite failed (${res.status})`);

      const newStaff: StaffRow = {
        id: data.id,
        name: name.trim(),
        email: trimmedEmail,
        phone: phone.trim(),
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };
      onInvited(newStaff);
      setInvitedName(newStaff.name);
      setTempPassword(data.tempPassword ?? null);
      toast.success("Staff member invited");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite staff");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!tempPassword) return;
    navigator.clipboard
      .writeText(tempPassword)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Couldn't copy - copy it manually"));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-4">
          <h2 className="text-[16px] font-bold text-text-primary">
            {tempPassword ? "Staff invited" : "Invite staff"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary active:bg-surface-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {tempPassword ? (
          <div className="p-5 space-y-4">
            <p className="text-[13px] text-text-secondary">
              <span className="font-semibold text-text-primary">{invitedName}</span> has been
              added as a staff member. Share this temporary password with them out of band
              (text, in person) - it won&rsquo;t be shown again.
            </p>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Temporary password
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-secondary px-3 py-2.5">
                <code className="flex-1 font-mono text-[14px] text-text-primary break-all">
                  {tempPassword}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-dark transition-colors"
                >
                  <Copy size={12} />
                  Copy
                </button>
              </div>
              <p className="mt-2 text-[11px] text-text-tertiary">
                Send to staff member out of band. Ask them to change it on first login.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-white hover:bg-primary-dark transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-[12px] text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Anthony Bell"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="staff@mcqhomeco.com"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-white px-4 py-2 text-[13px] font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {submitting ? "Inviting..." : "Send invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
