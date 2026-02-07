/**
 * In-memory per-IP rate limiter for API routes.
 * Use in /api/qa, /api/stt, /api/tts.
 */

const windowMs = 60 * 1000;
const maxPerWindow = 30;
const store = new Map<string, { count: number; resetAt: number }>();

function getKey(ip: string, path: string): string {
  return `${ip}:${path}`;
}

function prune(): void {
  const now = Date.now();
  Array.from(store.entries()).forEach(([k, v]) => {
    if (v.resetAt <= now) store.delete(k);
  });
}

export function rateLimit(ip: string, path: string): { ok: true } | { ok: false; retryAfter: number } {
  prune();
  const key = getKey(ip, path);
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  entry.count++;
  if (entry.count > maxPerWindow) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}

export function getRateLimitHeaders(ip: string, path: string): Record<string, string> {
  const key = getKey(ip, path);
  const entry = store.get(key);
  if (!entry) return {};
  const remaining = Math.max(0, maxPerWindow - entry.count);
  return {
    "X-RateLimit-Limit": String(maxPerWindow),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
  };
}
