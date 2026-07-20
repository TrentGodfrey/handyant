"use client";

import Link from "next/link";
import { ArrowRight, CalendarPlus, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";

export function LandingHeaderActions() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="h-9 w-28" aria-hidden="true" />;
  if (session?.user) {
    const href = session.user.role === "tech" ? "/dashboard" : "/home";
    return (
      <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(79,149,152,0.25)] hover:bg-primary-dark transition-colors">
        Open dashboard <ArrowRight size={14} />
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="hidden sm:inline-flex items-center px-4 py-2 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors">Sign in</Link>
      <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(79,149,152,0.25)] hover:bg-primary-dark transition-colors">Get started <ArrowRight size={14} /></Link>
    </div>
  );
}

export function LandingPrimaryActions() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="h-12" aria-hidden="true" />;
  if (session?.user) {
    const href = session.user.role === "tech" ? "/dashboard" : "/book";
    return (
      <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(79,149,152,0.30)] hover:bg-primary-dark transition-colors">
        {session.user.role === "tech" ? "Open dashboard" : "Book a visit"} <ChevronRight size={16} />
      </Link>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-center">
      <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(79,149,152,0.30)] hover:bg-primary-dark transition-colors"><CalendarPlus size={18} />Book a visit</Link>
      <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-7 py-3.5 text-[15px] font-bold text-text-primary hover:bg-surface-secondary transition-colors">Sign in <ChevronRight size={16} /></Link>
    </div>
  );
}
