import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

/**
 * Geofence Auto-Close Edge Function
 * 
 * Checks all "assigned" vehicle requests that have a destination geofence.
 * If the vehicle's current telemetry position is within the destination geofence radius,
 * auto-close the request, set vehicle status to available, and release the driver.
 */

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get all assigned vehicle requests with destination coords
    const { data: activeRequests, error: reqErr } = await supabase
      .from("vehicle_requests")
      .select("id, assigned_vehicle_id, assigned_driver_id, destination_lat, destination_lng, destination_geofence_id, organization_id")
      .eq("status", "assigned")
      .not("destination_lat", "is", null)
      .not("destination_lng", "is", null)
      .not("assigned_vehicle_id", "is", null);

    if (reqErr) throw reqErr;
    if (!activeRequests || activeRequests.length === 0) {
      return new Response(JSON.stringify({ closed: 0, message: "No active assigned requests" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get geofence radii for requests with destination_geofence_id
    const geofenceIds = [...new Set(activeRequests.filter(r => r.destination_geofence_id).map(r => r.destination_geofence_id))];
    let geofenceMap: Record<string, number> = {};
    if (geofenceIds.length > 0) {
      const { data: geofences } = await supabase
        .from("geofences")
        .select("id, radius")
        .in("id", geofenceIds);
      if (geofences) {
        for (const g of geofences) {
          geofenceMap[g.id] = g.radius || 500;
        }
      }
    }

    // 3. Get vehicle telemetry for all assigned vehicles
    const vehicleIds = [...new Set(activeRequests.map(r => r.assigned_vehicle_id))];
    const { data: telemetry } = await supabase
      .from("vehicle_telemetry")
      .select("vehicle_id, lat, lng, last_communication_at")
      .in("vehicle_id", vehicleIds);

    const telemetryMap: Record<string, { lat: number; lng: number }> = {};
    if (telemetry) {
      for (const t of telemetry) {
        if (t.lat && t.lng) telemetryMap[t.vehicle_id] = { lat: t.lat, lng: t.lng };
      }
    }

    // 4. Check each request
    let closedCount = 0;
    const closedIds: string[] = [];

    for (const req of activeRequests) {
      const vPos = telemetryMap[req.assigned_vehicle_id];
      if (!vPos) continue;

      const destLat = req.destination_lat;
      const destLng = req.destination_lng;
      const radius = req.destination_geofence_id
        ? (geofenceMap[req.destination_geofence_id] || 500)
        : 500; // default 500m radius

      const distance = haversineDistance(vPos.lat, vPos.lng, destLat, destLng);

      if (distance <= radius) {
        // Auto-close this request
        const now = new Date().toISOString();
        await supabase
          .from("vehicle_requests")
          .update({
            status: "completed",
            auto_closed: true,
            auto_closed_at: now,
            completed_at: now,
            pool_review_status: "reviewed",
          })
          .eq("id", req.id);

        // Set vehicle status back to available/idle
        await supabase
          .from("vehicles")
          .update({ status: "available", updated_at: now })
          .eq("id", req.assigned_vehicle_id);

        // Release driver (set status back to active/available)
        if (req.assigned_driver_id) {
          await supabase
            .from("drivers")
            .update({ status: "active", updated_at: now })
            .eq("id", req.assigned_driver_id);
        }

        closedCount++;
        closedIds.push(req.id);
      }
    }

    return new Response(
      JSON.stringify({ closed: closedCount, closedIds, checked: activeRequests.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Geofence auto-close error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});