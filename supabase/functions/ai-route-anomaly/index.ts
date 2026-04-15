import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { vehicleId, date, organizationId, telemetryPoints } = body;

    if (!organizationId || !vehicleId) {
      return new Response(JSON.stringify({ error: "vehicleId and organizationId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify org access
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    if (profile?.organization_id !== organizationId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get vehicle info
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("plate_number, make, model, fuel_type")
      .eq("id", vehicleId)
      .single();

    // If telemetry not passed from client, fetch from DB
    let points = telemetryPoints;
    if (!points || points.length === 0) {
      const targetDate = date || new Date().toISOString().split("T")[0];
      const startISO = `${targetDate}T00:00:00Z`;
      const endISO = `${targetDate}T23:59:59.999Z`;

      const { data: dbPoints } = await supabase
        .from("vehicle_telemetry_history")
        .select("latitude, longitude, speed_kmh, fuel_level_percent, heading, last_communication_at, engine_on")
        .eq("vehicle_id", vehicleId)
        .gte("last_communication_at", startISO)
        .lte("last_communication_at", endISO)
        .order("last_communication_at", { ascending: true })
        .limit(500);

      points = dbPoints || [];
    }

    if (points.length < 3) {
      return new Response(JSON.stringify({
        anomalies: [],
        summary: "Insufficient data points for analysis",
        riskScore: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare condensed telemetry for AI analysis
    const condensed = points.map((p: any, i: number) => ({
      idx: i,
      t: p.last_communication_at,
      lat: p.latitude,
      lng: p.longitude,
      spd: p.speed_kmh,
      fuel: p.fuel_level_percent,
      hdg: p.heading,
      eng: p.engine_on,
    }));

    // Compute basic stats for context
    const speeds = points.map((p: any) => p.speed_kmh).filter((s: any) => s != null);
    const fuels = points.map((p: any) => p.fuel_level_percent).filter((f: any) => f != null);
    const maxSpeed = Math.max(...speeds, 0);
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length : 0;
    const fuelStart = fuels[0] ?? null;
    const fuelEnd = fuels[fuels.length - 1] ?? null;
    const fuelDrop = fuelStart != null && fuelEnd != null ? fuelStart - fuelEnd : null;

    // Detect sudden fuel drops (>5% in consecutive readings)
    const suddenFuelDrops: any[] = [];
    for (let i = 1; i < fuels.length; i++) {
      if (fuels[i - 1] - fuels[i] > 5) {
        suddenFuelDrops.push({ idx: i, drop: fuels[i - 1] - fuels[i] });
      }
    }

    // Detect speed spikes
    const speedSpikes = speeds.filter((s: number) => s > 120).length;

    // Detect GPS jumps (teleportation)
    const gpsJumps: any[] = [];
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      if (p1.latitude && p2.latitude) {
        const dist = haversine(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        const timeDiff = (new Date(p2.last_communication_at).getTime() - new Date(p1.last_communication_at).getTime()) / 1000;
        if (timeDiff > 0 && dist > 0) {
          const impliedSpeed = (dist / timeDiff) * 3600; // km/h
          if (impliedSpeed > 300) {
            gpsJumps.push({ idx: i, impliedSpeedKmh: Math.round(impliedSpeed), distKm: dist.toFixed(2) });
          }
        }
      }
    }

    const systemPrompt = `You are an expert fleet telemetry analyst for an Ethiopian fleet management system. Analyze vehicle route data and detect anomalies.

You will receive telemetry data for vehicle ${vehicle?.plate_number || "Unknown"} (${vehicle?.make || ""} ${vehicle?.model || ""}, ${vehicle?.fuel_type || "diesel"}).

Analyze for these anomaly categories:
1. **Route Deviation** - Unusual routes, unauthorized stops, detours from expected paths
2. **Speed Anomalies** - Dangerous speeding, unusual speed patterns, sudden acceleration/deceleration
3. **Fuel Anomalies** - Sudden fuel drops (possible theft/siphoning), abnormal consumption rates
4. **GPS Tampering** - Location jumps, impossible movements, signal gaps
5. **Idle Abuse** - Excessive engine-on idle time, unauthorized stops with engine running
6. **Time Anomalies** - Driving during restricted hours, unusual trip timing patterns

Return your analysis as a JSON object with this exact structure:
{
  "riskScore": <0-100 overall risk score>,
  "summary": "<2-3 sentence overview>",
  "anomalies": [
    {
      "type": "<route_deviation|speed_anomaly|fuel_anomaly|gps_tampering|idle_abuse|time_anomaly>",
      "severity": "<low|medium|high|critical>",
      "title": "<short title>",
      "description": "<detailed explanation>",
      "recommendation": "<actionable recommendation>",
      "confidence": <0-100>,
      "dataPointIndex": <index in telemetry array or null>,
      "timeRange": "<HH:MM - HH:MM or null>"
    }
  ],
  "drivingScore": <0-100 driving quality score>,
  "insights": ["<insight 1>", "<insight 2>", "..."]
}`;

    const userPrompt = `Analyze this route telemetry (${points.length} data points):

**Pre-computed statistics:**
- Max Speed: ${maxSpeed.toFixed(0)} km/h
- Avg Speed: ${avgSpeed.toFixed(0)} km/h
- Speed Spikes (>120 km/h): ${speedSpikes}
- Fuel Start: ${fuelStart ?? "N/A"}%, Fuel End: ${fuelEnd ?? "N/A"}%, Total Drop: ${fuelDrop?.toFixed(1) ?? "N/A"}%
- Sudden Fuel Drops (>5%): ${JSON.stringify(suddenFuelDrops)}
- GPS Jumps (implied >300 km/h): ${JSON.stringify(gpsJumps)}

**Telemetry Data (sampled ${Math.min(condensed.length, 100)} of ${condensed.length} points):**
${JSON.stringify(condensed.slice(0, 100))}

Provide thorough anomaly analysis. If no anomalies are found, return an empty anomalies array with a positive summary.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_anomalies",
            description: "Report detected route anomalies",
            parameters: {
              type: "object",
              properties: {
                riskScore: { type: "number", description: "0-100 overall risk" },
                summary: { type: "string" },
                drivingScore: { type: "number", description: "0-100 driving quality" },
                anomalies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["route_deviation", "speed_anomaly", "fuel_anomaly", "gps_tampering", "idle_abuse", "time_anomaly"] },
                      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      recommendation: { type: "string" },
                      confidence: { type: "number" },
                      timeRange: { type: "string" },
                    },
                    required: ["type", "severity", "title", "description", "recommendation", "confidence"],
                  },
                },
                insights: { type: "array", items: { type: "string" } },
              },
              required: ["riskScore", "summary", "anomalies", "drivingScore", "insights"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_anomalies" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let result;

    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        result = { riskScore: 0, summary: "Analysis completed but response parsing failed", anomalies: [], drivingScore: 50, insights: [] };
      }
    } else {
      // Try parsing content directly
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content);
      } catch {
        result = { riskScore: 0, summary: content || "Analysis completed", anomalies: [], drivingScore: 50, insights: [] };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Route anomaly error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
