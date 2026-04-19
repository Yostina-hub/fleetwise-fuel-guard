/**
 * iPROC Adapter — unified facade for ERP/iPROC operations.
 *
 * This is a MOCK adapter. It returns deterministic, repeatable data so the
 * Tire Request flow can run end-to-end without a live iPROC connection. When
 * real iPROC credentials become available, swap the `MOCK_*` blocks for
 * actual fetch() calls behind the same action names — the front-end keeps
 * working unchanged.
 *
 * Actions (POST body: { action, ... })
 *  - lookup_onhand:  { tire_size, sku? }                        → on-hand balance per warehouse
 *  - create_mr:      { tire_request_id }                        → generates an MR number, persists on tire_requests
 *  - post_return:    { request_item_id, warehouse?, notes? }    → marks an item returned + writes iPROC reference
 *  - asset_history:  { vehicle_id, asset_type? }                → mock past purchases
 *
 * All persistence uses the service role to bypass RLS so the adapter can be
 * called from any authenticated client without polluting policies.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const sb = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

/* -------- mock generators (deterministic per input) ----------------------- */

function mockOnHand(tireSize: string, sku: string) {
  // Use a tiny hash so results are stable per SKU but vary across SKUs.
  const h = [...sku].reduce((a, c) => a + c.charCodeAt(0), 0);
  const totalA = 4 + (h % 9);
  const totalB = 2 + ((h * 7) % 6);
  return {
    sku,
    tire_size: tireSize,
    total_on_hand: totalA + totalB,
    warehouses: [
      { warehouse: "WH-A (Main)", quantity: totalA, location: "Aisle 4 / Rack 2" },
      { warehouse: "WH-B (Bole)", quantity: totalB, location: "Aisle 1 / Rack 1" },
    ],
    last_updated: new Date().toISOString(),
    _mock: true,
  };
}

/* -------- handler --------------------------------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const action = String(body?.action ?? "");
  if (!action) return json({ error: "action is required" }, 400);

  try {
    switch (action) {
      case "lookup_onhand": {
        const tire_size = String(body.tire_size ?? "295/80R22.5");
        const sku = String(body.sku ?? `TIRE-${tire_size.replace(/\W/g, "")}`);
        return json(mockOnHand(tire_size, sku));
      }

      case "create_mr": {
        const id = String(body.tire_request_id ?? "");
        if (!id) return json({ error: "tire_request_id required" }, 400);
        const mrNumber = `MR-${Date.now().toString().slice(-8)}`;
        const { error } = await sb()
          .from("tire_requests")
          .update({ iproc_mr_number: mrNumber })
          .eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, iproc_mr_number: mrNumber, _mock: true });
      }

      case "post_return": {
        const itemId = String(body.request_item_id ?? "");
        if (!itemId) return json({ error: "request_item_id required" }, 400);
        const reference = `RTN-${Date.now().toString().slice(-8)}`;
        const { data, error } = await sb()
          .from("tire_request_items")
          .update({
            iproc_return_status: "returned",
            iproc_return_reference: reference,
            iproc_warehouse: body.warehouse ?? "WH-A (Main)",
            iproc_received_by: body.received_by ?? "iPROC system",
            iproc_returned_at: new Date().toISOString(),
            notes: body.notes ?? undefined,
          })
          .eq("id", itemId)
          .select("id, request_id")
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, iproc_return_reference: reference, ...data, _mock: true });
      }

      case "asset_history": {
        const vehicleId = String(body.vehicle_id ?? "");
        if (!vehicleId) return json({ error: "vehicle_id required" }, 400);
        const seed = vehicleId.slice(0, 8);
        return json({
          vehicle_id: vehicleId,
          purchases: [
            { date: "2025-09-12", sku: "TIRE-2958022", quantity: 4, mr: `MR-9100${seed.charCodeAt(0) % 99}` },
            { date: "2025-03-04", sku: "TIRE-2958022", quantity: 2, mr: `MR-8800${seed.charCodeAt(1) % 99}` },
          ],
          _mock: true,
        });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
