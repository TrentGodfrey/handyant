"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "Verification link is missing a token. Try the link from your email again.",
  invalid_token: "Verification link is invalid or has already been used.",
  expired_token: "Verification link has expired. Request a new one from your account page.",
  email_taken: "That email address is already in use by another account.",
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // The /api/auth/verify-email GET endpoint redirects on success directly to
  // /account?verified=1 - so this page only renders when something went wrong.
  // If a token is present without an error, the user landed here from a
  // direct link and we let them know we're verifying.
  const token = searchParams.get("token");

  if (!error && token) {
    // Bounce them through the API endpoint so the actual verification runs.
    if (typeof window !== "undefined") {
      window.location.replace(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    }
    return (
      <div className="p-4 rounded-xl bg-blue-50 text-blue-800 text-sm text-center">
        Verifying your email…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">
          {ERROR_MESSAGES[error] ?? "Could not verify your email."}
        </div>
        <Link
          href="/account/manage"
          className="block w-full py-3 rounded-xl bg-primary text-white font-semibold text-center hover:bg-primary/90 transition"
        >
          Go to account
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-blue-50 text-blue-800 text-sm text-center">
      Open the verification link from your email to confirm your address.
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-2xl font-bold mb-3">
            HA
          </div>
          <h1 className="text-2xl font-bold text-foreground">Email verification</h1>
        </div>

        <Suspense fallback={<div className="h-32" />}>
          <VerifyEmailContent />
        </Suspense>

        <p className="text-center text-sm text-secondary">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
