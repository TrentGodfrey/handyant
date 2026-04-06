"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronLeft, User, Mail, Phone, MapPin, CreditCard,
  Bell, Shield, ChevronRight, Check, Pencil, Trash2, LogOut, Loader2,
} from "lucide-react";

const DEMO_USER = {
  name: "Sarah Mitchell",
  email: "sarah.mitchell@gmail.com",
  phone: "(972) 555-0142",
};

export default function AccountManagePage() {
  const { data: session } = useSession();

  const isDemo =
    typeof document !== "undefined" && document.cookie.includes("demo_mode=true");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("4821 Oak Hollow Dr, Plano TX 75024");
  const [textNotifs, setTextNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [reminderTime, setReminderTime] = useState("24h");

  // Fetch user profile on mount
  useEffect(() => {
    if (isDemo) {
      setName(DEMO_USER.name);
      setEmail(DEMO_USER.email);
      setPhone(DEMO_USER.phone);
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
      } catch {
        // Fall back silently; fields stay empty
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [isDemo]);

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
        throw new Error(err.message ?? "Failed to save changes");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function FieldRow({
    label, value, icon: Icon, field, onChange, readOnly,
  }: {
    label: string;
    value: string;
    icon: typeof User;
    field: string;
    onChange: (v: string) => void;
    readOnly?: boolean;
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
          ) : isEditing ? (
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
              {value || <span className="text-text-tertiary">—</span>}
            </p>
          )}
        </div>
        {!readOnly && (
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

        {/* Personal Info */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Personal Information</p>
          <Card className="divide-y divide-border-light">
            <FieldRow label="Full Name" value={name} icon={User} field="name" onChange={setName} />
            <FieldRow label="Email" value={email} icon={Mail} field="email" onChange={setEmail} readOnly />
            <FieldRow label="Phone" value={phone} icon={Phone} field="phone" onChange={setPhone} />
            <FieldRow label="Service Address" value={address} icon={MapPin} field="address" onChange={setAddress} />
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

            {/* Usage bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-text-secondary">Visits this cycle</span>
                <span className="text-[12px] font-semibold text-text-primary">1 of 2 used</span>
              </div>
              <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-primary transition-all" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" fullWidth>Change Plan</Button>
              <Button variant="ghost" size="sm" fullWidth className="text-text-tertiary">Cancel</Button>
            </div>
          </Card>
        </div>

        {/* Payment Methods */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Payment</p>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#1A1F71] text-[11px] font-bold text-white tracking-wider">VISA</div>
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Visa ending in 4242</p>
                  <p className="text-[11px] text-text-tertiary">Expires 08/27</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-full bg-success-light px-2 py-0.5 text-[10px] font-semibold text-success">Default</span>
                <ChevronRight size={14} className="text-text-tertiary" />
              </div>
            </div>
            <Button variant="outline" size="sm" fullWidth icon={<CreditCard size={14} />}>Add Payment Method</Button>
          </Card>
        </div>

        {/* Notifications */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Notifications</p>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-text-secondary" />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Text notifications</p>
                  <p className="text-[11px] text-text-tertiary">Booking confirmations &amp; reminders</p>
                </div>
              </div>
              <button
                onClick={() => setTextNotifs(!textNotifs)}
                className={`relative h-7 w-12 rounded-full transition-colors ${textNotifs ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${textNotifs ? "translate-x-5" : "translate-x-0.5"}`} />
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
                onClick={() => setEmailNotifs(!emailNotifs)}
                className={`relative h-7 w-12 rounded-full transition-colors ${emailNotifs ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${emailNotifs ? "translate-x-5" : "translate-x-0.5"}`} />
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
            <button className="flex w-full items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-text-secondary" />
                <span className="text-[13px] font-semibold text-text-primary">Change Password</span>
              </div>
              <ChevronRight size={14} className="text-text-tertiary" />
            </button>
            <div className="h-px bg-border" />
            <button className="flex w-full items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <Trash2 size={16} className="text-error" />
                <span className="text-[13px] font-semibold text-error">Delete Account</span>
              </div>
              <ChevronRight size={14} className="text-text-tertiary" />
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
    </div>
  );
}
