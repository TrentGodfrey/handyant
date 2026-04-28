import Link from "next/link";
import {
  Wrench, Home, ArrowRight, CheckCircle2, Star, Shield, Clock,
  Droplet, Zap, Hammer, PaintBucket, Square, Refrigerator, Trees, Wifi,
  CalendarPlus, MessageCircle, Sparkles, MapPin, ChevronRight,
} from "lucide-react";
import { DEMO_TECH } from "@/lib/demoData";

const categories = [
  { name: "Plumbing", icon: Droplet, color: "text-blue-500", bg: "bg-blue-50" },
  { name: "Electrical", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
  { name: "Carpentry", icon: Hammer, color: "text-orange-600", bg: "bg-orange-50" },
  { name: "Painting", icon: PaintBucket, color: "text-rose-500", bg: "bg-rose-50" },
  { name: "Drywall", icon: Square, color: "text-slate-500", bg: "bg-slate-50" },
  { name: "Appliance", icon: Refrigerator, color: "text-indigo-500", bg: "bg-indigo-50" },
  { name: "Outdoor", icon: Trees, color: "text-emerald-500", bg: "bg-emerald-50" },
  { name: "Smart Home", icon: Wifi, color: "text-violet-500", bg: "bg-violet-50" },
];

const cities = ["Plano", "Frisco", "McKinney", "Allen", "Roanoke", "Waxahachie"];

const testimonials = [
  {
    name: "Sarah M.",
    city: "Plano",
    rating: 5,
    text: "Anthony fixed three things in under two hours and left the kitchen cleaner than he found it. Booking on the app took 30 seconds.",
  },
  {
    name: "Robert C.",
    city: "Frisco",
    rating: 5,
    text: "Smart thermostat install + 3 outlets done in one trip. The app showed me exactly when he'd arrive. Will absolutely use again.",
  },
  {
    name: "Angela T.",
    city: "Waxahachie",
    rating: 5,
    text: "I love the Pro plan — priority scheduling has saved me twice when something broke right before guests came over.",
  },
];

const steps = [
  { n: 1, title: "Tell us what's broken", body: "Snap a photo, describe the job, or just pick from a list. Two minutes." },
  { n: 2, title: "Pick a time that works", body: "See real availability on Anthony's calendar. Mornings, evenings, weekends." },
  { n: 3, title: "Get it fixed — for good", body: "Licensed, insured, and on time. Upfront pricing. Real receipts. Real warranties." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Top Bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-[0_2px_8px_rgba(37,99,235,0.30)]">
              <Home size={14} className="absolute text-white" style={{ top: 7, left: 8 }} />
              <Wrench size={11} className="absolute text-white/80" style={{ bottom: 7, right: 7 }} />
            </div>
            <span className="text-[18px] font-black tracking-tight text-text-primary">HandyAnt</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-primary-dark transition-colors"
            >
              Get started
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pt-12 pb-16 lg:pt-24 lg:pb-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-[12px] font-semibold text-primary">Booking visits this week in DFW</span>
              </div>

              <h1 className="text-[40px] sm:text-[48px] lg:text-[56px] font-black tracking-tight text-text-primary leading-[1.05]">
                Your home&apos;s <span className="text-primary">handyman</span>,
                <br className="hidden sm:block" /> on speed dial.
              </h1>

              <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-[16px] sm:text-[17px] leading-relaxed text-text-secondary">
                Plumbing leaks, broken switches, that closet door that never closed right —
                book Anthony in 30 seconds and stop adding things to a list nobody&apos;s ever going to read.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-center lg:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.30)] hover:bg-primary-dark transition-colors"
                >
                  <CalendarPlus size={18} />
                  Book a visit
                </Link>
                <Link
                  href="/?demo=true"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 py-3.5 text-[15px] font-bold text-text-primary hover:bg-surface-secondary transition-colors"
                >
                  Try the demo
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-6 flex items-center justify-center lg:justify-start gap-5 text-[12px] text-text-tertiary">
                <div className="flex items-center gap-1.5">
                  <Shield size={14} className="text-success" />
                  Licensed &amp; insured
                </div>
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-warning fill-warning" />
                  4.9 · 86 reviews
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <Clock size={14} className="text-primary" />
                  Same-week availability
                </div>
              </div>
            </div>

            {/* Right: phone mockup */}
            <div className="relative mx-auto max-w-[320px] lg:max-w-[360px]">
              <div className="absolute inset-0 -m-4 rounded-[3rem] bg-gradient-to-br from-primary/30 to-primary-200/0 blur-2xl" />
              <div className="relative rounded-[2.5rem] bg-text-primary p-2.5 shadow-[0_24px_48px_rgba(0,0,0,0.25)]">
                <div className="rounded-[2rem] overflow-hidden bg-background aspect-[9/19.5]">
                  {/* Status bar */}
                  <div className="h-7 bg-surface" />
                  {/* App content sketch */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Welcome back</p>
                        <p className="text-[16px] font-bold text-text-primary leading-tight">Sarah&apos;s Home</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-primary">SH</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-r from-primary to-primary-dark p-3 mb-3">
                      <p className="text-[11px] font-bold text-white">Anthony is confirmed</p>
                      <p className="text-[9px] text-white/70 mt-0.5">Tap to track on the day of your visit</p>
                    </div>

                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Next Visit</p>
                    <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-3">
                      <div className="flex items-start gap-2 mb-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-white">A</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-text-primary">{DEMO_TECH.name}</p>
                          <p className="text-[9px] text-text-secondary mt-0.5">Tuesday · 9:00 AM</p>
                        </div>
                        <div className="rounded-full bg-success-light px-1.5 py-0.5">
                          <span className="text-[8px] font-semibold text-success">Confirmed</span>
                        </div>
                      </div>
                      <div className="bg-white/70 rounded-md p-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full border border-primary/40" />
                          <span className="text-[9px] text-text-primary">Replace kitchen faucet</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full border border-primary/40" />
                          <span className="text-[9px] text-text-primary">Fix garage door sensor</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {[Droplet, Zap, Hammer].map((Icon, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface flex flex-col items-center py-2">
                          <Icon size={14} className="text-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { num: "4.9★", label: "86 reviews" },
            { num: "1,200+", label: "jobs completed" },
            { num: "DFW", label: "since 2024" },
            { num: "TXH-2824", label: "TX licensed" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[20px] sm:text-[24px] font-black text-text-primary leading-none">{s.num}</p>
              <p className="mt-1 text-[11px] sm:text-[12px] text-text-tertiary uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="text-center mb-10">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-primary mb-2">What we fix</p>
          <h2 className="text-[28px] sm:text-[34px] font-black tracking-tight text-text-primary">
            One handyman. Every kind of job.
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-[15px] text-text-secondary">
            From a leaky faucet to a full smart-home install — book any of the below in two taps.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((c) => (
            <div
              key={c.name}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-6 hover:border-primary-200 hover:shadow-card transition-all"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                <c.icon size={22} className={c.color} />
              </div>
              <span className="text-[14px] font-semibold text-text-primary">{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section className="bg-surface-secondary border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="text-center mb-10">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-primary mb-2">How it works</p>
            <h2 className="text-[28px] sm:text-[34px] font-black tracking-tight text-text-primary">
              Three steps. No phone tag.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl bg-white border border-border p-6">
                <div className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-black shadow-[0_2px_8px_rgba(37,99,235,0.30)]">
                  {s.n}
                </div>
                <h3 className="mt-3 text-[18px] font-bold text-text-primary">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="text-center mb-10">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-primary mb-2">From homeowners</p>
          <h2 className="text-[28px] sm:text-[34px] font-black tracking-tight text-text-primary">
            People who used to dread the to-do list.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-white p-6">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} className="fill-warning text-warning" />
                ))}
              </div>
              <p className="text-[14px] leading-relaxed text-text-primary">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-2.5 pt-4 border-t border-border-light">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-[11px] font-bold text-primary">{t.name[0]}</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">{t.name}</p>
                  <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                    <MapPin size={10} />
                    <span>{t.city}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Plans ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-primary-50 border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="text-center mb-10">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-primary mb-2">Pricing</p>
            <h2 className="text-[28px] sm:text-[34px] font-black tracking-tight text-text-primary">
              Pay per visit, or skip the line.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-[15px] text-text-secondary">
              No subscription needed to book. But Pro members get priority scheduling and member pricing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
            {/* Basic */}
            <div className="rounded-2xl border border-border bg-white p-7">
              <p className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider">Basic</p>
              <p className="mt-2 text-[36px] font-black text-text-primary leading-none">Free</p>
              <p className="mt-1 text-[13px] text-text-tertiary">Pay only for the work done.</p>
              <ul className="mt-5 space-y-2.5">
                {["Book any service online", "Real-time visit tracking", "Photo notes & history", "Itemized receipts"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[14px] text-text-primary">
                    <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-[14px] font-bold text-text-primary hover:bg-surface-secondary transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border-2 border-primary bg-gradient-to-br from-primary-50 to-white p-7">
              <div className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">Most popular</span>
              </div>
              <p className="text-[13px] font-semibold text-primary uppercase tracking-wider">Pro</p>
              <p className="mt-2 text-[36px] font-black text-text-primary leading-none">
                $29<span className="text-[16px] font-bold text-text-tertiary">/mo</span>
              </p>
              <p className="mt-1 text-[13px] text-text-tertiary">Cancel anytime.</p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Everything in Basic",
                  "Priority scheduling (next-day)",
                  "10% off every visit",
                  "Free seasonal home check-up",
                  "Direct messaging with Anthony",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[14px] text-text-primary">
                    <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.30)] hover:bg-primary-dark transition-colors"
              >
                <Sparkles size={15} />
                Go Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service Area ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="rounded-3xl bg-text-primary p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 mb-5">
                <MapPin size={12} className="text-white" />
                <span className="text-[12px] font-semibold text-white">DFW Metro</span>
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-black tracking-tight text-white">
                Serving North Texas, one neighborhood at a time.
              </h2>
              <p className="mt-3 text-[15px] text-white/70 leading-relaxed">
                Based in Plano. We service homes across the DFW metro and surrounding suburbs.
                Don&apos;t see your city? <Link href="/signup" className="text-white underline hover:text-primary-200">Ask anyway</Link>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white border border-white/10"
                >
                  <MapPin size={12} />
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-5 py-16 lg:py-24 text-center">
          <h2 className="text-[32px] sm:text-[42px] font-black tracking-tight text-text-primary leading-tight">
            Stop staring at the to-do list.
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-[16px] text-text-secondary">
            Book Anthony in 30 seconds. Get back to your life.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.30)] hover:bg-primary-dark transition-colors"
            >
              <CalendarPlus size={18} />
              Book a visit
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-7 py-3.5 text-[15px] font-bold text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Sign in
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Home size={12} className="absolute text-white" style={{ top: 6, left: 7 }} />
                <Wrench size={10} className="absolute text-white/80" style={{ bottom: 6, right: 6 }} />
              </div>
              <div>
                <p className="text-[14px] font-black text-text-primary">HandyAnt</p>
                <p className="text-[11px] text-text-tertiary">Plano, TX · TXH-2824</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-text-secondary">
              <Link href="/login" className="hover:text-text-primary transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-text-primary transition-colors">Sign up</Link>
              <Link href="/?demo=true" className="hover:text-text-primary transition-colors">Try demo</Link>
              <a href="tel:2145550199" className="hover:text-text-primary transition-colors flex items-center gap-1.5">
                <MessageCircle size={12} />
                (214) 555-0199
              </a>
            </div>
          </div>
          <p className="mt-6 text-[11px] text-text-tertiary">
            © {new Date().getFullYear()} HandyAnt. Licensed &amp; insured in Texas. Independently owned.
          </p>
        </div>
      </footer>
    </div>
  );
}
