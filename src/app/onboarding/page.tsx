"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Wrench,
  Home,
  ChevronLeft,
  ChevronRight,
  Check,
  Phone,
  Mail,
  User,
  MapPin,
  Building2,
  CalendarDays,
  Maximize2,
  Minus,
  Plus,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "welcome"
  | "sign-in-phone"
  | "sign-in-otp"
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
      <ellipse cx="170" cy="130" rx="148" ry="108" fill="#EFF6FF" opacity="0.9" />
      <ellipse cx="170" cy="130" rx="148" ry="108" fill="none" stroke="#BFDBFE" strokeWidth="1.5" />

      {/* Subtle grid lines */}
      <line x1="30" y1="130" x2="310" y2="130" stroke="#DBEAFE" strokeWidth="0.5" strokeDasharray="4 4" />
      <line x1="170" y1="22" x2="170" y2="238" stroke="#DBEAFE" strokeWidth="0.5" strokeDasharray="4 4" />

      {/* City nodes */}
      {dfwCities.map((city) => (
        <g key={city.name}>
          {/* Outer glow ring */}
          <circle cx={city.x} cy={city.y} r="10" fill="#2563EB" opacity="0.12" />
          {/* Main circle */}
          <circle cx={city.x} cy={city.y} r="7" fill="#2563EB" />
          {/* Inner highlight */}
          <circle cx={city.x} cy={city.y - 2} r="2.5" fill="white" opacity="0.35" />
          {/* Label — position above or below based on y */}
          <text
            x={city.x}
            y={city.y > 200 ? city.y + 17 : city.y - 12}
            textAnchor="middle"
            fontSize="8"
            fontWeight="600"
            fill="#1E40AF"
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
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface active:bg-surface-secondary transition-colors"
        >
          <Minus size={14} className="text-text-primary" />
        </button>
        <span className="w-6 text-center text-[16px] font-bold text-text-primary">{value}</span>
        <button
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
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [screen, setScreen] = useState<Screen>("welcome");

  // Sign-in state
  const [signInPhone, setSignInPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [homeType, setHomeType] = useState<HomeType>("Single Family");
  const [yearBuilt, setYearBuilt] = useState("");
  const [sqft, setSqft] = useState("");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);

  // Step 3 — service area check (simulated)
  const [areaStatus, setAreaStatus] = useState<"checking" | "in-area" | "out-area">("checking");

  // Step 4
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");

  // Simulate area check on step 3
  useEffect(() => {
    if (screen === "step-3") {
      setAreaStatus("checking");
      const t = setTimeout(() => setAreaStatus("in-area"), 1800);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // OTP input handler
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  const homeTypes: HomeType[] = ["Single Family", "Townhouse", "Condo", "Other"];

  // ── Screen renderers ────────────────────────────────────────────────────────

  function renderWelcome() {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-[0_8px_32px_rgba(37,99,235,0.30)]">
            <Home size={28} className="absolute text-white" style={{ top: 14, left: 16 }} />
            <Wrench size={20} className="absolute text-white/80" style={{ bottom: 14, right: 14 }} />
          </div>
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-text-primary">
              HandyAnt
            </h1>
            <p className="mt-1 text-[15px] font-medium text-text-secondary">Your home, handled.</p>
          </div>
        </div>

        {/* Tagline card */}
        <div className="mb-10 max-w-[280px] rounded-2xl bg-surface p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[13px] leading-relaxed text-text-secondary">
            Professional handyman service for DFW homeowners. Scheduled visits, a maintained home, zero hassle.
          </p>
        </div>

        {/* CTAs */}
        <div className="w-full max-w-[320px] space-y-3">
          <button
            onClick={() => setScreen("step-1")}
            className="w-full rounded-2xl bg-primary py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)] active:bg-primary-dark transition-colors"
          >
            Create Account
          </button>
          <button
            onClick={() => setScreen("sign-in-phone")}
            className="w-full rounded-2xl border-2 border-border bg-surface py-4 text-[16px] font-bold text-text-primary active:bg-surface-secondary transition-colors"
          >
            Sign In
          </button>
        </div>

        <p className="mt-8 text-[11px] text-text-tertiary">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    );
  }

  function renderSignInPhone() {
    return (
      <div className="flex min-h-screen flex-col bg-background px-6 pt-16">
        <button onClick={() => setScreen("welcome")} className="mb-8 flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
          <ChevronLeft size={18} /> Back
        </button>

        <div className="mb-8">
          <h2 className="text-[26px] font-black text-text-primary">Welcome back</h2>
          <p className="mt-1 text-[14px] text-text-secondary">Enter your phone number to sign in.</p>
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
            Phone Number
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Phone size={16} className="shrink-0 text-text-tertiary" />
            <input
              type="tel"
              inputMode="tel"
              placeholder="(555) 555-5555"
              value={signInPhone}
              onChange={(e) => setSignInPhone(e.target.value)}
              className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => setScreen("sign-in-otp")}
          className="w-full rounded-2xl bg-primary py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.30)] active:bg-primary-dark transition-colors"
        >
          Send Code
        </button>
      </div>
    );
  }

  function renderSignInOtp() {
    const filled = otp.every((d) => d !== "");
    return (
      <div className="flex min-h-screen flex-col bg-background px-6 pt-16">
        <button onClick={() => setScreen("sign-in-phone")} className="mb-8 flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
          <ChevronLeft size={18} /> Back
        </button>

        <div className="mb-8">
          <h2 className="text-[26px] font-black text-text-primary">Enter code</h2>
          <p className="mt-1 text-[14px] text-text-secondary">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-text-primary">{signInPhone || "(555) 555-5555"}</span>.
          </p>
        </div>

        {/* OTP boxes */}
        <div className="mb-6 flex justify-between gap-2">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className={`h-14 w-12 rounded-xl border text-center text-[22px] font-bold text-text-primary focus:outline-none transition-all ${
                digit
                  ? "border-primary bg-primary-50 ring-2 ring-primary/15"
                  : "border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/10"
              }`}
            />
          ))}
        </div>

        <Link href="/">
          <button
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              filled
                ? "bg-primary shadow-[0_4px_16px_rgba(37,99,235,0.30)] active:bg-primary-dark"
                : "bg-primary/40 cursor-not-allowed"
            }`}
            disabled={!filled}
          >
            Sign In
          </button>
        </Link>

        <button className="mt-4 text-center text-[13px] font-semibold text-primary">
          Resend Code
        </button>
      </div>
    );
  }

  function renderStep1() {
    const valid = firstName.trim() && lastName.trim() && phone.trim() && email.trim();
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pt-14 pb-4">
          <button onClick={() => setScreen("welcome")} className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
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
                    placeholder="Mitchell"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <Field
              label="Phone Number"
              icon={Phone}
              type="tel"
              inputMode="tel"
              placeholder="(555) 555-5555"
              value={phone}
              onChange={setPhone}
            />
            <Field
              label="Email Address"
              icon={Mail}
              type="email"
              placeholder="sarah@example.com"
              value={email}
              onChange={setEmail}
            />
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-8 pt-4">
          <button
            onClick={() => valid && setScreen("step-2")}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              valid
                ? "bg-primary shadow-[0_4px_16px_rgba(37,99,235,0.30)] active:bg-primary-dark"
                : "bg-primary/40"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderStep2() {
    const valid = street.trim() && city.trim() && zip.trim();
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background px-5 pt-14 pb-4">
          <button onClick={() => setScreen("step-1")} className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
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
              placeholder="4821 Oak Hollow Dr"
              value={street}
              onChange={setStreet}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" icon={Building2} placeholder="Plano" value={city} onChange={setCity} />
              <Field label="ZIP Code" icon={MapPin} inputMode="numeric" placeholder="75024" value={zip} onChange={setZip} />
            </div>

            {/* Home type */}
            <div>
              <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
                Home Type
              </label>
              <div className="flex flex-wrap gap-2">
                {homeTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setHomeType(t)}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                      homeType === t
                        ? "bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
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
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-8 pt-4">
          <button
            onClick={() => valid && setScreen("step-3")}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              valid
                ? "bg-primary shadow-[0_4px_16px_rgba(37,99,235,0.30)] active:bg-primary-dark"
                : "bg-primary/40"
            }`}
          >
            Continue
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
          <button onClick={() => setScreen("step-2")} className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
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
          <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-[#F0F6FF] p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
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
              : "border-border bg-surface"
          }`}>
            {areaStatus === "checking" && (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                  <p className="text-[13px] text-[#16A34A]">Your home is in our service area.</p>
                </div>
              </div>
            )}
            {areaStatus === "out-area" && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error">
                  <Minus size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-error">Not yet available</p>
                  <p className="text-[13px] text-text-secondary">We&apos;re expanding — join the waitlist.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-8 pt-4">
          <button
            onClick={() => areaStatus === "in-area" && setScreen("step-4")}
            className={`w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-all ${
              areaStatus === "in-area"
                ? "bg-primary shadow-[0_4px_16px_rgba(37,99,235,0.30)] active:bg-primary-dark"
                : "bg-primary/40"
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
          <button onClick={() => setScreen("step-3")} className="mb-4 flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
            <ChevronLeft size={18} /> Back
          </button>
          <div className="mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Step 4 of 4</span>
          </div>
          <ProgressBar step={4} total={4} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-40">
          <div className="mb-6 mt-2">
            <h2 className="text-[24px] font-black text-text-primary">Choose Your Plan</h2>
            <p className="mt-1 text-[13px] text-text-secondary">All plans include licensed, insured service.</p>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-gradient-to-br from-primary-50 to-white shadow-[0_4px_20px_rgba(37,99,235,0.18)]"
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
            onClick={() => setScreen("success")}
            className="w-full rounded-2xl bg-primary py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.30)] active:bg-primary-dark transition-colors"
          >
            Start My Plan
          </button>
          <button
            onClick={() => { setSelectedPlan("basic"); setScreen("success"); }}
            className="mt-3 w-full text-center text-[13px] font-semibold text-text-secondary"
          >
            Start with Basic
          </button>
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
          Welcome to HandyAnt! 🏡
        </h2>
        <p className="mb-2 max-w-[280px] text-[15px] leading-relaxed text-text-secondary">
          Anthony will reach out within 24 hours to schedule your first visit.
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
              {plans.find((p) => p.id === selectedPlan)?.name} Plan — ${plans.find((p) => p.id === selectedPlan)?.price}/mo
            </span>
          </div>
        </div>

        <Link href="/">
          <button className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.30)] active:bg-primary-dark transition-colors">
            Go to Home
            <ArrowRight size={18} />
          </button>
        </Link>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  function renderScreen() {
    switch (screen) {
      case "welcome":       return renderWelcome();
      case "sign-in-phone": return renderSignInPhone();
      case "sign-in-otp":   return renderSignInOtp();
      case "step-1":        return renderStep1();
      case "step-2":        return renderStep2();
      case "step-3":        return renderStep3();
      case "step-4":        return renderStep4();
      case "success":       return renderSuccess();
      default:              return renderWelcome();
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
