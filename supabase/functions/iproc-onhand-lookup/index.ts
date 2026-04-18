// iPROC on-hand balance lookup (SOP 1.4.1) — STUB with mock data.
// Replace with real iPROC ERP call when integration credentials are configured.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tireSize = url.searchParams.get("tire_size") || "295/80R22.5";
    const sku = url.searchParams.get("sku") || `TIRE-${tireSize.replace(/\W/g, "")}`;

    // MOCK iPROC response — deterministic per SKU for repeatable demos.
    const mockBalance = {
      sku,
      tire_size: tireSize,
      total_on_hand: 12,
      warehouses: [
        { warehouse: "WH-A (Main)", quantity: 8, location: "Aisle 4 / Rack 2" },
        { warehouse: "WH-B (Bole)", quantity: 4, location: "Aisle 1 / Rack 1" },
      ],
      last_updated: new Date().toISOString(),
      _stub: true,
      _note: "iPROC integration pending — mock response",
    };

    return new Response(JSON.stringify(mockBalance), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
