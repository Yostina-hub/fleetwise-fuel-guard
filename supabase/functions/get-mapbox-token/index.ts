import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role key to access organization_settings
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get organization ID from the request body or query params
    let organizationId: string | null = null;
    
    try {
      const url = new URL(req.url);
      organizationId = url.searchParams.get('organization_id');
      
      if (!organizationId && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        organizationId = body.organization_id || null;
      }
    } catch {}

    // 1) First try to get token from organization_settings
    if (organizationId) {
      const { data: orgSettings, error: orgError } = await supabase
        .from('organization_settings')
        .select('mapbox_token')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!orgError && orgSettings?.mapbox_token) {
        console.log('Using mapbox token from organization_settings');
        return new Response(
          JSON.stringify({ token: orgSettings.mapbox_token, source: 'organization_settings' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // 2) Try getting from any org settings if org_id not provided
    if (!organizationId) {
      const { data: anyOrgSettings } = await supabase
        .from('organization_settings')
        .select('mapbox_token')
        .not('mapbox_token', 'is', null)
        .limit(1)
        .maybeSingle();

      if (anyOrgSettings?.mapbox_token) {
        console.log('Using mapbox token from first available organization_settings');
        return new Response(
          JSON.stringify({ token: anyOrgSettings.mapbox_token, source: 'organization_settings' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // 3) Fall back to environment variable
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured and no token in organization_settings');
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Using mapbox token from environment variable');
    return new Response(
      JSON.stringify({ token: mapboxToken, source: 'environment' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in get-mapbox-token function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
