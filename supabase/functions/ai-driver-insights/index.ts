import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";
import { validateString, validateAll } from "../_shared/validation.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return secureJsonResponse({ error: "Authorization required" }, req, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return secureJsonResponse({ error: "Invalid or expired token" }, req, 401);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: "Invalid request body" }, req, 400);
    }

    const { driver_id, organization_id } = body;
    const validationError = validateAll(
      () => validateString(driver_id, "driver_id", { required: true, maxLength: 100 }),
      () => validateString(organization_id, "organization_id", { required: true, maxLength: 100 }),
    );
    if (validationError) return secureJsonResponse({ error: validationError }, req, 400);

    // Fetch driver data
    const [driverRes, tripsRes, scoresRes] = await Promise.all([
      supabase.from("drivers").select("first_name, last_name, safety_score, total_trips, total_distance_km, status").eq("id", driver_id).single(),
      supabase.from("trips").select("distance_km, fuel_consumed, start_time, end_time, status").eq("driver_id", driver_id).order("start_time", { ascending: false }).limit(15),
      supabase.from("driver_behavior_scores").select("overall_score, speeding_score, braking_score, acceleration_score, cornering_score, calculated_at").eq("driver_id", driver_id).order("calculated_at", { ascending: false }).limit(5),
    ]);

    const driver = driverRes.data;
    if (!driver) return secureJsonResponse({ error: "Driver not found" }, req, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a fleet management AI analyst. Analyze this driver's data and generate 2-3 actionable performance insights.

Driver: ${driver.first_name} ${driver.last_name} (Status: ${driver.status})
Safety Score: ${driver.safety_score || "N/A"}/100
Total Trips: ${driver.total_trips || 0}
Total Distance: ${driver.total_distance_km || 0} km

Recent Trips (last 15): ${JSON.stringify(tripsRes.data?.slice(0, 5) || [])}
Behavior Scores: ${JSON.stringify(scoresRes.data || [])}

Return ONLY a valid JSON array (no markdown, no backticks). Each object:
[{"insight_type":"performance_trend","severity":"info","title":"Short Title","description":"Detailed analysis...","action_items":["action1","action2"],"confidence_score":85}]

insight_type: risk_prediction | coaching_tip | performance_trend | fuel_optimization | route_suggestion
severity: positive | info | warning | critical`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI service error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    let insights: any[];
    try {
      const cleaned = rawContent.replace(/```json\n?|\n?```/g, "").trim();
      insights = JSON.parse(cleaned);
      if (!Array.isArray(insights)) throw new Error("Not an array");
    } catch {
      return secureJsonResponse({ error: "Failed to parse AI response", raw: rawContent }, req, 500);
    }

    // Store insights in the database
    const insertPromises = insights.map((insight: any) =>
      supabase.from("driver_ai_insights").insert({
        organization_id,
        driver_id,
        insight_type: insight.insight_type || "performance_trend",
        severity: insight.severity || "info",
        title: String(insight.title || "").slice(0, 255),
        description: String(insight.description || "").slice(0, 2000),
        action_items: Array.isArray(insight.action_items) ? insight.action_items : [],
        confidence_score: typeof insight.confidence_score === "number" ? insight.confidence_score : null,
        is_acknowledged: false,
      })
    );

    await Promise.all(insertPromises);

    return secureJsonResponse({ success: true, count: insights.length, insights }, req, 200);
  } catch (error: any) {
    console.error("Driver insights generation error:", error);
    return secureJsonResponse({ error: error.message || "Internal error" }, req, 500);
  }
});
