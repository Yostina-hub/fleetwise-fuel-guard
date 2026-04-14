import {
  buildCorsHeaders,
  handleCorsPreflightRequest,
  secureJsonResponse,
} from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  // CORS preflight
  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) return preflightResponse;

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureJsonResponse({ error: "Missing authorization" }, req, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify token via anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return secureJsonResponse({ error: "Invalid token" }, req, 401);
    }

    // Get user's organization using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return secureJsonResponse({ error: "No organization" }, req, 403);
    }

    const orgId = profile.organization_id;
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "aggregates";

    // Validate params
    const granularity =
      url.searchParams.get("granularity") === "daily" ? "daily" : "hourly";
    const vehicleId = url.searchParams.get("vehicle_id");
    const eventType = url.searchParams.get("event_type");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "200"), 1),
      1000
    );

    // UUID validation
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (vehicleId && !uuidRe.test(vehicleId)) {
      return secureJsonResponse({ error: "Invalid vehicle_id" }, req, 400);
    }

    // ── ACTION: aggregates ──
    if (action === "aggregates") {
      const viewName =
        granularity === "daily"
          ? "telemetry_daily_agg"
          : "telemetry_hourly_agg";

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

      return secureJsonResponse(
        { data, count: data?.length || 0, granularity },
        req
      );
    }

    // ── ACTION: events ──
    if (action === "events") {
      let query = supabase
        .from("telemetry_events")
        .select(
          "id, event_id, vehicle_id, device_id, event_type, event_time, payload, lat, lng, speed_kmh, heading, source"
        )
        .eq("organization_id", orgId)
        .order("event_time", { ascending: false })
        .limit(Math.min(limit, 500));

      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      if (eventType) query = query.eq("event_type", eventType);
      if (from) query = query.gte("event_time", from);
      if (to) query = query.lte("event_time", to);

      const { data, error } = await query;
      if (error) throw error;

      return secureJsonResponse({ data, count: data?.length || 0 }, req);
    }

    // ── ACTION: summary ──
    if (action === "summary") {
      if (!vehicleId) {
        return secureJsonResponse(
          { error: "vehicle_id required" },
          req,
          400
        );
      }

      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 86400000
      ).toISOString();
      const { data, error } = await supabase
        .from("telemetry_daily_agg")
        .select("*")
        .eq("organization_id", orgId)
        .eq("vehicle_id", vehicleId)
        .gte("bucket", thirtyDaysAgo)
        .order("bucket", { ascending: false });

      if (error) throw error;

      const summary = (data || []).reduce(
        (acc: any, row: any) => ({
          total_days: acc.total_days + 1,
          total_events: acc.total_events + (row.event_count || 0),
          avg_speed: acc.avg_speed + (row.avg_speed || 0),
          max_speed: Math.max(acc.max_speed, row.max_speed || 0),
          avg_fuel: acc.avg_fuel + (row.avg_fuel || 0),
          total_distance_km:
            acc.total_distance_km + (row.distance_km || 0),
          total_alarms: acc.total_alarms + (row.alarm_count || 0),
        }),
        {
          total_days: 0,
          total_events: 0,
          avg_speed: 0,
          max_speed: 0,
          avg_fuel: 0,
          total_distance_km: 0,
          total_alarms: 0,
        }
      );

      if (summary.total_days > 0) {
        summary.avg_speed =
          Math.round((summary.avg_speed / summary.total_days) * 10) / 10;
        summary.avg_fuel =
          Math.round((summary.avg_fuel / summary.total_days) * 10) / 10;
        summary.total_distance_km =
          Math.round(summary.total_distance_km * 10) / 10;
      }

      return secureJsonResponse(
        { data: { vehicle_id: vehicleId, ...summary } },
        req
      );
    }

    // ── ACTION: cron-status ──
    if (action === "cron-status") {
      const { data, error } = await supabase
        .from("cron_job_history")
        .select("*")
        .eq("organization_id", orgId)
        .order("executed_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return secureJsonResponse({ data, count: data?.length || 0 }, req);
    }

    return secureJsonResponse(
      {
        error:
          "Unknown action. Use: aggregates, events, summary, cron-status",
      },
      req,
      400
    );
  } catch (err) {
    return secureJsonResponse(
      { error: "Internal server error", message: (err as Error).message },
      req,
      500
    );
  }
});
