// OLA SLA Monitor — runs every 2 min via cron.
// 1) Flags requests whose sla_due_at has passed without assignment.
// 2) Releases assigned-but-not-checked-in vehicles after 1 hour (NB clause of OLA).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date().toISOString();
  const result = { breached_flagged: 0, no_show_released: 0, errors: [] as string[] };

  // 1. Flag unassigned overdue requests as breached
  try {
    const { data: overdue, error } = await supabase
      .from("vehicle_requests")
      .select("id, request_number, sla_due_at")
      .is("assigned_at", null)
      .eq("sla_breached", false)
      .lt("sla_due_at", now)
      .is("deleted_at", null)
      .in("status", ["pending", "approved"])
      .limit(500);
    if (error) throw error;

    if (overdue && overdue.length) {
      const ids = overdue.map((r: any) => r.id);
      const { error: upErr } = await supabase
        .from("vehicle_requests")
        .update({ sla_breached: true, sla_breached_at: now })
        .in("id", ids);
      if (upErr) throw upErr;
      result.breached_flagged = overdue.length;
    }
  } catch (e: any) {
    result.errors.push(`breach: ${e.message}`);
  }

  // 2. Release assigned vehicles that no one has checked into within 1 hour
  try {
    const { data: noShows, error } = await supabase
      .from("vehicle_requests")
      .select("id, assigned_vehicle_id, request_number")
      .not("assigned_at", "is", null)
      .is("check_in_at", null)
      .is("driver_checked_in_at", null)
      .is("no_show_released_at", null)
      .lt("no_show_due_at", now)
      .is("deleted_at", null)
      .in("status", ["assigned", "approved"])
      .limit(200);
    if (error) throw error;

    for (const r of noShows ?? []) {
      const { error: relErr } = await supabase
        .from("vehicle_requests")
        .update({
          status: "cancelled",
          no_show_released_at: now,
          cancellation_reason: "Auto-released: vehicle not used within 1 hour of assignment (OLA NB clause)",
          assigned_vehicle_id: null,
          assigned_driver_id: null,
        })
        .eq("id", r.id);
      if (relErr) {
        result.errors.push(`release ${r.request_number}: ${relErr.message}`);
        continue;
      }
      result.no_show_released++;
    }
  } catch (e: any) {
    result.errors.push(`no_show: ${e.message}`);
  }

  return new Response(JSON.stringify({ ok: true, ...result, ts: now }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
