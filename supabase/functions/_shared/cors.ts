/**
 * Shared CORS + Security Headers utility for edge functions.
 *
 * Provides:
 * - Dynamic CORS origin validation (allowlisted origins only)
 * - Security response headers (X-Content-Type-Options, X-Frame-Options, etc.)
 * - Helper to build responses with all headers applied
 */

// Allowed origins for CORS (preview, published, localhost dev)
const ALLOWED_ORIGINS: string[] = [
  "https://fleetwise-fuel-guard.lovable.app",
  "https://id-preview--c2373776-be5b-46e0-8765-5dba59351e26.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

// Pattern for Lovable preview URLs (dynamic subdomains)
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+--[a-f0-9-]+\.lovable\.app$/;

/**
 * Check if an origin is allowed for CORS.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (LOVABLE_PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

/**
 * Security headers applied to ALL responses.
 */
export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Build dynamic CORS headers based on the request origin.
 * Falls back to the first allowed origin if the request origin is not recognized.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    ...securityHeaders,
  };
}

/**
 * Handle CORS preflight (OPTIONS) request.
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }
  return null;
}

/**
 * Build a JSON response with all security + CORS headers applied.
 */
export function secureJsonResponse(
  data: Record<string, unknown>,
  req: Request,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Build a streaming response with all security + CORS headers applied.
 */
export function secureStreamResponse(
  body: ReadableStream | null,
  req: Request,
  contentType = "text/event-stream"
): Response {
  return new Response(body, {
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": contentType,
    },
  });
}
