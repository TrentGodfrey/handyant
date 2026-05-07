"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronLeft, User, Mail, Phone, MapPin, CreditCard,
  Bell, Shield, Check, Pencil, Trash2, LogOut, Loader2,
  Camera, X, AlertTriangle,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { PLANS, planMeta as sharedPlanMeta } from "@/lib/plans";
import { demoCustomerBy } from "@/lib/demoData";

const DEMO_USER = (() => {
  const c = demoCustomerBy("Sarah Mitchell")!;
  return { name: c.name, email: c.email ?? "", phone: c.phone ?? "" };
})();

interface Prefs {
  jobReminders: boolean;
  promos: boolean;
  sms: boolean;
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
  plan: string;
  status: string | null;
  startedAt: string | null;
  endsAt: string | null;
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

  // Address (from Home record in real mode)
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
    promos: false,
    sms: true,
    email: true,
  });
  const [reminderTime, setReminderTime] = useState("24h"); // local-only display

  // Subscription
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  const [subMessage, setSubMessage] = useState<string | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [confirmCancelSub, setConfirmCancelSub] = useState(false);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Payment methods (display-only stub)
  const [showAddCard, setShowAddCard] = useState(false);
  const [paymentToast, setPaymentToast] = useState<string | null>(null);

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

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
          const homes = await homesRes.json();
          if (!cancelled && Array.isArray(homes) && homes.length > 0) {
            const h = homes[0] as HomeRecord;
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
          if (!cancelled) setPrefs({
            jobReminders: p.jobReminders ?? true,
            promos: p.promos ?? false,
            sms: p.sms ?? true,
            email: p.email ?? true,
          });
        }
        if (subsRes.ok) {
          const subs = await subsRes.json();
          if (!cancelled && Array.isArray(subs)) {
            const active = subs.find((s: SubscriptionRecord) => s.status === "active") ?? null;
            setSubscription(active);
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
        await fetch("/api/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: next[key] }),
        });
      } catch {
        // Revert on error
        setPrefs(prefs);
      }
    },
    [prefs, isDemo]
  );

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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
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
  async function handleChangePlan(plan: string) {
    if (isDemo) {
      setShowPlanPicker(false);
      setSubMessage("Plan change disabled in demo mode");
      setTimeout(() => setSubMessage(null), 3000);
      return;
    }
    setSubBusy(true);
    setSubMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Failed to update plan");
      const sub = await res.json();
      setSubscription(sub);
      setShowPlanPicker(false);
      setSubMessage("Plan updated");
      setTimeout(() => setSubMessage(null), 3000);
    } catch (e: unknown) {
      setSubMessage(e instanceof Error ? e.message : "Failed to update plan");
    } finally {
      setSubBusy(false);
    }
  }

  async function handleCancelSub() {
    if (isDemo) {
      setConfirmCancelSub(false);
      setSubMessage("Cancellation disabled in demo mode");
      setTimeout(() => setSubMessage(null), 3000);
      return;
    }
    setSubBusy(true);
    setSubMessage(null);
    try {
      const res = await fetch("/api/subscriptions", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel subscription");
      setSubscription(null);
      setConfirmCancelSub(false);
      setSubMessage("Subscription cancelled");
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
      setTimeout(() => {
        setShowPasswordForm(false);
        setPwSuccess(false);
      }, 1500);
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
        const h = homes[0] as HomeRecord;
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

  function FieldRow({
    label, value, icon: Icon, field, onChange, readOnly, placeholder,
  }: {
    label: string;
    value: string;
    icon: typeof User;
    field: string;
    onChange?: (v: string) => void;
    readOnly?: boolean;
    placeholder?: string;
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-40"
          >
            {isEditing
              ? <Check size={16} className="text-primary" />
              : <Pencil size={14} className="text-text-tertiary" />}
          </button>
        )}
      </div>
    );
  }

  const userInitials = (name || session?.user?.name || "U")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // Subscription card content
  const subPlan = subscription ? planMeta(subscription.plan) : null;
  const subRenewal = subscription ? formatRenewalDate(subscription.endsAt) : null;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-white border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Account
        </Link>
        <h1 className="text-[24px] font-bold text-text-primary">Manage Account</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Edit your profile, notifications, and subscription.</p>
      </div>

      <div className="px-5 py-5 space-y-6">

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
              className="text-[12px] font-semibold text-primary disabled:opacity-50"
            >
              {avatarUploading ? "Uploading…" : "Change photo"}
            </button>
            {avatarError && <p className="text-[11px] text-error mt-1">{avatarError}</p>}
          </div>
        </div>

        {/* Personal Info */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Personal Information</p>
          <Card className="divide-y divide-border-light">
            <FieldRow label="Full Name" value={name} icon={User} field="name" onChange={setName} />
            {/* TODO: a parallel agent is wiring email-change-with-verification.
                Hide the pencil for now by omitting onChange - FieldRow only renders
                its edit button when an onChange handler is supplied. */}
            <FieldRow label="Email" value={email} icon={Mail} field="email" readOnly />
            <FieldRow label="Phone" value={phone} icon={Phone} field="phone" onChange={setPhone} />

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
                        className="flex h-7 items-center justify-center rounded-full px-2 hover:bg-surface-secondary transition-colors"
                        aria-label={addressValue ? "Edit address" : "Add address"}
                      >
                        {addressValue
                          ? <Pencil size={14} className="text-text-tertiary" />
                          : <span className="text-[12px] font-semibold text-primary">Add</span>}
                      </button>
                    )}
                  </div>

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
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={addressDraft.city}
                          onChange={(e) => setAddressDraft((s) => ({ ...s, city: e.target.value }))}
                          placeholder="City"
                          className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={addressDraft.state}
                          onChange={(e) => setAddressDraft((s) => ({ ...s, state: e.target.value }))}
                          placeholder="State"
                          maxLength={2}
                          className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={addressDraft.zip}
                          onChange={(e) => setAddressDraft((s) => ({ ...s, zip: e.target.value }))}
                          placeholder="ZIP"
                          className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
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

        {/* Subscription */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Subscription</p>
          <Card>
            {isDemo ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-text-primary">Monthly Plan</span>
                      <span className="rounded-full bg-success-light px-2.5 py-0.5 text-[10px] font-semibold text-success">Active</span>
                    </div>
                    <p className="text-[13px] text-text-secondary mt-0.5">2 visits/month &middot; Renews April 15</p>
                  </div>
                  <span className="text-[20px] font-bold text-text-primary">$149<span className="text-[12px] font-normal text-text-tertiary">/mo</span></span>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium text-text-secondary">Visits this cycle</span>
                    <span className="text-[12px] font-semibold text-text-primary">1 of 2 used</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
                    <div className="h-full w-1/2 rounded-full bg-primary transition-all" />
                  </div>
                </div>
              </>
            ) : loading ? (
              <div className="h-16 rounded bg-surface-secondary animate-pulse" />
            ) : subscription && subPlan ? (
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-text-primary">{subPlan.label} Plan</span>
                    <span className="rounded-full bg-success-light px-2.5 py-0.5 text-[10px] font-semibold text-success capitalize">
                      {subscription.status ?? "active"}
                    </span>
                  </div>
                  <p className="text-[13px] text-text-secondary mt-0.5">
                    {subPlan.details}
                    {subRenewal ? ` · Renews ${subRenewal}` : ""}
                  </p>
                </div>
                <span className="text-[20px] font-bold text-text-primary">{subPlan.price}</span>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-[15px] font-semibold text-text-primary">No subscription</p>
                <p className="text-[13px] text-text-secondary mt-0.5">You&apos;re on Basic Free - pay per visit.</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setShowPlanPicker((v) => !v)}
                disabled={subBusy}
              >
                {subscription ? "Change Plan" : "Subscribe"}
              </Button>
              {subscription && (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  className="text-text-tertiary"
                  onClick={() => setConfirmCancelSub(true)}
                  disabled={subBusy}
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Plan picker */}
            {showPlanPicker && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {Object.entries(PLAN_PRESENTATION).map(([key, meta]) => {
                  const isCurrent = subscription?.plan === key && subscription?.status === "active";
                  return (
                    <button
                      key={key}
                      onClick={() => handleChangePlan(key)}
                      disabled={subBusy || isCurrent}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        isCurrent
                          ? "border-primary bg-primary-50"
                          : "border-border hover:bg-surface-secondary"
                      } disabled:opacity-50`}
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-text-primary">
                          {meta.label} {isCurrent && <span className="text-[11px] text-primary">(current)</span>}
                        </p>
                        <p className="text-[11px] text-text-tertiary">{meta.details}</p>
                      </div>
                      <span className="text-[13px] font-bold text-text-primary">{meta.price}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cancel confirmation */}
            {confirmCancelSub && (
              <div className="mt-3 rounded-lg border border-error/30 bg-error/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-error mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-text-primary">Cancel subscription?</p>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      You&apos;ll lose access to plan benefits at the end of this cycle.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="danger" size="sm" onClick={handleCancelSub} disabled={subBusy}>
                        {subBusy ? "Cancelling…" : "Yes, cancel"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmCancelSub(false)} disabled={subBusy}>
                        Keep
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subMessage && (
              <p className="mt-3 text-[12px] font-medium text-text-secondary">{subMessage}</p>
            )}
          </Card>
        </div>

        {/* Payment Methods */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Payment Methods</p>
          <Card className="space-y-3">
            {isDemo ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#1A1F71] text-[11px] font-bold text-white tracking-wider">VISA</div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Visa ending in 4242</p>
                    <p className="text-[11px] text-text-tertiary">Expires 08/27</p>
                  </div>
                </div>
                <span className="rounded-full bg-success-light px-2 py-0.5 text-[10px] font-semibold text-success">Default</span>
              </div>
            ) : (
              <p className="text-[13px] text-text-secondary">
                Add a card to enable in-app payments.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              fullWidth
              icon={<CreditCard size={14} />}
              onClick={() => setShowAddCard(true)}
            >
              Add card
            </Button>
            {paymentToast && (
              <p className="text-[12px] font-medium text-text-secondary">{paymentToast}</p>
            )}
          </Card>

          {/* Add card form (display-only) */}
          {showAddCard && (
            <Card className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-primary">Add a card</p>
                <button onClick={() => setShowAddCard(false)} className="text-text-tertiary hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Card number"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="CVC"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
              </div>
              <Button
                size="sm"
                fullWidth
                onClick={() => {
                  setPaymentToast("Coming soon - card storage isn't enabled yet.");
                  setShowAddCard(false);
                  setTimeout(() => setPaymentToast(null), 4000);
                }}
              >
                Save card
              </Button>
            </Card>
          )}
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
                  <p className="text-[11px] text-text-tertiary">Booking confirmations &amp; reminders</p>
                </div>
              </div>
              <button
                onClick={() => togglePref("sms")}
                disabled={loading}
                className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${prefs.sms ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.sms ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-text-secondary" />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Email notifications</p>
                  <p className="text-[11px] text-text-tertiary">Receipts &amp; monthly summaries</p>
                </div>
              </div>
              <button
                onClick={() => togglePref("email")}
                disabled={loading}
                className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${prefs.email ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.email ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
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
              <button
                onClick={() => togglePref("jobReminders")}
                disabled={loading}
                className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${prefs.jobReminders ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.jobReminders ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-text-secondary" />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Promotions</p>
                  <p className="text-[11px] text-text-tertiary">Deals and feature updates</p>
                </div>
              </div>
              <button
                onClick={() => togglePref("promos")}
                disabled={loading}
                className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${prefs.promos ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.promos ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="text-[13px] font-semibold text-text-primary mb-2">Appointment reminders</p>
              <div className="flex gap-2">
                {["1h", "3h", "24h", "48h"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setReminderTime(t)}
                    className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-all ${
                      reminderTime === t
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-secondary text-text-secondary"
                    }`}
                  >
                    {t === "1h" ? "1 hour" : t === "3h" ? "3 hours" : t === "24h" ? "1 day" : "2 days"}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Security */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Security</p>
          <Card className="space-y-3">
            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              className="flex w-full items-center justify-between py-1"
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
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={pwNext}
                  onChange={(e) => setPwNext(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
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
              className="flex w-full items-center justify-between py-1"
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

      {/* Delete account modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
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
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-error"
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
                    window.location.href = "mailto:support@mcqhome.co?subject=Account%20deletion%20request";
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
