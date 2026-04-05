"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Camera, X, ChevronLeft as ArrowLeft, ChevronRight as ArrowRight, Upload, ZoomIn } from "lucide-react";
import Button from "@/components/Button";

interface Photo {
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

const PHOTOS: Photo[] = [
  {
    id: "p1",
    visitDate: "Mar 15, 2026",
    visitLabel: "Mar 15 Visit",
    taskName: "Kitchen Faucet – After",
    hasBefore: true,
    color: "bg-[#EEF4FF]",
    iconColor: "text-primary",
    beforeLabel: "Old faucet with corrosion",
    afterLabel: "New Moen faucet installed",
  },
  {
    id: "p2",
    visitDate: "Mar 15, 2026",
    visitLabel: "Mar 15 Visit",
    taskName: "Garbage Disposal – After",
    hasBefore: true,
    color: "bg-[#F0FDF4]",
    iconColor: "text-success",
    beforeLabel: "Jammed disposal unit",
    afterLabel: "Cleared & tested",
  },
  {
    id: "p3",
    visitDate: "Mar 15, 2026",
    visitLabel: "Mar 15 Visit",
    taskName: "Kitchen Sink Caulk",
    hasBefore: false,
    color: "bg-[#FFFBEB]",
    iconColor: "text-accent-amber",
  },
  {
    id: "p4",
    visitDate: "Feb 28, 2026",
    visitLabel: "Feb 28 Visit",
    taskName: "TV Mount – Living Room",
    hasBefore: true,
    color: "bg-[#F5F3FF]",
    iconColor: "text-accent-purple",
    beforeLabel: "Bare wall before",
    afterLabel: "65\" TV mounted cleanly",
  },
  {
    id: "p5",
    visitDate: "Feb 28, 2026",
    visitLabel: "Feb 28 Visit",
    taskName: "Smart Thermostat Install",
    hasBefore: true,
    color: "bg-[#F0FDFA]",
    iconColor: "text-accent-teal",
    beforeLabel: "Old manual thermostat",
    afterLabel: "Ecobee installed & connected",
  },
  {
    id: "p6",
    visitDate: "Feb 10, 2026",
    visitLabel: "Feb 10 Visit",
    taskName: "Drywall Patch – Hallway",
    hasBefore: true,
    color: "bg-[#FFF7ED]",
    iconColor: "text-accent-coral",
    beforeLabel: "Hole from door handle",
    afterLabel: "Patched & painted",
  },
  {
    id: "p7",
    visitDate: "Feb 10, 2026",
    visitLabel: "Feb 10 Visit",
    taskName: "Drywall Patch – Bedroom",
    hasBefore: false,
    color: "bg-[#FEF2F2]",
    iconColor: "text-error",
  },
  {
    id: "p8",
    visitDate: "Feb 10, 2026",
    visitLabel: "Feb 10 Visit",
    taskName: "Curtain Rod – Master",
    hasBefore: true,
    color: "bg-[#EFF6FF]",
    iconColor: "text-info",
    beforeLabel: "Empty window",
    afterLabel: "Double rod installed",
  },
  {
    id: "p9",
    visitDate: "Jan 22, 2026",
    visitLabel: "Jan 22 Visit",
    taskName: "Bathroom Fan – Master",
    hasBefore: true,
    color: "bg-[#FAFAFA]",
    iconColor: "text-text-secondary",
    beforeLabel: "Old rattling fan",
    afterLabel: "New Broan fan installed",
  },
];

const VISIT_FILTERS = [
  "All Visits",
  "Mar 15 Visit",
  "Feb 28 Visit",
  "Feb 10 Visit",
  "Jan 22 Visit",
];

export default function PhotoGalleryPage() {
  const [activeFilter, setActiveFilter] = useState("All Visits");
  const [modalPhoto, setModalPhoto] = useState<Photo | null>(null);
  const [modalView, setModalView] = useState<"before" | "after">("after");
  const [modalIndex, setModalIndex] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const filtered = activeFilter === "All Visits"
    ? PHOTOS
    : PHOTOS.filter((p) => p.visitLabel === activeFilter);

  function openModal(photo: Photo, index: number) {
    setModalPhoto(photo);
    setModalIndex(index);
    setModalView(photo.hasBefore ? "after" : "after");
  }

  function closeModal() {
    setModalPhoto(null);
  }

  function modalNav(dir: -1 | 1) {
    const next = (modalIndex + dir + filtered.length) % filtered.length;
    const nextPhoto = filtered[next];
    setModalIndex(next);
    setModalPhoto(nextPhoto);
    setModalView(nextPhoto.hasBefore ? "after" : "after");
  }

  function handleUpload() {
    setUploadedCount((c) => c + 1);
  }

  const totalPhotos = PHOTOS.length + uploadedCount;

  return (
    <div className="min-h-screen bg-background pb-28">
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
            <p className="text-[13px] text-text-secondary mt-0.5">{totalPhotos} photos across 4 visits</p>
          </div>
        </div>

        {/* Visit filter chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 -mx-5 px-5 scrollbar-hide">
          {VISIT_FILTERS.map((f) => {
            const count = f === "All Visits"
              ? PHOTOS.length
              : PHOTOS.filter((p) => p.visitLabel === f).length;
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
        {/* Photo grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => openModal(photo, i)}
              className="group rounded-2xl border border-border bg-surface overflow-hidden text-left active:scale-[0.97] transition-transform shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
            >
              {/* Photo placeholder */}
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

              {/* Label */}
              <div className="px-3 py-2.5">
                <p className="text-[12px] font-semibold text-text-primary truncate leading-snug">
                  {photo.taskName}
                </p>
                <p className="text-[10px] text-text-tertiary mt-0.5">{photo.visitDate}</p>
              </div>
            </button>
          ))}

          {/* Upload tile */}
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

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary mb-4">
              <Camera size={28} className="text-text-tertiary" />
            </div>
            <p className="text-[16px] font-semibold text-text-primary">No photos yet</p>
            <p className="text-[13px] text-text-secondary mt-1.5">
              Photos from this visit will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Upload button */}
      <div className="fixed bottom-24 right-5 z-10">
        <button
          onClick={handleUpload}
          className="flex items-center gap-2 rounded-full bg-primary text-white px-5 py-3 text-[13px] font-semibold shadow-[0_4px_20px_rgba(37,99,235,0.4)] active:scale-[0.97] transition-all"
        >
          <Upload size={16} />
          Upload Photo
        </button>
      </div>

      {/* Fullscreen modal */}
      {modalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* Modal header */}
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

          {/* Before / After toggle */}
          {modalPhoto.hasBefore && (
            <div className="flex justify-center mb-4">
              <div className="flex gap-1 rounded-xl bg-white/15 p-1">
                <button
                  onClick={() => setModalView("before")}
                  className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                    modalView === "before"
                      ? "bg-white text-text-primary"
                      : "text-white/70"
                  }`}
                >
                  Before
                </button>
                <button
                  onClick={() => setModalView("after")}
                  className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                    modalView === "after"
                      ? "bg-white text-text-primary"
                      : "text-white/70"
                  }`}
                >
                  After
                </button>
              </div>
            </div>
          )}

          {/* Photo area */}
          <div className="flex-1 flex items-center justify-center px-8 relative">
            {/* Nav arrows */}
            <button
              onClick={() => modalNav(-1)}
              className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/30 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>

            <div className={`w-full max-w-sm aspect-square rounded-2xl ${modalPhoto.color} flex flex-col items-center justify-center gap-3 shadow-xl`}>
              <Camera size={48} className={`${modalPhoto.iconColor} opacity-50`} />
              <p className="text-[14px] font-semibold text-text-secondary text-center px-6">
                {modalPhoto.hasBefore
                  ? (modalView === "before" ? modalPhoto.beforeLabel : modalPhoto.afterLabel)
                  : modalPhoto.taskName
                }
              </p>
              {modalPhoto.hasBefore && (
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold text-white ${
                  modalView === "before" ? "bg-accent-amber" : "bg-success"
                }`}>
                  {modalView === "before" ? "BEFORE" : "AFTER"}
                </span>
              )}
            </div>

            <button
              onClick={() => modalNav(1)}
              className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/30 transition-colors"
            >
              <ArrowRight size={20} className="text-white" />
            </button>
          </div>

          {/* Bottom hint + counter */}
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
