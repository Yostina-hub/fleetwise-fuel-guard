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

    // AUTH: Verify caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureJsonResponse({ error: "Missing authorization header" }, req, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return secureJsonResponse({ error: "Unauthorized" }, req, 401);
    }

    // Get user's organization to scope token retrieval
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    let organizationId: string | null = callerProfile?.organization_id || null;
    try {
      const url = new URL(req.url);
      const queryOrgId = url.searchParams.get('organization_id');
      if (queryOrgId) {
        // Only super_admin can request tokens for other orgs
        if (queryOrgId !== organizationId) {
          const { data: saRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "super_admin");
          if (saRole && saRole.length > 0) {
            organizationId = queryOrgId;
          }
          // Otherwise stick with user's own org
        } else {
          organizationId = queryOrgId;
        }
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
