"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home, Wrench, CalendarPlus, User, LayoutDashboard, Calendar,
  ClipboardList, Building2, MessageCircle, Settings, LogOut,
} from "lucide-react";

const customerTabs = [
  { href: "/home", icon: Home, label: "Home" },
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

export default function BottomNav({ variant = "customer" }: { variant?: "customer" | "admin" }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const tabs = variant === "admin" ? adminTabs : customerTabs;
  const isAdmin = variant === "admin";

  const role = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const isTech = role === "tech";

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
                <tab.icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
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
          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_2px_8px_rgba(37,99,235,0.30)]">
              <Home size={14} className="absolute text-white" style={{ top: 7, left: 8 }} />
              <Wrench size={11} className="absolute text-white/80" style={{ bottom: 7, right: 7 }} />
            </div>
            <span className="text-[18px] font-black tracking-tight text-text-primary">HandyAnt</span>
          </div>

          {/* Role Switcher — only for tech users */}
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
