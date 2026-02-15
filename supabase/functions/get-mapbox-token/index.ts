import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let organizationId: string | null = null;
    try {
      const url = new URL(req.url);
      organizationId = url.searchParams.get('organization_id');
      if (!organizationId && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        organizationId = body.organization_id || null;
      }
    } catch {}

    if (organizationId) {
      const { data: orgSettings, error: orgError } = await supabase
        .from('organization_settings')
        .select('mapbox_token')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!orgError && orgSettings?.mapbox_token) {
        return secureJsonResponse({ token: orgSettings.mapbox_token, source: 'organization_settings' }, req);
      }
    }

    if (!organizationId) {
      const { data: anyOrgSettings } = await supabase
        .from('organization_settings')
        .select('mapbox_token')
        .not('mapbox_token', 'is', null)
        .limit(1)
        .maybeSingle();

      if (anyOrgSettings?.mapbox_token) {
        return secureJsonResponse({ token: anyOrgSettings.mapbox_token, source: 'organization_settings' }, req);
      }
    }

    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured and no token in organization_settings');
      return secureJsonResponse({ error: 'Mapbox token not configured' }, req, 500);
    }

    return secureJsonResponse({ token: mapboxToken, source: 'environment' }, req);
  } catch (error) {
    console.error('Error in get-mapbox-token function:', error);
    return secureJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
