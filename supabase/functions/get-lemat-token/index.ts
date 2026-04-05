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

    const lematApiKey = Deno.env.get('LEMAT_API_KEY');
    if (!lematApiKey) {
      return secureJsonResponse({ error: 'Lemat API key not configured' }, req, 500);
    }

    return secureJsonResponse({ token: lematApiKey }, req);
  } catch (error) {
    console.error('Error in get-lemat-token function:', error);
    return secureJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
