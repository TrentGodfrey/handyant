"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home, Wrench, CalendarPlus, User, LayoutDashboard, Calendar,
  ClipboardList, Building2, MessageCircle, Settings, LogOut, Users,
  ListChecks, MoreHorizontal, X,
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

const customerTechMoreTabs = [
  { href: "/account", icon: User, label: "Account" },
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
  const isOwner = session?.user?.isAdmin === true;
  const isTech = session?.user?.role === "tech";
  const tabs = isAdmin
    ? adminTabs.filter((tab) => tab.href !== "/settings" || isOwner)
    : customerTabs;
  const mobileTabs = isAdmin
    ? adminMobileTabs
    : isTech
      ? customerMobileTabs.filter((tab) => tab.href !== "/account")
      : customerMobileTabs;
  const moreTabs = isAdmin
    ? adminMoreTabs.filter((tab) => tab.href !== "/settings" || isOwner)
    : isTech
      ? customerTechMoreTabs
      : [];
  const showMobileMore = isAdmin || isTech;

  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreActive = moreTabs.some((tab) => isTabActive(pathname, tab.href));

  // Close the sheet whenever navigation happens
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      moreMenuRef.current
        ?.querySelector<HTMLElement>("a[href], button:not([disabled])")
        ?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
        return;
      }
      if (e.key !== "Tab" || !moreMenuRef.current) return;

      const focusable = Array.from(
        moreMenuRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [moreOpen]);

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
      <nav aria-label={isAdmin ? "Staff navigation" : "Customer navigation"} className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
          {mobileTabs.map((tab) => {
            const isActive = isTabActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-1 min-w-0 flex-col items-center justify-center gap-1 pt-2 pb-2.5 transition-colors ${
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

          {showMobileMore && (
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-controls="mobile-more-menu"
              aria-label={moreOpen ? "Close more navigation options" : "Open more navigation options"}
              className={`flex min-h-14 flex-1 min-w-0 flex-col items-center justify-center gap-1 pt-2 pb-2.5 transition-colors ${
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

      {/* ── "More" sheet (staff account actions, mobile only) ─────────── */}
      {showMobileMore && moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div
            ref={moreMenuRef}
            id="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation options"
            className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-2xl bg-surface pb-[max(env(safe-area-inset-bottom),12px)] animate-slide-in-bottom"
          >
            <div className="flex min-h-12 items-center justify-between border-b border-border px-3">
              <span className="px-2 text-[14px] font-semibold text-text-primary">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close more navigation options"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary active:bg-surface-secondary"
              >
                <X size={19} />
              </button>
            </div>
            <div className="px-3 pt-2 pb-1">
              {moreTabs.map((tab) => {
                const isActive = isTabActive(pathname, tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 ${
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
              {isTech && (
                <Link
                  href={isAdmin ? "/home" : "/dashboard"}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-text-primary active:bg-surface-secondary"
                >
                  {isAdmin ? <User size={20} strokeWidth={1.8} /> : <Wrench size={20} strokeWidth={1.8} />}
                  <span className="text-[15px] font-medium">
                    {isAdmin ? "Customer view" : "Staff view"}
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-text-secondary active:bg-surface-secondary"
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
            <span className="text-[16px] font-black tracking-tight text-text-primary">MCQ Property Care</span>
          </div>

          {/* Role Switcher - only for tech users */}
          {isTech && (
            <div className="flex rounded-full bg-gray-100 p-1">
              <a
                href="/home"
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all no-underline ${
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
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all no-underline ${
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
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
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
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Sign out"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
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
