import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
export { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "./cors.ts";

// Legacy corsHeaders kept for backward compatibility with functions not yet migrated
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function successResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function verifyAuth(supabaseAdmin: SupabaseClient, authHeader: string | null) {
  if (!authHeader) return { user: null, error: "Authorization header required" };
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { user: null, error: "Invalid or expired token" };
  return { user, error: null };
}

export async function hasRole(
  supabase: SupabaseClient,
  userId: string,
  requiredRoles: string[],
  organizationId?: string
): Promise<boolean> {
  let query = supabase
    .from("user_roles")
    .select("role, organization_id")
    .eq("user_id", userId);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data: roles, error } = await query;
  if (error || !roles) return false;
  return roles.some((r: { role: string }) => requiredRoles.includes(r.role));
}

export async function isSuperAdmin(supabase: SupabaseClient, userId: string) {
  return hasRole(supabase, userId, ["super_admin"]);
}

export async function isOrgAdmin(supabase: SupabaseClient, userId: string, organizationId: string) {
  if (await isSuperAdmin(supabase, userId)) return true;
  return hasRole(supabase, userId, ["org_admin"], organizationId);
}

export async function getUserOrganization(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.organization_id || null;
}

export async function validateOrgAccess(
  supabase: SupabaseClient,
  userId: string,
  targetOrgId: string
) {
  const userOrgId = await getUserOrganization(supabase, userId);
  if (!userOrgId) return { allowed: false, userOrgId: null, error: "User organization not found" };
  if (await isSuperAdmin(supabase, userId)) return { allowed: true, userOrgId };
  if (userOrgId !== targetOrgId) return { allowed: false, userOrgId, error: "Organization access denied" };
  return { allowed: true, userOrgId };
}

export async function logSecurityEvent(
  supabase: SupabaseClient,
  event: {
    eventType: string;
    userId?: string;
    organizationId?: string;
    severity: string;
    description: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    await supabase.from("security_audit_logs").insert({
      event_type: event.eventType,
      user_id: event.userId,
      organization_id: event.organizationId,
      severity: event.severity,
      description: event.description,
      metadata: event.metadata || {},
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
    });
  } catch (e) {
    console.error("Failed to log security event:", e);
  }
}

export function getClientInfo(req: Request) {
  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}
