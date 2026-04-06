/**
 * Shared Gateway Authentication
 * 
 * Validates requests from the TCP/UDP gateway using a shared HMAC key.
 * The gateway sends `x-gateway-key` header which must match GATEWAY_SHARED_KEY.
 * 
 * This prevents unauthorized systems from injecting telemetry data
 * into gps-data-receiver and gps-external-api endpoints.
 */

import { securityHeaders } from "./cors.ts";

const GATEWAY_RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  // Gateway requests are server-to-server, use permissive CORS
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token, x-gateway-key, x-api-key",
  ...securityHeaders,
};

/**
 * Validates the x-gateway-key header using constant-time comparison.
 * Returns null if valid, or an error Response if invalid.
 */
export function validateGatewayKey(req: Request): Response | null {
  const gatewayKey = req.headers.get("x-gateway-key");
  const expectedKey = Deno.env.get("GATEWAY_SHARED_KEY");

  // If GATEWAY_SHARED_KEY is not configured, skip validation (backward compat)
  if (!expectedKey) {
    console.warn("[gateway-auth] GATEWAY_SHARED_KEY not configured — skipping gateway auth");
    return null;
  }

  // If no key provided, check if this is a browser/API-key request (not gateway)
  if (!gatewayKey) {
    // Allow requests with device-token or api-key headers (non-gateway callers)
    const hasDeviceToken = !!req.headers.get("x-device-token");
    const hasApiKey = !!req.headers.get("x-api-key");
    const hasAuth = !!req.headers.get("authorization");
    if (hasDeviceToken || hasApiKey || hasAuth) {
      return null; // Authenticated via other means
    }

    return new Response(
      JSON.stringify({ success: false, error: "Missing x-gateway-key header" }),
      { status: 401, headers: GATEWAY_RESPONSE_HEADERS }
    );
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(gatewayKey, expectedKey)) {
    console.error("[gateway-auth] Invalid gateway key received");
    return new Response(
      JSON.stringify({ success: false, error: "Invalid gateway key" }),
      { status: 403, headers: GATEWAY_RESPONSE_HEADERS }
    );
  }

  return null; // Valid
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}
