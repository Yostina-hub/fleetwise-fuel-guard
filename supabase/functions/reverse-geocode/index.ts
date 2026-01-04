import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "Missing lat or lng parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Nominatim with proper headers
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "FleetTracker/1.0 (https://lovable.dev)",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const data = await response.json();

    // Extract a clean address
    let address = `${lat}, ${lng}`;
    
    if (data.display_name) {
      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.footway,
        addr.neighbourhood || addr.suburb || addr.quarter,
        addr.city || addr.town || addr.village || addr.municipality,
      ].filter(Boolean);
      
      address = parts.length > 0 
        ? parts.join(", ") 
        : data.display_name.split(",").slice(0, 3).join(",");
    }

    return new Response(
      JSON.stringify({ address, raw: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Geocoding error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});