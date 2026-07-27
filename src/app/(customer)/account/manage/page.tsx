"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ChipMultiSelect from "@/components/ChipMultiSelect";
import { toast } from "@/components/Toaster";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronLeft, User, Mail, Phone, MapPin,
  Bell, Shield, Check, Pencil, Trash2, LogOut, Loader2,
  Camera, AlertTriangle, BellRing,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { PLANS, planMeta as sharedPlanMeta } from "@/lib/plans";
import { demoCustomerBy } from "@/lib/demoData";
import {
  DEFAULT_APPOINTMENT_REMINDERS,
  REMINDER_LEAD_OPTIONS,
  normalizeAppointmentReminders,
  type AppointmentReminders,
} from "@/lib/reminders";
import { prepareImageForUpload } from "@/lib/client-image-upload";

const DEMO_USER = (() => {
  const c = demoCustomerBy("Sarah Mitchell")!;
  return { name: c.name, email: c.email ?? "", phone: c.phone ?? "" };
})();

interface Prefs {
  jobReminders: boolean;
  email: boolean;
}

interface HomeRecord {
  id: string;
  address: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

interface AddressDraft {
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface SubscriptionRecord {
  id: string;
  homeId: string | null;
  plan: string;
  status: string | null;
  startedAt: string | null;
  endsAt: string | null;
  home: HomeRecord | null;
}

// Plan presentation derived from shared PLANS source of truth (src/lib/plans.ts)
const PLAN_PRESENTATION: Record<string, { label: string; price: string; details: string }> =
  Object.fromEntries(PLANS.map((p) => [p.id, sharedPlanMeta(p.id)]));

const planMeta = sharedPlanMeta;

function formatRenewalDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ToggleSwitch({
  checked,
  disabled,
  label,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-12 shrink-0 items-center disabled:opacity-50"
    >
      <span className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

export default function AccountManagePage() {
  const { data: session, update: updateSession } = useSession();

  const { isDemo, mounted } = useDemoMode();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Email verification banner state (real mode only)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);

  // Address (from Home record in real mode)
  const [homes, setHomes] = useState<HomeRecord[]>([]);
  const [home, setHome] = useState<HomeRecord | null>(null);
  const [demoAddress, setDemoAddress] = useState("4821 Oak Hollow Dr, Plano TX 75024");
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>({ address: "", city: "", state: "", zip: "" });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState(false);

  // Notification prefs (real mode persisted via /api/me/preferences)
  const [prefs, setPrefs] = useState<Prefs>({
    jobReminders: true,
    email: true,
  });
  // Appointment reminder preferences (multi-select lead times + channels).
  const [reminders, setReminders] = useState<AppointmentReminders>(
    DEFAULT_APPOINTMENT_REMINDERS,
  );
  // Debounce timer for chip changes so rapid taps don't spam the API.
  const reminderSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscription
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [subBusy, setSubBusy] = useState(false);
  const [subMessage, setSubMessage] = useState<string | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState<string | null>(null);
  const [confirmCancelSub, setConfirmCancelSub] = useState<string | null>(null);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const passwordChangeRequired = session?.user?.mustChangePassword === true;

  useEffect(() => {
    if (passwordChangeRequired) setShowPasswordForm(true);
  }, [passwordChangeRequired]);

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  // Fetch initial data
  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setName(DEMO_USER.name);
      setEmail(DEMO_USER.email);
      setPhone(DEMO_USER.phone);
      setAddressDraft({
        address: "4821 Oak Hollow Dr",
        city: "Plano",
        state: "TX",
        zip: "75024",
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      try {
        const [meRes, homesRes, prefsRes, subsRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/homes"),
          fetch("/api/me/preferences"),
          fetch("/api/subscriptions"),
        ]);

        if (meRes.ok) {
          const me = await meRes.json();
          if (!cancelled) {
            setName(me.name ?? "");
            setEmail(me.email ?? "");
            setPhone(me.phone ?? "");
            setAvatarUrl(me.avatarUrl ?? null);
            setEmailVerified(me.emailVerified === true);
            setPendingEmail(me.pendingEmail ?? null);
          }
        }
        if (homesRes.ok) {
          const homeRecords = await homesRes.json();
          if (!cancelled && Array.isArray(homeRecords)) {
            setHomes(homeRecords as HomeRecord[]);
          }
          if (!cancelled && Array.isArray(homeRecords) && homeRecords.length > 0) {
            const h = homeRecords[0] as HomeRecord;
            setHome(h);
            setAddressDraft({
              address: h.address ?? "",
              city: h.city ?? "",
              state: h.state ?? "",
              zip: h.zip ?? "",
            });
          }
        }
        if (prefsRes.ok) {
          const p = await prefsRes.json();
          if (!cancelled) {
            setPrefs({
              jobReminders: p.jobReminders ?? true,
              email: p.email ?? true,
            });
            setReminders(normalizeAppointmentReminders(p.appointmentReminders));
          }
        }
        if (subsRes.ok) {
          const subs = await subsRes.json();
          if (!cancelled && Array.isArray(subs)) {
            setSubscriptions(subs as SubscriptionRecord[]);
          }
        }
      } catch {
        // Soft-fail; fields stay default
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [isDemo, mounted]);

  async function handleSave() {
    if (isDemo) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Failed to save changes");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  // Toggle a notification preference (optimistic + PATCH)
  const togglePref = useCallback(
    async (key: keyof Prefs) => {
      const next = { ...prefs, [key]: !prefs[key] };
      setPrefs(next);
      if (isDemo) return;
      try {
        const response = await fetch("/api/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: next[key] }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }
      } catch (error) {
        // Revert on error
        setPrefs(prefs);
        toast.error(
          "Couldn't save notification preference: " +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    },
    [prefs, isDemo]
  );

  // Debounced persist of appointment reminders. Optimistic UI; on error we
  // surface a toast but keep the in-memory state so the user isn't whip-sawed.
  const persistReminders = useCallback(
    (next: AppointmentReminders) => {
      if (reminderSaveTimer.current) clearTimeout(reminderSaveTimer.current);
      if (isDemo) return; // demo mode: state changes only, no API call
      reminderSaveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/me/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointmentReminders: next }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          toast.success("Reminders saved");
        } catch (e) {
          toast.error(
            "Couldn't save reminder preferences: " +
              (e instanceof Error ? e.message : String(e)),
          );
        }
      }, 500);
    },
    [isDemo],
  );

  function updateReminders(next: AppointmentReminders) {
    setReminders(next);
    persistReminders(next);
  }

  // Avatar upload
  function openFilePicker() {
    fileInputRef.current?.click();
  }
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (isDemo) {
      setAvatarError("Avatar uploads disabled in demo mode");
      return;
    }
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const dataUrl = await prepareImageForUpload(file);
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      const updated = await res.json();
      setAvatarUrl(updated.avatarUrl ?? null);
      // Refresh session so avatar shows in nav etc.
      try { await updateSession?.(); } catch { /* noop */ }
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  // Subscription actions
  async function handleCancelSub(subscription: SubscriptionRecord) {
    if (isDemo) {
      setConfirmCancelSub(null);
      setSubMessage("Cancellation disabled in demo mode");
      setTimeout(() => setSubMessage(null), 3000);
      return;
    }
    setSubBusy(true);
    setSubMessage(null);
    try {
      const res = await fetch(
        `/api/subscriptions?subscriptionId=${encodeURIComponent(subscription.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to cancel subscription");
      }
      setSubscriptions((current) =>
        current.map((item) =>
          item.id === subscription.id
            ? { ...item, status: "cancelled", endsAt: new Date().toISOString() }
            : item,
        ),
      );
      setConfirmCancelSub(null);
      setShowPlanPicker(null);
      setSubMessage(
        `${subscription.home?.address ?? "Selected"} membership cancelled immediately`,
      );
      setTimeout(() => setSubMessage(null), 3000);
    } catch (e: unknown) {
      setSubMessage(e instanceof Error ? e.message : "Failed to cancel subscription");
    } finally {
      setSubBusy(false);
    }
  }

  // Resend email verification
  async function handleResendVerification() {
    if (isDemo) {
      setVerifyMessage("Email verification disabled in demo mode");
      setTimeout(() => setVerifyMessage(null), 3000);
      return;
    }
    setVerifySending(true);
    setVerifyMessage(null);
    try {
      const res = await fetch("/api/auth/verify-email/send", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to send verification email");
      }
      setVerifyMessage("Verification email sent. Check your inbox.");
      setTimeout(() => setVerifyMessage(null), 5000);
    } catch (e: unknown) {
      setVerifyMessage(e instanceof Error ? e.message : "Failed to send verification email");
    } finally {
      setVerifySending(false);
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailChangeError(null);
    if (isDemo) {
      setEmailChangeError("Email changes are disabled in demo mode");
      return;
    }
    setEmailChangeBusy(true);
    try {
      const normalized = newEmail.trim().toLowerCase();
      const res = await fetch("/api/me/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: normalized,
          currentPassword: emailPassword,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start email change");
      }
      setPendingEmail(normalized);
      setEmailVerified(false);
      setVerifyMessage(`Confirmation sent to ${normalized}.`);
      setShowEmailChange(false);
      setNewEmail("");
      setEmailPassword("");
    } catch (error) {
      setEmailChangeError(
        error instanceof Error ? error.message : "Could not start email change",
      );
    } finally {
      setEmailChangeBusy(false);
    }
  }

  // Password change
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (pwNext.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    if (pwNext !== pwConfirm) {
      setPwError("New passwords do not match");
      return;
    }
    if (isDemo) {
      setPwError("Password changes disabled in demo mode");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: pwCurrent, next: pwNext }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to change password");
      }
      setPwSuccess(true);
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
      await signOut({ callbackUrl: "/login?passwordChanged=1" });
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  }

  async function refetchHome() {
    try {
      const res = await fetch("/api/homes");
      if (!res.ok) return;
      const homes = await res.json();
      if (Array.isArray(homes) && homes.length > 0) {
        setHomes(homes as HomeRecord[]);
        const h = (
          (homes as HomeRecord[]).find((item) => item.id === home?.id)
          ?? homes[0]
        ) as HomeRecord;
        setHome(h);
        setAddressDraft({
          address: h.address ?? "",
          city: h.city ?? "",
          state: h.state ?? "",
          zip: h.zip ?? "",
        });
      }
    } catch { /* noop */ }
  }

  function selectHome(homeId: string) {
    const selected = homes.find((item) => item.id === homeId);
    if (!selected) return;
    setHome(selected);
    setEditingAddress(false);
    setAddressError(null);
    setAddressSuccess(false);
    setAddressDraft({
      address: selected.address ?? "",
      city: selected.city ?? "",
      state: selected.state ?? "",
      zip: selected.zip ?? "",
    });
  }

  async function saveAddress() {
    if (isDemo) {
      setEditingAddress(false);
      setDemoAddress(`${addressDraft.address}, ${addressDraft.city} ${addressDraft.state} ${addressDraft.zip}`.trim());
      return;
    }
    setAddressError(null);
    setAddressSuccess(false);
    if (!addressDraft.address.trim()) {
      setAddressError("Address is required");
      return;
    }
    if (!home) {
      // Create a new home record
      setSavingAddress(true);
      try {
        const res = await fetch("/api/homes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: addressDraft.address.trim(),
            city: addressDraft.city.trim() || null,
            state: addressDraft.state.trim() || "TX",
            zip: addressDraft.zip.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to save address");
        }
        await refetchHome();
        setEditingAddress(false);
        setAddressSuccess(true);
        setTimeout(() => setAddressSuccess(false), 3000);
      } catch (e: unknown) {
        setAddressError(e instanceof Error ? e.message : "Failed to save address");
      } finally {
        setSavingAddress(false);
      }
      return;
    }
    setSavingAddress(true);
    try {
      const res = await fetch(`/api/homes/${home.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: addressDraft.address.trim(),
          city: addressDraft.city.trim() || null,
          state: addressDraft.state.trim() || null,
          zip: addressDraft.zip.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save address");
      }
      await refetchHome();
      setEditingAddress(false);
      setAddressSuccess(true);
      setTimeout(() => setAddressSuccess(false), 3000);
    } catch (e: unknown) {
      setAddressError(e instanceof Error ? e.message : "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  }

  function cancelAddressEdit() {
    setEditingAddress(false);
    setAddressError(null);
    if (isDemo) {
      // Keep current draft on cancel in demo mode (no source of truth to restore from)
      return;
    }
    if (home) {
      setAddressDraft({
        address: home.address ?? "",
        city: home.city ?? "",
        state: home.state ?? "",
        zip: home.zip ?? "",
      });
    } else {
      setAddressDraft({ address: "", city: "", state: "", zip: "" });
    }
  }

  // Address display value
  const addressValue = (() => {
    if (isDemo) return demoAddress;
    if (home) {
      const parts = [home.address];
      const cityState = [home.city, home.state].filter(Boolean).join(", ");
      if (cityState) parts.push(cityState);
      if (home.zip) parts.push(home.zip);
      return parts.join(", ");
    }
    return "";
  })();

  function renderFieldRow({
    label, value, icon: Icon, field, onChange, readOnly, placeholder, actionLabel, onAction,
  }: {
    label: string;
    value: string;
    icon: typeof User;
    field: string;
    onChange?: (v: string) => void;
    readOnly?: boolean;
    placeholder?: string;
    actionLabel?: string;
    onAction?: () => void;
  }) {
    const isEditing = editing === field;
    return (
      <div className="flex items-center gap-3 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
          <Icon size={16} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</p>
          {loading ? (
            <div className="mt-1.5 h-4 w-32 rounded bg-surface-secondary animate-pulse" />
          ) : isEditing && onChange ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => setEditing(null)}
              onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
              className="mt-0.5 w-full border-b-2 border-primary bg-transparent text-[14px] font-medium text-text-primary outline-none py-0.5"
            />
          ) : (
            <p className="text-[14px] font-medium text-text-primary mt-0.5 truncate">
              {value || <span className="text-text-tertiary">{placeholder ?? "-"}</span>}
            </p>
          )}
        </div>
        {!readOnly && onChange && (
          <button
            onClick={() => setEditing(isEditing ? null : field)}
            disabled={loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-40"
          >
            {isEditing
              ? <Check size={16} className="text-primary" />
              : <Pencil size={14} className="text-text-tertiary" />}
          </button>
        )}
        {readOnly && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={loading}
            className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-[12px] font-semibold text-primary hover:bg-surface-secondary transition-colors disabled:opacity-40"
          >
            {actionLabel ?? "Change"}
          </button>
        )}
      </div>
    );
  }

  const userInitials = (name || session?.user?.name || "U")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active",
  );

  function membershipLocation(subscription: SubscriptionRecord): string {
    if (!subscription.home) return "Account membership";
    return [
      subscription.home.address,
      subscription.home.city,
      subscription.home.state,
      subscription.home.zip,
    ].filter(Boolean).join(", ");
  }

  function renderPlanPicker(subscription: SubscriptionRecord | null) {
    const targetHome = subscription?.home ?? home;
    return (
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        {Object.entries(PLAN_PRESENTATION).map(([key, meta]) => {
          const isCurrent =
            subscription?.plan === key && subscription.status === "active";
          const params = new URLSearchParams({
            topic: "membership",
            plan: key,
          });
          if (targetHome?.id) params.set("homeId", targetHome.id);
          if (targetHome?.address) params.set("home", targetHome.address);
          return (
            <Link
              key={key}
              href={isCurrent ? "#" : `/messages?${params.toString()}`}
              aria-disabled={isCurrent}
              onClick={(event) => {
                if (isCurrent) event.preventDefault();
              }}
              className={`flex min-h-12 w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                isCurrent
                  ? "border-primary bg-primary-50"
                  : "border-border hover:bg-surface-secondary"
              } ${isCurrent ? "pointer-events-none opacity-50" : ""}`}
            >
              <div>
                <p className="text-[13px] font-semibold text-text-primary">
                  {meta.label}{" "}
                  {isCurrent && (
                    <span className="text-[11px] text-primary">(current)</span>
                  )}
                </p>
                <p className="text-[11px] text-text-tertiary">{meta.details}</p>
              </div>
              <span className="text-[13px] font-bold text-text-primary">
                {meta.price}
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-white border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/account"
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Account
        </Link>
        <h1 className="text-[24px] font-bold text-text-primary">Manage Account</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Edit your profile, notifications, and memberships.</p>
      </div>

      <div className="px-5 py-5 space-y-6">
        {passwordChangeRequired && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5">
            <div className="flex items-start gap-3">
              <Shield size={18} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="text-[13px] font-semibold text-text-primary">
                  Change your temporary password
                </p>
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  Enter the temporary password you received, then choose a private password before continuing to staff tools.
                </p>
                <a href="#change-password" className="mt-2 inline-flex text-[12px] font-semibold text-primary">
                  Go to password form
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Email verification banner (real mode only, when unverified) */}
        {!isDemo && emailVerified === false && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-warning mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">
                  Email not verified
                </p>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  {pendingEmail
                    ? `Confirm ${pendingEmail} to finish your email change.`
                    : "Verify your email address to keep your account secure."}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResendVerification}
                    disabled={verifySending}
                  >
                    {verifySending ? "Sending…" : "Resend verification"}
                  </Button>
                  {verifyMessage && (
                    <span className="text-[12px] font-medium text-text-secondary">
                      {verifyMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={avatarUploading}
            className="relative group"
            aria-label="Change avatar"
          >
            <div className="relative h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-[20px] font-bold overflow-hidden shadow-[0_2px_12px_rgba(79,149,152,0.3)]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <span>{userInitials}</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <Loader2 size={20} className="text-white animate-spin" />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <div>
            <p className="text-[14px] font-semibold text-text-primary">{name || "Your account"}</p>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={avatarUploading}
              className="min-h-11 px-2 text-[12px] font-semibold text-primary disabled:opacity-50"
            >
              {avatarUploading ? "Uploading…" : "Change photo"}
            </button>
            {avatarError && <p className="text-[11px] text-error mt-1">{avatarError}</p>}
          </div>
        </div>

        {/* Personal Info */}
        <div id="email-security" className="scroll-mt-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Personal Information</p>
          <Card className="divide-y divide-border-light">
            {renderFieldRow({ label: "Full Name", value: name, icon: User, field: "name", onChange: setName })}
            {renderFieldRow({
              label: "Email",
              value: pendingEmail ? `${email} · pending ${pendingEmail}` : email,
              icon: Mail,
              field: "email",
              readOnly: true,
              actionLabel: "Change",
              onAction: () => {
                setNewEmail(pendingEmail ?? "");
                setEmailPassword("");
                setEmailChangeError(null);
                setShowEmailChange(true);
              },
            })}
            {renderFieldRow({ label: "Phone", value: phone, icon: Phone, field: "phone", onChange: setPhone })}

            {/* Service Address - inline editable (real + demo) */}
            <div className="py-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                  <MapPin size={16} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Service Address</p>
                    {!editingAddress && !loading && (
                      <button
                        type="button"
                        onClick={() => setEditingAddress(true)}
                        className="flex h-11 items-center justify-center rounded-full px-2 hover:bg-surface-secondary transition-colors"
                        aria-label={addressValue ? "Edit address" : "Add address"}
                      >
                        {addressValue
                          ? <Pencil size={14} className="text-text-tertiary" />
                          : <span className="text-[12px] font-semibold text-primary">Add</span>}
                      </button>
                    )}
                  </div>

                  {!isDemo && homes.length > 1 && !editingAddress && (
                    <select
                      aria-label="Choose service address"
                      value={home?.id ?? ""}
                      onChange={(event) => selectHome(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold text-text-primary"
                    >
                      {homes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.address}{item.city ? `, ${item.city}` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {loading ? (
                    <div className="mt-1.5 h-4 w-32 rounded bg-surface-secondary animate-pulse" />
                  ) : !editingAddress ? (
                    <p className="text-[14px] font-medium text-text-primary mt-0.5 truncate">
                      {addressValue || <span className="text-text-tertiary">No address yet</span>}
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={addressDraft.address}
                        onChange={(e) => setAddressDraft((s) => ({ ...s, address: e.target.value }))}
                        placeholder="Street address"
                        autoFocus
                        className="min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                      />
                      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
                        <input
                          type="text"
                          value={addressDraft.city}
                          onChange={(e) => setAddressDraft((s) => ({ ...s, city: e.target.value }))}
                          placeholder="City"
                          className="min-h-12 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={addressDraft.state}
                          onChange={(e) => setAddressDraft((s) => ({ ...s, state: e.target.value }))}
                          placeholder="State"
                          maxLength={2}
                          className="min-h-12 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={addressDraft.zip}
                          onChange={(e) => setAddressDraft((s) => ({ ...s, zip: e.target.value }))}
                          placeholder="ZIP"
                          className="min-h-12 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button variant="primary" size="sm" disabled={savingAddress} onClick={saveAddress}>
                          {savingAddress ? "Saving…" : "Save"}
                        </Button>
                        <Button variant="outline" size="sm" disabled={savingAddress} onClick={cancelAddressEdit}>
                          Cancel
                        </Button>
                        {addressSuccess && (
                          <span className="flex items-center gap-1 text-[12px] font-medium text-success">
                            <Check size={13} />
                            Saved
                          </span>
                        )}
                      </div>
                      {addressError && <p className="text-[12px] text-error">{addressError}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Save row */}
          <div className="mt-3 flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              size="sm"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" />
                  Saving…
                </span>
              ) : "Save Changes"}
            </Button>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-[13px] font-medium text-success">
                <Check size={14} />
                Saved
              </span>
            )}
            {saveError && (
              <span className="text-[13px] font-medium text-error">{saveError}</span>
            )}
          </div>
        </div>

        {/* Memberships */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Memberships</p>
          <Card>
            {isDemo ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-text-primary">Pro Plan</span>
                      <span className="rounded-full bg-success-light px-2.5 py-0.5 text-[10px] font-semibold text-success">Active</span>
                    </div>
                    <p className="text-[13px] text-text-secondary mt-0.5">20 visits/year &middot; Renews April 15</p>
                  </div>
                  <span className="text-[20px] font-bold text-text-primary">$3,400<span className="text-[12px] font-normal text-text-tertiary">/yr</span></span>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium text-text-secondary">Visits this year</span>
                    <span className="text-[12px] font-semibold text-text-primary">12 of 20 used</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(12 / 20) * 100}%` }} />
                  </div>
                </div>
              </>
            ) : loading ? (
              <div className="h-16 rounded bg-surface-secondary animate-pulse" />
            ) : activeSubscriptions.length > 0 ? (
              <div className="divide-y divide-border">
                {activeSubscriptions.map((subscription) => {
                  const subPlan = planMeta(subscription.plan);
                  const subRenewal = formatRenewalDate(subscription.endsAt);
                  const location = membershipLocation(subscription);
                  const pickerOpen = showPlanPicker === subscription.id;
                  const cancelOpen = confirmCancelSub === subscription.id;
                  return (
                    <section key={subscription.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-semibold text-text-primary">
                              {subPlan.label} Plan
                            </span>
                            <span className="rounded-full bg-success-light px-2.5 py-0.5 text-[10px] font-semibold capitalize text-success">
                              {subscription.status ?? "active"}
                            </span>
                          </div>
                          <p className="mt-1 flex items-start gap-1.5 text-[12px] font-medium text-text-secondary">
                            <MapPin size={13} className="mt-0.5 shrink-0" />
                            <span>{location}</span>
                          </p>
                          <p className="mt-1 text-[12px] text-text-secondary">
                            {subPlan.details}
                            {subRenewal ? ` · Ends ${subRenewal}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[18px] font-bold text-text-primary">
                          {subPlan.price}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setShowPlanPicker((current) =>
                              current === subscription.id ? null : subscription.id,
                            );
                            setConfirmCancelSub(null);
                          }}
                          disabled={subBusy}
                        >
                          Change Plan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          className="text-text-tertiary"
                          onClick={() => {
                            setConfirmCancelSub(subscription.id);
                            setShowPlanPicker(null);
                          }}
                          disabled={subBusy}
                        >
                          Cancel
                        </Button>
                      </div>

                      {pickerOpen && renderPlanPicker(subscription)}

                      {cancelOpen && (
                        <div className="mt-3 rounded-lg border border-error/30 bg-error/5 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              size={16}
                              className="mt-0.5 shrink-0 text-error"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-text-primary">
                                Cancel this membership?
                              </p>
                              <p className="mt-0.5 text-[12px] text-text-secondary">
                                This immediately ends plan benefits and remaining
                                visits for {location}. This cannot be undone in
                                the app.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleCancelSub(subscription)}
                                  disabled={subBusy}
                                >
                                  {subBusy ? "Cancelling…" : "Cancel now"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmCancelSub(null)}
                                  disabled={subBusy}
                                >
                                  Keep membership
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div>
                <p className="text-[15px] font-semibold text-text-primary">No active membership</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  Contact MCQ to choose an annual plan for your home.
                </p>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() =>
                      setShowPlanPicker((current) =>
                        current === "new" ? null : "new",
                      )
                    }
                    disabled={subBusy}
                  >
                    View Plans
                  </Button>
                </div>
                {showPlanPicker === "new" && renderPlanPicker(null)}
              </div>
            )}

            {subMessage && (
              <p
                role="status"
                className="mt-3 text-[12px] font-medium text-text-secondary"
              >
                {subMessage}
              </p>
            )}
          </Card>
        </div>

        {/* Notifications */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Notifications</p>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-text-secondary" />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Text notifications</p>
                  <p className="text-[11px] text-text-tertiary">Not available</p>
                </div>
              </div>
              <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-tertiary">
                Not available
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-text-secondary" />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Email notifications</p>
                  <p className="text-[11px] text-text-tertiary">Booking confirmations &amp; visit updates</p>
                </div>
              </div>
              <ToggleSwitch
                checked={prefs.email}
                disabled={loading}
                label="Email notifications"
                onClick={() => togglePref("email")}
              />
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-text-secondary" />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Job reminders</p>
                  <p className="text-[11px] text-text-tertiary">Before each appointment</p>
                </div>
              </div>
              <ToggleSwitch
                checked={prefs.jobReminders}
                disabled={loading}
                label="Job reminders"
                onClick={() => togglePref("jobReminders")}
              />
            </div>
            <div className="h-px bg-border" />
            {/* Appointment reminders ── master toggle + multi-select chips + channels */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellRing size={16} className="text-text-secondary" />
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Appointment reminders</p>
                    <p className="text-[11px] text-text-tertiary">Pick when we&apos;ll nudge you before each visit</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={reminders.enabled}
                  disabled={loading}
                  label={reminders.enabled ? "Disable appointment reminders" : "Enable appointment reminders"}
                  onClick={() => updateReminders({ ...reminders, enabled: !reminders.enabled })}
                />
              </div>

              {reminders.enabled && (
                <div className="mt-3 space-y-3 animate-fade-in">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">When to remind me</p>
                    <ChipMultiSelect
                      options={REMINDER_LEAD_OPTIONS}
                      selected={reminders.leadTimes}
                      onChange={(next) =>
                        updateReminders({
                          ...reminders,
                          // keep stored array sorted descending so storage is canonical
                          leadTimes: [...next].sort((a, b) => b - a),
                        })
                      }
                      disabled={loading}
                      ariaLabel="Appointment reminder lead times"
                    />
                    {reminders.leadTimes.length === 0 && (
                      <p className="mt-1.5 text-[11px] text-text-tertiary">Pick at least one lead time to receive reminders.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">Send via</p>
                    <div className="flex gap-2">
                      {([
                        { key: "email" as const, label: "Email" },
                      ]).map(({ key, label }) => {
                        const on = reminders.channels[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              updateReminders({
                                ...reminders,
                                channels: { ...reminders.channels, [key]: !on },
                              })
                            }
                            disabled={loading}
                            aria-pressed={on}
                            className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-all disabled:opacity-50 ${
                              on
                                ? "border-primary bg-primary text-white shadow-sm"
                                : "border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-primary"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Security */}
        <div id="change-password" className="scroll-mt-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Security</p>
          <Card className="space-y-3">
            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              className="flex min-h-11 w-full items-center justify-between py-1"
            >
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-text-secondary" />
                <span className="text-[13px] font-semibold text-text-primary">Change Password</span>
              </div>
              <span className="text-[12px] font-semibold text-primary">{showPasswordForm ? "Close" : "Edit"}</span>
            </button>
            {showPasswordForm && (
              <form onSubmit={handlePasswordSubmit} className="space-y-2 border-t border-border pt-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  required
                  className="min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={pwNext}
                  onChange={(e) => setPwNext(e.target.value)}
                  required
                  minLength={8}
                  className="min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                  className="min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                {pwError && <p className="text-[12px] text-error">{pwError}</p>}
                {pwSuccess && <p className="text-[12px] text-success">Password updated</p>}
                <Button size="sm" fullWidth disabled={pwSaving}>
                  {pwSaving ? "Updating…" : "Update password"}
                </Button>
              </form>
            )}
            <div className="h-px bg-border" />
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="flex min-h-11 w-full items-center justify-between py-1"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={16} className="text-error" />
                <span className="text-[13px] font-semibold text-error">Delete Account</span>
              </div>
              <span className="text-[12px] font-semibold text-error">Open</span>
            </button>
          </Card>
        </div>

        {/* Sign Out */}
        <Button
          variant="ghost"
          fullWidth
          onClick={() => signOut({ callbackUrl: "/login" })}
          icon={<LogOut size={15} />}
          className="text-text-secondary"
        >
          Sign Out
        </Button>

      </div>

      {showEmailChange && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:items-center sm:p-4">
          <form
            onSubmit={handleEmailChange}
            className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-[18px] font-bold text-text-primary">Change email</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              Enter your password to protect the account. We&apos;ll send a confirmation link to the new address before changing it.
            </p>
            <label className="mt-4 block text-[12px] font-semibold text-text-secondary">
              New email
              <input
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className="mt-1 min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[16px] font-normal text-text-primary outline-none focus:border-primary"
              />
            </label>
            <label className="mt-3 block text-[12px] font-semibold text-text-secondary">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                className="mt-1 min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[16px] font-normal text-text-primary outline-none focus:border-primary"
              />
            </label>
            {emailChangeError && (
              <p className="mt-3 text-[12px] text-error">{emailChangeError}</p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <Button type="submit" fullWidth disabled={emailChangeBusy}>
                {emailChangeBusy ? "Sending…" : "Send confirmation"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                disabled={emailChangeBusy}
                onClick={() => setShowEmailChange(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete account modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle size={20} className="text-error" />
              </div>
              <div className="flex-1">
                <p className="text-[16px] font-bold text-text-primary">Delete account</p>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  We don&apos;t support self-serve deletion yet. Type <span className="font-mono font-semibold">DELETE</span> below and contact support to confirm.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE"
              className="min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-error"
            />
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="danger"
                fullWidth
                size="sm"
                disabled={deleteText !== "DELETE"}
                onClick={() => {
                  setShowDelete(false);
                  setDeleteText("");
                  if (typeof window !== "undefined") {
                    window.location.href = "/messages?topic=account-deletion";
                  }
                }}
              >
                Contact support to delete
              </Button>
              <Button variant="ghost" fullWidth size="sm" onClick={() => { setShowDelete(false); setDeleteText(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
