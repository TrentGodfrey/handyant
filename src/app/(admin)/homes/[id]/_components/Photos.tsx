"use client";

import Card from "@/components/Card";
import { Plus, X } from "lucide-react";
import type { ApiPhoto } from "./types";

interface PhotosProps {
  photos: ApiPhoto[];
  showAddPhoto: boolean;
  setShowAddPhoto: (v: boolean | ((p: boolean) => boolean)) => void;
  newPhotoUrl: string;
  setNewPhotoUrl: (v: string) => void;
  newPhotoLabel: string;
  setNewPhotoLabel: (v: string) => void;
  savingPhoto: boolean;
  addPhoto: () => void;
}

export default function Photos({
  photos, showAddPhoto, setShowAddPhoto,
  newPhotoUrl, setNewPhotoUrl, newPhotoLabel, setNewPhotoLabel,
  savingPhoto, addPhoto,
}: PhotosProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Photos
          <span className="ml-2 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-text-tertiary">
            {photos.length}
          </span>
        </h2>
        <button
          onClick={() => setShowAddPhoto((v) => !v)}
          className="flex items-center gap-1 text-[12px] font-semibold text-primary active:opacity-70 transition-opacity"
        >
          {showAddPhoto ? <X size={13} /> : <Plus size={13} />}
          {showAddPhoto ? "Cancel" : "Add Photo"}
        </button>
      </div>

      {showAddPhoto && (
        <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50 p-3 space-y-2">
          <input
            type="url"
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            placeholder="Photo URL (https://...)"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            value={newPhotoLabel}
            onChange={(e) => setNewPhotoLabel(e.target.value)}
            placeholder="Caption (optional)"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
          />
          <div className="flex justify-end">
            <button
              onClick={addPhoto}
              disabled={!newPhotoUrl.trim() || savingPhoto}
              className="rounded-lg bg-primary px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
            >
              {savingPhoto ? "Saving…" : "Save Photo"}
            </button>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <Card padding="md" variant="outlined">
          <p className="text-[12px] text-text-tertiary text-center py-2">No photos yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square overflow-hidden rounded-xl border border-border bg-surface-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.label || "Home photo"}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
