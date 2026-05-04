"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Eye, X } from "lucide-react";

/**
 * Sticky banner that appears on every page when the demo_mode cookie is set.
 * Lets the user know they're browsing sample data and gives them a one-click
 * exit. Hidden on auth pages (login/signup/etc) and on the /demo chooser
 * itself, where the banner would be redundant.
 */
export default function DemoBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDemo, setIsDemo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDemo(document.cookie.includes("demo_mode=true"));
  }, [pathname]);

  if (!mounted || !isDemo) return null;

  // Hide on screens where the banner would be redundant or in the way.
  const HIDE_ON = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/demo"];
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  function exitDemo() {
    document.cookie = "demo_mode=; max-age=0; path=/";
    setIsDemo(false);
    // Hard reload to /signup so the user can convert
    window.location.href = "/signup";
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-primary text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 text-[13px] font-medium min-w-0">
          <Eye size={15} className="shrink-0" />
          <span className="truncate">
            <span className="font-bold">Demo mode</span>
            <span className="hidden sm:inline"> · You&rsquo;re browsing sample data. Changes won&rsquo;t save.</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/demo")}
            className="hidden sm:inline-block rounded-md px-2.5 py-1 text-[12px] font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            Switch view
          </button>
          <button
            onClick={exitDemo}
            className="flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 px-3 py-1 text-[12px] font-semibold transition"
          >
            <X size={13} />
            Exit demo
          </button>
        </div>
      </div>
    </div>
  );
}
