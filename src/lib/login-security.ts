export const LOGIN_IP_EMAIL_ATTEMPT_LIMIT = 8;
export const LOGIN_IP_EMAIL_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_ACCOUNT_ATTEMPT_LIMIT = 50;
export const LOGIN_ACCOUNT_WINDOW_MS = 60 * 60 * 1000;
export const MAX_PASSWORD_LENGTH = 128;

export function normalizeCredentialEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function loginIpEmailRateLimitKey(email: string, ip: string): string {
  return `login:ip-email:${ip}:${normalizeCredentialEmail(email)}`;
}

export function loginAccountRateLimitKey(email: string): string {
  return `login:account:${normalizeCredentialEmail(email)}`;
}

export function credentialRequestIp(headers?: Record<string, unknown>): string {
  const cloudflare = firstHeaderValue(headers?.["cf-connecting-ip"]);
  if (cloudflare) return cloudflare;
  const forwarded = firstHeaderValue(headers?.["x-forwarded-for"]);
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function firstHeaderValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === "string");
    return first?.trim() || null;
  }
  return null;
}
