"use client";

import { useState } from "react";
import Card from "@/components/Card";
import {
  MapPin, Edit, Phone, MessageCircle, Navigation, Wifi, Users, CircleCheck, Clock3,
} from "lucide-react";
import type { ApiHome } from "./types";
import { initialsFor } from "./types";

interface HomeOverviewProps {
  home: ApiHome;
  openTasks: number;
  totalVisits: number;
  totalSpent: number;
  fullAddress: string;
  gateCodeVisible: boolean;
  setGateCodeVisible: (v: boolean | ((p: boolean) => boolean)) => void;
  onOpenEdit: () => void;
  onCustomerSaved: () => Promise<void>;
}

export default function HomeOverview({
  home, openTasks, totalVisits, totalSpent, fullAddress,
  gateCodeVisible, setGateCodeVisible, onOpenEdit, onCustomerSaved,
}: HomeOverviewProps) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(home.customer.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  async function saveCustomerEmail() {
    setSavingEmail(true);
    setEmailError("");
    try {
      const response = await fetch(`/api/admin/customers/${home.customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not save email");
      }
      await onCustomerSaved();
      setEditingEmail(false);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Could not save email");
    } finally {
      setSavingEmail(false);
    }
  }

  async function createInvitation() {
    setCreatingInvite(true);
    setEmailError("");
    setInviteMessage("");
    try {
      const response = await fetch(`/api/homes/${home.id}/invitation`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Could not create invitation");
      const shareText = `Create your MCQ Property Care login and link your home: ${body.inviteUrl}`;
      if (navigator.share) {
        await navigator.share({ title: "MCQ Property Care invitation", text: shareText, url: body.inviteUrl });
        setInviteMessage(body.emailSent ? "Invitation emailed and shared." : "Secure invitation shared.");
      } else {
        await navigator.clipboard.writeText(body.inviteUrl);
        setInviteMessage(body.emailSent ? "Invitation emailed; link also copied." : "Secure invitation link copied.");
      }
      await onCustomerSaved();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setEmailError(error instanceof Error ? error.message : "Could not create invitation");
    } finally {
      setCreatingInvite(false);
    }
  }
  const customerInitials = initialsFor(home.customer.name);
  const phoneHref = home.customer.phone ? `tel:${home.customer.phone}` : undefined;
  const smsHref = home.customer.phone ? `sms:${home.customer.phone}` : undefined;
  const navHref = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;

  return (
    <>
      {/* Client Header */}
      <div className="mb-4">
        <div className="flex items-start gap-2.5 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50">
            <span className="text-[13px] font-bold text-primary">{customerInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="break-words text-[22px] font-bold leading-tight text-text-primary">{home.customer.name}</h1>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="shrink-0 text-text-tertiary" />
              <span className="text-[12px] text-text-secondary truncate">{fullAddress}</span>
            </div>
          </div>
          <button
            onClick={onOpenEdit}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-secondary transition-colors active:bg-surface-secondary"
          >
            <Edit size={11} />
            Edit
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-3">
          <div className="flex min-w-0 flex-col items-center rounded-xl bg-surface border border-border px-1 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">{openTasks}</span>
            <span className="text-[10px] text-text-tertiary">Open Tasks</span>
          </div>
          <div className="flex min-w-0 flex-col items-center rounded-xl bg-surface border border-border px-1 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">{totalVisits}</span>
            <span className="text-[10px] text-text-tertiary">Total Visits</span>
          </div>
          <div className="flex min-w-0 flex-col items-center rounded-xl bg-surface border border-border px-1 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">${Math.round(totalSpent)}</span>
            <span className="text-[10px] text-text-tertiary">Total Spent</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {/* Call */}
        {phoneHref ? (
          <a href={phoneHref} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors">
            <Phone size={18} className="text-success" />
            <span className="text-[11px] font-medium text-text-secondary">Call</span>
          </a>
        ) : (
          <button
            disabled
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] opacity-40"
          >
            <Phone size={18} className="text-success" />
            <span className="text-[11px] font-medium text-text-secondary">Call</span>
          </button>
        )}

        {/* Text */}
        {smsHref ? (
          <a href={smsHref} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors">
            <MessageCircle size={18} className="text-primary" />
            <span className="text-[11px] font-medium text-text-secondary">Text</span>
          </a>
        ) : (
          <button
            disabled
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] opacity-40"
          >
            <MessageCircle size={18} className="text-primary" />
            <span className="text-[11px] font-medium text-text-secondary">Text</span>
          </button>
        )}

        {/* Navigate */}
        <a
          href={navHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors"
        >
          <Navigation size={18} className="text-accent-teal" />
          <span className="text-[11px] font-medium text-text-secondary">Navigate</span>
        </a>

        {/* Edit */}
        <button
          onClick={onOpenEdit}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-surface-secondary transition-colors"
        >
          <Edit size={18} className="text-text-secondary" />
          <span className="text-[11px] font-medium text-text-secondary">Edit</span>
        </button>
      </div>

      {/* Info Cards: Access + Contact */}
      <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Access (Gate Code) */}
        <Card padding="sm" variant="default">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wifi size={14} className="text-info" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Access</span>
            </div>
            {home.gateCode && (
              <button
                onClick={() => setGateCodeVisible((v) => !v)}
                className="text-[10px] font-medium text-primary active:opacity-70"
              >
                {gateCodeVisible ? "Hide" : "Show"}
              </button>
            )}
          </div>
          <p className="text-[12px] font-semibold text-text-primary">
            {home.gateCode ? "Gate Code" : "No code on file"}
          </p>
          {home.gateCode && (
            <p
              className={`mt-0.5 font-mono text-[11px] transition-all ${
                gateCodeVisible ? "text-text-secondary" : "text-transparent select-none"
              }`}
              style={gateCodeVisible ? {} : { textShadow: "0 0 6px rgba(0,0,0,0.3)" }}
            >
              {home.gateCode}
            </p>
          )}
          {home.wifiName && (
            <p className="mt-1.5 text-[10px] text-text-tertiary truncate">
              WiFi: <span className="font-medium text-text-secondary">{home.wifiName}</span>
            </p>
          )}
        </Card>

        {/* Customer */}
        <Card padding="sm" variant="default">
          <div className="mb-2 flex items-center gap-1.5">
            <Users size={14} className="text-accent-purple" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Contact</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-text-primary">{home.customer.name.split(" ")[0]}</p>
                <p className="text-[10px] text-text-tertiary">Primary</p>
              </div>
              {phoneHref && (
                <a
                  href={phoneHref}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-success-light active:bg-success transition-colors"
                >
                  <Phone size={12} className="text-success" />
                </a>
              )}
            </div>
            <div className={`flex items-start gap-2 rounded-lg p-2 ${home.customer.hasLogin ? "bg-success-light" : "bg-warning-light"}`}>
              {home.customer.hasLogin ? (
                <CircleCheck size={14} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <Clock3 size={14} className="mt-0.5 shrink-0 text-warning" />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-text-primary">
                  {home.customer.hasLogin ? "Customer login linked" : "Awaiting customer signup"}
                </p>
                {!home.customer.hasLogin && (
                  <div className="mt-0.5">
                    {editingEmail ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="customer@example.com"
                          className="min-h-11 w-full rounded-lg border border-border bg-surface px-2.5 text-[12px] text-text-primary outline-none focus:border-primary"
                        />
                        {emailError && <p className="text-[10px] font-medium text-error">{emailError}</p>}
                        <div className="flex gap-2">
                          <button type="button" disabled={savingEmail} onClick={() => setEditingEmail(false)} className="min-h-10 rounded-lg border border-border px-3 text-[11px] font-semibold text-text-secondary">Cancel</button>
                          <button type="button" disabled={savingEmail || !email.trim()} onClick={saveCustomerEmail} className="min-h-10 rounded-lg bg-primary px-3 text-[11px] font-bold text-white disabled:opacity-50">{savingEmail ? "Saving…" : "Save email"}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="break-words text-[10px] leading-relaxed text-text-secondary">
                          {home.customer.email
                            ? `Create a private link for ${home.customer.email}. It expires after 7 days and works once.`
                            : "Add their email first, then create a secure signup invitation."}
                        </p>
                        {home.customer.email && (
                          <button type="button" disabled={creatingInvite} onClick={createInvitation} className="mt-2 min-h-11 w-full rounded-lg bg-primary px-3 text-[11px] font-bold text-white disabled:opacity-50">
                            {creatingInvite ? "Creating…" : home.pendingInvitation ? "Replace & share invite" : "Create & share invite"}
                          </button>
                        )}
                        <button type="button" onClick={() => setEditingEmail(true)} className="mt-1.5 min-h-10 rounded-lg border border-warning/30 bg-surface px-3 text-[11px] font-bold text-text-primary">
                          {home.customer.email ? "Change signup email" : "Add signup email"}
                        </button>
                        {home.pendingInvitation && (
                          <p className="mt-1.5 text-[10px] text-text-tertiary">
                            Invite pending until {new Date(home.pendingInvitation.expiresAt).toLocaleDateString()}.
                          </p>
                        )}
                        {inviteMessage && <p className="mt-1.5 text-[10px] font-semibold text-success">{inviteMessage}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
