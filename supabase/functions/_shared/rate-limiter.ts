/**
 * Shared in-memory rate limiter for edge functions.
 *
 * Uses a sliding-window counter per client identifier (IP or user ID).
 * Because each edge-function instance is ephemeral, the window resets on
 * cold starts — this is acceptable for abuse prevention (not billing).
 *
 * Usage:
 *   import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
 *
 *   const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
 *   const rl = checkRateLimit(clientIp, { maxRequests: 30, windowMs: 60_000 });
 *   if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Max requests allowed in the window. Default: 30 */
  maxRequests?: number;
  /** Window duration in milliseconds. Default: 60 000 (1 min) */
  windowMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

// In-memory store (per isolate). Automatically garbage-collected on shutdown.
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to avoid unbounded growth within a long-lived isolate
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 120_000; // 2 minutes

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/**
 * Check whether a request from `clientId` is within the rate limit.
 */
export function checkRateLimit(
  clientId: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const maxRequests = options.maxRequests ?? 30;
  const windowMs = options.windowMs ?? 60_000;
  const now = Date.now();

  cleanup(now);

  let entry = store.get(clientId);

  // Window expired or first request — start fresh
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(clientId, entry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: entry.resetAt, limit: maxRequests };
  }

  entry.count++;
  store.set(clientId, entry);

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: maxRequests };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt, limit: maxRequests };
}

/**
 * Build a 429 response with standard rate-limit headers.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(retryAfter, 1)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

/**
 * Extract a client identifier from the request (IP-based).
 */
export function getClientId(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
