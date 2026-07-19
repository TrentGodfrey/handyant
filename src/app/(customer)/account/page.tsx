"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  Home, ChevronRight, Bell, Settings, LogOut,
  Calendar, Wrench, MessageCircle, Star, Shield, Edit2,
} from "lucide-react";
import { useDemoMode } from "@/lib/useDemoMode";
import { demoCustomerBy } from "@/lib/demoData";
import { PLANS } from "@/lib/plans";

interface PastJob {
  date: string;
  tasks: string;
  status: "completed";
  rating: number;
  hours: string;
}

const DEMO_JOBS: PastJob[] = [
  { date: "Mar 15, 2026", tasks: "Kitchen faucet repair + garbage disposal", status: "completed", rating: 5, hours: "2.5h" },
  { date: "Feb 28, 2026", tasks: "Smart thermostat installation", status: "completed", rating: 5, hours: "1.5h" },
  { date: "Feb 10, 2026", tasks: "Drywall patch + paint touch-up (2 rooms)", status: "completed", rating: 4, hours: "3h" },
];

const menuItems = [
  { icon: Home, label: "Home Profile", href: "/account/home", desc: "To-do list, WiFi, household info", color: "bg-primary-50", iconColor: "text-primary" },
  { icon: Bell, label: "Notifications", href: "/notifications", desc: "Text & email preferences", color: "bg-warning-light", iconColor: "text-accent-amber" },
  { icon: Settings, label: "Manage Account", href: "/account/manage", desc: "Profile, subscription, notifications", color: "bg-surface-secondary", iconColor: "text-text-secondary" },
];

interface SubscriptionRecord {
  id: string;
  plan: string;
  status: string | null;
  visitsUsed: number;
}

export default function AccountPage() {
  const { data: session } = useSession();
  const { isDemo, mounted } = useDemoMode();

  const [pastJobs, setPastJobs] = useState<PastJob[]>([]);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [planVisitAllowance, setPlanVisitAllowance] = useState<number | null>(null);
  const [subscriptionVisitsUsed, setSubscriptionVisitsUsed] = useState<number | null>(null);
  const [tasksDone, setTasksDone] = useState<number | null>(null);

  const userName = !mounted ? "User" : isDemo ? (demoCustomerBy("Sarah Mitchell")?.name ?? "User") : session?.user?.name || "User";
  const userInitials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo) {
      setPastJobs(DEMO_JOBS);
      return;
    }
    // Fetch completed bookings + active subscription + homes (for todo counts)
    Promise.all([
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/subscriptions").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/homes").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(async ([bookings, subs, homes]) => {
      let completedBookings: Array<Record<string, unknown>> = [];
      if (Array.isArray(bookings)) {
        completedBookings = bookings.filter((b: Record<string, unknown>) => b.status === "completed");
        const completed = completedBookings.map((b: Record<string, unknown>) => ({
          date: new Date(b.scheduledDate as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          tasks: (b.description as string) || "Service visit",
          status: "completed" as const,
          rating: 0,
          hours: `${(b.durationMinutes as number || 120) / 60}h`,
        }));
        setPastJobs(completed);
      }
      if (Array.isArray(subs)) {
        const active = (subs as SubscriptionRecord[]).find((s) => s.status === "active");
        const plan = active ? PLANS.find((p) => p.id === active.plan) : null;
        setPlanVisitAllowance(plan ? plan.visits : null);
        setSubscriptionVisitsUsed(active?.visitsUsed ?? null);
      }

      // Tasks Done = completed home-profile todos across all the customer's
      // homes + completed sub-tasks on past bookings. Use Promise.all to fetch
      // each home's detail (which includes todos).
      try {
        const completedBookingTasks = completedBookings.reduce((sum, b) => {
          const tasks = Array.isArray((b as Record<string, unknown>).tasks)
            ? ((b as Record<string, unknown>).tasks as Array<{ done?: boolean | null }>)
            : [];
          return sum + tasks.filter((t) => t.done === true).length;
        }, 0);

        let completedTodos = 0;
        if (Array.isArray(homes) && homes.length) {
          const details = await Promise.all(
            (homes as Array<{ id: string }>).map((h) =>
              fetch(`/api/homes/${h.id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
            )
          );
          for (const detail of details) {
            if (!detail || !Array.isArray(detail.todos)) continue;
            completedTodos += detail.todos.filter((t: { status?: string }) => t.status === "completed").length;
          }
        }
        setTasksDone(completedTodos + completedBookingTasks);
      } catch {
        setTasksDone(0);
      }
    });
  }, [isDemo, mounted]);

  const displayedJobs = showAllJobs ? pastJobs : pastJobs.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      {/* Profile hero */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-6 lg:px-8 lg:pt-6 lg:pb-5 lg:rounded-2xl lg:border lg:mt-6 lg:shadow-sm">
        <div className="flex items-start justify-between mb-5 lg:mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white shadow-[0_2px_12px_rgba(79,149,152,0.3)]">
                {userInitials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-surface bg-success" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-text-primary">{userName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <Shield size={10} />
                  Customer
                </span>
              </div>
              <p className="text-[12px] text-text-tertiary mt-1">
                {session?.user?.email || ""}
              </p>
            </div>
          </div>
          <Link href="/account/manage">
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-secondary hover:bg-border transition-colors">
              <Edit2 size={15} className="text-text-secondary" />
            </button>
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3 lg:max-w-md">
          {[
            { label: "Total Visits", value: !mounted ? "-" : isDemo ? "12" : String(pastJobs.length), icon: Calendar, color: "text-primary", bg: "bg-primary-50" },
            {
              label: "Visits Used",
              value: !mounted
                ? "-"
                : isDemo
                  ? "12/20"
                  : planVisitAllowance != null
                    ? `${subscriptionVisitsUsed ?? 0}/${planVisitAllowance}`
                    : String(pastJobs.length),
              icon: Calendar,
              color: "text-accent-teal",
              bg: "bg-[#F0FDFA]",
            },
            { label: "Tasks Done", value: !mounted ? "-" : isDemo ? "31" : String(tasksDone ?? 0), icon: Wrench, color: "text-accent-amber", bg: "bg-warning-light" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-surface-secondary p-3.5 text-center">
              <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className="text-[20px] font-bold text-text-primary leading-none">{stat.value}</p>
              <p className="text-[10px] text-text-tertiary mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-6 lg:px-0 lg:py-6 lg:space-y-7">
        {/* Chat CTA */}
        <Link href="/messages" className="block">
          <Card className="flex items-center gap-4 border border-border">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-[0_2px_10px_rgba(79,149,152,0.25)]">
                <MessageCircle size={22} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text-primary">Messages</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Chat with your handyman</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-primary">Open</span>
              <ChevronRight size={14} className="text-primary" />
            </div>
          </Card>
        </Link>

        {/* Recent jobs */}
        {pastJobs.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Recent Jobs</p>
              {pastJobs.length > 2 && (
                <button onClick={() => setShowAllJobs(!showAllJobs)} className="text-[12px] font-semibold text-primary">
                  {showAllJobs ? "Show less" : `See all ${pastJobs.length}`}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {displayedJobs.map((job) => (
                <Card key={job.date} padding="sm" className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-light">
                    <Wrench size={16} className="text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{job.tasks}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-text-tertiary">{job.date}</span>
                      <span className="text-text-tertiary">·</span>
                      <span className="text-[11px] text-text-tertiary">{job.hours}</span>
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                  {job.rating > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} className={i < job.rating ? "fill-warning text-warning" : "fill-border text-border"} />
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Menu items */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Account</p>
          <div className="rounded-xl overflow-hidden border border-border bg-surface">
            {menuItems.map((item, i) => (
              <Link key={item.label} href={item.href}>
                <div className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-secondary active:bg-surface-secondary transition-colors ${
                  i < menuItems.length - 1 ? "border-b border-border" : ""
                }`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon size={17} className={item.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary">{item.label}</p>
                    <p className="text-[12px] text-text-tertiary">{item.desc}</p>
                  </div>
                  <ChevronRight size={15} className="text-text-tertiary shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3.5 text-[13px] font-semibold text-text-tertiary hover:bg-surface-secondary hover:text-error hover:border-error/30 transition-all"
        >
          <LogOut size={15} />
          Sign Out
        </button>

        <p className="text-center text-[11px] text-text-tertiary">
          Version 1.0.0 · Privacy Policy · Terms of Service
        </p>
      </div>
    </div>
  );
}
