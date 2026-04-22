import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";

const UPSTREAM_TIMEOUT_MS = 8000;

const createFallbackResponse = (lat: number, lng: number, reason: string) => ({
  display_name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
  name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
  lat,
  lng,
  address: {},
  fallback: true,
  fallback_reason: reason,
});

const fetchWithHttp1Fallback = async (url: string, apiKey: string) => {
  const headers = { "X-Api-Key": apiKey };

  try {
    return await fetch(url, {
      headers,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (primaryError) {
    console.warn("Primary fetch failed, retrying reverse-geocode over HTTP/1:", primaryError);

    const client = Deno.createHttpClient({
      http1: true,
      http2: false,
    });

    try {
      return await fetch(url, {
        client,
        headers,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } finally {
      client.close();
    }
  }
};

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 60, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing backend credentials", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(supabaseServiceKey),
      });
      return secureJsonResponse({ error: "Server configuration error" }, req, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return secureJsonResponse({ error: "Missing authorization header" }, req, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? supabaseServiceKey;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !claimsData?.claims?.sub) {
      console.error("Auth verification failed:", authError);
      return secureJsonResponse({ error: "Unauthorized" }, req, 401);
    }

    const lematApiKey = Deno.env.get("LEMAT_API_KEY");
    if (!lematApiKey) {
      return secureJsonResponse({ error: "Lemat API key not configured" }, req, 500);
    }

    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon") || url.searchParams.get("lng");

    if (!lat || !lon) {
      return secureJsonResponse({ error: "lat and lon parameters required" }, req, 400);
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isFinite(latNum) || !isFinite(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return secureJsonResponse({ error: "Invalid coordinates" }, req, 400);
    }

    const fallbackResponse = createFallbackResponse(latNum, lonNum, "upstream_unavailable");
    const lematUrl = `https://lemat.goffice.et/api/v1/reverse-geocode?lat=${latNum.toFixed(6)}&lon=${lonNum.toFixed(6)}`;

    try {
      const lematRes = await fetchWithHttp1Fallback(lematUrl, lematApiKey);

      if (!lematRes.ok) {
        const body = await lematRes.text();
        console.error("Lemat reverse-geocode error:", lematRes.status, body);
        return secureJsonResponse(
          {
            ...fallbackResponse,
            fallback_reason: `upstream_http_${lematRes.status}`,
          },
          req,
        );
      }

      const data = await lematRes.json();
      const resolvedLat = Number(data?.lat);
      const resolvedLng = Number(data?.lng ?? data?.lon);

      return secureJsonResponse(
        {
          ...fallbackResponse,
          ...data,
          lat: Number.isFinite(resolvedLat) ? resolvedLat : latNum,
          lng: Number.isFinite(resolvedLng) ? resolvedLng : lonNum,
          fallback: false,
          fallback_reason: null,
        },
        req,
      );
    } catch (error) {
      console.error("Lemat reverse-geocode upstream unavailable:", error);
      return secureJsonResponse(fallbackResponse, req);
    }
  } catch (error) {
    console.error("Error in lemat-reverse-geocode:", error);
    return secureJsonResponse({ error: "Internal server error" }, req, 500);
  }
});