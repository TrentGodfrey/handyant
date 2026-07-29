"use client";

import Card from "@/components/Card";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import type { ApiPhoto } from "./types";
import type { ChangeEvent } from "react";
import { isVideoUrl } from "@/lib/media";

interface PhotosProps {
  photos: ApiPhoto[];
  showAddMedia: boolean;
  onOpenAddMedia: () => void;
  onCancelAddMedia: () => void;
  newMediaPreviewUrl: string;
  newMediaFileName: string;
  newMediaIsVideo: boolean;
  newMediaLabel: string;
  setNewMediaLabel: (v: string) => void;
  mediaError: string | null;
  savingMedia: boolean;
  deletingPhotoId: string | null;
  selectMedia: (event: ChangeEvent<HTMLInputElement>) => void;
  addMedia: () => void;
  deletePhoto: (photoId: string) => void;
}

export default function Photos({
  photos, showAddMedia, onOpenAddMedia, onCancelAddMedia,
  newMediaPreviewUrl, newMediaFileName, newMediaIsVideo,
  newMediaLabel, setNewMediaLabel,
  mediaError, savingMedia, selectMedia, addMedia,
  deletingPhotoId, deletePhoto,
}: PhotosProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Media
          <span className="ml-2 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-text-tertiary">
            {photos.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={showAddMedia ? onCancelAddMedia : onOpenAddMedia}
          className="flex min-h-11 items-center gap-1 px-2 text-[12px] font-semibold text-primary active:opacity-70 transition-opacity"
        >
          {showAddMedia ? <X size={13} /> : <Plus size={13} />}
          {showAddMedia ? "Cancel" : "Add Media"}
        </button>
      </div>

      {showAddMedia && (
        <div className="mb-3 space-y-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
          {newMediaPreviewUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2">
              {newMediaIsVideo ? (
                <video
                  src={newMediaPreviewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-16 w-16 shrink-0 rounded-lg bg-black object-cover"
                  aria-label="Selected video preview"
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={newMediaPreviewUrl}
                  alt="Selected image preview"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-text-primary">{newMediaFileName}</p>
                <label className="mt-1 inline-flex min-h-11 cursor-pointer items-center text-[12px] font-semibold text-primary">
                  Choose different media
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                    className="sr-only"
                    onChange={selectMedia}
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-surface px-4 py-4 text-center active:bg-primary-50">
              <ImagePlus size={24} className="text-primary" />
              <span className="mt-2 text-[13px] font-semibold text-primary">
                Choose media from phone
              </span>
              <span className="mt-1 text-[11px] text-text-tertiary">
                Photo, MP4, MOV, or WEBM
              </span>
              <input
                type="file"
                accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="sr-only"
                onChange={selectMedia}
              />
            </label>
          )}
          <input
            type="text"
            value={newMediaLabel}
            onChange={(e) => setNewMediaLabel(e.target.value)}
            placeholder="Caption (optional)"
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
          />
          {mediaError && (
            <p role="alert" className="rounded-lg bg-error-light px-3 py-2 text-[12px] font-medium text-error">
              {mediaError}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addMedia}
              disabled={!newMediaPreviewUrl || savingMedia}
              className="min-h-11 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 active:bg-primary-dark transition-colors"
            >
              {savingMedia ? "Uploading…" : "Add Media"}
            </button>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <Card padding="md" variant="outlined">
          <p className="text-[12px] text-text-tertiary text-center py-2">No media yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-secondary"
            >
              {isVideoUrl(photo.url) || /\.(?:mp4|mov|webm)$/i.test(photo.label ?? "") ? (
                <video
                  src={photo.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                  aria-label={photo.label || "Home video"}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo.url}
                alt={photo.label || "Home photo"}
                className="h-full w-full object-cover"
              />
              )}
              <button
                type="button"
                onClick={() => deletePhoto(photo.id)}
                disabled={deletingPhotoId === photo.id}
                aria-label={`Delete ${photo.label || "home media"}`}
                className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white shadow-sm active:bg-black/85 disabled:opacity-60"
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
