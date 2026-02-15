import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return secureJsonResponse({ error: "Unauthorized" }, req, 401);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Invalid or missing request body' }, req, 400);
    }
    const {
      sessionId, impersonatedUserId, organizationId,
      activityType, resourceType, resourceId, action, details, metadata,
    } = body;

    const { error: insertError } = await supabase.from("impersonation_activity_logs").insert({
      impersonation_session_id: sessionId,
      super_admin_id: user.id,
      impersonated_user_id: impersonatedUserId,
      organization_id: organizationId || null,
      activity_type: activityType,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      action,
      details: details || {},
      metadata: metadata || {},
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return secureJsonResponse({ error: insertError.message }, req, 500);
    }

    return secureJsonResponse({ success: true }, req);
  } catch (error: any) {
    console.error('Log impersonation activity error:', error);
    return secureJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
