"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Star, Camera, ThumbsUp, ThumbsDown, Check, X } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";

const JOB_DATA = {
  id: "1",
  service: "Kitchen Faucet Repair + Garbage Disposal",
  date: "March 15, 2026",
  tech: "Anthony Torres",
  techInitials: "AT",
  hours: "2.5 hours",
  tasks: ["Replaced kitchen faucet cartridge", "Fixed garbage disposal jam", "Caulked kitchen sink"],
};

const CATEGORY_RATINGS = [
  { id: "quality", label: "Quality of Work" },
  { id: "timeliness", label: "Timeliness" },
  { id: "communication", label: "Communication" },
  { id: "cleanliness", label: "Cleanliness" },
];

const CONFETTI_COLORS = [
  "bg-primary", "bg-success", "bg-warning", "bg-accent-coral",
  "bg-accent-purple", "bg-info",
];

function StarRow({
  count,
  size = 32,
  value,
  onChange,
  hovered,
  onHover,
}: {
  count: 5;
  size?: number;
  value: number;
  onChange: (v: number) => void;
  hovered: number;
  onHover: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => {
        const filled = i < (hovered || value);
        return (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            onMouseEnter={() => onHover(i + 1)}
            onMouseLeave={() => onHover(0)}
            onTouchStart={() => onHover(i + 1)}
            onTouchEnd={() => onHover(0)}
            className="transition-transform active:scale-110"
            style={{ fontSize: size }}
          >
            <Star
              size={size}
              className={`transition-all duration-100 ${
                filled
                  ? "fill-warning text-warning drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                  : "fill-border text-border"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Amazing!"];

export default function RateJobPage() {
  const [overallRating, setOverallRating] = useState(0);
  const [overallHovered, setOverallHovered] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [categoryHovered, setCategoryHovered] = useState<Record<string, number>>({});
  const [review, setReview] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const showCategories = overallRating >= 1;

  function setCatRating(id: string, value: number) {
    setCategoryRatings((prev) => ({ ...prev, [id]: value }));
  }
  function setCatHovered(id: string, value: number) {
    setCategoryHovered((prev) => ({ ...prev, [id]: value }));
  }

  function handlePhotoAdd() {
    // Simulate adding a photo
    const id = Math.random().toString(36).slice(2);
    setPhotos((prev) => [...prev, id]);
  }

  function handleSubmit() {
    if (overallRating === 0) return;
    setSubmitted(true);
  }

  const displayRating = overallHovered || overallRating;
  const allCatsFilled = CATEGORY_RATINGS.every((c) => (categoryRatings[c.id] ?? 0) > 0);

  // --- Thank you state ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 pt-14 pb-28">
        {/* Confetti burst */}
        <div className="relative mb-6">
          {Array.from({ length: 24 }).map((_, i) => {
            const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
            const angle = (i / 24) * 360;
            const distance = 50 + Math.random() * 40;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;
            return (
              <div
                key={i}
                className={`absolute h-2 w-2 rounded-sm ${color} opacity-0`}
                style={{
                  left: "50%",
                  top: "50%",
                  animation: `confetti-burst 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 30}ms forwards`,
                  "--tx": `${x}px`,
                  "--ty": `${y}px`,
                } as React.CSSProperties}
              />
            );
          })}
          <style>{`
            @keyframes confetti-burst {
              0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
              60% { opacity: 1; }
              100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(${Math.random() * 180}deg); opacity: 0; }
            }
          `}</style>

          <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-success shadow-[0_4px_24px_rgba(22,163,74,0.35)]">
            <Check size={42} className="text-white" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-[28px] font-bold text-text-primary text-center">Thank you!</h1>
        <p className="text-[15px] text-text-secondary text-center mt-2 leading-relaxed max-w-[260px]">
          Your review helps us keep Anthony's work excellent and improve the service.
        </p>

        {/* Star display */}
        <div className="mt-5 flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={24}
              className={i < overallRating ? "fill-warning text-warning" : "fill-border text-border"}
            />
          ))}
        </div>
        <p className="text-[13px] text-text-secondary mt-1">
          You rated Anthony {overallRating} out of 5 stars
        </p>

        <div className="mt-8 w-full space-y-3 max-w-sm">
          <Link href="/messages" className="block">
            <Button variant="primary" fullWidth>Message Anthony</Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="outline" fullWidth>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Account
        </Link>
        <h1 className="text-[24px] font-bold text-text-primary">Rate Your Visit</h1>
        <p className="text-[13px] text-text-secondary mt-1">Share your experience with the community</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Job summary */}
        <Card padding="md">
          <div className="flex items-center gap-3.5 mb-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white shadow-sm">
              {JOB_DATA.techInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-text-primary">{JOB_DATA.tech}</p>
              <p className="text-[12px] text-text-secondary">{JOB_DATA.date} · {JOB_DATA.hours}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-secondary px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
              Completed
            </span>
          </div>
          <div className="h-px bg-border mb-3.5" />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">Work completed</p>
          <ul className="space-y-1.5">
            {JOB_DATA.tasks.map((task) => (
              <li key={task} className="flex items-center gap-2">
                <Check size={12} className="text-success shrink-0" strokeWidth={2.5} />
                <span className="text-[13px] text-text-secondary">{task}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Overall star rating */}
        <Card padding="lg">
          <p className="text-[15px] font-bold text-text-primary text-center mb-1">Overall Rating</p>
          <p className="text-[12px] text-text-secondary text-center mb-5">
            How was your experience with {JOB_DATA.tech.split(" ")[0]}?
          </p>

          <div className="flex justify-center mb-3">
            <StarRow
              count={5}
              size={44}
              value={overallRating}
              onChange={setOverallRating}
              hovered={overallHovered}
              onHover={setOverallHovered}
            />
          </div>

          <div className="h-7 flex items-center justify-center">
            {displayRating > 0 && (
              <p className={`text-[15px] font-semibold transition-all ${
                displayRating >= 4 ? "text-success" : displayRating >= 3 ? "text-warning" : "text-error"
              }`}>
                {STAR_LABELS[displayRating]}
              </p>
            )}
          </div>
        </Card>

        {/* Category ratings — shown after overall is selected */}
        {showCategories && (
          <Card padding="md">
            <p className="text-[13px] font-bold text-text-primary mb-4">Rate specific areas</p>
            <div className="space-y-4">
              {CATEGORY_RATINGS.map((cat, i) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-text-secondary">{cat.label}</span>
                    {categoryRatings[cat.id] > 0 && (
                      <span className="text-[11px] font-semibold text-text-tertiary">
                        {STAR_LABELS[categoryRatings[cat.id]]}
                      </span>
                    )}
                  </div>
                  <StarRow
                    count={5}
                    size={26}
                    value={categoryRatings[cat.id] ?? 0}
                    onChange={(v) => setCatRating(cat.id, v)}
                    hovered={categoryHovered[cat.id] ?? 0}
                    onHover={(v) => setCatHovered(cat.id, v)}
                  />
                  {i < CATEGORY_RATINGS.length - 1 && <div className="mt-4 h-px bg-border" />}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Written review */}
        {showCategories && (
          <Card padding="md">
            <p className="text-[13px] font-bold text-text-primary mb-3">Written Review</p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={`Tell others about your experience with ${JOB_DATA.tech.split(" ")[0]}…`}
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-surface-secondary px-4 py-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:bg-surface transition-all leading-relaxed"
            />
            <p className="text-[11px] text-text-tertiary mt-2 text-right">
              {review.length}/500
            </p>
          </Card>
        )}

        {/* Photo upload */}
        {showCategories && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-text-primary">Add Photos</p>
              <span className="text-[11px] text-text-tertiary">Optional</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {photos.map((id, i) => (
                <div
                  key={id}
                  className="relative h-20 w-20 rounded-xl bg-surface-secondary border border-border overflow-hidden flex items-center justify-center"
                >
                  <Camera size={22} className="text-text-tertiary" />
                  <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-text-tertiary font-medium">
                    Photo {i + 1}
                  </span>
                  <button
                    onClick={() => setPhotos((prev) => prev.filter((p) => p !== id))}
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-text-primary/70"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}

              {photos.length < 6 && (
                <button
                  onClick={handlePhotoAdd}
                  className="h-20 w-20 rounded-xl border-2 border-dashed border-border bg-surface-secondary flex flex-col items-center justify-center gap-1 hover:border-primary/40 hover:bg-primary-50/40 transition-colors active:scale-[0.97]"
                >
                  <Camera size={20} className="text-text-tertiary" />
                  <span className="text-[10px] font-medium text-text-tertiary">Add Photo</span>
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Recommend toggle */}
        {showCategories && (
          <Card padding="md">
            <p className="text-[13px] font-bold text-text-primary mb-3">
              Would you recommend HandyAnt to a friend?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRecommend(true)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition-all active:scale-[0.98] ${
                  recommend === true
                    ? "border-success bg-success-light text-success"
                    : "border-border bg-surface-secondary text-text-secondary"
                }`}
              >
                <ThumbsUp size={16} />
                Yes, definitely
              </button>
              <button
                onClick={() => setRecommend(false)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition-all active:scale-[0.98] ${
                  recommend === false
                    ? "border-error bg-error-light text-error"
                    : "border-border bg-surface-secondary text-text-secondary"
                }`}
              >
                <ThumbsDown size={16} />
                Not really
              </button>
            </div>
          </Card>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          fullWidth
          size="lg"
          disabled={overallRating === 0}
          onClick={handleSubmit}
        >
          Submit Review
        </Button>

        {overallRating === 0 && (
          <p className="text-center text-[12px] text-text-tertiary -mt-2">
            Tap a star to get started
          </p>
        )}
      </div>
    </div>
  );
}
