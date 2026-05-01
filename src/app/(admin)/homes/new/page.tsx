"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  ChevronLeft,
  Check,
  User,
  Home,
  ClipboardList,
  ChevronRight,
  Plus,
  Minus,
  MapPin,
  Phone,
  Mail,
  Star,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

type HomeType = "Single Family" | "Townhouse" | "Condo";
type Plan = "Basic" | "Pro" | "Premium";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  zip: string;
  homeType: HomeType;
  yearBuilt: string;
  sqFootage: string;
  bedrooms: number;
  bathrooms: number;
  specialNotes: string;
  plan: Plan | null;
}

const plans: { name: Plan; price: string; features: string[] }[] = [
  { name: "Basic", price: "$79/mo", features: ["2 visits/yr", "Emergency calls", "Priority scheduling"] },
  { name: "Pro", price: "$149/mo", features: ["4 visits/yr", "Parts discount 10%", "Same-day response"] },
  { name: "Premium", price: "$249/mo", features: ["Monthly visits", "Parts included", "24/7 hotline"] },
];

const yearOptions = Array.from({ length: 25 }, (_, i) => String(2024 - i));

export default function AddNewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { isDemo } = useDemoMode();

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    zip: "",
    homeType: "Single Family",
    yearBuilt: "2015",
    sqFootage: "",
    bedrooms: 3,
    bathrooms: 2,
    specialNotes: "",
    plan: null,
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    setSubmitError(null);
    if (isDemo) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: form.email || null,
          phone: form.phone || null,
          address: form.street,
          city: form.city || null,
          state: "TX",
          zip: form.zip || null,
          notes: form.specialNotes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create client");
      }
      await res.json();
      setSubmitted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create client";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";
  const labelCls = "block text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5";

  const steps = [
    { n: 1, label: "Contact", icon: User },
    { n: 2, label: "Home", icon: Home },
    { n: 3, label: "Review", icon: ClipboardList },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background px-5 pt-14 pb-24 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-success-light">
            <Check size={38} className="text-success" strokeWidth={2.5} />
          </div>
          <h2 className="text-[26px] font-bold text-text-primary">Profile Created!</h2>
          <p className="mt-2 text-[15px] text-text-secondary">
            {form.firstName} {form.lastName} has been added to your client base.
          </p>
          {form.plan && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5">
              <Star size={13} className="text-primary" />
              <span className="text-[13px] font-semibold text-primary">{form.plan} Plan activated</span>
            </div>
          )}
          <div className="mt-8 space-y-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => router.push("/homes")}
            >
              Back to Homes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-5">
        <Link
          href="/homes"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Homes
        </Link>
        <h1 className="text-[22px] font-bold text-text-primary">Add New Client</h1>

        {/* Step progress */}
        <div className="mt-5 flex items-center gap-0">
          {steps.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      done
                        ? "border-primary bg-primary"
                        : active
                        ? "border-primary bg-primary-50"
                        : "border-border bg-surface-secondary"
                    }`}
                  >
                    {done ? (
                      <Check size={15} className="text-white" strokeWidth={2.5} />
                    ) : (
                      <s.icon size={15} className={active ? "text-primary" : "text-text-tertiary"} />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      active ? "text-primary" : done ? "text-primary" : "text-text-tertiary"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-300 ${
                      step > s.n ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* ── STEP 1: Contact Info ── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First Name</label>
                <input
                  className={inputCls}
                  placeholder="Sarah"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input
                  className={inputCls}
                  placeholder="Mitchell"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={11} />
                  Phone Number
                </span>
              </label>
              <input
                className={inputCls}
                type="tel"
                placeholder="(972) 555-0100"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={11} />
                  Email Address
                </span>
              </label>
              <input
                className={inputCls}
                type="email"
                placeholder="sarah@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={11} />
                  Address
                </span>
              </label>
              <div className="space-y-2.5">
                <input
                  className={inputCls}
                  placeholder="Street address"
                  value={form.street}
                  onChange={(e) => set("street", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    className={inputCls}
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="ZIP"
                    value={form.zip}
                    onChange={(e) => set("zip", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<ChevronRight size={17} />}
              onClick={() => setStep(2)}
            >
              Next: Home Details
            </Button>
          </div>
        )}

        {/* ── STEP 2: Home Details ── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            {/* Home type */}
            <div>
              <label className={labelCls}>Home Type</label>
              <div className="flex gap-2">
                {(["Single Family", "Townhouse", "Condo"] as HomeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => set("homeType", type)}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                      form.homeType === type
                        ? "border-primary bg-primary text-white shadow-[0_2px_8px_rgba(79,149,152,0.25)]"
                        : "border-border bg-surface text-text-secondary hover:border-primary/30"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Year built */}
            <div>
              <label className={labelCls}>Year Built</label>
              <select
                className={inputCls}
                value={form.yearBuilt}
                onChange={(e) => set("yearBuilt", e.target.value)}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Sq footage */}
            <div>
              <label className={labelCls}>Square Footage</label>
              <input
                className={inputCls}
                type="number"
                placeholder="e.g. 2,400"
                value={form.sqFootage}
                onChange={(e) => set("sqFootage", e.target.value)}
              />
            </div>

            {/* Bedrooms / Bathrooms */}
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { key: "bedrooms" as const, label: "Bedrooms" },
                  { key: "bathrooms" as const, label: "Bathrooms" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
                    <button
                      onClick={() => set(key, Math.max(1, (form[key] as number) - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-secondary active:bg-border transition-colors"
                    >
                      <Minus size={14} className="text-text-secondary" />
                    </button>
                    <span className="flex-1 text-center text-[17px] font-bold text-text-primary">
                      {form[key]}
                    </span>
                    <button
                      onClick={() => set(key, (form[key] as number) + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-secondary active:bg-border transition-colors"
                    >
                      <Plus size={14} className="text-text-secondary" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special notes */}
            <div>
              <label className={labelCls}>Special Notes</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Gate code, pets, access instructions, special concerns..."
                value={form.specialNotes}
                onChange={(e) => set("specialNotes", e.target.value)}
              />
            </div>

            {/* Subscription plan */}
            <div>
              <label className={labelCls}>Subscription Plan (Optional)</label>
              <div className="space-y-2.5">
                {plans.map((plan) => (
                  <button
                    key={plan.name}
                    onClick={() => set("plan", form.plan === plan.name ? null : plan.name)}
                    className={`w-full rounded-xl border-2 p-3.5 text-left transition-all duration-150 ${
                      form.plan === plan.name
                        ? "border-primary bg-primary-50"
                        : "border-border bg-surface hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[14px] font-bold ${
                              form.plan === plan.name ? "text-primary" : "text-text-primary"
                            }`}
                          >
                            {plan.name}
                          </span>
                          {plan.name === "Pro" && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-text-tertiary">
                          {plan.features.join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[15px] font-bold ${
                            form.plan === plan.name ? "text-primary" : "text-text-primary"
                          }`}
                        >
                          {plan.price}
                        </span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                            form.plan === plan.name
                              ? "border-primary bg-primary"
                              : "border-border bg-white"
                          }`}
                        >
                          {form.plan === plan.name && (
                            <Check size={11} className="text-white" strokeWidth={2.5} />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-text-tertiary px-1">
                Skip for now — you can assign a plan later from the client profile.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                icon={<ChevronRight size={17} />}
                onClick={() => setStep(3)}
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Create ── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <p className="text-[13px] text-text-secondary">
              Please review the information before creating the profile.
            </p>

            {/* Contact summary */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50">
                  <User size={15} className="text-primary" />
                </div>
                <span className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary">
                  Contact Info
                </span>
                <button
                  onClick={() => setStep(1)}
                  className="ml-auto text-[12px] font-semibold text-primary"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-2">
                <ReviewRow
                  label="Name"
                  value={`${form.firstName || "—"} ${form.lastName || ""}`.trim() || "—"}
                />
                <ReviewRow label="Phone" value={form.phone || "—"} />
                <ReviewRow label="Email" value={form.email || "—"} />
                <ReviewRow
                  label="Address"
                  value={
                    form.street
                      ? `${form.street}, ${form.city} ${form.zip}`
                      : "—"
                  }
                />
              </div>
            </Card>

            {/* Home summary */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50">
                  <Home size={15} className="text-primary" />
                </div>
                <span className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary">
                  Home Details
                </span>
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto text-[12px] font-semibold text-primary"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-2">
                <ReviewRow label="Type" value={form.homeType} />
                <ReviewRow label="Year Built" value={form.yearBuilt} />
                <ReviewRow
                  label="Size"
                  value={form.sqFootage ? `${Number(form.sqFootage).toLocaleString()} sq ft` : "—"}
                />
                <ReviewRow label="Beds / Baths" value={`${form.bedrooms} bd / ${form.bathrooms} ba`} />
                {form.specialNotes && (
                  <ReviewRow label="Notes" value={form.specialNotes} multiline />
                )}
              </div>
            </Card>

            {/* Plan summary */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50">
                  <Star size={15} className="text-primary" />
                </div>
                <span className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary">
                  Subscription
                </span>
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto text-[12px] font-semibold text-primary"
                >
                  Edit
                </button>
              </div>
              {form.plan ? (
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-text-primary">{form.plan} Plan</span>
                  <span className="text-[14px] font-semibold text-primary">
                    {plans.find((p) => p.name === form.plan)?.price}
                  </span>
                </div>
              ) : (
                <p className="text-[13px] text-text-tertiary">No plan selected — one-time client</p>
              )}
            </Card>

            {submitError && (
              <div className="rounded-xl border border-error/30 bg-error-light px-4 py-3 text-[12px] font-medium text-error">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(2)} disabled={submitting}>
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                icon={<Check size={17} />}
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? "Creating…" : "Create Client Profile"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={`flex ${multiline ? "flex-col gap-0.5" : "items-center justify-between"}`}>
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <span
        className={`text-[13px] font-medium text-text-primary ${
          multiline ? "" : "text-right max-w-[200px]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
