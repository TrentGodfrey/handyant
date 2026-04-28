"use client";

import Link from "next/link";
import Button from "@/components/Button";
import {
  ChevronLeft, MapPin, Pencil, Plus, Home, Droplets, Zap, Flag,
} from "lucide-react";
import type { HomeFull } from "./types";
import { fmtAddress } from "./types";

interface HomeHeaderProps {
  home: HomeFull;
  highCount: number;

  // Address editing
  editingAddress: boolean;
  setEditingAddress: (v: boolean) => void;
  editAddress: string;
  setEditAddress: (v: string) => void;
  editCity: string;
  setEditCity: (v: string) => void;
  editState: string;
  setEditState: (v: string) => void;
  editZip: string;
  setEditZip: (v: string) => void;
  savingAddress: boolean;
  saveAddress: () => void;
  addressToast: string | null;

  // Details editing
  editingDetails: boolean;
  setEditingDetails: (v: boolean) => void;
  editYearBuilt: string;
  setEditYearBuilt: (v: string) => void;
  editWaterHeaterYear: string;
  setEditWaterHeaterYear: (v: string) => void;
  editPanelAmps: string;
  setEditPanelAmps: (v: string) => void;
  savingDetails: boolean;
  saveDetails: () => void;
}

export default function HomeHeader(props: HomeHeaderProps) {
  const {
    home, highCount,
    editingAddress, setEditingAddress, editAddress, setEditAddress,
    editCity, setEditCity, editState, setEditState, editZip, setEditZip,
    savingAddress, saveAddress, addressToast,
    editingDetails, setEditingDetails,
    editYearBuilt, setEditYearBuilt,
    editWaterHeaterYear, setEditWaterHeaterYear,
    editPanelAmps, setEditPanelAmps,
    savingDetails, saveDetails,
  } = props;

  return (
    <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
      <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
        <ChevronLeft size={16} />
        Account
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-bold text-text-primary">Home Profile</h1>

          {!editingAddress ? (
            <button
              type="button"
              onClick={() => setEditingAddress(true)}
              className="mt-1.5 flex items-start gap-1.5 text-left text-text-tertiary hover:text-text-secondary transition-colors group"
            >
              <MapPin size={13} className="mt-0.5 shrink-0" />
              <span className="text-[13px]">{fmtAddress(home)}</span>
              <Pencil size={11} className="mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Street address"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="City"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="State"
                  maxLength={2}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={editZip}
                  onChange={(e) => setEditZip(e.target.value)}
                  placeholder="ZIP"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" disabled={savingAddress} onClick={saveAddress}>
                  {savingAddress ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditingAddress(false); setEditAddress(home.address); setEditCity(home.city ?? ""); setEditState(home.state ?? ""); setEditZip(home.zip ?? ""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {addressToast && <p className="mt-1 text-[11px] font-medium text-success">{addressToast}</p>}
        </div>
        {highCount > 0 && !editingAddress && (
          <span className="flex items-center gap-1 rounded-full bg-error-light px-3 py-1.5 text-[11px] font-semibold text-error shrink-0">
            <Flag size={11} />
            {highCount} urgent
          </span>
        )}
      </div>

      {/* Home detail pills (editable) */}
      <div className="mt-4">
        {!editingDetails ? (
          <div className="flex flex-wrap gap-2">
            {home.yearBuilt != null && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5">
                <Home size={12} className="text-primary" />
                <span className="text-[11px] text-text-tertiary">Built:</span>
                <span className="text-[11px] font-semibold text-text-primary">{home.yearBuilt}</span>
              </div>
            )}
            {home.waterHeaterYear != null && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5">
                <Droplets size={12} className="text-info" />
                <span className="text-[11px] text-text-tertiary">Water Heater:</span>
                <span className="text-[11px] font-semibold text-text-primary">{home.waterHeaterYear}</span>
              </div>
            )}
            {home.panelAmps != null && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5">
                <Zap size={12} className="text-accent-amber" />
                <span className="text-[11px] text-text-tertiary">Panel:</span>
                <span className="text-[11px] font-semibold text-text-primary">{home.panelAmps}A</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setEditingDetails(true)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-surface-secondary"
            >
              <Plus size={11} />
              {home.yearBuilt == null && home.waterHeaterYear == null && home.panelAmps == null ? "Add details" : "Edit"}
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Built</label>
                <input
                  type="number"
                  value={editYearBuilt}
                  onChange={(e) => setEditYearBuilt(e.target.value)}
                  placeholder="2008"
                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">WH Year</label>
                <input
                  type="number"
                  value={editWaterHeaterYear}
                  onChange={(e) => setEditWaterHeaterYear(e.target.value)}
                  placeholder="2012"
                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Panel A</label>
                <input
                  type="number"
                  value={editPanelAmps}
                  onChange={(e) => setEditPanelAmps(e.target.value)}
                  placeholder="200"
                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={savingDetails} onClick={saveDetails}>
                {savingDetails ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditingDetails(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
