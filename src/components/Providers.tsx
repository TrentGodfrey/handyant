"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import DemoBanner from "./DemoBanner";

const HEARTBEAT_INTERVAL_MS = 60_000;

function HeartbeatPing() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof document !== "undefined" && document.cookie.includes("demo_mode=true")) {
      return;
    }

    let cancelled = false;
    const ping = () => {
      if (cancelled) return;
      fetch("/api/me/heartbeat", { method: "POST" }).catch(() => {});
    };

    ping(); // initial ping on mount
    const id = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HeartbeatPing />
      <DemoBanner />
      {children}
    </SessionProvider>
  );
}
