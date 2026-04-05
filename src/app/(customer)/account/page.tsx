"use client";

import Link from "next/link";
import { useState } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import {
  Home, ChevronRight, FileText, CreditCard, Bell, Settings, LogOut,
  Calendar, Clock, Wrench, MessageCircle, Star, Shield, Edit2,
} from "lucide-react";

const pastJobs = [
  {
    date: "Mar 15, 2026",
    tasks: "Kitchen faucet repair + garbage disposal",
    status: "completed" as const,
    rating: 5,
    hours: "2.5h",
  },
  {
    date: "Feb 28, 2026",
    tasks: "Smart thermostat installation",
    status: "completed" as const,
    rating: 5,
    hours: "1.5h",
  },
  {
    date: "Feb 10, 2026",
    tasks: "Drywall patch + paint touch-up (2 rooms)",
    status: "completed" as const,
    rating: 4,
    hours: "3h",
  },
];

const menuItems = [
  {
    icon: Home,
    label: "Home Profile",
    href: "/account/home",
    desc: "To-do list, WiFi, household info",
    color: "bg-primary-50",
    iconColor: "text-primary",
  },
  {
    icon: FileText,
    label: "Receipts & Invoices",
    href: "/account/receipts",
    desc: "View transaction history",
    color: "bg-success-light",
    iconColor: "text-success",
  },
  {
    icon: CreditCard,
    label: "Payment Methods",
    href: "#",
    desc: "Visa ending in 4242",
    color: "bg-[#EFF6FF]",
    iconColor: "text-info",
  },
  {
    icon: Bell,
    label: "Notifications",
    href: "#",
    desc: "Text & email preferences",
    color: "bg-warning-light",
    iconColor: "text-accent-amber",
  },
  {
    icon: Settings,
    label: "Manage Account",
    href: "/account/manage",
    desc: "Profile, subscription, notifications",
    color: "bg-surface-secondary",
    iconColor: "text-text-secondary",
  },
];

export default function AccountPage() {
  const [showAllJobs, setShowAllJobs] = useState(false);

  const displayedJobs = showAllJobs ? pastJobs : pastJobs.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Profile hero */}
      <div className="bg-surface border-b border-border px-5 pt-14 lg:pt-8 pb-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white shadow-[0_2px_12px_rgba(37,99,235,0.3)]">
                SM
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-surface bg-success" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-text-primary">Sarah Mitchell</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <Shield size={10} />
                  Subscription Member
                </span>
              </div>
              <p className="text-[12px] text-text-tertiary mt-1">Member since Jan 2025</p>
            </div>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-secondary hover:bg-border transition-colors">
            <Edit2 size={15} className="text-text-secondary" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Visits", value: "12", icon: Calendar, color: "text-primary", bg: "bg-primary-50" },
            { label: "Hours Used", value: "24h", icon: Clock, color: "text-accent-teal", bg: "bg-[#F0FDFA]" },
            { label: "Tasks Done", value: "31", icon: Wrench, color: "text-accent-amber", bg: "bg-warning-light" },
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

      <div className="px-5 py-5 space-y-6">
        {/* Chat with Tech CTA */}
        <Card
          onClick={() => {}}
          className="flex items-center gap-4 border border-primary-100 bg-gradient-to-r from-primary-50 to-surface"
        >
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-[0_2px_10px_rgba(37,99,235,0.25)]">
              <MessageCircle size={22} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">Chat with Anthony</p>
            <p className="text-[12px] text-text-secondary mt-0.5">Usually responds in minutes</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-primary">Message</span>
            <ChevronRight size={14} className="text-primary" />
          </div>
        </Card>

        {/* Recent jobs */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Recent Jobs
            </p>
            {pastJobs.length > 2 && (
              <button
                onClick={() => setShowAllJobs(!showAllJobs)}
                className="text-[12px] font-semibold text-primary"
              >
                {showAllJobs ? "Show less" : `See all ${pastJobs.length}`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {displayedJobs.map((job) => (
              <Card key={job.date} padding="sm" onClick={() => {}} className="flex items-center gap-3">
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
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      className={i < job.rating ? "fill-warning text-warning" : "fill-border text-border"}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Account
          </p>
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
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3.5 text-[13px] font-semibold text-text-tertiary hover:bg-surface-secondary hover:text-error hover:border-error/30 transition-all">
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
