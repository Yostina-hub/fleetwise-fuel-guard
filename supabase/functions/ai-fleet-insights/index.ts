import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FleetData {
  vehicles: any[];
  telemetry: any[];
  trips: any[];
  alerts: any[];
  fuelEvents: any[];
  driverScores: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, insightType, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant fleet data based on insight type
    const fleetData = await fetchFleetData(supabase, organizationId, insightType);
    
    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(insightType, context);
    const userPrompt = buildUserPrompt(insightType, fleetData, context);

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

    return new Response(JSON.stringify({ insights, raw: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI fleet insights error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
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

function buildUserPrompt(insightType: string, data: FleetData, context?: any): string {
  const { vehicles, telemetry, trips, alerts, fuelEvents, driverScores } = data;

  // Calculate key metrics
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  
  // CRITICAL: Deduplicate telemetry by vehicle_id and only count vehicles that exist in the vehicles list
  const vehicleIds = new Set(vehicles.map(v => v.id));
  const latestTelemetryByVehicle = new Map<string, any>();
  telemetry.forEach(t => {
    // Only include telemetry for vehicles that exist in our fleet
    if (!vehicleIds.has(t.vehicle_id)) return;
    
    const existing = latestTelemetryByVehicle.get(t.vehicle_id);
    if (!existing || new Date(t.last_communication_at) > new Date(existing.last_communication_at)) {
      latestTelemetryByVehicle.set(t.vehicle_id, t);
    }
  });
  
  // Count online vehicles using the 15-minute threshold and bounded by total vehicles
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  let onlineCount = 0;
  latestTelemetryByVehicle.forEach((t) => {
    const lastComm = new Date(t.last_communication_at).getTime();
    if (lastComm >= fifteenMinutesAgo && t.device_connected) {
      onlineCount++;
    }
  });
  
  // Ensure online count never exceeds total vehicles
  const onlineVehicles = Math.min(onlineCount, totalVehicles);
  const offlineVehicles = Math.max(0, totalVehicles - onlineVehicles);

  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
  
  // Only count trips with valid avg_speed_kmh for average calculation
  const tripsWithSpeed = trips.filter(t => t.avg_speed_kmh != null && t.avg_speed_kmh > 0);
  const avgSpeed = tripsWithSpeed.length > 0 ? tripsWithSpeed.reduce((sum, t) => sum + t.avg_speed_kmh, 0) / tripsWithSpeed.length : 0;
  const totalIdleMinutes = trips.reduce((sum, t) => sum + (t.idle_time_minutes || 0), 0);
  const totalFuelConsumed = trips.reduce((sum, t) => sum + (t.fuel_consumed_liters || 0), 0);

  const unacknowledgedAlerts = alerts.filter(a => a.status === 'unacknowledged');
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved');

  const fuelAnomalies = fuelEvents.filter(e => e.event_type === 'theft' || e.event_type === 'leak' || e.event_type === 'drain').filter(e => e.status !== 'false_positive');
  const totalRefuels = fuelEvents.filter(e => e.event_type === 'refuel').reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);

  const avgDriverScore = driverScores.length > 0 ? driverScores.reduce((sum, s) => sum + s.overall_score, 0) / driverScores.length : 0;
  const lowScoreDrivers = driverScores.filter(s => s.overall_score < 70).length;

  const prompt = `Analyze this fleet data and provide insights:

FLEET OVERVIEW:
- Total Vehicles: ${totalVehicles}
- Active: ${activeVehicles}, Online Now: ${onlineVehicles}
- Offline: ${offlineVehicles}

TRIP METRICS (Last 7 Days):
- Total Trips: ${totalTrips}
- Total Distance: ${totalDistance.toFixed(0)} km
- Average Speed: ${avgSpeed.toFixed(1)} km/h
- Total Idle Time: ${(totalIdleMinutes / 60).toFixed(1)} hours
- Fuel Consumed: ${totalFuelConsumed.toFixed(0)} liters

ALERTS:
- Unacknowledged: ${unacknowledgedAlerts.length}
- Critical Active: ${criticalAlerts.length}
- Alert Types: ${[...new Set(alerts.map(a => a.alert_type))].join(', ') || 'None'}

FUEL:
- Total Refueled: ${totalRefuels.toFixed(0)} liters
- Anomalies Detected: ${fuelAnomalies.length}

DRIVER SAFETY:
- Average Score: ${avgDriverScore.toFixed(0)}/100
- Drivers Below 70: ${lowScoreDrivers}

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
