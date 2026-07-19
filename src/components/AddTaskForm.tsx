"use client";

import { useRef, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  Camera, Loader2, X, ShoppingCart, AlignLeft, Flag,
} from "lucide-react";
import { prepareImageForUpload } from "@/lib/client-image-upload";

export type Priority = "high" | "medium" | "low";
export type PartsBuyer = "customer" | "tech";

export interface NewTaskPayload {
  task: string;
  description: string | null;
  priority: Priority;
  partsDescription: string | null;
  partsBuyer: PartsBuyer | null;
  photoIds: string[];
  // Derived field for convenience: combined parts label (back-compat)
  parts: string | null;
  partStatus: string | null;
}

interface AddTaskFormProps {
  /**
   * Controls form visibility. When false, the component renders nothing.
   * The parent owns this state so the form can be toggled from various
   * spots (sticky button, FAB, header button, etc).
   */
  open: boolean;
  onCancel: () => void;
  onSubmit: (payload: NewTaskPayload) => Promise<void> | void;
  /**
   * If provided, this homeId is used to upload photos. When omitted,
   * the photo picker is disabled (e.g. demo mode without a home).
   */
  homeId?: string | null;
  /**
   * In demo/disconnected modes you can pass `null` to skip the upload roundtrip
   * and just locally remember a placeholder photo id.
   */
  demoMode?: boolean;
  saving?: boolean;
}

const MAX_DESCRIPTION = 200;
const MAX_PHOTOS = 5;

const PRIORITY_OPTS: { value: Priority; label: string; dot: string }[] = [
  { value: "low", label: "Low", dot: "bg-text-tertiary" },
  { value: "medium", label: "Normal", dot: "bg-warning" },
  { value: "high", label: "High", dot: "bg-error" },
];

export default function AddTaskForm({
  open, onCancel, onSubmit, homeId, demoMode = false, saving = false,
}: AddTaskFormProps) {
  const [task, setTask] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [partsDescription, setPartsDescription] = useState("");
  const [partsBuyer, setPartsBuyer] = useState<PartsBuyer>("customer");
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  function reset() {
    setTask("");
    setDescription("");
    setPriority("medium");
    setPartsDescription("");
    setPartsBuyer("customer");
    setPhotos([]);
    setPhotoError(null);
    setSubmitError(null);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(`Max ${MAX_PHOTOS} photos per task`);
      return;
    }
    setPhotoError(null);

    if (demoMode || !homeId) {
      // Demo: create a local blob URL so the user sees the thumbnail.
      const url = URL.createObjectURL(file);
      setPhotos((p) => [...p, { id: `demo-${Date.now()}`, url }]);
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await prepareImageForUpload(file);
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeId, dataUrl, type: "before" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      const photo = await res.json();
      setPhotos((p) => [...p, { id: photo.id, url: photo.url }]);
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(id: string) {
    setPhotos((p) => p.filter((x) => x.id !== id));
    if (!demoMode && !id.startsWith("demo-")) {
      await fetch(`/api/photos/${id}`, { method: "DELETE" }).catch(() => null);
    }
  }

  async function handleSubmit() {
    if (!task.trim()) return;
    const trimmedParts = partsDescription.trim();
    const partsBuyerLabel = partsBuyer === "tech" ? "Anthony to Purchase" : "Customer to Purchase";

    const payload: NewTaskPayload = {
      task: task.trim(),
      description: description.trim() ? description.trim() : null,
      priority,
      partsDescription: trimmedParts || null,
      partsBuyer: trimmedParts ? partsBuyer : null,
      photoIds: photos.map((p) => p.id),
      // Back-compat fields used by existing TodoList rendering:
      parts: trimmedParts || null,
      partStatus: trimmedParts ? partsBuyerLabel : null,
    };

    setSubmitError(null);
    try {
      await onSubmit(payload);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Task could not be saved.");
    }
  }

  return (
    <Card padding="md" className="mb-3 border border-primary-100 bg-primary-50">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-text-primary">New Task</p>
        <button
          onClick={onCancel}
          className="flex h-7 w-7 items-center justify-center rounded-full text-text-tertiary hover:bg-white hover:text-text-secondary transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Title */}
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
        Task <span className="text-error">*</span>
      </label>
      <input
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="What needs to get done?"
        autoFocus
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none mb-3"
      />

      {/* Description */}
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
        <AlignLeft size={11} />
        Description
        <span className="ml-auto text-[10px] font-normal text-text-tertiary normal-case tracking-normal">
          {description.length}/{MAX_DESCRIPTION}
        </span>
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
        placeholder="Add a brief description (optional)"
        rows={2}
        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none mb-3 resize-none"
      />

      {/* Priority */}
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
        <Flag size={11} />
        Priority
      </label>
      <div className="flex gap-2 mb-3">
        {PRIORITY_OPTS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPriority(opt.value)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all ${
              priority === opt.value
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-text-secondary"
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${priority === opt.value ? "bg-white" : opt.dot}`} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Parts */}
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
        <ShoppingCart size={11} />
        Parts (optional)
      </label>
      <input
        type="text"
        value={partsDescription}
        onChange={(e) => setPartsDescription(e.target.value)}
        placeholder="e.g. Ecobee Smart Thermostat"
        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none mb-2.5"
      />
      {partsDescription.trim() && (
        <div className="mb-3">
          <p className="text-[11px] font-medium text-text-secondary mb-1.5">Who buys the parts?</p>
          <div className="inline-flex rounded-full bg-white p-1 border border-border">
            <button
              type="button"
              onClick={() => setPartsBuyer("customer")}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                partsBuyer === "customer" ? "bg-primary text-white shadow-sm" : "text-text-secondary"
              }`}
            >
              Me
            </button>
            <button
              type="button"
              onClick={() => setPartsBuyer("tech")}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                partsBuyer === "tech" ? "bg-primary text-white shadow-sm" : "text-text-secondary"
              }`}
            >
              Anthony
            </button>
          </div>
        </div>
      )}

      {/* Photos */}
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
        <Camera size={11} />
        Photos (optional)
        <span className="ml-auto text-[10px] font-normal text-text-tertiary normal-case tracking-normal">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </label>
      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt="Task photo"
                className="h-16 w-16 rounded-lg object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white shadow-sm hover:bg-red-700"
                aria-label="Remove photo"
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border bg-surface text-text-tertiary hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Camera size={16} />
                  <span className="text-[9px] font-semibold">Add</span>
                </>
              )}
            </button>
          )}
        </div>
        {photoError && (
          <p className="mt-1.5 text-[11px] text-error">{photoError}</p>
        )}
      </div>

      {submitError && (
        <p className="mb-3 rounded-lg bg-error-light px-3 py-2 text-[11px] font-medium text-error">{submitError}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { reset(); onCancel(); }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          fullWidth
          disabled={!task.trim() || saving}
          onClick={handleSubmit}
        >
          {saving ? "Adding…" : "Add Task"}
        </Button>
      </div>
    </Card>
  );
}
