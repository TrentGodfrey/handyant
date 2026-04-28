"use client";

import Card from "@/components/Card";
import {
  MapPin, Edit, Phone, MessageCircle, Navigation, Wifi, Users,
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
}

export default function HomeOverview({
  home, openTasks, totalVisits, totalSpent, fullAddress,
  gateCodeVisible, setGateCodeVisible, onOpenEdit,
}: HomeOverviewProps) {
  const customerInitials = initialsFor(home.customer.name);
  const phoneHref = home.customer.phone ? `tel:${home.customer.phone}` : undefined;
  const smsHref = home.customer.phone ? `sms:${home.customer.phone}` : undefined;
  const navHref = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;

  return (
    <>
      {/* Client Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50">
            <span className="text-[13px] font-bold text-primary">{customerInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-text-primary leading-tight">{home.customer.name}</h1>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="shrink-0 text-text-tertiary" />
              <span className="text-[12px] text-text-secondary truncate">{fullAddress}</span>
            </div>
          </div>
          <button
            onClick={onOpenEdit}
            className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary active:bg-surface-secondary transition-colors flex items-center gap-1"
          >
            <Edit size={11} />
            Edit
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-3 flex items-center gap-1.5">
          <div className="flex flex-1 flex-col items-center rounded-xl bg-surface border border-border py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">{openTasks}</span>
            <span className="text-[10px] text-text-tertiary">Open Tasks</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-xl bg-surface border border-border py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-bold text-text-primary">{totalVisits}</span>
            <span className="text-[10px] text-text-tertiary">Total Visits</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-xl bg-surface border border-border py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
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
      <div className="mb-6 grid grid-cols-2 gap-2.5">
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
          </div>
        </Card>
      </div>
    </>
  );
}
