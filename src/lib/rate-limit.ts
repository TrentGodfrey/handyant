interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const globalRateLimits = globalThis as unknown as { mcqRateLimits?: Map<string, RateLimitEntry> };
const store = globalRateLimits.mcqRateLimits ?? new Map<string, RateLimitEntry>();
globalRateLimits.mcqRateLimits = store;

export function requestIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export function takeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (store.size >= 5_000 && !store.has(key)) {
    for (const [entryKey, entry] of store) {
      if (entry.resetAt <= now) store.delete(entryKey);
    }
    // Keep the in-process fallback bounded even when an attacker intentionally
    // generates thousands of unique keys inside the same active window.
    while (store.size >= 5_000) {
      const oldestKey = store.keys().next().value as string | undefined;
      if (!oldestKey) break;
      store.delete(oldestKey);
    }
  }
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function checkRateLimit(key: string, limit: number, now = Date.now()) {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    if (current) store.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: current.count < limit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}

export function rateLimited(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
