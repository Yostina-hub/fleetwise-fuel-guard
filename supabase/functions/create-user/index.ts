import {
  createAdminClient,
  verifyAuth,
  isSuperAdmin,
  isOrgAdmin,
  getUserOrganization,
  logSecurityEvent,
  getClientInfo,
} from "../_shared/security.ts";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";
import { validateEmail, validateString, validateEnum, validateOptionalUUID, validateAll } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 5, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseAdmin = createAdminClient();
    const { user: requestingUser, error: authError } = await verifyAuth(
      supabaseAdmin,
      req.headers.get("Authorization")
    );

    if (authError || !requestingUser) {
      return secureJsonResponse({ success: false, error: authError || "Unauthorized" }, req, 401);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ success: false, error: 'Invalid or missing request body' }, req, 400);
    }
    const { email, password, fullName, role, organizationId } = body;

    // Input validation
    const validationError = validateAll(
      () => validateEmail(email),
      () => validateString(password, "password", { minLength: 8, maxLength: 128 }),
      () => validateString(fullName, "fullName", { required: false, maxLength: 200 }),
      () => validateEnum(role, "role", ["super_admin", "org_admin", "fleet_manager", "driver", "viewer", "mechanic"]),
      () => validateOptionalUUID(organizationId, "organizationId"),
    );
    if (validationError) return secureJsonResponse({ success: false, error: validationError }, req, 400);

    // Determine target organization
    const targetOrgId = organizationId || await getUserOrganization(supabaseAdmin, requestingUser.id);
    if (!targetOrgId) {
      return secureJsonResponse({ success: false, error: "No target organization specified or found" }, req, 400);
    }

    // Authorization: super_admin can create in any org, org_admin only in their own
    const isSA = await isSuperAdmin(supabaseAdmin, requestingUser.id);
    const isOA = await isOrgAdmin(supabaseAdmin, requestingUser.id, targetOrgId);

    if (!isSA && !isOA) {
      const { ipAddress, userAgent } = getClientInfo(req);
      await logSecurityEvent(supabaseAdmin, {
        eventType: "unauthorized_user_creation",
        userId: requestingUser.id,
        organizationId: targetOrgId,
        severity: "warning",
        description: `Unauthorized attempt to create user by ${requestingUser.email}`,
        ipAddress,
        userAgent,
      });
      return secureJsonResponse({ success: false, error: "Unauthorized - admin role required" }, req, 403);
    }

    // org_admin cannot create super_admin or org_admin roles
    if (!isSA && (role === "super_admin" || role === "org_admin")) {
      return secureJsonResponse({ success: false, error: "Only super_admin can assign admin roles" }, req, 403);
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error("Create user error:", createError);
      return secureJsonResponse({ success: false, error: createError.message || "Failed to create user" }, req, 400);
    }

    if (!newUser?.user) {
      return secureJsonResponse({ success: false, error: "User creation returned no user data" }, req, 400);
    }

    // Update profile with target organization
    await supabaseAdmin
      .from("profiles")
      .update({ organization_id: targetOrgId })
      .eq("id", newUser.user.id);

    // Assign role
    const { error: roleAssignError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: role,
        organization_id: targetOrgId,
      });

    if (roleAssignError) {
      console.error("Role assignment error:", roleAssignError);
      return secureJsonResponse(
        { success: true, user: newUser.user, warning: "User created but role assignment failed" },
        req, 201
      );
    }

    // Audit log
    const { ipAddress, userAgent } = getClientInfo(req);
    await logSecurityEvent(supabaseAdmin, {
      eventType: "user_created",
      userId: requestingUser.id,
      organizationId: targetOrgId,
      severity: "info",
      description: `User ${email} created with role ${role} in org ${targetOrgId}`,
      metadata: { newUserId: newUser.user.id, role, email },
      ipAddress,
      userAgent,
    });

    return secureJsonResponse({ success: true, user: newUser.user }, req, 201);
  } catch (error: unknown) {
    console.error("Error:", error);
    return secureJsonResponse({ success: false, error: "Internal server error" }, req, 500);
  }
});
