"use client";

import { useState } from "react";
import Card from "@/components/Card";
import {
  MapPin, Edit, Phone, MessageCircle, Navigation, Wifi, Users, CircleCheck, Clock3,
  Copy, Mail, Share2,
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
  const [activeInvitation, setActiveInvitation] = useState<{
    url: string;
    email: string;
    emailSent: boolean;
    expiresAt: string;
  } | null>(null);

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
      setActiveInvitation(null);
      setInviteMessage("");
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
      setActiveInvitation({
        url: body.inviteUrl,
        email: body.email,
        emailSent: body.emailSent,
        expiresAt: body.expiresAt,
      });
      setInviteMessage(
        body.emailSent
          ? `Secure invitation emailed to ${body.email}. You can also text or copy it below.`
          : "Secure invitation created. Email delivery is not configured yet, so text or copy it below.",
      );
      await onCustomerSaved();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setEmailError(error instanceof Error ? error.message : "Could not create invitation");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInvitation() {
    if (!activeInvitation) return;
    setEmailError("");
    try {
      await navigator.clipboard.writeText(activeInvitation.url);
      setInviteMessage("Secure invitation link copied.");
    } catch {
      setEmailError("Could not copy the link. Use Share instead.");
    }
  }

  async function shareInvitation() {
    if (!activeInvitation) return;
    setEmailError("");
    if (!navigator.share) {
      await copyInvitation();
      return;
    }
    try {
      await navigator.share({
        title: "MCQ Property Care invitation",
        text: "Anthony has set up your MCQ Property Care home. Create your private login with this secure link:",
        url: activeInvitation.url,
      });
      setInviteMessage("Secure invitation shared.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setEmailError("Could not open sharing. Copy the link instead.");
      }
    }
  }
  const customerInitials = initialsFor(home.customer.name);
  const phoneHref = home.customer.phone ? `tel:${home.customer.phone}` : undefined;
  const smsHref = home.customer.phone ? `sms:${home.customer.phone}` : undefined;
  const navHref = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
  const invitationText = activeInvitation
    ? `Hi ${home.customer.name.split(" ")[0]}, Anthony has set up your home in MCQ Property Care. Create your private login here: ${activeInvitation.url} This secure link expires in 7 days and works once.`
    : "";
  const inviteSmsHref = activeInvitation && home.customer.phone
    ? `sms:${home.customer.phone}?&body=${encodeURIComponent(invitationText)}`
    : undefined;
  const inviteEmailHref = activeInvitation
    ? `mailto:${encodeURIComponent(activeInvitation.email)}?subject=${encodeURIComponent("Your MCQ Property Care home is ready")}&body=${encodeURIComponent(invitationText)}`
    : undefined;

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
                            ? `Anthony sets up the home, plan, and tasks first. ${home.customer.name.split(" ")[0]} then uses a private link to choose their own password. It expires after 7 days and works once.`
                            : "Add their email first, then create a secure signup invitation."}
                        </p>
                        {home.customer.email && (
                          <button type="button" disabled={creatingInvite} onClick={createInvitation} className="mt-2 min-h-11 w-full rounded-lg bg-primary px-3 text-[11px] font-bold text-white disabled:opacity-50">
                            {creatingInvite ? "Creating…" : home.pendingInvitation ? "Replace secure invite" : "Create secure invite"}
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
                        {activeInvitation && (
                          <div className="mt-2 rounded-lg border border-primary/20 bg-primary-50 p-2.5">
                            <p className="text-[10px] font-bold text-text-primary">
                              {activeInvitation.emailSent ? "Email delivered" : "Choose how to send it"}
                            </p>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">
                              For assisted setup, text the link to the customer, open it on their phone, and help them choose a password. Anthony never needs to know it.
                            </p>
                            <p className="mt-1 text-[9px] font-medium text-text-tertiary">
                              Expires {new Date(activeInvitation.expiresAt).toLocaleString()} and works once.
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {inviteSmsHref ? (
                                <a href={inviteSmsHref} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-[10px] font-bold text-white">
                                  <MessageCircle size={13} /> Text invite
                                </a>
                              ) : (
                                <button type="button" disabled className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-[10px] font-bold text-white opacity-40">
                                  <MessageCircle size={13} /> No phone
                                </button>
                              )}
                              <button type="button" onClick={shareInvitation} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-[10px] font-bold text-text-primary">
                                <Share2 size={13} /> Share
                              </button>
                              <button type="button" onClick={copyInvitation} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-[10px] font-bold text-text-primary">
                                <Copy size={13} /> Copy link
                              </button>
                              <a href={inviteEmailHref} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-[10px] font-bold text-text-primary">
                                <Mail size={13} /> Email app
                              </a>
                            </div>
                          </div>
                        )}
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
