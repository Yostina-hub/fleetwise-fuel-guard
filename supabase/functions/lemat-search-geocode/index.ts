import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";

const UPSTREAM_TIMEOUT_MS = 8000;

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const fetchWithHttp1Fallback = async (url: string, headers: Record<string, string>) => {
  try {
    return await fetch(url, {
      headers,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (primaryError) {
    console.warn("Primary fetch failed, retrying search-geocode over HTTP/1:", primaryError);

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
      return secureJsonResponse({ error: "Server configuration error" }, req, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return secureJsonResponse({ error: "Missing authorization header" }, req, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return secureJsonResponse({ error: "Unauthorized" }, req, 401);
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim();
    const countrycodes = url.searchParams.get("countrycodes")?.trim() || "et";
    const limitParam = Number.parseInt(url.searchParams.get("limit") || "5", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 10) : 5;

    if (!query || query.length < 3) {
      return secureJsonResponse({ error: "q parameter must be at least 3 characters" }, req, 400);
    }

    const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
    searchUrl.searchParams.set("format", "jsonv2");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("countrycodes", countrycodes);
    searchUrl.searchParams.set("limit", String(limit));
    searchUrl.searchParams.set("addressdetails", "0");

    const upstreamRes = await fetchWithHttp1Fallback(searchUrl.toString(), {
      "Accept-Language": req.headers.get("accept-language") || "en",
      "User-Agent": "Lovable Cloud Geocoder/1.0",
      Accept: "application/json",
    });

    if (!upstreamRes.ok) {
      const body = await upstreamRes.text();
      console.error("Search geocode upstream error:", upstreamRes.status, body);
      return secureJsonResponse({ error: "Search upstream unavailable", results: [] }, req, 502);
    }

    const data = (await upstreamRes.json()) as SearchResult[];
    return secureJsonResponse({ results: data }, req);
  } catch (error) {
    console.error("Error in lemat-search-geocode:", error);
    return secureJsonResponse({ error: "Internal server error" }, req, 500);
  }
});