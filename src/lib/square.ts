import { createHmac, timingSafeEqual } from "node:crypto";

export const SQUARE_API_VERSION = "2026-05-20";

function squareBaseUrl(): string {
  return process.env.SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}
export function isSquareCheckoutConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

export async function squareRequest<T>(path: string, init: RequestInit): Promise<T> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Square checkout is not configured");

  const response = await fetch(`${squareBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": SQUARE_API_VERSION,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.errors)
      ? body.errors.map((error: { detail?: string }) => error.detail).filter(Boolean).join("; ")
      : "Square request failed";
    throw new Error(message || "Square request failed");
  }
  return body as T;
}

export function squareWebhookUrl(origin: string): string {
  return process.env.SQUARE_WEBHOOK_URL ?? `${origin.replace(/\/$/, "")}/api/webhooks/square`;
}

export function isValidSquareWebhookSignature(params: {
  rawBody: string;
  signature: string;
  notificationUrl: string;
}): boolean {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey || !params.signature) return false;
  const expected = createHmac("sha256", signatureKey)
    .update(params.notificationUrl + params.rawBody)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(params.signature, "base64");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}
