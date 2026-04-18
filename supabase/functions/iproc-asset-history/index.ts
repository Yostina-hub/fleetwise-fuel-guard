// iPROC asset history — old tire serial numbers per vehicle (SOP 1.4.2). STUB.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const vehicleId = url.searchParams.get("vehicle_id") || "unknown";

    // MOCK — returns 4 old serials. Replace with iPROC asset registry call.
    const mockSerials = {
      vehicle_id: vehicleId,
      tires: [
        { position: "Front Left", serial: "MICH-2023-FL-9981", install_date: "2024-01-15", km_lifetime: 62000 },
        { position: "Front Right", serial: "MICH-2023-FR-9982", install_date: "2024-01-15", km_lifetime: 61500 },
        { position: "Rear Left Outer", serial: "BRGS-2023-RLO-7741", install_date: "2024-03-02", km_lifetime: 48000 },
        { position: "Rear Right Outer", serial: "BRGS-2023-RRO-7742", install_date: "2024-03-02", km_lifetime: 47800 },
      ],
      _stub: true,
      _note: "iPROC integration pending — mock response",
    };

    return new Response(JSON.stringify(mockSerials), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
