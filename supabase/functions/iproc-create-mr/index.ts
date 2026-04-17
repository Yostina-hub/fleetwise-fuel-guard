// iPROC auto Material Requisition generation (SOP 1.7) — STUB.
// In production this POSTs to the ERP and stores the returned MR number on tire_requests.
import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tire_request_id } = await req.json();
    if (!tire_request_id) {
      return new Response(JSON.stringify({ error: "tire_request_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Generate a mock MR number. Real impl would POST to iPROC and parse response.
    const mrNumber = `MR-${Date.now().toString().slice(-8)}`;

    const { error } = await supabase
      .from("tire_requests")
      .update({ iproc_mr_number: mrNumber })
      .eq("id", tire_request_id);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      iproc_mr_number: mrNumber,
      _stub: true,
      _note: "iPROC integration pending — mock MR generated",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
