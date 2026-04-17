// Called from the Vehicle Dispatch workflow when a trip transitions to "completed".
// Creates a pending post-trip inspection record + driver alert (if org settings enable it).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  organization_id: string;
  vehicle_id: string;
  driver_id?: string | null;
  trip_id?: string | null;
  odometer_km?: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "missing bearer" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Validate caller's JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.organization_id || !body.vehicle_id) {
    return new Response(JSON.stringify({ error: "organization_id and vehicle_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Honour org setting
  const { data: settings } = await sb
    .from("inspection_settings")
    .select("posttrip_auto_create")
    .eq("organization_id", body.organization_id)
    .maybeSingle();
  if (settings && settings.posttrip_auto_create === false) {
    return new Response(JSON.stringify({ ok: true, skipped: "disabled in settings" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: insp, error: inspErr } = await sb
    .from("vehicle_inspections")
    .insert({
      organization_id: body.organization_id,
      vehicle_id: body.vehicle_id,
      driver_id: body.driver_id ?? null,
      inspection_type: "post_trip",
      status: "pending",
      odometer_km: body.odometer_km ?? null,
      inspection_date: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (inspErr) {
    return new Response(JSON.stringify({ error: inspErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Notify driver — include inspection_id in alert_data so the alert bell
  // can deep-link to /driver-portal?postTrip=<id>.
  await sb.from("alerts").insert({
    organization_id: body.organization_id,
    vehicle_id: body.vehicle_id,
    driver_id: body.driver_id ?? null,
    trip_id: body.trip_id ?? null,
    alert_type: "post_trip_inspection_required",
    severity: "medium",
    title: "Post-trip inspection required",
    message: "Please complete the post-trip inspection for the vehicle you just returned.",
    alert_time: new Date().toISOString(),
    status: "active",
    alert_data: { inspection_id: insp.id, trip_id: body.trip_id ?? null },
  });

  await sb.from("audit_logs").insert({
    organization_id: body.organization_id,
    user_id: userData.user.id,
    action: "post_trip_inspection_auto_created",
    resource_type: "vehicle_inspection",
    resource_id: insp.id,
    status: "success",
    new_values: { trip_id: body.trip_id, vehicle_id: body.vehicle_id },
  });

  return new Response(JSON.stringify({ ok: true, inspection_id: insp.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
