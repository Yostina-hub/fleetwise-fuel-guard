import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";

import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

interface FleetData {
  vehicles: any[];
  telemetry: any[];
  trips: any[];
  alerts: any[];
  fuelEvents: any[];
  driverScores: any[];
}

interface FleetComputedMetrics {
  totalVehicles: number;
  activeVehicles: number;
  onlineVehicles: number;
  offlineVehicles: number;

  totalTrips: number;
  totalDistanceKm: number;
  avgSpeedKmh: number;
  totalIdleMinutes: number;
  totalFuelConsumedLiters: number;

  unacknowledgedAlerts: number;
  criticalActiveAlerts: number;
  alertTypes: string[];

  totalRefueledLiters: number;
  fuelAnomaliesDetected: number;

  avgDriverScore: number;
  driversBelow70: number;
}

function computeFleetMetrics(data: FleetData): FleetComputedMetrics {
  const { vehicles, telemetry, trips, alerts, fuelEvents, driverScores } = data;

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;

  // Deduplicate telemetry by vehicle_id and only count telemetry for known vehicles
  const vehicleIds = new Set(vehicles.map(v => v.id));
  const latestTelemetryByVehicle = new Map<string, any>();
  telemetry.forEach(t => {
    if (!vehicleIds.has(t.vehicle_id)) return;

    const existing = latestTelemetryByVehicle.get(t.vehicle_id);
    if (!existing || new Date(t.last_communication_at) > new Date(existing.last_communication_at)) {
      latestTelemetryByVehicle.set(t.vehicle_id, t);
    }
  });

  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  let onlineCount = 0;
  latestTelemetryByVehicle.forEach((t) => {
    const lastComm = new Date(t.last_communication_at).getTime();
    if (t.device_connected && lastComm >= fifteenMinutesAgo) {
      onlineCount++;
    }
  });

  const onlineVehicles = Math.min(onlineCount, totalVehicles);
  const offlineVehicles = Math.max(0, totalVehicles - onlineVehicles);

  const totalTrips = trips.length;
  const totalDistanceKm = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);

  const tripsWithSpeed = trips.filter(t => t.avg_speed_kmh != null && t.avg_speed_kmh > 0);
  const avgSpeedKmh = tripsWithSpeed.length > 0
    ? tripsWithSpeed.reduce((sum, t) => sum + t.avg_speed_kmh, 0) / tripsWithSpeed.length
    : 0;

  const totalIdleMinutes = trips.reduce((sum, t) => sum + (t.idle_time_minutes || 0), 0);
  const totalFuelConsumedLiters = trips.reduce((sum, t) => sum + (t.fuel_consumed_liters || 0), 0);

  const unacknowledgedAlerts = alerts.filter(a => a.status === 'unacknowledged').length;
  const criticalActiveAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;
  const alertTypes = [...new Set(alerts.map(a => a.alert_type).filter(Boolean))] as string[];

  const totalRefueledLiters = fuelEvents
    .filter(e => e.event_type === 'refuel')
    .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters || 0), 0);

  const fuelAnomaliesDetected = fuelEvents.filter(e =>
    e.event_type === 'theft' || e.event_type === 'leak' || e.event_type === 'drain' || e.event_type === 'sudden_drop'
  ).length;

  const avgDriverScore = driverScores.length > 0
    ? driverScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / driverScores.length
    : 0;
  const driversBelow70 = driverScores.filter(s => (s.overall_score || 0) < 70).length;

  return {
    totalVehicles,
    activeVehicles,
    onlineVehicles,
    offlineVehicles,
    totalTrips,
    totalDistanceKm,
    avgSpeedKmh,
    totalIdleMinutes,
    totalFuelConsumedLiters,
    unacknowledgedAlerts,
    criticalActiveAlerts,
    alertTypes,
    totalRefueledLiters,
    fuelAnomaliesDetected,
    avgDriverScore,
    driversBelow70,
  };
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return secureJsonResponse({ error: "Authorization required" }, req, 401);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { organizationId, insightType, context } = body;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant fleet data based on insight type
    const fleetData = await fetchFleetData(supabase, organizationId, insightType);
    const computedMetrics = computeFleetMetrics(fleetData);
    
    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(insightType, context);
    const userPrompt = buildUserPrompt(insightType, fleetData, context, computedMetrics);

    console.log(`Generating ${insightType} insights for org ${organizationId}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    // Parse the AI response into structured insights
    const insights = parseInsights(aiResponse, insightType);

    return new Response(JSON.stringify({ insights, raw: aiResponse, computedMetrics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI fleet insights error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchFleetData(supabase: any, organizationId: string, insightType: string): Promise<FleetData> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [vehiclesRes, telemetryRes, tripsRes, alertsRes, fuelRes, scoresRes] = await Promise.all([
    supabase.from('vehicles').select('id, plate_number, status, make, model, year, vehicle_type').eq('organization_id', organizationId).limit(100),
    supabase.from('vehicle_telemetry').select('*').eq('organization_id', organizationId).gte('last_communication_at', oneDayAgo.toISOString()).limit(500),
    supabase.from('trips').select('id, vehicle_id, distance_km, duration_minutes, max_speed_kmh, avg_speed_kmh, idle_time_minutes, fuel_consumed_liters, start_time, end_time').eq('organization_id', organizationId).gte('start_time', oneWeekAgo.toISOString()).limit(200),
    supabase.from('alerts').select('id, alert_type, severity, status, vehicle_id, alert_time, message').eq('organization_id', organizationId).gte('alert_time', oneWeekAgo.toISOString()).limit(100),
    supabase.from('fuel_events').select('id, vehicle_id, event_type, fuel_change_liters, event_time').eq('organization_id', organizationId).gte('event_time', oneWeekAgo.toISOString()).limit(200),
    supabase.from('driver_behavior_scores').select('driver_id, overall_score, speeding_score, braking_score, safety_rating, score_period_end').eq('organization_id', organizationId).order('score_period_end', { ascending: false }).limit(50),
  ]);

  return {
    vehicles: vehiclesRes.data || [],
    telemetry: telemetryRes.data || [],
    trips: tripsRes.data || [],
    alerts: alertsRes.data || [],
    fuelEvents: fuelRes.data || [],
    driverScores: scoresRes.data || [],
  };
}

function buildSystemPrompt(insightType: string, context?: any): string {
  const basePrompt = `You are FleetAI, an intelligent fleet management analyst. You analyze fleet data and provide actionable insights.

Your responses should be:
- Concise and actionable (max 3-5 key insights)
- Data-driven with specific numbers when available
- Prioritized by business impact
- Written in a professional but accessible tone

CRITICAL RULES (do not violate):
- Never claim counts that contradict the provided fleet overview (e.g., Online Now > Total Vehicles, negative Offline).
- Do not invent missing telemetry/trip metrics. If a metric is missing (null/0 due to no data), explicitly say it is "Not available" or "Not captured".
- Prefer reporting "insufficient data" over reporting zeros as factual activity.

Format your response as JSON with the following structure:
{
  "summary": "One sentence executive summary",
  "insights": [
    {
      "type": "warning|success|info|critical",
      "title": "Short title",
      "description": "Detailed insight",
      "metric": "Key metric if applicable",
      "action": "Recommended action"
    }
  ],
  "healthScore": 0-100,
  "trends": {
    "improving": ["list of improving metrics"],
    "declining": ["list of declining metrics"]
  }
}`;

  const typeSpecificPrompts: Record<string, string> = {
    dashboard: `${basePrompt}

Focus on overall fleet health, including:
- Vehicle utilization and availability
- Active alerts requiring attention
- Fuel efficiency trends
- Driver safety scores
- Maintenance predictions`,

    tracking: `${basePrompt}

Focus on real-time tracking insights:
- Vehicle movement patterns and anomalies
- Offline/disconnected vehicles
- GPS signal quality issues
- Route deviation detection
- ETA predictions`,

    speed: `${basePrompt}

Focus on speed management and compliance:
- Speeding violations and patterns
- High-risk drivers
- Zone-based speed compliance
- Fuel savings from speed optimization
- Safety improvements from governor usage`,

    fuel: `${basePrompt}

Focus on fuel management and efficiency:
- Fuel consumption trends
- Theft or anomaly detection
- Inefficient vehicles
- Idle time impact on fuel
- Refueling pattern analysis
- Cost optimization opportunities`,
  };

  return typeSpecificPrompts[insightType] || basePrompt;
}

function buildUserPrompt(
  insightType: string,
  data: FleetData,
  context?: any,
  computedMetrics?: FleetComputedMetrics
): string {
  const m = computedMetrics ?? computeFleetMetrics(data);

  const avgSpeedText = m.avgSpeedKmh > 0 ? `${m.avgSpeedKmh.toFixed(1)} km/h` : 'Not available';
  const fuelConsumedText = m.totalFuelConsumedLiters > 0 ? `${m.totalFuelConsumedLiters.toFixed(0)} liters` : 'Not available';
  const idleTimeText = m.totalIdleMinutes > 0 ? `${(m.totalIdleMinutes / 60).toFixed(1)} hours` : 'Not available';

  const prompt = `Analyze this fleet data and provide insights:

FLEET OVERVIEW (authoritative counts):
- Total Vehicles: ${m.totalVehicles}
- Active: ${m.activeVehicles}, Online Now: ${m.onlineVehicles}
- Offline: ${m.offlineVehicles}

TRIP METRICS (Last 7 Days):
- Total Trips: ${m.totalTrips}
- Total Distance: ${m.totalDistanceKm.toFixed(0)} km
- Average Speed: ${avgSpeedText}
- Total Idle Time: ${idleTimeText}
- Fuel Consumed: ${fuelConsumedText}

ALERTS:
- Unacknowledged: ${m.unacknowledgedAlerts}
- Critical Active: ${m.criticalActiveAlerts}
- Alert Types: ${m.alertTypes.join(', ') || 'None'}

FUEL:
- Total Refueled: ${m.totalRefueledLiters.toFixed(0)} liters
- Anomalies Detected: ${m.fuelAnomaliesDetected}

DRIVER SAFETY:
- Average Score: ${m.avgDriverScore.toFixed(0)}/100
- Drivers Below 70: ${m.driversBelow70}

${context ? `ADDITIONAL CONTEXT: ${JSON.stringify(context)}` : ''}

Provide ${insightType === 'dashboard' ? 'executive-level' : insightType + '-focused'} insights.`;

  return prompt;
}

function parseInsights(aiResponse: string, insightType: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', e);
  }

  // Return a fallback structure if parsing fails
  return {
    summary: "Fleet analysis complete",
    insights: [{
      type: "info",
      title: "AI Analysis",
      description: aiResponse.slice(0, 500),
      action: "Review the detailed analysis"
    }],
    healthScore: 75,
    trends: { improving: [], declining: [] }
  };
}
