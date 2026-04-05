import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 60, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    // Auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureJsonResponse({ error: "Missing authorization header" }, req, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
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

    const lematUrl = `https://lemat.goffice.et/api/v1/reverse-geocode?lat=${latNum.toFixed(6)}&lon=${lonNum.toFixed(6)}`;
    const lematRes = await fetch(lematUrl, {
      headers: { "X-Api-Key": lematApiKey },
    });

    if (!lematRes.ok) {
      const body = await lematRes.text();
      console.error("Lemat reverse-geocode error:", lematRes.status, body);
      return secureJsonResponse({ error: "Geocoding failed" }, req, lematRes.status);
    }

    const data = await lematRes.json();
    return secureJsonResponse(data, req);
  } catch (error) {
    console.error("Error in lemat-reverse-geocode:", error);
    return secureJsonResponse({ error: "Internal server error" }, req, 500);
  }
});
