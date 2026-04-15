import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://fleet.goffice.et",
  "https://fleetwise-fuel-guard.lovable.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith(".lovableproject.com")) return true;
  if (origin.endsWith(".lovable.app")) return true;
  return false;
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = isAllowedOrigin(origin) ? (origin || "*") : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    const tilePath = url.searchParams.get("path");

    if (!tilePath) {
      return new Response(JSON.stringify({ error: "Missing path parameter" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Fetch tile from Lemat server
    const tileUrl = `https://lemat.goffice.et/${tilePath}`;
    const tileResp = await fetch(tileUrl);

    if (!tileResp.ok) {
      return new Response(null, {
        status: tileResp.status,
        headers: corsHeaders(origin),
      });
    }

    const body = await tileResp.arrayBuffer();
    const contentType = tileResp.headers.get("content-type") || "application/x-protobuf";

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
