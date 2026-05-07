"use client";

import { useState, useMemo, useEffect } from "react";
import Card from "@/components/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Wrench, Droplets, Lightbulb, PaintBucket, Hammer, Zap, Layers,
  ChevronDown, MapPin, X, ArrowRight, Wallpaper, CheckCircle2, Square,
  Refrigerator, Trees, Wifi, Loader2, LucideIcon,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";

// =====================================================================
// Demo data (preserved)
// =====================================================================

const demoCategories = [
  {
    icon: Wrench,
    name: "General Repairs",
    desc: "Drywall, doors, fixtures & misc repairs",
    color: "text-primary",
    bg: "bg-primary-50",
    iconBg: "bg-primary-100",
    services: [
      { name: "Drywall Patching & Repair", popular: true },
      { name: "Door Repair & Adjustment", popular: false },
      { name: "Fixture Installation", popular: false },
      { name: "Caulking & Sealing", popular: false },
      { name: "Weather Stripping", popular: false },
      { name: "Grab Bar Installation", popular: false },
    ],
  },
  {
    icon: Droplets,
    name: "Plumbing",
    desc: "Faucets, toilets, drains & water heaters",
    color: "text-[#0EA5E9]",
    bg: "bg-[#F0F9FF]",
    iconBg: "bg-[#E0F2FE]",
    services: [
      { name: "Faucet Replacement", popular: true },
      { name: "Toilet Repair & Replacement", popular: true },
      { name: "Drain Clearing", popular: false },
      { name: "Garbage Disposal Install", popular: false },
      { name: "Water Heater Maintenance", popular: false },
      { name: "Shut-off Valve Replacement", popular: false },
    ],
  },
  {
    icon: Lightbulb,
    name: "Electrical",
    desc: "Switches, outlets, fixtures & smart home",
    color: "text-warning",
    bg: "bg-warning-light",
    iconBg: "bg-[#FEF3C7]",
    services: [
      { name: "Light Fixture Installation", popular: true },
      { name: "Ceiling Fan Install & Swap", popular: true },
      { name: "Outlet Install / Replace", popular: false },
      { name: "Smart Switch Replacement", popular: false },
      { name: "Dimmer Switch Setup", popular: false },
      { name: "GFCI Outlet Install", popular: false },
    ],
  },
  {
    icon: PaintBucket,
    name: "Painting & Walls",
    desc: "Interior painting, wallpaper & drywall",
    color: "text-accent-purple",
    bg: "bg-[#F5F3FF]",
    iconBg: "bg-[#EDE9FE]",
    services: [
      { name: "Interior Painting", popular: true },
      { name: "Touch-Up Painting", popular: false },
      { name: "Accent Wall", popular: true },
      { name: "Wallpaper Installation", popular: false },
      { name: "Wallpaper Removal", popular: false },
      { name: "Wall Prep & Priming", popular: false },
    ],
  },
  {
    icon: Hammer,
    name: "Carpentry",
    desc: "Shelving, trim, furniture & custom builds",
    color: "text-accent-coral",
    bg: "bg-[#FFF7ED]",
    iconBg: "bg-[#FFEDD5]",
    services: [
      { name: "Shelf & Storage Installation", popular: true },
      { name: "Crown Molding & Trim", popular: false },
      { name: "Baseboard Repair & Install", popular: false },
      { name: "Furniture Assembly", popular: true },
      { name: "Custom Shelving Units", popular: false },
      { name: "Cabinet Repair & Adjust", popular: false },
    ],
  },
  {
    icon: Zap,
    name: "Smart Home",
    desc: "Thermostats, locks, cameras & hubs",
    color: "text-success",
    bg: "bg-success-light",
    iconBg: "bg-[#DCFCE7]",
    services: [
      { name: "Smart Thermostat Install", popular: true },
      { name: "Smart Lock Setup", popular: true },
      { name: "Security Camera Install", popular: false },
      { name: "Smart Lighting Setup", popular: false },
      { name: "Hub & Bridge Config", popular: false },
      { name: "Video Doorbell Install", popular: false },
    ],
  },
  {
    icon: Wallpaper,
    name: "Wallpaper",
    desc: "Full room, accent wall & removal",
    color: "text-accent-teal",
    bg: "bg-[#F0FDFA]",
    iconBg: "bg-[#CCFBF1]",
    services: [
      { name: "Full Room Wallpaper", popular: false },
      { name: "Accent Wall Install", popular: true },
      { name: "Wallpaper Removal", popular: false },
      { name: "Wall Prep & Prime", popular: false },
    ],
  },
  {
    icon: Layers,
    name: "Space Conversions",
    desc: "Garage, closet & room transformations",
    color: "text-[#F97316]",
    bg: "bg-[#FFF7ED]",
    iconBg: "bg-[#FFEDD5]",
    services: [
      { name: "Garage Organization Systems", popular: false },
      { name: "Closet System Install", popular: true },
      { name: "Room Conversion Consult", popular: false },
      { name: "Built-In Storage", popular: false },
      { name: "Laundry Room Upgrade", popular: false },
    ],
  },
];

const serviceAreas = [
  { name: "Justin / Roanoke", primary: true },
  { name: "Plano", primary: true },
  { name: "Frisco", primary: true },
  { name: "Waxahachie", primary: true },
  { name: "McKinney", primary: false },
  { name: "Allen", primary: true },
  { name: "Flower Mound", primary: true },
  { name: "Southlake", primary: true },
];

// =====================================================================
// Real-mode helpers
// =====================================================================

interface ServiceCategoryRecord {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number | null;
}

// Map seeded icon names + a few fallbacks to lucide components.
const ICON_MAP: Record<string, LucideIcon> = {
  Droplet: Droplets,
  Droplets,
  Zap,
  Hammer,
  PaintBucket,
  Square,
  Refrigerator,
  Trees,
  Wifi,
  Wrench,
  Lightbulb,
  Wallpaper,
  Layers,
};

// Stable color/bg styling derived from category index, so the page stays
// colorful even when icon names change.
const COLOR_PALETTE = [
  { color: "text-[#0EA5E9]", bg: "bg-[#F0F9FF]", iconBg: "bg-[#E0F2FE]" },
  { color: "text-warning", bg: "bg-warning-light", iconBg: "bg-[#FEF3C7]" },
  { color: "text-accent-coral", bg: "bg-[#FFF7ED]", iconBg: "bg-[#FFEDD5]" },
  { color: "text-accent-purple", bg: "bg-[#F5F3FF]", iconBg: "bg-[#EDE9FE]" },
  { color: "text-success", bg: "bg-success-light", iconBg: "bg-[#DCFCE7]" },
  { color: "text-primary", bg: "bg-primary-50", iconBg: "bg-primary-100" },
  { color: "text-accent-teal", bg: "bg-[#F0FDFA]", iconBg: "bg-[#CCFBF1]" },
  { color: "text-[#F97316]", bg: "bg-[#FFF7ED]", iconBg: "bg-[#FFEDD5]" },
];

function descFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("plumb")) return "Faucets, toilets, drains & water heaters";
  if (lower.includes("electric")) return "Switches, outlets, fixtures & smart home";
  if (lower.includes("carpentry")) return "Shelving, trim, furniture & custom builds";
  if (lower.includes("paint")) return "Interior painting, walls & touch-ups";
  if (lower.includes("drywall")) return "Patches, repairs & finishing";
  if (lower.includes("appliance")) return "Install, repair & maintenance";
  if (lower.includes("outdoor")) return "Decks, fences & yard projects";
  if (lower.includes("smart")) return "Thermostats, locks, cameras & hubs";
  return "Tap to book this service";
}

// =====================================================================
// Page
// =====================================================================

export default function ServicesPage() {
  const { isDemo, mounted } = useDemoMode();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Real-mode categories
  const [realCats, setRealCats] = useState<ServiceCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/services");
        if (!res.ok) throw new Error("Failed to load services");
        const data = (await res.json()) as ServiceCategoryRecord[];
        if (!cancelled) setRealCats(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load services");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isDemo, mounted]);

  // Build the unified category list rendered by the grid below.
  // In demo mode, we use the rich curated catalog. In real mode, we project
  // ServiceCategory rows onto the same shape (no sub-services - the click
  // takes the user straight to /book?category=<name>).
  const categories = useMemo(() => {
    if (isDemo) return demoCategories;
    return realCats.map((c, i) => {
      const palette = COLOR_PALETTE[i % COLOR_PALETTE.length];
      const Icon = (c.icon && ICON_MAP[c.icon]) || Wrench;
      return {
        id: c.id,
        icon: Icon,
        name: c.name,
        desc: descFor(c.name),
        color: palette.color,
        bg: palette.bg,
        iconBg: palette.iconBg,
        services: [] as { name: string; popular: boolean }[],
      };
    });
  }, [isDemo, realCats]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return categories;
    return categories
      .map((cat) => {
        const services = cat.services.filter((s) => s.name.toLowerCase().includes(q));
        const catMatch = cat.name.toLowerCase().includes(q) || cat.desc.toLowerCase().includes(q);
        if (catMatch) return cat;
        if (services.length > 0) return { ...cat, services };
        return null;
      })
      .filter(Boolean) as typeof categories;
  }, [query, categories]);

  const toggle = (name: string) => {
    setExpanded((prev) => (prev === name ? null : name));
  };

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-border px-5 pt-12 lg:pt-8 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          What we offer
        </p>
        <h1 className="mt-0.5 text-[22px] font-bold text-text-primary">Services</h1>
        <p className="mt-1 text-[13px] text-text-secondary leading-relaxed">
          Full-service handyman covering the DFW metroplex.
        </p>

        {/* Search */}
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3">
          <Search size={18} className="text-text-tertiary shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setExpanded(null);
            }}
            placeholder="Search services…"
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={16} className="text-text-tertiary" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-4">

        {/* ── Loading state ────────────────────────────────────────── */}
        {!mounted || loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error/30 bg-error/5 p-4 text-center">
            <p className="text-[13px] text-error">{error}</p>
          </div>
        ) : (
          <>
            {/* ── Service Count ─────────────────────────────────────────── */}
            {query && (
              <p className="text-[12px] text-text-tertiary mb-3">
                {filtered.length === 0
                  ? "No services found"
                  : `${filtered.length} ${filtered.length === 1 ? "category" : "categories"} found`}
              </p>
            )}

            {/* ── Category Cards ────────────────────────────────────────── */}
            <div className="space-y-2.5">
              {filtered.map((cat) => {
                const hasSubServices = cat.services.length > 0;
                const isOpen = hasSubServices && (expanded === cat.name || (!!query && cat.services.length > 0));

                // For real-mode (no sub-services), the whole card navigates to /book
                if (!hasSubServices) {
                  const href = `/book?category=${encodeURIComponent(cat.name)}`;
                  return (
                    <Card
                      key={cat.name}
                      padding="md"
                      onClick={() => router.push(href)}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`h-12 w-12 shrink-0 rounded-2xl ${cat.bg} flex items-center justify-center`}>
                          <cat.icon size={22} className={cat.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-text-primary">{cat.name}</p>
                          <p className="text-[12px] text-text-tertiary mt-0.5">{cat.desc}</p>
                        </div>
                        <ArrowRight size={18} className="text-primary shrink-0" />
                      </div>
                    </Card>
                  );
                }

                // Demo-mode expanded sub-service tree
                return (
                  <div key={cat.name}>
                    <Card
                      padding="md"
                      onClick={() => !query && toggle(cat.name)}
                      className={`${isOpen && !query ? "rounded-b-none border-b-0" : ""}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`h-12 w-12 shrink-0 rounded-2xl ${cat.bg} flex items-center justify-center`}>
                          <cat.icon size={22} className={cat.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-text-primary">{cat.name}</p>
                          <p className="text-[12px] text-text-tertiary mt-0.5">{cat.desc}</p>
                          <p className="text-[11px] font-medium text-text-secondary mt-1">
                            {cat.services.length} services
                          </p>
                        </div>
                        {!query && (
                          <ChevronDown
                            size={18}
                            className={`text-text-tertiary shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          />
                        )}
                      </div>
                    </Card>

                    {isOpen && (
                      <div className="bg-surface rounded-b-xl border border-t-0 border-border shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
                        {cat.services.map((svc, i) => (
                          <button
                            key={svc.name}
                            onClick={() => router.push(`/book?service=${encodeURIComponent(svc.name)}&category=${encodeURIComponent(cat.name)}`)}
                            className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors active:bg-surface-secondary hover:bg-primary-50
                              ${i < cat.services.length - 1 ? "border-b border-border-light" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-7 w-7 rounded-lg ${cat.iconBg} flex items-center justify-center shrink-0`}>
                                <cat.icon size={14} className={cat.color} />
                              </div>
                              <span className="text-[13px] font-medium text-text-primary">{svc.name}</span>
                              {svc.popular && (
                                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  Popular
                                </span>
                              )}
                            </div>
                            <ArrowRight size={14} className="text-primary shrink-0 ml-2" />
                          </button>
                        ))}

                        <div className="px-4 py-3 bg-surface-secondary">
                          <Link
                            href={`/book?category=${encodeURIComponent(cat.name)}`}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white active:bg-primary-dark transition-colors"
                          >
                            Book {cat.name}
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── No Results ────────────────────────────────────────────── */}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-surface-secondary flex items-center justify-center mb-3">
                  <Wrench size={24} className="text-text-tertiary" />
                </div>
                <p className="text-[15px] font-semibold text-text-primary">
                  {categories.length === 0 ? "No services yet" : "No services found"}
                </p>
                <p className="text-[13px] text-text-secondary mt-1">
                  {categories.length === 0
                    ? "Categories will appear here once they're set up"
                    : "Try a different search term"}
                </p>
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="mt-4 text-[13px] font-semibold text-primary"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Service Areas ─────────────────────────────────────────── */}
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-2 mb-2.5">
            <MapPin size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Service Areas
            </h2>
          </div>
          <Card variant="outlined">
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <span
                  key={area.name}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
                    area.primary
                      ? "bg-primary-50 text-primary border border-primary-100"
                      : "bg-warning-light text-accent-amber border border-warning/20"
                  }`}
                >
                  {!area.primary && <span className="text-[10px]">+fee</span>}
                  {area.name}
                </span>
              ))}
            </div>
            <div className="mt-3.5 flex items-start gap-2 rounded-lg bg-surface-secondary p-3">
              <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-text-primary">Free Estimates</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  Available throughout DFW. Travel surcharge may apply for McKinney and outlying areas.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Request a Quote CTA ───────────────────────────────────── */}
        <div className="mb-4">
          <Card className="bg-gradient-to-r from-primary-50 to-white border border-primary-100">
            <p className="text-[16px] font-bold text-text-primary mb-1">Not sure what you need?</p>
            <p className="text-[13px] text-text-secondary mb-4 leading-relaxed">
              Describe the problem and we&apos;ll give you a free estimate within a few hours.
            </p>
            <Link href="/book" className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-bold text-white active:bg-primary-dark transition-colors">
              Book a Free Estimate
              <ArrowRight size={16} />
            </Link>
          </Card>
        </div>

      </div>
    </div>
  );
}
