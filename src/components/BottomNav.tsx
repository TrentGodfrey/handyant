"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home, Wrench, CalendarPlus, User, LayoutDashboard, Calendar,
  ClipboardList, Building2, MessageCircle, Settings, LogOut, Users,
  ListChecks, MoreHorizontal,
} from "lucide-react";

const customerTabs = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/services", icon: Wrench, label: "Services" },
  { href: "/book", icon: CalendarPlus, label: "Book" },
  { href: "/todo", icon: ListChecks, label: "To-Do" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/account", icon: User, label: "Account" },
];

const adminTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/jobs", icon: ClipboardList, label: "Jobs" },
  { href: "/homes", icon: Building2, label: "Homes" },
  { href: "/people", icon: Users, label: "People" },
  { href: "/admin-messages", icon: MessageCircle, label: "Messages" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

// Mobile shows at most 5 slots. Anything beyond the primary four (admin)
// lives in the "More" sheet; customer Services is reachable via Book.
const customerMobileTabs = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/book", icon: CalendarPlus, label: "Book" },
  { href: "/todo", icon: ListChecks, label: "To-Do" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/account", icon: User, label: "Account" },
];

const adminMobileTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/jobs", icon: ClipboardList, label: "Jobs" },
  { href: "/admin-messages", icon: MessageCircle, label: "Messages" },
];

const adminMoreTabs = [
  { href: "/homes", icon: Building2, label: "Homes" },
  { href: "/people", icon: Users, label: "People" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function isTabActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/" && href !== "/dashboard" && pathname.startsWith(href))
  );
}

export default function BottomNav({ variant = "customer" }: { variant?: "customer" | "admin" }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = variant === "admin";
  const tabs = isAdmin ? adminTabs : customerTabs;
  const mobileTabs = isAdmin ? adminMobileTabs : customerMobileTabs;

  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = adminMoreTabs.some((tab) => isTabActive(pathname, tab.href));

  // Close the sheet whenever navigation happens
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const isTech = session?.user?.role === "tech";

  const userName = session?.user?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* ── Mobile bottom nav (hidden on lg+) ─────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
          {mobileTabs.map((tab) => {
            const isActive = isTabActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-1 min-w-0 flex-col items-center gap-1 pt-2 pb-2.5 transition-colors ${
                  isActive ? "text-primary" : "text-text-tertiary active:text-text-secondary"
                }`}
              >
                <tab.icon size={22} strokeWidth={isActive ? 2.2 : 1.7} />
                <span className={`max-w-full truncate px-0.5 text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className={`flex flex-1 min-w-0 flex-col items-center gap-1 pt-2 pb-2.5 transition-colors ${
                moreActive || moreOpen ? "text-primary" : "text-text-tertiary active:text-text-secondary"
              }`}
            >
              <MoreHorizontal size={22} strokeWidth={moreActive || moreOpen ? 2.2 : 1.7} />
              <span className={`max-w-full truncate px-0.5 text-[10px] leading-none ${moreActive || moreOpen ? "font-semibold" : "font-medium"}`}>
                More
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* ── "More" sheet (admin, mobile only) ─────────────────────────── */}
      {isAdmin && moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-surface pb-[max(env(safe-area-inset-bottom),12px)] animate-slide-in-bottom">
            <div className="mx-auto mt-2.5 mb-1 h-1 w-9 rounded-full bg-border" />
            <div className="px-3 pt-2 pb-1">
              {adminMoreTabs.map((tab) => {
                const isActive = isTabActive(pathname, tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                      isActive
                        ? "bg-primary-50 text-primary"
                        : "text-text-primary active:bg-surface-secondary"
                    }`}
                  >
                    <tab.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className={`text-[15px] ${isActive ? "font-semibold" : "font-medium"}`}>
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-text-secondary active:bg-surface-secondary"
              >
                <LogOut size={20} strokeWidth={1.8} />
                <span className="text-[15px] font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar (hidden below lg) ─────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex-col z-50">
        {/* Logo + Role Switcher */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_2px_8px_rgba(79,149,152,0.30)]">
              <span className="text-[10px] font-black tracking-[-0.05em] text-white">MCQ</span>
            </div>
            <span className="text-[16px] font-black tracking-tight text-text-primary">MCQ Home Co.</span>
          </div>

          {/* Role Switcher - only for tech users */}
          {isTech && (
            <div className="flex rounded-full bg-gray-100 p-1">
              <a
                href="/home"
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
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {tabs.map((tab) => {
              const isActive = isTabActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-[0_2px_8px_rgba(79,149,152,0.20)]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <tab.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className={`text-[14px] ${isActive ? "font-semibold" : "font-medium"}`}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Profile Card */}
        <div className="px-3 pb-5 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <span className="text-[13px] font-bold text-white">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary truncate">{userName}</p>
              <p className="text-[10px] text-text-tertiary">{isTech ? "Technician" : "Customer"}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
