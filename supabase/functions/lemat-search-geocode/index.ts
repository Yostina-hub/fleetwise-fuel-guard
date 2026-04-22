import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    const url = new URL(req.url);
    const isReverse = url.searchParams.get("reverse") === "1";

    // ---- Reverse geocoding branch (lat/lon -> address) ----
    if (isReverse) {
      const lat = Number.parseFloat(url.searchParams.get("lat") || "");
      const lon = Number.parseFloat(url.searchParams.get("lon") || "");
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return secureJsonResponse({ error: "Valid lat/lon required for reverse geocoding" }, req, 400);
      }

      const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
      reverseUrl.searchParams.set("format", "jsonv2");
      reverseUrl.searchParams.set("lat", String(lat));
      reverseUrl.searchParams.set("lon", String(lon));
      reverseUrl.searchParams.set("addressdetails", "1");

      const upstreamRes = await fetchWithHttp1Fallback(reverseUrl.toString(), {
        "Accept-Language": req.headers.get("accept-language") || "en",
        "User-Agent": "Lovable Cloud Geocoder/1.0",
        Accept: "application/json",
      });

      if (!upstreamRes.ok) {
        const body = await upstreamRes.text();
        console.error("Reverse geocode upstream error:", upstreamRes.status, body);
        return secureJsonResponse({ error: "Reverse geocode upstream unavailable", result: null }, req, 502);
      }

      const data = await upstreamRes.json();
      return secureJsonResponse({ result: data }, req);
    }

    // ---- Forward search branch (q -> results) ----
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