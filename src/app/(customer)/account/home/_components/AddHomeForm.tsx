"use client";

import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { ChevronLeft } from "lucide-react";

export interface AddHomeState {
  address: string;
  city: string;
  state: string;
  zip: string;
  gateCode: string;
  notes: string;
}

interface AddHomeFormProps {
  addHome: AddHomeState;
  setAddHome: (updater: (prev: AddHomeState) => AddHomeState) => void;
  addHomeBusy: boolean;
  addHomeError: string | null;
  handleCreateHome: (e: React.FormEvent) => void;
}

export default function AddHomeForm({
  addHome, setAddHome, addHomeBusy, addHomeError, handleCreateHome,
}: AddHomeFormProps) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
          Account
        </Link>
        <h1 className="text-[24px] font-bold text-text-primary">Add Your Home</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Set up your home so we can schedule visits and track work.</p>
      </div>
      <div className="px-5 py-5">
        <Card>
          <form onSubmit={handleCreateHome} className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Street Address</label>
              <input
                type="text"
                value={addHome.address}
                onChange={(e) => setAddHome((s) => ({ ...s, address: e.target.value }))}
                placeholder="123 Main St"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">City</label>
                <input
                  type="text"
                  value={addHome.city}
                  onChange={(e) => setAddHome((s) => ({ ...s, city: e.target.value }))}
                  placeholder="Plano"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">State</label>
                  <input
                    type="text"
                    value={addHome.state}
                    onChange={(e) => setAddHome((s) => ({ ...s, state: e.target.value }))}
                    placeholder="TX"
                    maxLength={2}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">ZIP</label>
                  <input
                    type="text"
                    value={addHome.zip}
                    onChange={(e) => setAddHome((s) => ({ ...s, zip: e.target.value }))}
                    placeholder="75024"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Gate Code (optional)</label>
              <input
                type="text"
                value={addHome.gateCode}
                onChange={(e) => setAddHome((s) => ({ ...s, gateCode: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Notes (optional)</label>
              <textarea
                value={addHome.notes}
                onChange={(e) => setAddHome((s) => ({ ...s, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              />
            </div>
            {addHomeError && <p className="text-[12px] text-error">{addHomeError}</p>}
            <Button size="md" fullWidth disabled={addHomeBusy}>
              {addHomeBusy ? "Saving…" : "Save home"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
