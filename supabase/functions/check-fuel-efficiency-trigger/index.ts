import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Auto Fuel Request Trigger
 * 
 * Checks vehicles with telemetry data for low fuel efficiency (km/liter).
 * When efficiency drops below the configurable threshold, auto-creates a fuel request.
 * Runs as a scheduled cron job.
 */

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get all orgs with auto fuel request enabled
    const { data: orgSettings, error: orgErr } = await supabase
      .from("organization_settings")
      .select("organization_id, fuel_efficiency_threshold, fuel_auto_request_enabled")
      .eq("fuel_auto_request_enabled", true);

    if (orgErr) throw orgErr;
    if (!orgSettings || orgSettings.length === 0) {
      return new Response(JSON.stringify({ triggered: 0, message: "No orgs with auto fuel request enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalTriggered = 0;

    for (const org of orgSettings) {
      const threshold = org.fuel_efficiency_threshold || 5.0;
      const orgId = org.organization_id;

      // 2. Get active vehicles with telemetry
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, fuel_type, status")
        .eq("organization_id", orgId)
        .in("status", ["available", "in_use"]);

      if (!vehicles || vehicles.length === 0) continue;

      for (const vehicle of vehicles) {
        // 3. Get last 2 fuel requests to calculate efficiency
        const { data: lastRequests } = await supabase
          .from("fuel_requests")
          .select("current_odometer, actual_liters, liters_approved, created_at")
          .eq("vehicle_id", vehicle.id)
          .eq("request_type", "vehicle")
          .not("current_odometer", "is", null)
          .order("created_at", { ascending: false })
          .limit(2);

        if (!lastRequests || lastRequests.length < 2) continue;

        const latest = lastRequests[0];
        const previous = lastRequests[1];

        if (!latest.current_odometer || !previous.current_odometer) continue;

        const kmDiff = latest.current_odometer - previous.current_odometer;
        const literUsed = latest.actual_liters || latest.liters_approved || 0;

        if (literUsed <= 0 || kmDiff <= 0) continue;

        const efficiency = kmDiff / literUsed;

        // 4. Check if efficiency is below threshold
        if (efficiency < threshold) {
          // Check if we already auto-triggered for this vehicle recently (within 24h)
          const { data: recentAuto } = await supabase
            .from("fuel_requests")
            .select("id")
            .eq("vehicle_id", vehicle.id)
            .eq("trigger_source", "auto")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (recentAuto && recentAuto.length > 0) continue;

          // 5. Get a fleet ops user to be the requester
          const { data: fleetOps } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("organization_id", orgId)
            .in("role", ["operations_manager", "fleet_manager", "super_admin"])
            .limit(1)
            .single();

          if (!fleetOps) continue;

          // 6. Auto-create fuel request
          const reqNum = `FR-AUTO-${Date.now().toString(36).toUpperCase()}`;
          const { error: insertErr } = await supabase
            .from("fuel_requests")
            .insert({
              organization_id: orgId,
              request_type: "vehicle",
              vehicle_id: vehicle.id,
              requested_by: fleetOps.user_id,
              request_number: reqNum,
              fuel_type: vehicle.fuel_type || "diesel",
              liters_requested: Math.ceil(60 / efficiency) * 10, // estimate based on tank
              purpose: `Auto-triggered: Low fuel efficiency detected (${efficiency.toFixed(1)} km/L, threshold: ${threshold} km/L)`,
              status: "pending",
              trigger_source: "auto",
              auto_triggered_at: new Date().toISOString(),
              auto_trigger_efficiency: Math.round(efficiency * 100) / 100,
              context_value: "Fuel request for vehicle",
              notes: `System auto-triggered. Vehicle ${vehicle.plate_number} efficiency dropped to ${efficiency.toFixed(1)} km/L (below ${threshold} km/L threshold).`,
            });

          if (!insertErr) {
            totalTriggered++;
          } else {
            console.error(`Failed to create auto fuel request for ${vehicle.plate_number}:`, insertErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ triggered: totalTriggered, orgsChecked: orgSettings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Fuel efficiency trigger error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
