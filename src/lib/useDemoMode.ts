"use client";

import { useEffect, useState } from "react";

export function useDemoMode(): { isDemo: boolean; mounted: boolean } {
  const [isDemo, setIsDemo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDemo(document.cookie.includes("demo_mode=true"));
  }, []);

  return { isDemo, mounted };
}
