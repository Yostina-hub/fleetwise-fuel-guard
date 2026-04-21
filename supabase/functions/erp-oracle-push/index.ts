// ERP Oracle Cloud push: drains the erp_outbox queue and pushes pending
// delegation/approval events to Oracle ERP Cloud REST. Uses Basic auth.
//
// Required org-level secrets (set per deploy via Lovable Cloud):
//   ORACLE_ERP_BASE_URL   e.g. https://your-instance.oraclecloud.com
//   ORACLE_ERP_USERNAME   integration user
//   ORACLE_ERP_PASSWORD   integration password
//
// Endpoint mapping (configurable later): POSTs to
//   {ORACLE_ERP_BASE_URL}/fscmRestApi/resources/11.13.18.05/erpintegrations
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const baseUrl = Deno.env.get("ORACLE_ERP_BASE_URL");
  const user = Deno.env.get("ORACLE_ERP_USERNAME");
  const pass = Deno.env.get("ORACLE_ERP_PASSWORD");

  try {
    // Pull a small batch of due items
    const { data: items, error } = await supabase
      .from("erp_outbox")
      .select("id, organization_id, entity_type, entity_id, event_type, payload, attempts")
      .eq("status", "pending")
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, note: "queue empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // No credentials? Mark as 'awaiting_credentials' so admins know to configure.
    if (!baseUrl || !user || !pass) {
      const ids = items.map((i) => i.id);
      await supabase
        .from("erp_outbox")
        .update({
          status: "awaiting_credentials",
          last_error: "ORACLE_ERP_BASE_URL / USERNAME / PASSWORD not configured",
        })
        .in("id", ids);
      return new Response(
        JSON.stringify({
          success: false,
          processed: 0,
          paused: ids.length,
          reason: "Oracle ERP credentials missing",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = "Basic " + btoa(`${user}:${pass}`);
    const endpoint = `${baseUrl.replace(/\/$/, "")}/fscmRestApi/resources/11.13.18.05/erpintegrations`;

    let success = 0;
    let failed = 0;

    for (const item of items) {
      const body = {
        OperationName: "uploadFleetDelegationEvent",
        DocumentContent: btoa(
          JSON.stringify({
            source: "lovable_fleet",
            organization_id: item.organization_id,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            event_type: item.event_type,
            payload: item.payload,
            occurred_at: new Date().toISOString(),
          }),
        ),
        ContentType: "application/json",
        FileName: `${item.entity_type}_${item.entity_id ?? item.id}.json`,
      };

      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(body),
        });

        const text = await resp.text();

        if (resp.ok) {
          await supabase
            .from("erp_outbox")
            .update({
              status: "pushed",
              pushed_at: new Date().toISOString(),
              response_code: resp.status,
              response_body: text.slice(0, 4000),
              last_error: null,
            })
            .eq("id", item.id);
          success++;
        } else {
          const attempts = (item.attempts ?? 0) + 1;
          const giveUp = attempts >= MAX_ATTEMPTS;
          // Exponential backoff: 1m, 5m, 15m, 1h, 6h
          const backoffMin = [1, 5, 15, 60, 360][Math.min(attempts - 1, 4)];
          const next = new Date(Date.now() + backoffMin * 60 * 1000).toISOString();
          await supabase
            .from("erp_outbox")
            .update({
              status: giveUp ? "failed" : "pending",
              attempts,
              next_attempt_at: next,
              response_code: resp.status,
              response_body: text.slice(0, 4000),
              last_error: `HTTP ${resp.status}: ${text.slice(0, 500)}`,
            })
            .eq("id", item.id);
          failed++;
        }
      } catch (err) {
        const attempts = (item.attempts ?? 0) + 1;
        const giveUp = attempts >= MAX_ATTEMPTS;
        const backoffMin = [1, 5, 15, 60, 360][Math.min(attempts - 1, 4)];
        const next = new Date(Date.now() + backoffMin * 60 * 1000).toISOString();
        await supabase
          .from("erp_outbox")
          .update({
            status: giveUp ? "failed" : "pending",
            attempts,
            next_attempt_at: next,
            last_error: err instanceof Error ? err.message : String(err),
          })
          .eq("id", item.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: items.length, pushed: success, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("erp-oracle-push error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
