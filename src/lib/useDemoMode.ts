"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function useDemoMode(): { isDemo: boolean; mounted: boolean } {
  const { status } = useSession();
  const [isDemo, setIsDemo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    setMounted(true);
    if (status === "authenticated") {
      document.cookie = "demo_mode=; max-age=0; path=/; samesite=lax";
      setIsDemo(false);
      return;
    }
    setIsDemo(document.cookie.includes("demo_mode=true"));
  }, [status]);

  return { isDemo, mounted };
}
