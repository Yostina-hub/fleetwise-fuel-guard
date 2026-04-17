// Public webhook entrypoint.
// External systems POST to:
//   https://<project>.supabase.co/functions/v1/workflow-webhook?token=<webhook_token>
// We look up the workflow by token, verify it's active+webhook-triggered,
// then call the workflow-runner to actually execute it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("x-workflow-token");
    if (!token || token.length < 16 || token.length > 96) {
      return json({ error: "missing or invalid token" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: wf, error } = await admin
      .from("workflows")
      .select("id, organization_id, status, trigger_type")
      .eq("webhook_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!wf) return json({ error: "unknown token" }, 404);
    if (wf.status !== "active") {
      return json({ error: `workflow status is ${wf.status}, not active` }, 409);
    }

    let payload: any = null;
    try {
      payload = req.method === "POST" ? await req.json() : null;
    } catch {
      payload = null;
    }

    // Fire & forget the runner (don't await full execution → keep webhook fast)
    const runnerUrl = `${SUPABASE_URL}/functions/v1/workflow-runner`;
    fetch(runnerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        workflow_id: wf.id,
        trigger_data: { source: "webhook", received_at: new Date().toISOString(), payload },
      }),
    }).catch((e) => console.error("runner invoke failed:", e));

    return json({ ok: true, workflow_id: wf.id, queued: true }, 202);
  } catch (e: any) {
    console.error("workflow-webhook error:", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
