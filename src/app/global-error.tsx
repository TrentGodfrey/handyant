"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          background: "#FAF9F7",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#111827",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 8, lineHeight: 1.5 }}>
            A critical error occurred. Please try reloading the page.
          </p>
          {isDev && error?.message && (
            <pre
              style={{
                marginTop: 16,
                padding: 10,
                background: "#FEF2F2",
                color: "#DC2626",
                borderRadius: 8,
                fontSize: 12,
                textAlign: "left",
                overflow: "auto",
              }}
            >
              {error.message}
            </pre>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
            <a
              href="/"
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                color: "#111827",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Home
            </a>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                background: "#4F9598",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
