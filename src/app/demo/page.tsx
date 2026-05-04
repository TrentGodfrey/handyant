"use client";

import Link from "next/link";
import { useEffect } from "react";
import { User, Wrench, ArrowRight } from "lucide-react";

export default function DemoPage() {
  // If the user landed here with a stale demo cookie from a previous session,
  // clear it so they get a fresh choice. The links below set it again.
  useEffect(() => {
    document.cookie = "demo_mode=; max-age=0; path=/";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-lg font-black tracking-[-0.06em] mb-4">
            MCQ
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Try the demo</h1>
          <p className="text-text-secondary mt-2 text-[14px]">
            Pick a role and explore. Sample data only — nothing is saved.
          </p>
        </div>

        {/* Customer View */}
        <Link href="/home?demo=true">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 hover:border-primary/30 hover:shadow-md transition-all text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 shrink-0">
              <User size={24} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary">I&rsquo;m a homeowner</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Book a visit, manage your home, message your tech</p>
            </div>
            <ArrowRight size={18} className="text-text-tertiary shrink-0" />
          </div>
        </Link>

        {/* Staff View */}
        <Link href="/dashboard?demo=true">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 hover:border-primary/30 hover:shadow-md transition-all text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 shrink-0">
              <Wrench size={24} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary">I&rsquo;m a tradesperson</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Dashboard, jobs board, schedule, invoicing, reports</p>
            </div>
            <ArrowRight size={18} className="text-text-tertiary shrink-0" />
          </div>
        </Link>

        <p className="text-[12px] text-text-tertiary px-2">
          You can switch views or exit demo any time from the banner at the top of the screen.
        </p>

        {/* Sign up CTA */}
        <div className="pt-2 border-t border-border">
          <p className="text-[13px] text-text-secondary mt-4">
            Ready for the real thing?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
