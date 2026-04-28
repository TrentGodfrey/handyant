"use client";

import { X } from "lucide-react";
import type { EditFormState } from "./types";

interface EditHomeModalProps {
  open: boolean;
  editForm: EditFormState;
  setEditForm: (updater: (prev: EditFormState) => EditFormState) => void;
  savingEdit: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function EditHomeModal({
  open, editForm, setEditForm, savingEdit, onClose, onSave,
}: EditHomeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-4">
          <h2 className="text-[16px] font-bold text-text-primary">Edit Home</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary active:bg-surface-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Address */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Street Address
            </label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">City</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">State</label>
              <input
                type="text"
                value={editForm.state}
                onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                maxLength={2}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary uppercase"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">ZIP</label>
            <input
              type="text"
              value={editForm.zip}
              onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Access */}
          <div className="border-t border-border pt-4">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Gate Code
            </label>
            <input
              type="text"
              value={editForm.gateCode}
              onChange={(e) => setEditForm((f) => ({ ...f, gateCode: e.target.value }))}
              placeholder="e.g. 1234#"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi Name</label>
            <input
              type="text"
              value={editForm.wifiName}
              onChange={(e) => setEditForm((f) => ({ ...f, wifiName: e.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi Password</label>
            <input
              type="text"
              value={editForm.wifiPassword}
              onChange={(e) => setEditForm((f) => ({ ...f, wifiPassword: e.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Home details */}
          <div className="border-t border-border pt-4 grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Year Built</label>
              <input
                type="number"
                value={editForm.yearBuilt}
                onChange={(e) => setEditForm((f) => ({ ...f, yearBuilt: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">WH Year</label>
              <input
                type="number"
                value={editForm.waterHeaterYear}
                onChange={(e) => setEditForm((f) => ({ ...f, waterHeaterYear: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Amps</label>
              <input
                type="number"
                value={editForm.panelAmps}
                onChange={(e) => setEditForm((f) => ({ ...f, panelAmps: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-border pt-4">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Notes
            </label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-white px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-white px-4 py-2 text-[13px] font-semibold text-text-secondary active:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={savingEdit}
            className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white active:bg-primary-dark transition-colors disabled:opacity-40"
          >
            {savingEdit ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
