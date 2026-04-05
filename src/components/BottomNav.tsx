"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Wrench, CalendarPlus, User, LayoutDashboard, Calendar,
  ClipboardList, Building2, MessageCircle, Settings,
} from "lucide-react";

const customerTabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/services", icon: Wrench, label: "Services" },
  { href: "/book", icon: CalendarPlus, label: "Book" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/account", icon: User, label: "Account" },
];

const adminTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/jobs", icon: ClipboardList, label: "Jobs" },
  { href: "/homes", icon: Building2, label: "Homes" },
  { href: "/admin-messages", icon: MessageCircle, label: "Messages" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

/* Hardcoded badge counts for demo */
const badgeCounts: Record<string, Record<string, number>> = {
  customer: { "/messages": 1 },
  admin: { "/admin-messages": 2 },
};

export default function BottomNav({ variant = "customer" }: { variant?: "customer" | "admin" }) {
  const pathname = usePathname();
  const tabs = variant === "admin" ? adminTabs : customerTabs;

  const isAdmin = variant === "admin";
  const badges = badgeCounts[variant] ?? {};

  return (
    <>
      {/* ── Mobile bottom nav (hidden on lg+) ─────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/" && tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-w-[64px] flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  isActive ? "text-primary" : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                <span className="relative">
                  <tab.icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                  {badges[tab.href] && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                      {badges[tab.href]}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop sidebar (hidden below lg) ─────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex-col z-50">
        {/* Logo + Role Switcher */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_2px_8px_rgba(37,99,235,0.30)]">
              <Home size={14} className="absolute text-white" style={{ top: 7, left: 8 }} />
              <Wrench size={11} className="absolute text-white/80" style={{ bottom: 7, right: 7 }} />
            </div>
            <span className="text-[18px] font-black tracking-tight text-text-primary">HandyAnt</span>
          </div>

          {/* Role Switcher */}
          <div className="flex rounded-full bg-gray-100 p-1">
            <a
              href="/"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all no-underline ${
                !isAdmin
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <User size={12} />
              Customer
            </a>
            <a
              href="/dashboard"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all no-underline ${
                isAdmin
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Wrench size={12} />
              Staff
            </a>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                (tab.href !== "/" && tab.href !== "/dashboard" && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-[0_2px_8px_rgba(37,99,235,0.20)]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="relative">
                    <tab.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    {badges[tab.href] && !isActive && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                        {badges[tab.href]}
                      </span>
                    )}
                  </span>
                  <span className={`text-[14px] ${isActive ? "font-semibold" : "font-medium"}`}>
                    {tab.label}
                  </span>
                  {badges[tab.href] && isActive && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                      {badges[tab.href]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Profile Card */}
        <div className="px-3 pb-5 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <span className="text-[13px] font-bold text-white">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary truncate">Anthony</p>
              <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Pro Plan
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
