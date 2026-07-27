"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Phone,
  Mail,
  User,
  MapPin,
  Building2,
  CalendarDays,
  Maximize2,
  Lock,
  Minus,
  Plus,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/Toaster";
import Spinner from "@/components/Spinner";
import { PLANS, VISIT_USES } from "@/lib/plans";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "welcome"
  | "step-1"
  | "step-2"
  | "step-3"
  | "step-4"
  | "success";

type HomeType = "Single Family" | "Townhouse" | "Condo" | "Other";
type PlanId = "essential" | "pro" | "elite";
type AreaStatus = "idle" | "checking" | "in-area" | "out-area" | "unavailable";

// ─── DFW Map ─────────────────────────────────────────────────────────────────

// Illustrative map coordinates only. Eligibility and the displayed city list
// always come from /api/service-areas.
const dfwMapPoints = [
  { name: "Denton",      x: 72,  y: 38 },
  { name: "Frisco",      x: 160, y: 44 },
  { name: "McKinney",    x: 230, y: 38 },
  { name: "Plano",       x: 216, y: 82 },
  { name: "Allen",       x: 234, y: 72 },
  { name: "Richardson",  x: 200, y: 100 },
  { name: "Garland",     x: 240, y: 114 },
  { name: "Mesquite",    x: 268, y: 138 },
  { name: "Irving",      x: 160, y: 124 },
  { name: "Arlington",   x: 138, y: 164 },
  { name: "Fort Worth",  x: 68,  y: 168 },
  { name: "Grapevine",   x: 112, y: 108 },
  { name: "Southlake",   x: 86,  y: 122 },
  { name: "Keller",      x: 60,  y: 140 },
  { name: "Waxahachie",  x: 170, y: 212 },
];

function normalizeCity(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

async function fetchActiveServiceCities(signal?: AbortSignal) {
  const response = await fetch("/api/service-areas", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error("Could not load service areas.");
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Service-area data is unavailable.");
  }

  const cities = payload
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Map(cities.map((value) => [normalizeCity(value), value])).values()];
}

function DFWMap({ serviceCities }: { serviceCities: string[] }) {
  const activeCities = new Set(serviceCities.map(normalizeCity));
  const mappedCities = dfwMapPoints.filter((city) => activeCities.has(normalizeCity(city.name)));

  return (
    <svg
      viewBox="0 0 340 260"
      className="mx-auto block h-auto w-full max-w-[340px]"
      role="img"
      aria-label="Active MCQ service cities in the DFW Metro area"
    >
      {/* Background metro blob */}
      <ellipse cx="170" cy="130" rx="148" ry="108" fill="#EAF4F4" opacity="0.9" />
      <ellipse cx="170" cy="130" rx="148" ry="108" fill="none" stroke="#B5D7D8" strokeWidth="1.5" />

      {/* Subtle grid lines */}
      <line x1="30" y1="130" x2="310" y2="130" stroke="#D4E8E9" strokeWidth="0.5" strokeDasharray="4 4" />
      <line x1="170" y1="22" x2="170" y2="238" stroke="#D4E8E9" strokeWidth="0.5" strokeDasharray="4 4" />

      {/* City nodes */}
      {mappedCities.map((city) => (
        <g key={city.name}>
          {/* Outer glow ring */}
          <circle cx={city.x} cy={city.y} r="10" fill="#4F9598" opacity="0.12" />
          {/* Main circle */}
          <circle cx={city.x} cy={city.y} r="7" fill="#4F9598" />
          {/* Inner highlight */}
          <circle cx={city.x} cy={city.y - 2} r="2.5" fill="white" opacity="0.35" />
          {/* Label - position above or below based on y */}
          <text
            x={city.x}
            y={city.y > 200 ? city.y + 17 : city.y - 12}
            textAnchor="middle"
            fontSize="8"
            fontWeight="600"
            fill="#3E7B7E"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {city.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Plans ────────────────────────────────────────────────────────────────────
// Derive plan display from the canonical PLANS list so pricing/visits stay
// in sync with /account/plans, /account/manage, and the landing page.

const plans = PLANS.map((p) => ({
  id: p.id as PlanId,
  name: p.label,
  price: p.annualPrice,
  visits: p.visitLabel,
  popular: p.popular ?? false,
  features: p.features,
}));

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < step ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Stepper Input ────────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  min = 0,
  max = 20,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-[14px] font-medium text-text-primary">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition-colors active:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={14} className="text-text-primary" />
        </button>
        <span className="w-6 text-center text-[16px] font-bold text-text-primary">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition-colors active:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} className="text-text-primary" />
        </button>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  inputMode,
  autoComplete,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  const inputId = useId();

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary"
      >
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
        <Icon size={16} className="shrink-0 text-text-tertiary" />
        <input
          id={inputId}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [submitting, setSubmitting] = useState(false);

  // Step 1 - account info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step1Error, setStep1Error] = useState("");

  // Step 2 - home info
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [homeType, setHomeType] = useState<HomeType>("Single Family");
  const [yearBuilt, setYearBuilt] = useState("");
  const [sqft, setSqft] = useState("");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [step2Error, setStep2Error] = useState("");

  // Step 3 - service area check
  const [areaStatus, setAreaStatus] = useState<AreaStatus>("idle");
  const [serviceCities, setServiceCities] = useState<string[]>([]);
  const [areaCheckAttempt, setAreaCheckAttempt] = useState(0);
  const [step3Error, setStep3Error] = useState("");
  const [savedHomeId, setSavedHomeId] = useState<string | null>(null);

  // Step 4 - plan
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("essential");

  // The public endpoint is the source of truth. A failed or empty response is
  // never interpreted as approval, and no home is saved until step 3 continues.
  useEffect(() => {
    if (screen !== "step-3") return;

    const controller = new AbortController();
    setAreaStatus("checking");
    setStep3Error("");

    void fetchActiveServiceCities(controller.signal)
      .then((cities) => {
        if (cities.length === 0) {
          setServiceCities([]);
          setAreaStatus("unavailable");
          setStep3Error("Our service-area list is temporarily unavailable. No home has been saved.");
          return;
        }

        setServiceCities(cities);
        const isServed = cities.some(
          (serviceCity) => normalizeCity(serviceCity) === normalizeCity(city),
        );
        setAreaStatus(isServed ? "in-area" : "out-area");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setServiceCities([]);
        setAreaStatus("unavailable");
        setStep3Error("We could not check your address right now. No home has been saved.");
      });

    return () => controller.abort();
  }, [screen, city, areaCheckAttempt]);

  const homeTypes: HomeType[] = ["Single Family", "Townhouse", "Condo", "Other"];

  // ── Submit handlers ─────────────────────────────────────────────────────────

  async function handleStep1Continue() {
    setStep1Error("");
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setStep1Error("All fields except phone are required.");
      return;
    }
    if (password.length < 8) {
      setStep1Error("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`;
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data.error || "Could not create account.";
        setStep1Error(msg);
        toast.error(msg);
        return;
      }

      const registration = (await res.json()) as {
        claimedExisting?: boolean;
        linkedHomeCount?: number;
        verificationRequired?: boolean;
        verificationSent?: boolean;
      };

      if (registration.verificationRequired) {
        router.push(
          `/verify-email?sent=${registration.verificationSent ? "1" : "0"}&email=${encodeURIComponent(email.trim())}`,
        );
        return;
      }

      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        const msg = "Account created, but auto sign-in failed. Please log in.";
        setStep1Error(msg);
        toast.error(msg);
        return;
      }

      if (registration.claimedExisting && registration.linkedHomeCount) {
        toast.success("Account created — your existing home is linked.");
        router.push("/home?linked=1");
        router.refresh();
        return;
      }

      setScreen("step-2");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setStep1Error(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleStep2Continue() {
    setStep2Error("");
    if (!street.trim() || !city.trim() || !zip.trim()) {
      setStep2Error("Address, city, and ZIP are required.");
      return;
    }

    setScreen("step-3");
  }

  function homePayload() {
    // Stash extras (homeType, sqft, beds, baths) in notes since the schema
    // doesn't have dedicated columns. yearBuilt has its own column.
    const noteParts = [
      `Type: ${homeType}`,
      sqft.trim() && `Sqft: ${sqft.trim()}`,
      `Bedrooms: ${bedrooms}`,
      `Bathrooms: ${bathrooms}`,
    ].filter(Boolean);
    const yearBuiltNum = yearBuilt.trim()
      ? Number.parseInt(yearBuilt.trim(), 10)
      : undefined;

    return {
      address: street.trim(),
      city: city.trim(),
      zip: zip.trim(),
      state: "TX",
      notes: noteParts.join(" • "),
      ...(yearBuiltNum && !Number.isNaN(yearBuiltNum) ? { yearBuilt: yearBuiltNum } : {}),
    };
  }

  async function handleStep3Continue() {
    if (areaStatus !== "in-area" || submitting) return;

    setSubmitting(true);
    setStep3Error("");
    try {
      // Re-check immediately before writing so a stale browser result cannot
      // save an address after the active service-area list changes.
      let activeCities: string[];
      try {
        activeCities = await fetchActiveServiceCities();
      } catch {
        setServiceCities([]);
        setAreaStatus("unavailable");
        setStep3Error("We could not check your address right now. No home has been saved.");
        return;
      }
      setServiceCities(activeCities);

      if (activeCities.length === 0) {
        setAreaStatus("unavailable");
        setStep3Error("Our service-area list is temporarily unavailable. No home has been saved.");
        return;
      }

      const isServed = activeCities.some(
        (serviceCity) => normalizeCity(serviceCity) === normalizeCity(city),
      );
      if (!isServed) {
        setAreaStatus("out-area");
        setStep3Error("This city is not currently in our active service area. No home has been saved.");
        return;
      }

      const response = await fetch(savedHomeId ? `/api/homes/${savedHomeId}` : "/api/homes", {
        method: savedHomeId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(homePayload()),
      });
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (result.code === "EMAIL_VERIFICATION_REQUIRED") {
          router.push("/account/manage?verify=1");
          return;
        }
        if (result.code === "OUTSIDE_SERVICE_AREA" || result.code === "CITY_REQUIRED") {
          setAreaStatus("out-area");
          setStep3Error(result.error || "This address is not in the active service area.");
          return;
        }
        throw new Error(result.error || "Could not save your home.");
      }

      if (!savedHomeId && result.id) setSavedHomeId(result.id);
      setScreen("step-4");
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : "We could not save your home. Please try again.";
      setStep3Error(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartPlan() {
    const planName = plans.find((plan) => plan.id === selectedPlan)?.name ?? "membership";
    toast.info(`Message Anthony to activate the ${planName} plan for your home.`);
    router.push(`/messages?topic=membership&plan=${encodeURIComponent(selectedPlan)}`);
  }

  // ── Screen renderers ────────────────────────────────────────────────────────

  function renderWelcome() {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-[0_8px_32px_rgba(79,149,152,0.30)]">
            <span className="text-[20px] font-black tracking-[-0.06em] text-white">MCQ</span>
          </div>
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-text-primary">
              MCQ Property Care
            </h1>
            <p className="mt-1 text-[15px] font-medium text-text-secondary">Meticulous Craftsman Quality.</p>
          </div>
        </div>

        {/* Tagline card */}
        <div className="mb-10 max-w-[280px] rounded-2xl bg-surface p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[13px] leading-relaxed text-text-secondary">
            Professional handyman service for DFW homeowners. Scheduled visits, a meticulously maintained home, zero hassle.
          </p>
        </div>

        {/* CTAs */}
        <div className="w-full max-w-[320px] space-y-3">
          <button
            type="button"
            onClick={() => {
              if (sessionStatus === "authenticated") {
                // Already signed in - skip account step, go straight to home info.
                setScreen("step-2");
              } else {
                setScreen("step-1");
              }
            }}
            className="w-full rounded-2xl bg-primary py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(79,149,152,0.35)] active:bg-primary-dark transition-colors"
          >
            {sessionStatus === "authenticated" ? "Set Up My Home" : "Create Account"}
          </button>
          <Link
            href="/login"
            className="block w-full rounded-2xl border-2 border-border bg-surface py-4 text-center text-[16px] font-bold text-text-primary active:bg-surface-secondary transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-5 text-[11px] text-text-tertiary">
          <p>By continuing you agree to our</p>
          <div className="flex items-center justify-center gap-1">
            <Link href="/terms" className="inline-flex min-h-11 items-center px-1 font-semibold text-primary">Terms</Link>
            <span>&amp;</span>
            <Link href="/privacy" className="inline-flex min-h-11 items-center px-1 font-semibold text-primary">Privacy Policy</Link>
          </div>
        </div>
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setScreen("welcome")}
            className="-ml-2 mb-2 flex min-h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-text-secondary"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Step 1 of 4</span>
          </div>
          <ProgressBar step={1} total={4} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-32">
          <div className="mb-6 mt-2">
            <h2 className="text-[24px] font-black text-text-primary">Your Info</h2>
            <p className="mt-1 text-[13px] text-text-secondary">Tell us a bit about yourself.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="onboarding-first-name" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">First Name</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <User size={15} className="shrink-0 text-text-tertiary" />
                  <input
                    id="onboarding-first-name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Sarah"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="onboarding-last-name" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">Last Name</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <User size={15} className="shrink-0 text-text-tertiary" />
                  <input
                    id="onboarding-last-name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Mitchell"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <Field
              label="Phone Number (optional)"
              icon={Phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 555-5555"
              value={phone}
              onChange={setPhone}
            />
            <Field
              label="Email Address"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="sarah@example.com"
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Password"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              placeholder="Min 8 characters"
              value={password}
              onChange={setPassword}
            />

            {step1Error && (
              <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/5 p-3 text-[13px] font-medium text-error">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{step1Error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 lg:absolute lg:pb-4">
          <button
            type="button"
            onClick={handleStep1Continue}
            disabled={submitting}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              submitting
                ? "bg-primary/40 cursor-not-allowed"
                : "bg-primary shadow-[0_4px_16px_rgba(79,149,152,0.30)] active:bg-primary-dark"
            }`}
          >
            {submitting ? "Creating Account…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setScreen(sessionStatus === "authenticated" ? "welcome" : "step-1")}
            className="-ml-2 mb-2 flex min-h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-text-secondary"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Step 2 of 4</span>
          </div>
          <ProgressBar step={2} total={4} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-36">
          <div className="mb-6 mt-2">
            <h2 className="text-[24px] font-black text-text-primary">Your Home</h2>
            <p className="mt-1 text-[13px] text-text-secondary">We&apos;ll use this to prepare for every visit.</p>
          </div>

          <div className="space-y-4">
            {/* Address */}
            <Field
              label="Street Address"
              icon={MapPin}
              autoComplete="street-address"
              placeholder="4821 Oak Hollow Dr"
              value={street}
              onChange={setStreet}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" icon={Building2} autoComplete="address-level2" placeholder="Plano" value={city} onChange={setCity} />
              <Field label="ZIP Code" icon={MapPin} inputMode="numeric" autoComplete="postal-code" placeholder="75024" value={zip} onChange={setZip} />
            </div>

            {/* Home type */}
            <div>
              <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
                Home Type
              </label>
              <div className="flex flex-wrap gap-2">
                {homeTypes.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setHomeType(t)}
                    aria-pressed={homeType === t}
                    className={`min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                      homeType === t
                        ? "bg-primary text-white shadow-[0_2px_8px_rgba(79,149,152,0.25)]"
                        : "border border-border bg-surface text-text-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Year Built"
                icon={CalendarDays}
                inputMode="numeric"
                placeholder="2004"
                value={yearBuilt}
                onChange={setYearBuilt}
              />
              <Field
                label="Sq. Footage"
                icon={Maximize2}
                inputMode="numeric"
                placeholder="2,400"
                value={sqft}
                onChange={setSqft}
              />
            </div>

            {/* Steppers */}
            <div className="rounded-xl border border-border bg-surface px-4 py-1">
              <Stepper label="Bedrooms" value={bedrooms} min={1} max={10} onChange={setBedrooms} />
              <Stepper label="Bathrooms" value={bathrooms} min={1} max={10} onChange={setBathrooms} />
            </div>

            {step2Error && (
              <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/5 p-3 text-[13px] font-medium text-error">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{step2Error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 lg:absolute lg:pb-4">
          <button
            type="button"
            onClick={handleStep2Continue}
            className="w-full rounded-2xl bg-primary py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(79,149,152,0.30)] transition-all active:bg-primary-dark"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setScreen("step-2")}
            className="-ml-2 mb-2 flex min-h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-text-secondary"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Step 3 of 4</span>
          </div>
          <ProgressBar step={3} total={4} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-36">
          <div className="mb-5 mt-2">
            <h2 className="text-[24px] font-black text-text-primary">Are you in our service area?</h2>
            <p className="mt-1 text-[13px] text-text-secondary">
              We&apos;ll verify your city before saving your home.
            </p>
          </div>

          {/* Map */}
          <div className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-border bg-[#F0F8F8] p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <DFWMap serviceCities={serviceCities} />
          </div>

          {/* City list */}
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Active Service Cities
            </p>
            {serviceCities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {serviceCities.map((serviceCity) => (
                  <span
                    key={normalizeCity(serviceCity)}
                    className="rounded-full bg-primary-50 px-3 py-1.5 text-[12px] font-semibold text-primary"
                  >
                    {serviceCity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-text-secondary">
                {areaStatus === "checking"
                  ? "Loading the current service-area list…"
                  : "The current service-area list could not be displayed."}
              </p>
            )}
          </div>

          {/* Service area check */}
          <div className={`rounded-2xl border px-4 py-4 transition-all ${
            areaStatus === "in-area"
              ? "border-[#BBF7D0] bg-[#F0FFF4]"
              : areaStatus === "out-area"
              ? "border-error/30 bg-error/5"
              : areaStatus === "unavailable"
              ? "border-amber-300 bg-amber-50"
              : "border-border bg-surface"
          }`}>
            {areaStatus === "checking" && (
              <div className="flex items-center gap-3">
                <Spinner className="h-5 w-5" />
                <span className="text-[14px] font-medium text-text-secondary">Checking your address…</span>
              </div>
            )}
            {areaStatus === "in-area" && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22C55E]">
                  <Check size={16} className="text-white" strokeWidth={3} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#15803D]">Great news!</p>
                  <p className="text-[13px] text-[#16A34A]">{city} is in our service area.</p>
                </div>
              </div>
            )}
            {areaStatus === "out-area" && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error">
                  <AlertCircle size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-error">Not yet available</p>
                  <p className="text-[13px] text-text-secondary">
                    {city || "Your city"} is not in the current service-area list. No home has been saved.
                  </p>
                </div>
              </div>
            )}
            {areaStatus === "unavailable" && (
              <div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500">
                    <AlertCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-amber-900">We couldn&apos;t check just now</p>
                    <p className="text-[13px] text-amber-900/80">
                      {step3Error || "No home has been saved. Please try the check again."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAreaCheckAttempt((attempt) => attempt + 1)}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-[13px] font-bold text-amber-900"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {step3Error && areaStatus !== "unavailable" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-error/30 bg-error/5 p-3 text-[13px] font-medium text-error">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{step3Error}</span>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 lg:absolute lg:pb-4">
          <button
            type="button"
            onClick={handleStep3Continue}
            disabled={areaStatus !== "in-area" || submitting}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              areaStatus === "in-area" && !submitting
                ? "bg-primary shadow-[0_4px_16px_rgba(79,149,152,0.30)] active:bg-primary-dark"
                : "bg-primary/40 cursor-not-allowed"
            }`}
          >
            {submitting ? "Saving Home…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setScreen("step-3")}
            className="-ml-2 mb-2 flex min-h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-text-secondary"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Step 4 of 4</span>
          </div>
          <ProgressBar step={4} total={4} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-44">
          <div className="mb-4 mt-2">
            <h2 className="text-[24px] font-black text-text-primary">Choose a Plan to Discuss</h2>
            <p className="mt-1 text-[13px] text-text-secondary">Every plan includes the same visit length and in-app service tracking.</p>
          </div>

          {/* Activation notice */}
          <div className="mb-5 rounded-2xl border border-primary/20 bg-primary-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-[12px] leading-relaxed text-primary">
                Choose the plan you&apos;re interested in. Anthony will confirm service availability, plan details, and activation with you.
              </p>
            </div>
          </div>

          {/* What you can use visits for */}
          <div className="mb-5 rounded-2xl border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2.5">
              What you can use visits for
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {VISIT_USES.map((use) => (
                <div key={use} className="flex items-center gap-2 text-[13px] text-text-primary">
                  <CheckCircle2 size={13} className="text-primary shrink-0" />
                  <span>{use}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  aria-pressed={isSelected}
                  className={`relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary-50"
                      : "border-border bg-surface"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1">
                      <Sparkles size={10} className="text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white">Most Popular</span>
                    </div>
                  )}

                  <div className="mb-3 pr-24">
                    <p className="text-[18px] font-black text-text-primary">{plan.name}</p>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-[28px] font-black text-text-primary">${plan.price.toLocaleString()}</span>
                      <span className="text-[13px] text-text-tertiary">/yr</span>
                    </div>
                    <p className={`text-[12px] font-semibold ${isSelected ? "text-primary" : "text-text-secondary"}`}>
                      {plan.visits}
                    </p>
                  </div>

                  <div className={`space-y-1.5 ${isSelected ? "pr-8" : ""}`}>
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className={isSelected ? "text-primary" : "text-text-tertiary"}
                        />
                        <span className="text-[13px] text-text-secondary">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute bottom-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Check size={13} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky CTAs */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 lg:absolute lg:pb-4">
          <button
            type="button"
            onClick={handleStartPlan}
            className="w-full rounded-2xl bg-primary py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(79,149,152,0.30)] transition-colors active:bg-primary-dark"
          >
            Message Anthony to Activate
          </button>
          <p className="mt-3 text-center text-[12px] text-text-tertiary">
            Anthony will confirm your plan and visit allowance with you.
          </p>
        </div>
      </div>
    );
  }

  function renderSuccess() {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        {/* Animated checkmark */}
        <div className="mb-8 relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#DCFCE7] animate-[scale-in_0.4s_ease-out]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E] shadow-[0_8px_24px_rgba(34,197,94,0.35)]">
              <Check size={32} className="text-white" strokeWidth={3} />
            </div>
          </div>
          {/* Sparkle dots */}
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary opacity-70 animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="absolute -bottom-2 -left-2 h-3 w-3 rounded-full bg-[#22C55E] opacity-60 animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>

        <h2 className="mb-2 text-[28px] font-black text-text-primary">
          Welcome to MCQ Property Care!
        </h2>
        <p className="mb-2 max-w-[280px] text-[15px] leading-relaxed text-text-secondary">
          Your home is set up. Anthony will follow up to schedule your first visit.
        </p>

        <div className="mb-10 mt-4 w-full max-w-[300px] rounded-2xl bg-surface p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <span className="text-[14px] font-bold text-white">A</span>
            </div>
            <div className="text-left">
              <p className="text-[14px] font-bold text-text-primary">Anthony B.</p>
              <p className="text-[12px] text-text-secondary">Your dedicated handyman</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-2.5">
            <CheckCircle2 size={14} className="text-[#22C55E]" />
            <span className="text-[12px] font-semibold text-text-secondary">
              {plans.find((plan) => plan.id === selectedPlan)?.name ?? "Selected"} plan interest shared
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push("/home");
            router.refresh();
          }}
          className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(79,149,152,0.30)] active:bg-primary-dark transition-colors"
        >
          Go to Home
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  function renderScreen() {
    switch (screen) {
      case "welcome":  return renderWelcome();
      case "step-1":   return renderStep1();
      case "step-2":   return renderStep2();
      case "step-3":   return renderStep3();
      case "step-4":   return renderStep4();
      case "success":  return renderSuccess();
      default:         return renderWelcome();
    }
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background lg:flex lg:items-center lg:justify-center">
      <div className="w-full min-w-0 lg:relative lg:my-8 lg:max-w-md lg:overflow-hidden lg:rounded-3xl lg:shadow-xl [&>div]:lg:min-h-0">
        {renderScreen()}
      </div>
    </div>
  );
}
