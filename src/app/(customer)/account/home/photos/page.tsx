"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft, Camera, X,
  ChevronLeft as ArrowLeft, ChevronRight as ArrowRight,
  Upload, ZoomIn, Loader2, Trash2,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

// =====================================================================
// Demo data (preserved)
// =====================================================================

interface DemoPhoto {
  id: string;
  visitDate: string;
  visitLabel: string;
  taskName: string;
  hasBefore: boolean;
  color: string;
  iconColor: string;
  beforeLabel?: string;
  afterLabel?: string;
}

const DEMO_PHOTOS: DemoPhoto[] = [
  { id: "p1", visitDate: "Mar 15, 2026", visitLabel: "Mar 15 Visit", taskName: "Kitchen Faucet – After", hasBefore: true, color: "bg-[#EEF4FF]", iconColor: "text-primary", beforeLabel: "Old faucet with corrosion", afterLabel: "New Moen faucet installed" },
  { id: "p2", visitDate: "Mar 15, 2026", visitLabel: "Mar 15 Visit", taskName: "Garbage Disposal – After", hasBefore: true, color: "bg-[#F0FDF4]", iconColor: "text-success", beforeLabel: "Jammed disposal unit", afterLabel: "Cleared & tested" },
  { id: "p3", visitDate: "Mar 15, 2026", visitLabel: "Mar 15 Visit", taskName: "Kitchen Sink Caulk", hasBefore: false, color: "bg-[#FFFBEB]", iconColor: "text-accent-amber" },
  { id: "p4", visitDate: "Feb 28, 2026", visitLabel: "Feb 28 Visit", taskName: "TV Mount – Living Room", hasBefore: true, color: "bg-[#F5F3FF]", iconColor: "text-accent-purple", beforeLabel: "Bare wall before", afterLabel: "65\" TV mounted cleanly" },
  { id: "p5", visitDate: "Feb 28, 2026", visitLabel: "Feb 28 Visit", taskName: "Smart Thermostat Install", hasBefore: true, color: "bg-[#F0FDFA]", iconColor: "text-accent-teal", beforeLabel: "Old manual thermostat", afterLabel: "Ecobee installed & connected" },
  { id: "p6", visitDate: "Feb 10, 2026", visitLabel: "Feb 10 Visit", taskName: "Drywall Patch – Hallway", hasBefore: true, color: "bg-[#FFF7ED]", iconColor: "text-accent-coral", beforeLabel: "Hole from door handle", afterLabel: "Patched & painted" },
  { id: "p7", visitDate: "Feb 10, 2026", visitLabel: "Feb 10 Visit", taskName: "Drywall Patch – Bedroom", hasBefore: false, color: "bg-[#FEF2F2]", iconColor: "text-error" },
  { id: "p8", visitDate: "Feb 10, 2026", visitLabel: "Feb 10 Visit", taskName: "Curtain Rod – Master", hasBefore: true, color: "bg-[#EAF4F4]", iconColor: "text-info", beforeLabel: "Empty window", afterLabel: "Double rod installed" },
  { id: "p9", visitDate: "Jan 22, 2026", visitLabel: "Jan 22 Visit", taskName: "Bathroom Fan – Master", hasBefore: true, color: "bg-[#FAFAFA]", iconColor: "text-text-secondary", beforeLabel: "Old rattling fan", afterLabel: "New Broan fan installed" },
];

const DEMO_VISIT_FILTERS = [
  "All Visits",
  "Mar 15 Visit",
  "Feb 28 Visit",
  "Feb 10 Visit",
  "Jan 22 Visit",
];

// =====================================================================
// Real-mode types
// =====================================================================

interface RealPhoto {
  id: string;
  url: string;
  label: string | null;
  type: string | null;
  uploadedAt: string | null;
  bookingId: string | null;
  homeId: string | null;
}

interface HomeRecord {
  id: string;
}

// =====================================================================
// Page
// =====================================================================

export default function PhotoGalleryPage() {
  const { isDemo, mounted } = useDemoMode();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background pb-28 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  return isDemo ? <DemoPhotoGallery /> : <RealPhotoGallery />;
}

// =====================================================================
// Demo gallery (preserved)
// =====================================================================

function DemoPhotoGallery() {
  const [activeFilter, setActiveFilter] = useState("All Visits");
  const [modalPhoto, setModalPhoto] = useState<DemoPhoto | null>(null);
  const [modalView, setModalView] = useState<"before" | "after">("after");
  const [modalIndex, setModalIndex] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const filtered = activeFilter === "All Visits"
    ? DEMO_PHOTOS
    : DEMO_PHOTOS.filter((p) => p.visitLabel === activeFilter);

  function openModal(photo: DemoPhoto, index: number) {
    setModalPhoto(photo);
    setModalIndex(index);
    setModalView("after");
  }

  function closeModal() { setModalPhoto(null); }

  function modalNav(dir: -1 | 1) {
    const next = (modalIndex + dir + filtered.length) % filtered.length;
    const nextPhoto = filtered[next];
    setModalIndex(next);
    setModalPhoto(nextPhoto);
    setModalView("after");
  }

  const totalPhotos = DEMO_PHOTOS.length + uploadedCount;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4">
        <Link
          href="/account/home"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Home Profile
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-text-primary">Visit Photos</h1>
            <p className="text-[13px] text-text-secondary mt-0.5">{totalPhotos} photos across 4 visits</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 -mx-5 px-5 scrollbar-hide">
          {DEMO_VISIT_FILTERS.map((f) => {
            const count = f === "All Visits"
              ? DEMO_PHOTOS.length
              : DEMO_PHOTOS.filter((p) => p.visitLabel === f).length;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold border transition-all ${
                  activeFilter === f
                    ? "bg-primary border-primary text-white"
                    : "bg-surface border-border text-text-secondary hover:border-primary/40"
                }`}
              >
                {f}
                {f !== "All Visits" && (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${
                    activeFilter === f ? "bg-white/25 text-white" : "bg-surface-secondary text-text-tertiary"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => openModal(photo, i)}
              className="group rounded-2xl border border-border bg-surface overflow-hidden text-left active:scale-[0.97] transition-transform shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
            >
              <div className={`relative h-[120px] ${photo.color} flex items-center justify-center`}>
                <Camera size={28} className={`${photo.iconColor} opacity-60`} />
                {photo.hasBefore && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-text-primary/70 px-2 py-0.5">
                    <span className="text-[9px] font-semibold text-white">Before/After</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/90 rounded-full p-1.5">
                    <ZoomIn size={14} className="text-text-primary" />
                  </div>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[12px] font-semibold text-text-primary truncate leading-snug">{photo.taskName}</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">{photo.visitDate}</p>
              </div>
            </button>
          ))}

          {uploadedCount > 0 && Array.from({ length: uploadedCount }).map((_, i) => (
            <div
              key={`upload-${i}`}
              className="rounded-2xl border border-border bg-surface overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
            >
              <div className="relative h-[120px] bg-surface-secondary flex items-center justify-center">
                <Camera size={28} className="text-text-tertiary opacity-60" />
                <div className="absolute top-2 left-2 rounded-full bg-success px-2 py-0.5">
                  <span className="text-[9px] font-semibold text-white">Your photo</span>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[12px] font-semibold text-text-primary">Uploaded Photo</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">Just now</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-24 right-5 z-10">
        <button
          onClick={() => setUploadedCount((c) => c + 1)}
          className="flex items-center gap-2 rounded-full bg-primary text-white px-5 py-3 text-[13px] font-semibold shadow-[0_4px_20px_rgba(79,149,152,0.4)] active:scale-[0.97] transition-all"
        >
          <Upload size={16} />
          Upload Photo
        </button>
      </div>

      {modalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-5 pt-14 pb-4">
            <div>
              <p className="text-white font-semibold text-[15px]">{modalPhoto.taskName}</p>
              <p className="text-white/60 text-[12px] mt-0.5">{modalPhoto.visitDate}</p>
            </div>
            <button
              onClick={closeModal}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 active:bg-white/25 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {modalPhoto.hasBefore && (
            <div className="flex justify-center mb-4">
              <div className="flex gap-1 rounded-xl bg-white/15 p-1">
                <button onClick={() => setModalView("before")} className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${modalView === "before" ? "bg-white text-text-primary" : "text-white/70"}`}>
                  Before
                </button>
                <button onClick={() => setModalView("after")} className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${modalView === "after" ? "bg-white text-text-primary" : "text-white/70"}`}>
                  After
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center px-8 relative">
            <button onClick={() => modalNav(-1)} className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/30 transition-colors">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className={`w-full max-w-sm aspect-square rounded-2xl ${modalPhoto.color} flex flex-col items-center justify-center gap-3 shadow-xl`}>
              <Camera size={48} className={`${modalPhoto.iconColor} opacity-50`} />
              <p className="text-[14px] font-semibold text-text-secondary text-center px-6">
                {modalPhoto.hasBefore
                  ? (modalView === "before" ? modalPhoto.beforeLabel : modalPhoto.afterLabel)
                  : modalPhoto.taskName}
              </p>
              {modalPhoto.hasBefore && (
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold text-white ${modalView === "before" ? "bg-accent-amber" : "bg-success"}`}>
                  {modalView === "before" ? "BEFORE" : "AFTER"}
                </span>
              )}
            </div>
            <button onClick={() => modalNav(1)} className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/30 transition-colors">
              <ArrowRight size={20} className="text-white" />
            </button>
          </div>

          <div className="px-5 py-6 flex items-center justify-between">
            <p className="text-white/40 text-[12px]">Swipe or tap arrows to navigate</p>
            <p className="text-white/60 text-[12px] font-semibold">
              {modalIndex + 1} / {filtered.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Real-mode gallery
// =====================================================================

function formatPhotoDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RealPhotoGallery() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [home, setHome] = useState<HomeRecord | null>(null);
  const [photos, setPhotos] = useState<RealPhoto[]>([]);

  const [modalPhoto, setModalPhoto] = useState<RealPhoto | null>(null);
  const [modalIndex, setModalIndex] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const homesRes = await fetch("/api/homes");
      if (!homesRes.ok) throw new Error("Failed to load homes");
      const homes = (await homesRes.json()) as HomeRecord[];
      if (!Array.isArray(homes) || homes.length === 0) {
        setHome(null);
        setPhotos([]);
        return;
      }
      const h = homes[0];
      setHome(h);
      const photosRes = await fetch(`/api/photos?homeId=${encodeURIComponent(h.id)}`);
      if (!photosRes.ok) throw new Error("Failed to load photos");
      const data = (await photosRes.json()) as RealPhoto[];
      setPhotos(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function triggerUpload() {
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !home) return;
    setUploading(true);
    setUploadError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeId: home.id, dataUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      await refresh();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: RealPhoto) {
    if (deletingId) return;
    setDeletingId(photo.id);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      // If this photo was open in the modal, close it.
      if (modalPhoto?.id === photo.id) {
        setModalPhoto(null);
      }
      await refresh();
    } catch {
      // Soft-fail: keep photo in UI
    } finally {
      setDeletingId(null);
    }
  }

  function openModal(photo: RealPhoto, index: number) {
    setModalPhoto(photo);
    setModalIndex(index);
  }

  function modalNav(dir: -1 | 1) {
    if (photos.length === 0) return;
    const next = (modalIndex + dir + photos.length) % photos.length;
    setModalIndex(next);
    setModalPhoto(photos[next]);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4">
        <Link
          href="/account/home"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Home Profile
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-text-primary">Visit Photos</h1>
            <p className="text-[13px] text-text-secondary mt-0.5">
              {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </p>
          </div>
        </div>
        {(error || uploadError) && (
          <p className="mt-3 text-[12px] text-error">{error ?? uploadError}</p>
        )}
      </div>

      <div className="px-4 py-5">
        {!home ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary mb-4">
              <Camera size={28} className="text-text-tertiary" />
            </div>
            <p className="text-[16px] font-semibold text-text-primary">No home on file</p>
            <p className="text-[13px] text-text-secondary mt-1.5 max-w-xs">
              Set up your home in your profile before adding photos.
            </p>
            <Link
              href="/account/home"
              className="mt-4 text-[13px] font-semibold text-primary"
            >
              Go to Home Profile
            </Link>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary mb-4">
              <Camera size={28} className="text-text-tertiary" />
            </div>
            <p className="text-[16px] font-semibold text-text-primary">No photos yet</p>
            <p className="text-[13px] text-text-secondary mt-1.5">
              Tap Upload Photo to add the first one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => openModal(photo, i)}
                className="group rounded-2xl border border-border bg-surface overflow-hidden text-left active:scale-[0.97] transition-transform shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
              >
                <div className="relative h-[120px] bg-surface-secondary flex items-center justify-center overflow-hidden">
                  <Image
                    src={photo.url}
                    alt={photo.label ?? "Photo"}
                    fill
                    sizes="(max-width: 640px) 50vw, 320px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 rounded-full p-1.5">
                      <ZoomIn size={14} className="text-text-primary" />
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-text-primary truncate leading-snug">
                    {photo.label || "Untitled"}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{formatPhotoDate(photo.uploadedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload button */}
      {home && (
        <div className="fixed bottom-24 right-5 z-10">
          <button
            onClick={triggerUpload}
            disabled={uploading}
            className="flex items-center gap-2 rounded-full bg-primary text-white px-5 py-3 text-[13px] font-semibold shadow-[0_4px_20px_rgba(79,149,152,0.4)] active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading…" : "Upload Photo"}
          </button>
        </div>
      )}

      {/* Modal */}
      {modalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-5 pt-14 pb-4">
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-[15px] truncate">
                {modalPhoto.label || "Photo"}
              </p>
              <p className="text-white/60 text-[12px] mt-0.5">{formatPhotoDate(modalPhoto.uploadedAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                onClick={() => handleDelete(modalPhoto)}
                disabled={deletingId === modalPhoto.id}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 active:bg-white/25 transition-colors disabled:opacity-50"
                aria-label="Delete photo"
              >
                {deletingId === modalPhoto.id
                  ? <Loader2 size={16} className="animate-spin text-white" />
                  : <Trash2 size={16} className="text-white" />}
              </button>
              <button
                onClick={() => setModalPhoto(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 active:bg-white/25 transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-8 relative">
            {photos.length > 1 && (
              <button onClick={() => modalNav(-1)} className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/30 transition-colors">
                <ArrowLeft size={20} className="text-white" />
              </button>
            )}

            <div className="relative w-full max-w-sm aspect-square rounded-2xl bg-surface-secondary overflow-hidden flex items-center justify-center shadow-xl">
              <Image
                src={modalPhoto.url}
                alt={modalPhoto.label ?? "Photo"}
                fill
                sizes="384px"
                className="object-contain"
              />
            </div>

            {photos.length > 1 && (
              <button onClick={() => modalNav(1)} className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/30 transition-colors">
                <ArrowRight size={20} className="text-white" />
              </button>
            )}
          </div>

          <div className="px-5 py-6 flex items-center justify-between">
            <p className="text-white/40 text-[12px]">
              {photos.length > 1 ? "Tap arrows to navigate" : ""}
            </p>
            <p className="text-white/60 text-[12px] font-semibold">
              {modalIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
