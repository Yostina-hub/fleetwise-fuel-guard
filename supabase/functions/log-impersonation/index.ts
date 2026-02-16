import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 10, windowMs: 60_000 });
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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin");

    if (!roles || roles.length === 0) {
      return secureJsonResponse({ error: "Forbidden" }, req, 403);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Invalid or missing request body' }, req, 400);
    }
    const { impersonatedUserId, action, organizationId } = body;

    const { error: insertError } = await supabase.from("impersonation_audit_logs").insert({
      super_admin_id: user.id,
      impersonated_user_id: impersonatedUserId,
      action,
      organization_id: organizationId || null,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return secureJsonResponse({ error: "Failed to log impersonation event" }, req, 500);
    }

    return secureJsonResponse({ success: true }, req);
  } catch (error: any) {
    console.error('Log impersonation error:', error);
    return secureJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
