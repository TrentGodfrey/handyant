"use client";

import Link from "next/link";
import { User, Wrench, ArrowRight } from "lucide-react";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-3xl font-bold mb-4">
            HA
          </div>
          <h1 className="text-2xl font-bold text-foreground">HandyAnt Demo</h1>
          <p className="text-secondary mt-2 text-sm">
            Explore the full app as a customer or as Anthony (the handyman).
          </p>
        </div>

        {/* Customer View */}
        <Link href="/?demo=true">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 hover:border-primary/30 hover:shadow-md transition-all text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 shrink-0">
              <User size={24} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground">Customer View</p>
              <p className="text-[12px] text-secondary mt-0.5">Browse services, book visits, track your tech</p>
            </div>
            <ArrowRight size={18} className="text-secondary shrink-0" />
          </div>
        </Link>

        {/* Admin View */}
        <Link href="/dashboard?demo=true">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 hover:border-primary/30 hover:shadow-md transition-all text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F9FF] shrink-0">
              <Wrench size={24} className="text-[#0EA5E9]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground">Staff View</p>
              <p className="text-[12px] text-secondary mt-0.5">Dashboard, jobs kanban, schedule, reports</p>
            </div>
            <ArrowRight size={18} className="text-secondary shrink-0" />
          </div>
        </Link>

        {/* Sign up CTA */}
        <div className="pt-2">
          <p className="text-[13px] text-secondary">
            Ready to get started?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
