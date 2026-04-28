"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Wrench } from "lucide-react";

export default function RoleSwitcher() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Only show switcher for tech users who can access both views
  if (session?.user?.role !== "tech") return null;

  const adminPrefixes = ["/dashboard", "/schedule", "/jobs", "/homes", "/admin-messages", "/reports", "/settings"];
  const isAdmin = adminPrefixes.some((p) => pathname.startsWith(p));

  return (
    <div
      className="lg:hidden fixed left-1/2 -translate-x-1/2 z-[9999] flex rounded-full bg-white border border-border p-1"
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)", top: "max(12px, env(safe-area-inset-top, 12px))" }}
    >
      <a
        href="/home"
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all no-underline ${
          !isAdmin
            ? "bg-primary text-white shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <User size={14} />
        Customer
      </a>
      <a
        href="/dashboard"
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all no-underline ${
          isAdmin
            ? "bg-primary text-white shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <Wrench size={14} />
        Staff
      </a>
    </div>
  );
}
