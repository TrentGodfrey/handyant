"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console (in a real app, send to monitoring service)
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <Card padding="lg" className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-light">
          <AlertTriangle size={28} className="text-error" />
        </div>
        <h1 className="text-[20px] font-bold text-text-primary">Something went wrong</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
          We hit an unexpected error. Try again, or head back home.
        </p>

        {isDev && error?.message && (
          <div className="mt-4 rounded-lg bg-error-light px-3 py-2.5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-error">
              Dev details
            </p>
            <p className="mt-1 break-words font-mono text-[12px] text-error">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 font-mono text-[11px] text-error/70">
                digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="outline" icon={<Home size={14} />} onClick={() => { window.location.href = "/"; }}>
            Home
          </Button>
          <Button variant="primary" icon={<RotateCw size={14} />} onClick={() => reset()}>
            Try again
          </Button>
        </div>
        <Link href="/" className="sr-only">Home</Link>
      </Card>
    </div>
  );
}
