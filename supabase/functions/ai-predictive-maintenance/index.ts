// AI Predictive Maintenance — analyzes each vehicle with Lovable AI Gateway
// Returns structured failure prediction + reasoning per vehicle.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

const PREDICTION_TOOL = {
  type: "function",
  function: {
    name: "submit_prediction",
    description: "Return a structured maintenance failure prediction.",
    parameters: {
      type: "object",
      properties: {
        health_score: { type: "integer", minimum: 0, maximum: 100, description: "Overall vehicle health 0–100" },
        risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
        confidence: { type: "number", minimum: 0, maximum: 100, description: "AI confidence in the prediction (0-100)" },
        predicted_failure_component: { type: "string", description: "Most likely component to fail next (engine, brakes, transmission, tires, battery, suspension, etc.)" },
        predicted_failure_window_days: { type: "integer", description: "Estimated days until failure" },
        component_health: {
          type: "object",
          description: "Per-component health 0-100",
          properties: {
            engine: { type: "integer" },
            brakes: { type: "integer" },
            transmission: { type: "integer" },
            tires: { type: "integer" },
            battery: { type: "integer" },
            suspension: { type: "integer" },
            cooling: { type: "integer" },
            electrical: { type: "integer" },
          },
        },
        recommended_action: { type: "string", description: "Concise next step for fleet maintenance team" },
        recommended_priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        recommended_parts: { type: "array", items: { type: "string" }, description: "Likely parts needed" },
        estimated_cost_etb: { type: "number", description: "Estimated repair cost in Ethiopian Birr" },
        estimated_downtime_days: { type: "integer", description: "Estimated downtime days" },
        reasoning: { type: "string", description: "2-4 sentence explanation of how the prediction was derived" },
      },
      required: [
        "health_score", "risk_level", "confidence", "predicted_failure_component",
        "predicted_failure_window_days", "component_health", "recommended_action",
        "recommended_priority", "recommended_parts", "estimated_cost_etb",
        "estimated_downtime_days", "reasoning",
      ],
      additionalProperties: false,
    },
  },
};

async function analyzeVehicle(vehicle: any, alerts: any[], schedules: any[], maintenance: any[]) {
  const ageYears = vehicle.year ? new Date().getFullYear() - vehicle.year : null;
  const overdueCount = schedules.filter((s) => s.next_due_date && new Date(s.next_due_date) < new Date()).length;

  const summary = {
    plate: vehicle.plate_number,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    age_years: ageYears,
    mileage_km: vehicle.current_mileage_km ?? 0,
    fuel_type: vehicle.fuel_type,
    overdue_schedules: overdueCount,
    high_severity_alerts_30d: alerts.filter(
      (a) => ["high", "critical"].includes(a.severity) &&
        new Date(a.alert_time) > new Date(Date.now() - 30 * 86400 * 1000)
    ).length,
    recent_alerts_sample: alerts.slice(0, 8).map((a) => ({ type: a.alert_type, severity: a.severity, message: a.message })),
    recent_maintenance: maintenance.slice(0, 6).map((m) => ({ title: m.title, category: m.category, closed_at: m.closed_at })),
    overdue_items: schedules.filter((s) => s.next_due_date && new Date(s.next_due_date) < new Date()).slice(0, 5).map((s) => s.service_type),
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert fleet maintenance engineer for a commercial fleet in Ethiopia. " +
            "Predict the next likely component failure given vehicle telemetry, mileage, age, alerts, and maintenance history. " +
            "Be conservative with risk for new low-mileage vehicles, aggressive for old high-mileage vehicles with overdue maintenance. " +
            "Costs in ETB (Ethiopian Birr). Typical ranges: minor service 2,000-8,000 ETB, brake job 8,000-25,000, engine work 30,000-180,000.",
        },
        { role: "user", content: `Analyze this vehicle and submit a structured prediction:\n${JSON.stringify(summary, null, 2)}` },
      ],
      tools: [PREDICTION_TOOL],
      tool_choice: { type: "function", function: { name: "submit_prediction" } },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 429) throw new Error("Rate limited by AI gateway. Wait a minute and retry.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    throw new Error(`AI gateway error ${resp.status}: ${txt.slice(0, 200)}`);
  }

  const json = await resp.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("AI did not return a prediction");
  return JSON.parse(call.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
    const orgId = profile?.organization_id;
    if (!orgId) return new Response(JSON.stringify({ error: "No organization" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit ?? 10), 25);

    // Pick vehicles needing analysis (oldest first, prioritize active)
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, plate_number, make, model, year, current_mileage_km, fuel_type, status")
      .eq("organization_id", orgId)
      .in("status", ["active", "maintenance"])
      .order("year", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (vErr) throw vErr;

    const results: any[] = [];
    let processed = 0, critical = 0, high = 0, totalCost = 0, totalHealth = 0;
    const errors: string[] = [];

    for (const v of vehicles ?? []) {
      try {
        const [{ data: alerts }, { data: schedules }, { data: maintenance }] = await Promise.all([
          supabase.from("alerts").select("alert_type, severity, message, alert_time")
            .eq("vehicle_id", v.id).order("alert_time", { ascending: false }).limit(20),
          supabase.from("maintenance_schedules").select("service_type, next_due_date")
            .eq("vehicle_id", v.id).limit(20),
          supabase.from("maintenance_tickets").select("title, category, closed_at")
            .eq("vehicle_id", v.id).order("closed_at", { ascending: false, nullsFirst: false }).limit(10),
        ]);

        const pred = await analyzeVehicle(v, alerts ?? [], schedules ?? [], maintenance ?? []);

        await supabase.from("predictive_maintenance_scores").upsert({
          organization_id: orgId,
          vehicle_id: v.id,
          health_score: pred.health_score,
          risk_level: pred.risk_level,
          predicted_failure_component: pred.predicted_failure_component,
          predicted_failure_window_days: pred.predicted_failure_window_days,
          contributing_factors: {
            mileage_km: v.current_mileage_km,
            vehicle_age_years: v.year ? new Date().getFullYear() - v.year : null,
            overdue_schedules: (schedules ?? []).filter((s: any) => s.next_due_date && new Date(s.next_due_date) < new Date()).length,
            recent_high_alerts_30d: (alerts ?? []).filter((a: any) =>
              ["high", "critical"].includes(a.severity) &&
              new Date(a.alert_time) > new Date(Date.now() - 30 * 86400 * 1000)
            ).length,
          },
          recommended_action: pred.recommended_action,
          recommended_priority: pred.recommended_priority,
          ai_confidence: pred.confidence,
          ai_reasoning: pred.reasoning,
          ai_model: MODEL,
          estimated_cost_impact_etb: pred.estimated_cost_etb,
          estimated_downtime_days: pred.estimated_downtime_days,
          component_health: pred.component_health,
          recommended_parts: pred.recommended_parts,
          analysis_method: "ai",
          status: "open",
          computed_at: new Date().toISOString(),
        }, { onConflict: "organization_id,vehicle_id" });

        processed++;
        totalHealth += pred.health_score;
        totalCost += pred.estimated_cost_etb || 0;
        if (pred.risk_level === "critical") critical++;
        if (pred.risk_level === "high") high++;
        results.push({ vehicle: v.plate_number, ...pred });
      } catch (e) {
        errors.push(`${v.plate_number}: ${(e as Error).message}`);
      }
    }

    // Save daily snapshot for trend chart
    if (processed > 0) {
      const avg = totalHealth / processed;
      const { data: allScores } = await supabase
        .from("predictive_maintenance_scores")
        .select("risk_level")
        .eq("organization_id", orgId);
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      (allScores ?? []).forEach((s: any) => {
        if (counts[s.risk_level as keyof typeof counts] !== undefined) counts[s.risk_level as keyof typeof counts]++;
      });
      await supabase.from("predictive_health_snapshots").upsert({
        organization_id: orgId,
        snapshot_date: new Date().toISOString().slice(0, 10),
        avg_health_score: avg,
        vehicles_analyzed: processed,
        critical_count: counts.critical,
        high_count: counts.high,
        medium_count: counts.medium,
        low_count: counts.low,
        total_estimated_cost_etb: totalCost,
        analysis_method: "ai",
      }, { onConflict: "organization_id,snapshot_date" });
    }

    return new Response(JSON.stringify({ processed, critical, high, total_cost_etb: totalCost, errors, model: MODEL }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-predictive-maintenance error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
