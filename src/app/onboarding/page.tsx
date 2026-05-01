"use client";

import { useState, useEffect } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "welcome"
  | "step-1"
  | "step-2"
  | "step-3"
  | "step-4"
  | "success";

type HomeType = "Single Family" | "Townhouse" | "Condo" | "Other";
type PlanId = "basic" | "pro" | "premium";

// ─── DFW Map ─────────────────────────────────────────────────────────────────

const dfwCities = [
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

const dfwCityNames = new Set(dfwCities.map((c) => c.name.toLowerCase()));

function DFWMap() {
  return (
    <svg
      viewBox="0 0 340 260"
      width="340"
      height="260"
      className="mx-auto"
      aria-label="DFW Metro service area map"
    >
      {/* Background metro blob */}
      <ellipse cx="170" cy="130" rx="148" ry="108" fill="#EAF4F4" opacity="0.9" />
      <ellipse cx="170" cy="130" rx="148" ry="108" fill="none" stroke="#B5D7D8" strokeWidth="1.5" />

      {/* Subtle grid lines */}
      <line x1="30" y1="130" x2="310" y2="130" stroke="#D4E8E9" strokeWidth="0.5" strokeDasharray="4 4" />
      <line x1="170" y1="22" x2="170" y2="238" stroke="#D4E8E9" strokeWidth="0.5" strokeDasharray="4 4" />

      {/* City nodes */}
      {dfwCities.map((city) => (
        <g key={city.name}>
          {/* Outer glow ring */}
          <circle cx={city.x} cy={city.y} r="10" fill="#4F9598" opacity="0.12" />
          {/* Main circle */}
          <circle cx={city.x} cy={city.y} r="7" fill="#4F9598" />
          {/* Inner highlight */}
          <circle cx={city.x} cy={city.y - 2} r="2.5" fill="white" opacity="0.35" />
          {/* Label — position above or below based on y */}
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

const plans = [
  {
    id: "basic" as PlanId,
    name: "Basic",
    price: 49,
    visits: "2 visits / month",
    popular: false,
    features: [
      "2 scheduled visits/month",
      "General maintenance tasks",
      "Photo documentation",
      "Email support",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    price: 89,
    visits: "4 visits / month",
    popular: true,
    features: [
      "4 scheduled visits/month",
      "Priority scheduling",
      "Parts procurement help",
      "Phone & chat support",
    ],
  },
  {
    id: "premium" as PlanId,
    name: "Premium",
    price: 149,
    visits: "Unlimited visits",
    popular: false,
    features: [
      "Unlimited visits",
      "Same-day availability",
      "Dedicated handyman",
      "24/7 emergency support",
    ],
  },
];

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
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface active:bg-surface-secondary transition-colors"
        >
          <Minus size={14} className="text-text-primary" />
        </button>
        <span className="w-6 text-center text-[16px] font-bold text-text-primary">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface active:bg-surface-secondary transition-colors"
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
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
        <Icon size={16} className="shrink-0 text-text-tertiary" />
        <input
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

  // Step 1 — account info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step1Error, setStep1Error] = useState("");

  // Step 2 — home info
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [homeType, setHomeType] = useState<HomeType>("Single Family");
  const [yearBuilt, setYearBuilt] = useState("");
  const [sqft, setSqft] = useState("");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [step2Error, setStep2Error] = useState("");

  // Step 3 — service area check (real lookup against city list)
  const [areaStatus, setAreaStatus] = useState<"checking" | "in-area" | "out-area">("checking");

  // Step 4 — plan
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");

  // Service area check on entering step 3
  useEffect(() => {
    if (screen !== "step-3") return;
    setAreaStatus("checking");
    const t = setTimeout(() => {
      const isServed = dfwCityNames.has(city.trim().toLowerCase());
      setAreaStatus(isServed ? "in-area" : "out-area");
    }, 600);
    return () => clearTimeout(t);
  }, [screen, city]);

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

      setScreen("step-2");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setStep1Error(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep2Continue() {
    setStep2Error("");
    if (!street.trim() || !city.trim() || !zip.trim()) {
      setStep2Error("Address, city, and ZIP are required.");
      return;
    }

    setSubmitting(true);
    try {
      // Stash extras (homeType, sqft, beds, baths) in notes since the schema
      // doesn't have dedicated columns. yearBuilt has its own column.
      const noteParts = [
        `Type: ${homeType}`,
        sqft.trim() && `Sqft: ${sqft.trim()}`,
        `Bedrooms: ${bedrooms}`,
        `Bathrooms: ${bathrooms}`,
      ].filter(Boolean);

      const yearBuiltNum = yearBuilt.trim() ? Number.parseInt(yearBuilt.trim(), 10) : undefined;

      const res = await fetch("/api/homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: street.trim(),
          city: city.trim(),
          zip: zip.trim(),
          state: "TX",
          notes: noteParts.join(" • "),
          ...(yearBuiltNum && !Number.isNaN(yearBuiltNum) ? { yearBuilt: yearBuiltNum } : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data.error || "Could not save your home.";
        setStep2Error(msg);
        toast.error(msg);
        return;
      }

      setScreen("step-3");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setStep2Error(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartPlan() {
    setSubmitting(true);
    try {
      // Customers can only set themselves to the free tier today (Stripe pending).
      // Always POST "free" — we record the user's preferred plan in toast/UI so
      // they remember to upgrade when paid plans go live.
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "free" }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data.error || "Could not start your plan.";
        toast.error(msg);
        return;
      }

      if (selectedPlan !== "basic") {
        toast.info(`We'll let you know when ${plans.find((p) => p.id === selectedPlan)?.name} is available to upgrade.`);
      } else {
        toast.success("Welcome to MCQ Home Co.!");
      }
      setScreen("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Screen renderers ────────────────────────────────────────────────────────

  function renderWelcome() {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-[0_8px_32px_rgba(79,149,152,0.30)]">
            <span className="text-[20px] font-black tracking-[-0.06em] text-white">MCQ</span>
          </div>
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-text-primary">
              MCQ Home Co.
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
                // Already signed in — skip account step, go straight to home info.
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

        <p className="mt-8 text-[11px] text-text-tertiary">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pt-14 pb-4">
          <button
            type="button"
            onClick={() => setScreen("welcome")}
            className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary"
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
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">First Name</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <User size={15} className="shrink-0 text-text-tertiary" />
                  <input
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
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">Last Name</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <User size={15} className="shrink-0 text-text-tertiary" />
                  <input
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
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-8 pt-4">
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
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pt-14 pb-4">
          <button
            type="button"
            onClick={() => setScreen(sessionStatus === "authenticated" ? "welcome" : "step-1")}
            className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary"
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
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
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
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-8 pt-4">
          <button
            type="button"
            onClick={handleStep2Continue}
            disabled={submitting}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              submitting
                ? "bg-primary/40 cursor-not-allowed"
                : "bg-primary shadow-[0_4px_16px_rgba(79,149,152,0.30)] active:bg-primary-dark"
            }`}
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pt-14 pb-4">
          <button
            type="button"
            onClick={() => setScreen("step-2")}
            className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary"
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
            <p className="mt-1 text-[13px] text-text-secondary">We currently serve the DFW Metro Area.</p>
          </div>

          {/* Map */}
          <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-[#F0F8F8] p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <DFWMap />
          </div>

          {/* City list */}
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Service Cities
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dfwCities.map((c) => (
                <span
                  key={c.name}
                  className="rounded-full bg-primary-50 px-3 py-1 text-[12px] font-semibold text-primary"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Service area check */}
          <div className={`rounded-2xl border px-4 py-4 transition-all ${
            areaStatus === "in-area"
              ? "border-[#BBF7D0] bg-[#F0FFF4]"
              : areaStatus === "out-area"
              ? "border-error/30 bg-error/5"
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
                    We don&apos;t serve {city || "your city"} yet — but we&apos;re expanding fast.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-8 pt-4">
          <button
            type="button"
            onClick={() => areaStatus === "in-area" && setScreen("step-4")}
            disabled={areaStatus !== "in-area"}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              areaStatus === "in-area"
                ? "bg-primary shadow-[0_4px_16px_rgba(79,149,152,0.30)] active:bg-primary-dark"
                : "bg-primary/40 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pt-14 pb-4">
          <button
            type="button"
            onClick={() => setScreen("step-3")}
            className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary"
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
            <h2 className="text-[24px] font-black text-text-primary">Choose Your Plan</h2>
            <p className="mt-1 text-[13px] text-text-secondary">All plans include fully insured, reliable service.</p>
          </div>

          {/* Stripe-pending notice */}
          <div className="mb-5 rounded-2xl border border-primary/20 bg-primary-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-[12px] leading-relaxed text-primary">
                Paid plans launch soon. We&apos;ll start you on the free tier today and notify you when your selected plan is ready to activate.
              </p>
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
                  className={`relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-gradient-to-br from-primary-50 to-white shadow-[0_4px_20px_rgba(79,149,152,0.18)]"
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
                      <span className="text-[28px] font-black text-text-primary">${plan.price}</span>
                      <span className="text-[13px] text-text-tertiary">/mo</span>
                    </div>
                    <p className={`text-[12px] font-semibold ${isSelected ? "text-primary" : "text-text-secondary"}`}>
                      {plan.visits}
                    </p>
                  </div>

                  <div className="space-y-1.5">
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
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-8 pt-4">
          <button
            type="button"
            onClick={handleStartPlan}
            disabled={submitting}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-colors ${
              submitting
                ? "bg-primary/40 cursor-not-allowed"
                : "bg-primary shadow-[0_4px_16px_rgba(79,149,152,0.30)] active:bg-primary-dark"
            }`}
          >
            {submitting ? "Setting up…" : "Start with Free Plan"}
          </button>
          <p className="mt-3 text-center text-[12px] text-text-tertiary">
            You can upgrade to a paid plan anytime.
          </p>
        </div>
      </div>
    );
  }

  function renderSuccess() {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
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
          Welcome to MCQ Home Co.!
        </h2>
        <p className="mb-2 max-w-[280px] text-[15px] leading-relaxed text-text-secondary">
          Your home is set up. We&apos;ll be in touch within 24 hours to schedule your first visit.
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
              Free Plan — upgrade to {plans.find((p) => p.id === selectedPlan)?.name} when available
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
    <div className="min-h-screen bg-background lg:flex lg:items-center lg:justify-center">
      <div className="w-full lg:max-w-md lg:rounded-3xl lg:shadow-xl lg:overflow-hidden lg:my-8 [&>div]:lg:min-h-0">
        {renderScreen()}
      </div>
    </div>
  );
}
