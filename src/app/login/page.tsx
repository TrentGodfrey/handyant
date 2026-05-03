"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reset") !== "1") return null;
  return (
    <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
      Password reset. You can sign in with your new password.
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  // Detect whether Google provider is configured server-side. Default to NOT
  // showing the button until /api/auth/providers confirms it's available — the
  // unconditional button crashed in prod when env vars were absent.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && typeof data === "object" && "google" in data) {
          setShowGoogle(true);
        }
      })
      .catch(() => {
        /* leave hidden */
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/home");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-base font-black tracking-[-0.06em] mb-3">
            MCQ
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-secondary mt-1">Sign in to your MCQ Home Co. account</p>
        </div>

        {/* Google */}
        {showGoogle && (
          <>
            <button
              onClick={() => signIn("google", { callbackUrl: "/home" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-white text-foreground font-medium hover:bg-gray-50 transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-secondary uppercase">or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>
          </>
        )}

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Suspense fallback={null}>
            <ResetNotice />
          </Suspense>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
            />
            <div className="mt-1.5 text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
