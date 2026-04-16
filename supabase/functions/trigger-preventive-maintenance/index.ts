import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Auto-trigger Preventive Maintenance
 *
 * Runs on a schedule (or manually). Scans every organization's active
 * maintenance_schedules and creates a preventive maintenance_request for
 * any schedule that has crossed its odometer / engine-hours / next-due-date
 * threshold. Existing approval matrix handles routing afterwards.
 */
serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional org scope from body
    let organizationId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.organization_id === "string") {
          organizationId = body.organization_id;
        }
      } catch {
        // no body
      }
    }

    const { data, error } = await supabase.rpc("trigger_preventive_maintenance", {
      p_organization_id: organizationId,
    });

    if (error) {
      console.error("trigger_preventive_maintenance RPC failed:", error);
      return new Response(
        JSON.stringify({ error: "Failed to run preventive trigger", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const created = Array.isArray(data) ? data.length : 0;
    console.log(`Preventive auto-trigger created ${created} request(s)`);

    return new Response(
      JSON.stringify({ created, requests: data ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Preventive trigger error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
