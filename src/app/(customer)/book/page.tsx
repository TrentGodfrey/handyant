"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import {
  Calendar, Clock, Camera, ChevronLeft, ChevronRight,
  Upload, X, Check, Repeat, Info, Sun, Sunset,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

// ─── Calendar generation ────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarDay {
  date: number;
  month: string;
  day: string;
  year: number;
  available: boolean;
  isPast: boolean;
  isToday: boolean;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Build N weeks starting from the Monday of the week containing `start`.
function buildCalendar(start: Date, weeksCount: number): CalendarDay[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Find Monday of the week containing `start`
  const monday = new Date(start);
  monday.setHours(0, 0, 0, 0);
  const dayOfWeek = monday.getDay(); // 0=Sun..6=Sat
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(monday.getDate() + offsetToMonday);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeks: CalendarDay[][] = [];
  const cursor = new Date(monday);
  for (let w = 0; w < weeksCount; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const isPast = cursor < today;
      const isToday = isSameDay(cursor, today);
      // Mark Sundays as unavailable, plus past days
      const isSunday = cursor.getDay() === 0;
      week.push({
        date: cursor.getDate(),
        month: MONTH_NAMES[cursor.getMonth()],
        day: dayLabels[cursor.getDay()],
        year: cursor.getFullYear(),
        available: !isPast && !isSunday,
        isPast,
        isToday,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const WEEKS_TOTAL = 10;
const WEEKS_PER_PAGE = 3;

// Demo-mode time slots - 6 fixed 1h 45m slots, matches /api/availability.
// The 12 PM is shown booked in demo to illustrate how unavailable slots
// look (real prod API filters booked slots out entirely).
const demoMorningSlots = [
  { time: "6:00 AM", available: true },
  { time: "8:00 AM", available: true },
  { time: "10:00 AM", available: true },
];

const demoAfternoonSlots = [
  { time: "12:00 PM", available: false },
  { time: "2:00 PM", available: true },
  { time: "4:00 PM", available: true },
];

// Render a slot start time as a range, e.g. "8:00 AM" -> "8:00 - 9:45 AM".
const VISIT_LENGTH_MINUTES = 105;
function slotRangeLabel(displayTime: string): string {
  const [timePart, period] = displayTime.split(" ");
  if (!timePart || !period) return displayTime;
  const [hStr, mStr] = timePart.split(":");
  const h12 = parseInt(hStr, 10);
  const m = parseInt(mStr ?? "0", 10);
  if (Number.isNaN(h12) || Number.isNaN(m)) return displayTime;
  const isPm = period === "PM";
  const startH24 = (isPm ? (h12 % 12) + 12 : h12 % 12);
  const startMins = startH24 * 60 + m;
  const endMins = startMins + VISIT_LENGTH_MINUTES;
  const endH24 = Math.floor(endMins / 60) % 24;
  const endMin = endMins % 60;
  const endPeriod = endH24 >= 12 ? "PM" : "AM";
  const endH12 = endH24 % 12 === 0 ? 12 : endH24 % 12;
  // Compress to a single period suffix when both halves agree.
  const sameHalf = period === endPeriod;
  const startStr = sameHalf ? `${h12}:${String(m).padStart(2, "0")}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
  return `${startStr} - ${endH12}:${String(endMin).padStart(2, "0")} ${endPeriod}`;
}

interface ApiSlot { time: string; available: boolean; }
interface DisplaySlot { time: string; available: boolean; }

// Convert "08:30" → "8:30 AM" / "13:00" → "1:00 PM" for display.
function hhmmToDisplay(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${m} ${period}`;
}

const fallbackCategories = [
  "General Repair", "Plumbing", "Electrical",
  "Painting", "Carpentry", "Smart Home", "HVAC", "Other",
];

// Booking flow is always one-off. Membership sign-up lives on /account/plans.
const BOOKING_SERVICE_TYPE = "one_time" as const;

// Convert display time (e.g. "9:00 AM") to HH:MM (24-hour)
function timeToHHMM(displayTime: string): string {
  const [timePart, period] = displayTime.split(" ");
  const [hourStr, minuteStr] = timePart.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? "00";
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

// Convert selected day/month/year to ISO date string
function toISODate(day: number, month: string, year: number): string {
  const monthMap: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const m = monthMap[month] ?? "01";
  return `${year}-${m}-${String(day).padStart(2, "0")}`;
}

interface Photo { id: string; url: string; name: string; dataUrl?: string; }
interface ServiceCategory { id: string; name: string; }

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function BookingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useSession(); // ensure session is available (used server-side by the API)

  const { isDemo } = useDemoMode();

  const [step, setStep] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [calendarPage, setCalendarPage] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [partsNote, setPartsNote] = useState("");
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real-mode availability state - fetched per selected date.
  const [slots, setSlots] = useState<DisplaySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Build a dynamic calendar starting from today
  const allCalendarWeeks = useMemo(() => buildCalendar(new Date(), WEEKS_TOTAL), []);

  // Fetch real service categories, fall back to hardcoded list on error
  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (!res.ok) throw new Error("services 404");
        return res.json();
      })
      .then((data: ServiceCategory[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data.map((c) => c.name));
        }
      })
      .catch(() => {
        // keep fallbackCategories
      });
  }, []);

  // Pre-fill from URL params (coming from Services page)
  useEffect(() => {
    const service = searchParams.get("service");
    const category = searchParams.get("category");
    if (service) setDescription(`Service requested: ${service}`);
    if (category && !selectedCategories.includes(category)) {
      setSelectedCategories([category]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch real availability whenever the customer picks a new date (real mode only).
  useEffect(() => {
    if (isDemo) return;
    if (selectedDay === null || selectedMonth === null || selectedYear === null) {
      setSlots([]);
      setSlotsError(null);
      return;
    }
    const isoDate = toISODate(selectedDay, selectedMonth, selectedYear);
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    fetch(`/api/availability?date=${isoDate}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: { slots: ApiSlot[] }) => {
        if (cancelled) return;
        const display = (data.slots ?? []).map((s) => ({
          time: hhmmToDisplay(s.time),
          available: s.available,
        }));
        setSlots(display);
        // Drop the previously-picked time if it's no longer offered or available.
        setSelectedTime((prev) => {
          if (!prev) return prev;
          const match = display.find((s) => s.time === prev);
          return match && match.available ? prev : null;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setSlots([]);
        setSlotsError(err instanceof Error ? err.message : "Could not load availability");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDay, selectedMonth, selectedYear, isDemo]);

  const calendarWeeks = allCalendarWeeks.slice(calendarPage * WEEKS_PER_PAGE, (calendarPage + 1) * WEEKS_PER_PAGE);
  const totalPages = Math.ceil(allCalendarWeeks.length / WEEKS_PER_PAGE);

  // Compute month label from the visible weeks
  const monthLabel = useMemo(() => {
    if (!calendarWeeks.length) return "";
    const first = calendarWeeks[0][0];
    const last = calendarWeeks[calendarWeeks.length - 1][6];
    const firstFull = FULL_MONTH_NAMES[MONTH_NAMES.indexOf(first.month)];
    const lastFull = FULL_MONTH_NAMES[MONTH_NAMES.indexOf(last.month)];
    if (first.year === last.year && first.month === last.month) {
      return `${firstFull} ${first.year}`;
    }
    if (first.year === last.year) {
      return `${firstFull} – ${lastFull} ${first.year}`;
    }
    return `${firstFull} ${first.year} – ${lastFull} ${last.year}`;
  }, [calendarWeeks]);

  function goTo(s: number) { setStep(s); window.scrollTo(0, 0); }
  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  async function handlePhotoUpload() {
    if (isDemo) {
      // Demo mode: keep existing placeholder behavior
      const id = Math.random().toString(36).slice(2);
      setPhotos((prev) => [...prev, { id, url: `https://picsum.photos/seed/${id}/200/200`, name: `Photo ${prev.length + 1}` }]);
      return;
    }
    // Real mode: open a file picker, read as data URL, store locally until booking submits
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = false;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const id = Math.random().toString(36).slice(2);
        setPhotos((prev) => [...prev, { id, url: dataUrl, dataUrl, name: file.name || `Photo ${prev.length + 1}` }]);
      } catch {
        // ignore failed read
      }
    };
    input.click();
  }

  function removePhoto(id: string) { setPhotos((prev) => prev.filter((p) => p.id !== id)); }

  const selectedLabel = selectedDay && selectedMonth ? `${selectedMonth} ${selectedDay}` : null;
  const canStep1Continue = selectedDay !== null && selectedTime !== null && selectedYear !== null;

  // Build morning/afternoon arrays from either the API (real) or the demo set.
  const { morningSlots, afternoonSlots } = useMemo(() => {
    const source: DisplaySlot[] = isDemo
      ? [...demoMorningSlots, ...demoAfternoonSlots]
      : slots;
    const morning: DisplaySlot[] = [];
    const afternoon: DisplaySlot[] = [];
    for (const s of source) {
      const isPM = /PM$/.test(s.time);
      const hourPart = parseInt(s.time.split(":")[0], 10);
      // 12:xx PM = noon (afternoon). All other PM = afternoon. AM = morning.
      if (isPM && hourPart !== 12) {
        afternoon.push(s);
      } else if (isPM && hourPart === 12) {
        afternoon.push(s);
      } else {
        morning.push(s);
      }
    }
    return { morningSlots: morning, afternoonSlots: afternoon };
  }, [isDemo, slots]);

  const noSlotsForDay =
    !isDemo && !slotsLoading && !slotsError && slots.length > 0 && slots.every((s) => !s.available);
  const dayClosed = !isDemo && !slotsLoading && !slotsError && slots.length === 0 && selectedDay !== null;

  async function handleConfirmBooking() {
    if (isDemo) {
      // Demo mode: keep existing mock behavior
      router.push("/book/confirmation");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const scheduledDate = toISODate(selectedDay!, selectedMonth!, selectedYear!);
      const scheduledTime = timeToHHMM(selectedTime!);

      // Combine description and partsNote since the schema has no separate parts field on booking
      const combinedDescription = description + (partsNote ? `\n\nParts to bring: ${partsNote}` : "");

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate,
          scheduledTime,
          description: combinedDescription,
          customerNotes: partsNote || null,
          serviceType: BOOKING_SERVICE_TYPE,
          durationMinutes: VISIT_LENGTH_MINUTES,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const booking = await res.json();
      const bookingId: string | undefined = booking?.id;

      // Upload any collected photos against the new booking - best effort
      if (bookingId && photos.length) {
        const uploads = photos
          .filter((p) => p.dataUrl)
          .map((p) =>
            fetch("/api/photos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId,
                dataUrl: p.dataUrl,
                label: p.name,
                type: "before",
              }),
            }).catch(() => null)
          );
        await Promise.all(uploads);
      }

      router.push(bookingId ? `/book/confirmation?id=${bookingId}` : "/book/confirmation");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white px-5 pt-14 lg:pt-8 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          {step > 1 && (
            <button onClick={() => goTo(step - 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-secondary active:bg-border transition-colors">
              <ChevronLeft size={18} className="text-text-secondary" />
            </button>
          )}
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">Step {step} of 3</p>
            <h1 className="text-[22px] font-bold text-text-primary leading-tight">
              {step === 1 ? "When works for you?" : step === 2 ? "Tell us what you need" : "Review & Confirm"}
            </h1>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 pb-28">

        {/* ═══ STEP 1: Date & Time ═══ */}
        {step === 1 && (
          <div className="space-y-0">
            {/* Membership upsell - subtle pointer to /account/plans */}
            <Link
              href="/account/plans"
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-50 px-4 py-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Repeat size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-primary">Looking for a membership?</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Save with Essential, Pro, or Elite plans</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-primary shrink-0" />
            </Link>

            {/* Calendar Grid */}
            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Pick a Date</p>
              <Card padding="md" className="border border-border">
                {/* Month header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarPage(p => Math.max(0, p - 1))}
                    disabled={calendarPage === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft size={18} className="text-text-secondary" />
                  </button>
                  <span className="text-[15px] font-semibold text-text-primary">{monthLabel}</span>
                  <button
                    onClick={() => setCalendarPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={calendarPage === totalPages - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-30"
                  >
                    <ChevronRight size={18} className="text-text-secondary" />
                  </button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div key={i} className="text-center text-[11px] font-semibold text-text-tertiary">{d}</div>
                  ))}
                </div>

                {/* Calendar weeks */}
                {calendarWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                    {week.map((day) => {
                      const isSelected =
                        selectedDay === day.date &&
                        selectedMonth === day.month &&
                        selectedYear === day.year;
                      return (
                        <button
                          key={`${day.year}-${day.month}-${day.date}`}
                          disabled={!day.available}
                          onClick={() => {
                            setSelectedDay(day.date);
                            setSelectedMonth(day.month);
                            setSelectedYear(day.year);
                            setSelectedTime(null);
                          }}
                          className={`relative flex flex-col items-center justify-center rounded-xl h-11 transition-all ${
                            isSelected
                              ? "bg-primary text-white shadow-[0_2px_8px_rgba(79,149,152,0.30)]"
                              : day.available
                              ? "bg-surface hover:bg-primary-50 text-text-primary"
                              : "text-text-tertiary/30 cursor-not-allowed"
                          }`}
                        >
                          <span className={`text-[14px] font-semibold ${isSelected ? "text-white" : ""}`}>{day.date}</span>
                          {day.available && !isSelected && (
                            <div className="absolute bottom-1 h-1 w-1 rounded-full bg-success" />
                          )}
                          {day.isToday && !isSelected && (
                            <div className="absolute bottom-1 h-1 w-3 rounded-full bg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="mt-3 flex items-center gap-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span className="text-[10px] text-text-tertiary">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-3 rounded-full bg-primary" />
                    <span className="text-[10px] text-text-tertiary">Today</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Time Slots - only show after date selected */}
            {selectedDay && (
              <div className="mb-6 animate-slide-up">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Pick a Time for {selectedLabel}
                </p>

                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="md" />
                  </div>
                ) : slotsError ? (
                  <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[13px] text-error">
                    {slotsError}
                  </div>
                ) : dayClosed || noSlotsForDay ? (
                  <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-center">
                    <p className="text-[13px] font-medium text-text-primary">
                      Anthony isn&apos;t available this day
                    </p>
                    <p className="mt-1 text-[12px] text-text-tertiary">Pick another date.</p>
                  </div>
                ) : (
                  <>
                    {/* Morning */}
                    {morningSlots.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sun size={14} className="text-warning" />
                          <span className="text-[12px] font-semibold text-text-secondary">Morning</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {morningSlots.map(({ time, available }) => {
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                disabled={!available}
                                onClick={() => setSelectedTime(time)}
                                className={`rounded-xl py-3.5 px-4 text-[14px] font-semibold transition-all text-left ${
                                  isSelected
                                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(79,149,152,0.3)]"
                                    : available
                                    ? "bg-surface border border-border text-text-primary hover:border-primary/40 hover:bg-primary-50"
                                    : "bg-surface-secondary text-text-tertiary/40 cursor-not-allowed line-through"
                                }`}
                              >
                                {slotRangeLabel(time)}
                                {!available && <span className="ml-2 text-[11px] font-medium no-underline">booked</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Afternoon */}
                    {afternoonSlots.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sunset size={14} className="text-accent-coral" />
                          <span className="text-[12px] font-semibold text-text-secondary">Afternoon</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {afternoonSlots.map(({ time, available }) => {
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                disabled={!available}
                                onClick={() => setSelectedTime(time)}
                                className={`rounded-xl py-3.5 px-4 text-[14px] font-semibold transition-all text-left ${
                                  isSelected
                                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(79,149,152,0.3)]"
                                    : available
                                    ? "bg-surface border border-border text-text-primary hover:border-primary/40 hover:bg-primary-50"
                                    : "bg-surface-secondary text-text-tertiary/40 cursor-not-allowed line-through"
                                }`}
                              >
                                {slotRangeLabel(time)}
                                {!available && <span className="ml-2 text-[11px] font-medium no-underline">booked</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Selection summary */}
            {canStep1Continue && (
              <Card variant="flat" padding="sm" className="mb-5 flex items-center gap-3 border border-success/20 bg-success-light animate-scale-in">
                <Check size={18} className="text-success shrink-0" />
                <p className="text-[13px] font-semibold text-text-primary">
                  {selectedLabel} · {selectedTime ? slotRangeLabel(selectedTime) : ""}
                </p>
              </Card>
            )}

            <Button variant="primary" size="lg" fullWidth disabled={!canStep1Continue} onClick={() => goTo(2)}>
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}

        {/* ═══ STEP 2: Describe the Job ═══ */}
        {step === 2 && (
          <div>
            <Card variant="flat" padding="sm" className="mb-5 flex items-center gap-3 border border-primary-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                <Calendar size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-text-primary">{selectedLabel} · {selectedTime ? slotRangeLabel(selectedTime) : ""}</p>
                <p className="text-[11px] text-text-tertiary">1 hr 45 min visit</p>
              </div>
            </Card>

            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">What needs to be done?</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue or service needed in detail..."
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-surface p-4 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:ring-3 focus:ring-primary/10 focus:outline-none transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-text-tertiary text-right">{description.length} characters</p>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Service Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button key={cat} onClick={() => toggleCategory(cat)}
                      className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                        active ? "bg-primary text-white shadow-sm" : "border border-border bg-surface text-text-secondary hover:border-primary/40"
                      }`}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Photos <span className="ml-1 text-[11px] normal-case font-normal text-text-tertiary">(optional)</span></p>
                <span className="text-[11px] text-text-tertiary">{photos.length}/5</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button onClick={handlePhotoUpload} className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-surface hover:border-primary/50 hover:bg-primary-50 transition-colors">
                  <Camera size={22} className="text-text-tertiary" />
                  <span className="text-[10px] font-medium text-text-tertiary">Camera</span>
                </button>
                <button onClick={handlePhotoUpload} className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-surface hover:border-primary/50 hover:bg-primary-50 transition-colors">
                  <Upload size={22} className="text-text-tertiary" />
                  <span className="text-[10px] font-medium text-text-tertiary">Upload</span>
                </button>
                {photos.map((photo) => (
                  <div key={photo.id} className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden border border-border">
                    <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                    <button onClick={() => removePhoto(photo.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">Parts Needed <span className="ml-1 text-[11px] normal-case font-normal text-text-tertiary">(optional)</span></p>
              <input type="text" value={partsNote} onChange={(e) => setPartsNote(e.target.value)} placeholder="e.g. Broan fan motor, Ecobee thermostat…"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-primary focus:ring-3 focus:ring-primary/10 focus:outline-none transition-colors" />
              <div className="mt-2 flex items-start gap-1.5">
                <Info size={12} className="mt-0.5 shrink-0 text-text-tertiary" />
                <p className="text-[11px] text-text-tertiary">Tech can purchase parts for a $10 procurement fee, or you can provide them yourself.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => goTo(1)}><ChevronLeft size={16} className="-ml-1 mr-1" />Back</Button>
              <Button variant="primary" size="lg" fullWidth onClick={() => goTo(3)}>Review Booking</Button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Confirm ═══ */}
        {step === 3 && (
          <div>
            <Card padding="md" className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4">Booking Summary</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-text-tertiary"><Calendar size={15} /><span className="text-[12px] font-medium uppercase tracking-wide">Date & Time</span></div>
                  <span className="text-[14px] font-semibold text-text-primary">{selectedLabel} · {selectedTime ? slotRangeLabel(selectedTime) : ""}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-text-tertiary"><Clock size={15} /><span className="text-[12px] font-medium uppercase tracking-wide">Duration</span></div>
                  <span className="text-[14px] font-semibold text-text-primary">1 hr 45 min</span>
                </div>
                {selectedCategories.length > 0 && (<><div className="h-px bg-border" /><div><span className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Categories</span><div className="mt-2 flex flex-wrap gap-1.5">{selectedCategories.map((c) => (<span key={c} className="rounded-full bg-primary-50 px-3 py-1 text-[11px] font-medium text-primary">{c}</span>))}</div></div></>)}
                {description && (<><div className="h-px bg-border" /><div><span className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Description</span><p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed">{description}</p></div></>)}
                {partsNote && (<><div className="h-px bg-border" /><div className="flex items-center justify-between"><span className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Parts</span><span className="text-[13px] text-text-secondary">{partsNote}</span></div></>)}
                {photos.length > 0 && (<><div className="h-px bg-border" /><div><span className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Photos ({photos.length})</span><div className="mt-2 flex gap-2">{photos.map((p) => (<img key={p.id} src={p.url} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />))}</div></div></>)}
              </div>
            </Card>

            <Card variant="flat" padding="sm" className="mb-6 border border-success/20 bg-success-light flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 mt-0.5"><Check size={15} className="text-success" /></div>
              <div>
                <p className="text-[13px] font-semibold text-text-primary">You&apos;ll get a confirmation right away</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Text + email confirmation, plus a reminder 24 hours before.</p>
              </div>
            </Card>

            {/* Error banner */}
            {submitError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => goTo(2)} disabled={isSubmitting}>
                <ChevronLeft size={16} className="-ml-1 mr-1" />Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Confirming…
                  </span>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BookingPageInner />
    </Suspense>
  );
}
