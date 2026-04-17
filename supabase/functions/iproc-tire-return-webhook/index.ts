// iPROC -> Lovable webhook: receives old-tire return confirmations from the ERP.
// Public endpoint (verify_jwt = false). Authenticates via shared secret header.
//
// Expected payload:
// {
//   "request_number": "TRQ-20260417-0001",   // optional if request_item_id provided
//   "request_item_id": "<uuid>",              // optional alternative locator
//   "position": "Front Left",                 // required if locating by request_number
//   "iproc_return_reference": "PO-12345/RTN-9",
//   "warehouse": "Central Stores",
//   "received_by": "John Doe",
//   "returned_at": "2026-04-17T10:30:00Z"     // optional, defaults to now
// }
//
// Header: x-iproc-secret: <IPROC_WEBHOOK_SECRET>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-iproc-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SECRET = Deno.env.get("IPROC_WEBHOOK_SECRET");
    if (!SECRET) {
      return json({ error: "Webhook not configured" }, 500);
    }
    const provided = req.headers.get("x-iproc-secret");
    if (!provided || provided !== SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const {
      request_number,
      request_item_id,
      position,
      iproc_return_reference,
      warehouse,
      received_by,
      returned_at,
    } = body as Record<string, any>;

    if (!iproc_return_reference) return json({ error: "iproc_return_reference is required" }, 400);
    if (!request_item_id && !(request_number && position)) {
      return json({ error: "Provide request_item_id OR (request_number + position)" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve target item id
    let targetItemId = request_item_id as string | undefined;
    if (!targetItemId) {
      const { data: req, error: reqErr } = await supabase
        .from("tire_requests")
        .select("id")
        .eq("request_number", request_number)
        .maybeSingle();
      if (reqErr || !req) return json({ error: "Request not found", request_number }, 404);

      const { data: item, error: itemErr } = await supabase
        .from("tire_request_items")
        .select("id")
        .eq("request_id", req.id)
        .eq("position", position)
        .maybeSingle();
      if (itemErr || !item) return json({ error: "Item not found", request_number, position }, 404);
      targetItemId = item.id;
    }

    const { data: updated, error: upErr } = await supabase
      .from("tire_request_items")
      .update({
        iproc_return_status: "returned",
        iproc_return_reference,
        iproc_warehouse: warehouse ?? null,
        iproc_received_by: received_by ?? null,
        iproc_returned_at: returned_at ?? new Date().toISOString(),
      })
      .eq("id", targetItemId)
      .select("id, request_id")
      .single();
    if (upErr) return json({ error: upErr.message }, 500);

    // If all items now resolved, the header can be approved by maintenance.
    // We do not auto-approve here; we just confirm receipt.
    return json({ ok: true, item_id: updated.id, request_id: updated.request_id }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }

  function json(payload: unknown, status: number) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
