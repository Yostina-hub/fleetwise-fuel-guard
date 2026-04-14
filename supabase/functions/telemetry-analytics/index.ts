import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token and get user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "aggregates";

    // Validate params
    const granularity = url.searchParams.get("granularity") === "daily" ? "daily" : "hourly";
    const vehicleId = url.searchParams.get("vehicle_id");
    const eventType = url.searchParams.get("event_type");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "200"), 1), 1000);

    // UUID validation
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (vehicleId && !uuidRe.test(vehicleId)) {
      return new Response(JSON.stringify({ error: "Invalid vehicle_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "aggregates") {
      const viewName = granularity === "daily" ? "telemetry_daily_agg" : "telemetry_hourly_agg";
      
      let query = supabase
        .from(viewName)
        .select("*")
        .eq("organization_id", orgId)
        .order("bucket", { ascending: false })
        .limit(limit);

      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      if (eventType) query = query.eq("event_type", eventType);
      if (from) query = query.gte("bucket", from);
      if (to) query = query.lte("bucket", to);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ data, count: data?.length || 0, granularity }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "events") {
      let query = supabase
        .from("telemetry_events")
        .select("id, event_id, vehicle_id, device_id, event_type, event_time, payload, lat, lng, speed_kmh, heading, source")
        .eq("organization_id", orgId)
        .order("event_time", { ascending: false })
        .limit(Math.min(limit, 500));

      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      if (eventType) query = query.eq("event_type", eventType);
      if (from) query = query.gte("event_time", from);
      if (to) query = query.lte("event_time", to);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "summary") {
      if (!vehicleId) {
        return new Response(JSON.stringify({ error: "vehicle_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get 30-day summary from daily aggregates
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("telemetry_daily_agg")
        .select("*")
        .eq("organization_id", orgId)
        .eq("vehicle_id", vehicleId)
        .gte("bucket", thirtyDaysAgo)
        .order("bucket", { ascending: false });

      if (error) throw error;

      // Aggregate locally
      const summary = (data || []).reduce(
        (acc, row) => ({
          total_days: acc.total_days + 1,
          total_events: acc.total_events + (row.event_count || 0),
          avg_speed: acc.avg_speed + (row.avg_speed || 0),
          max_speed: Math.max(acc.max_speed, row.max_speed || 0),
          avg_fuel: acc.avg_fuel + (row.avg_fuel || 0),
          total_distance_km: acc.total_distance_km + (row.distance_km || 0),
          total_alarms: acc.total_alarms + (row.alarm_count || 0),
        }),
        { total_days: 0, total_events: 0, avg_speed: 0, max_speed: 0, avg_fuel: 0, total_distance_km: 0, total_alarms: 0 }
      );

      if (summary.total_days > 0) {
        summary.avg_speed = Math.round((summary.avg_speed / summary.total_days) * 10) / 10;
        summary.avg_fuel = Math.round((summary.avg_fuel / summary.total_days) * 10) / 10;
        summary.total_distance_km = Math.round(summary.total_distance_km * 10) / 10;
      }

      return new Response(
        JSON.stringify({ data: { vehicle_id: vehicleId, ...summary } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: aggregates, events, summary" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
