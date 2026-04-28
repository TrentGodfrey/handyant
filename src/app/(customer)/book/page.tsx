"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  Calendar, Clock, Camera, ChevronLeft, ChevronRight,
  Upload, X, Check, Repeat, Zap, Info, Sun, Sunset,
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

// Demo-mode time slots — kept hardcoded so the demo doesn't hit the API.
const demoMorningSlots = [
  { time: "8:00 AM", available: true },
  { time: "9:00 AM", available: true },
  { time: "10:00 AM", available: true },
  { time: "11:00 AM", available: true },
];

const demoAfternoonSlots = [
  { time: "12:00 PM", available: false },
  { time: "1:00 PM", available: true },
  { time: "2:00 PM", available: true },
  { time: "3:00 PM", available: false },
  { time: "4:00 PM", available: true },
];

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

const serviceTypes = [
  { id: "one-time", label: "One-Time Visit", desc: "Single service call", icon: Zap },
  { id: "subscription", label: "Subscription", desc: "Ongoing maintenance plan", icon: Repeat },
];

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
  const [serviceType, setServiceType] = useState("one-time");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [calendarPage, setCalendarPage] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [partsNote, setPartsNote] = useState("");
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real-mode availability state — fetched per selected date.
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
      const apiServiceType = serviceType === "subscription" ? "subscription" : "one_time";

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
          serviceType: apiServiceType,
          durationMinutes: 120,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const booking = await res.json();
      const bookingId: string | undefined = booking?.id;

      // Upload any collected photos against the new booking — best effort
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
            {/* Service Type */}
            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Service Type</p>
              <div className="flex gap-3">
                {serviceTypes.map(({ id, label, desc, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setServiceType(id)}
                    className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                      serviceType === id
                        ? "border-primary bg-primary-50 shadow-[0_0_0_1px_#2563EB]"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                      serviceType === id ? "bg-primary/10" : "bg-surface-secondary"
                    }`}>
                      <Icon size={16} className={serviceType === id ? "text-primary" : "text-text-tertiary"} />
                    </div>
                    <p className={`text-[13px] font-semibold ${serviceType === id ? "text-primary" : "text-text-primary"}`}>{label}</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

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
                              ? "bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.30)]"
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

            {/* Time Slots — only show after date selected */}
            {selectedDay && (
              <div className="mb-6 animate-slide-up">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Pick a Time for {selectedLabel}
                </p>

                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                        <div className="grid grid-cols-4 gap-2">
                          {morningSlots.map(({ time, available }) => {
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                disabled={!available}
                                onClick={() => setSelectedTime(time)}
                                className={`rounded-xl py-3 text-[13px] font-semibold transition-all ${
                                  isSelected
                                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
                                    : available
                                    ? "bg-surface border border-border text-text-secondary hover:border-primary/40 hover:bg-primary-50"
                                    : "bg-surface-secondary text-text-tertiary/40 cursor-not-allowed"
                                }`}
                              >
                                {time.replace(" AM", "a").replace(" PM", "p")}
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
                        <div className="grid grid-cols-4 gap-2">
                          {afternoonSlots.map(({ time, available }) => {
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                disabled={!available}
                                onClick={() => setSelectedTime(time)}
                                className={`rounded-xl py-3 text-[13px] font-semibold transition-all ${
                                  isSelected
                                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
                                    : available
                                    ? "bg-surface border border-border text-text-secondary hover:border-primary/40 hover:bg-primary-50"
                                    : "bg-surface-secondary text-text-tertiary/40 cursor-not-allowed"
                                }`}
                              >
                                {time.replace(" AM", "a").replace(" PM", "p")}
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
                  {selectedLabel} at {selectedTime}
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
                <p className="text-[13px] font-semibold text-text-primary">{selectedLabel} at {selectedTime}</p>
                <p className="text-[11px] text-text-tertiary capitalize">{serviceType.replace("-", " ")} visit</p>
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
                  <span className="text-[14px] font-semibold text-text-primary">{selectedLabel} at {selectedTime}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-text-tertiary"><Zap size={15} /><span className="text-[12px] font-medium uppercase tracking-wide">Type</span></div>
                  <span className="text-[14px] font-semibold text-text-primary capitalize">{serviceType === "subscription" ? "Subscription" : "One-Time"}</span>
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
