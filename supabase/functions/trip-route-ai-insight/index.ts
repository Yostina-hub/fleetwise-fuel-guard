// AI-powered trip route insight.
// Given an origin + destination + (optional) live vehicle position, the
// function asks Lovable AI Gateway (Gemini Flash, free) for a concise,
// professional travel briefing: ETA hints, traffic & condition expectations,
// and one or two recommended driving tips. Returned as a short paragraph.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import {
  buildCorsHeaders,
  handleCorsPreflightRequest,
  secureJsonResponse,
} from "../_shared/cors.ts";

interface InsightRequest {
  origin?: { lat: number; lng: number; label?: string };
  destination?: { lat: number; lng: number; label?: string };
  current?: { lat: number; lng: number } | null;
  routeDistanceKm?: number | null;
  routeDurationMin?: number | null;
  vehicleLabel?: string | null;
  departureTime?: string | null; // ISO
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    // AUTH
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return secureJsonResponse({ error: "Missing authorization header" }, req, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return secureJsonResponse({ error: "Unauthorized" }, req, 401);
    }

    const body = (await req.json()) as InsightRequest;
    if (!body.origin || !body.destination) {
      return secureJsonResponse(
        { error: "origin and destination are required" },
        req,
        400,
      );
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return secureJsonResponse(
        { error: "AI gateway not configured" },
        req,
        500,
      );
    }

    const distance =
      body.routeDistanceKm != null ? `${body.routeDistanceKm} km` : "unknown";
    const eta =
      body.routeDurationMin != null ? `${body.routeDurationMin} min` : "unknown";
    const departure = body.departureTime
      ? new Date(body.departureTime).toLocaleString("en-GB", {
          timeZone: "Africa/Addis_Ababa",
        })
      : "now";
    const live = body.current
      ? `Vehicle is currently at ${body.current.lat.toFixed(4)}, ${body.current.lng.toFixed(4)}.`
      : "No live GPS position yet.";

    const systemPrompt = [
      "You are a professional fleet dispatch AI assisting a driver in Ethiopia.",
      "Given the trip context, produce a concise, friendly travel briefing.",
      "Mention typical road conditions, expected traffic for the time of day,",
      "any obvious driving cautions (e.g., highland weather, mountain passes,",
      "city congestion), and a refined ETA estimate. Avoid hallucinating specific",
      "incidents. Keep the response under 90 words. Use plain text — no markdown.",
    ].join(" ");

    const userPrompt = `
Trip:
- From: ${body.origin.label || `${body.origin.lat},${body.origin.lng}`}
- To: ${body.destination.label || `${body.destination.lat},${body.destination.lng}`}
- Distance (routed): ${distance}
- Duration (routed): ${eta}
- Departure: ${departure}
- Vehicle: ${body.vehicleLabel || "company fleet vehicle"}
- ${live}

Provide the briefing now.`.trim();

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return secureJsonResponse(
        { error: "AI rate limit hit. Try again in a moment." },
        req,
        429,
      );
    }
    if (aiRes.status === 402) {
      return secureJsonResponse(
        { error: "AI credits exhausted. Please add credits to continue." },
        req,
        402,
      );
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      return secureJsonResponse({ error: "AI gateway error" }, req, 500);
    }

    const json = await aiRes.json();
    const content =
      json?.choices?.[0]?.message?.content?.toString().trim() ||
      "No insight available.";

    return secureJsonResponse({ insight: content }, req);
  } catch (err) {
    console.error("trip-route-ai-insight error", err);
    return secureJsonResponse({ error: "Internal server error" }, req, 500);
  }
});
