"use client";

import Card from "@/components/Card";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import type { ApiPhoto } from "./types";
import type { ChangeEvent } from "react";

interface PhotosProps {
  photos: ApiPhoto[];
  showAddPhoto: boolean;
  onOpenAddPhoto: () => void;
  onCancelAddPhoto: () => void;
  newPhotoDataUrl: string;
  newPhotoFileName: string;
  newPhotoLabel: string;
  setNewPhotoLabel: (v: string) => void;
  photoError: string | null;
  preparingPhoto: boolean;
  savingPhoto: boolean;
  deletingPhotoId: string | null;
  selectPhoto: (event: ChangeEvent<HTMLInputElement>) => void;
  addPhoto: () => void;
  deletePhoto: (photoId: string) => void;
}

export default function Photos({
  photos, showAddPhoto, onOpenAddPhoto, onCancelAddPhoto,
  newPhotoDataUrl, newPhotoFileName, newPhotoLabel, setNewPhotoLabel,
  photoError, preparingPhoto, savingPhoto, selectPhoto, addPhoto,
  deletingPhotoId, deletePhoto,
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
          type="button"
          onClick={showAddPhoto ? onCancelAddPhoto : onOpenAddPhoto}
          className="flex items-center gap-1 text-[12px] font-semibold text-primary active:opacity-70 transition-opacity"
        >
          {showAddPhoto ? <X size={13} /> : <Plus size={13} />}
          {showAddPhoto ? "Cancel" : "Add Photo"}
        </button>
      </div>

      {showAddPhoto && (
        <div className="mb-3 space-y-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
          {newPhotoDataUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={newPhotoDataUrl}
                alt="Selected photo preview"
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-text-primary">{newPhotoFileName}</p>
                <label className="mt-1 inline-flex min-h-9 cursor-pointer items-center text-[12px] font-semibold text-primary">
                  Choose a different photo
                  <input type="file" accept="image/*" className="sr-only" onChange={selectPhoto} />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-surface px-4 py-4 text-center active:bg-primary-50">
              <ImagePlus size={24} className="text-primary" />
              <span className="mt-2 text-[13px] font-semibold text-primary">
                {preparingPhoto ? "Preparing photo…" : "Choose photo from phone"}
              </span>
              <span className="mt-1 text-[11px] text-text-tertiary">Camera or photo library</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={preparingPhoto}
                onChange={selectPhoto}
              />
            </label>
          )}
          <input
            type="text"
            value={newPhotoLabel}
            onChange={(e) => setNewPhotoLabel(e.target.value)}
            placeholder="Caption (optional)"
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
          />
          {photoError && (
            <p role="alert" className="rounded-lg bg-error-light px-3 py-2 text-[12px] font-medium text-error">
              {photoError}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addPhoto}
              disabled={!newPhotoDataUrl || preparingPhoto || savingPhoto}
              className="min-h-11 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
            >
              {savingPhoto ? "Uploading…" : "Add Photo"}
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
              className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.label || "Home photo"}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => deletePhoto(photo.id)}
                disabled={deletingPhotoId === photo.id}
                aria-label={`Delete ${photo.label || "home photo"}`}
                className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-sm active:bg-black/85 disabled:opacity-60"
              >
                {deletingPhotoId === photo.id
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
