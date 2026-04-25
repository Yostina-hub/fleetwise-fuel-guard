// Idle-time detector: scans recent telemetry for vehicles idling ≥10min
// (engine on, speed ≤3 km/h) and creates an alert with a re-route suggestion
// for the next dispatch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IDLE_THRESHOLD_MIN = 10;
const SPEED_THRESHOLD = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const lookbackMs = 30 * 60 * 1000; // 30-min window
    const since = new Date(Date.now() - lookbackMs).toISOString();

    // Pull recent telemetry, ordered by vehicle/time
    const { data: tele, error: tErr } = await supabase
      .from("vehicle_telemetry")
      .select("vehicle_id, organization_id, speed_kmh, engine_on, ignition_on, last_communication_at, latitude, longitude, device_connected")
      .gte("last_communication_at", since)
      .order("vehicle_id", { ascending: true })
      .order("last_communication_at", { ascending: true })
      .limit(5000);

    if (tErr) throw tErr;

    type T = NonNullable<typeof tele>[number];
    const byVehicle = new Map<string, T[]>();
    for (const row of tele || []) {
      if (!row.vehicle_id) continue;
      if (!byVehicle.has(row.vehicle_id)) byVehicle.set(row.vehicle_id, []);
      byVehicle.get(row.vehicle_id)!.push(row);
    }

    const alertsCreated: string[] = [];

    for (const [vehicleId, points] of byVehicle.entries()) {
      let idleStart: T | null = null;
      let lastIdle: T | null = null;

      for (const p of points) {
        const speed = Number(p.speed_kmh ?? 0);
        const engineOn = Boolean(p.engine_on || p.ignition_on);
        const isIdle = engineOn && speed <= SPEED_THRESHOLD && p.device_connected;

        if (isIdle) {
          if (!idleStart) idleStart = p;
          lastIdle = p;
        } else if (idleStart && lastIdle) {
          await maybeAlert(supabase, vehicleId, idleStart, lastIdle, alertsCreated);
          idleStart = null;
          lastIdle = null;
        }
      }
      // Tail: still idling at end of window
      if (idleStart && lastIdle) {
        await maybeAlert(supabase, vehicleId, idleStart, lastIdle, alertsCreated);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned_vehicles: byVehicle.size,
        alerts_created: alertsCreated.length,
        threshold_minutes: IDLE_THRESHOLD_MIN,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("idle-time-detector error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function maybeAlert(
  supabase: any,
  vehicleId: string,
  start: any,
  end: any,
  acc: string[],
) {
  const durationMin = Math.round(
    (new Date(end.last_communication_at).getTime() -
      new Date(start.last_communication_at).getTime()) / 60000,
  );
  if (durationMin < IDLE_THRESHOLD_MIN) return;

  const orgId = start.organization_id;
  if (!orgId) return;

  // Dedupe: skip if an open idle alert exists for this vehicle in last 2h
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("alerts")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("alert_type", "idle_time")
    .eq("status", "open")
    .gte("alert_time", twoHoursAgo)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Find most recent active trip_assignment for re-route suggestion
  const { data: nextAssignment } = await supabase
    .from("trip_assignments")
    .select("id, driver_id")
    .eq("vehicle_id", vehicleId)
    .in("status", ["assigned", "in_progress", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const suggestion = nextAssignment
    ? `Suggest dispatcher re-route assignment ${String(nextAssignment.id).slice(0, 8)} to reduce idle exposure.`
    : "No active dispatch found — flag for next assignment planning.";

  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      organization_id: orgId,
      vehicle_id: vehicleId,
      alert_type: "idle_time",
      severity: durationMin >= 30 ? "high" : "medium",
      title: `Excessive idle time: ${durationMin} min`,
      message: `Vehicle idled for ${durationMin} minutes (engine on, stationary). ${suggestion}`,
      alert_time: end.last_communication_at,
      lat: start.latitude,
      lng: start.longitude,
      status: "open",
      alert_data: {
        duration_minutes: durationMin,
        threshold_minutes: IDLE_THRESHOLD_MIN,
        suggested_next_assignment: nextAssignment?.id ?? null,
        action: "suggest_reroute",
      },
    })
    .select("id")
    .single();

  if (!error && alert) acc.push(String((alert as { id: string }).id));
}
