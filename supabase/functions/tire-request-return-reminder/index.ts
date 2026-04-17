// Daily reminder — pings tire requests stuck in iPROC return check > 24h.
import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: stuck, error } = await supabase
      .from("workflow_instances")
      .select("id, organization_id, reference_number, vehicle_id, updated_at")
      .eq("workflow_type", "tire_request")
      .eq("current_stage", "iproc_return_check")
      .lt("updated_at", cutoff);

    if (error) throw error;

    const reminders = (stuck || []).map((w) => ({
      organization_id: w.organization_id,
      title: `Tire request ${w.reference_number} awaiting tire return`,
      message: `Old tires for tire request ${w.reference_number} have not been returned to the warehouse for >24h. Please follow up.`,
      severity: "warning",
      alert_type: "tire_request_return_overdue",
      alert_time: new Date().toISOString(),
      vehicle_id: w.vehicle_id,
      status: "open",
    }));

    if (reminders.length > 0) {
      await supabase.from("alerts").insert(reminders);
    }

    return new Response(JSON.stringify({ checked: stuck?.length || 0, reminders_sent: reminders.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
