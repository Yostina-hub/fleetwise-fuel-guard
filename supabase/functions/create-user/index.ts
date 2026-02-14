import {
  corsHeaders,
  createAdminClient,
  verifyAuth,
  isSuperAdmin,
  isOrgAdmin,
  getUserOrganization,
  logSecurityEvent,
  getClientInfo,
  errorResponse,
  successResponse,
} from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { user: requestingUser, error: authError } = await verifyAuth(
      supabaseAdmin,
      req.headers.get("Authorization")
    );

    if (authError || !requestingUser) {
      return errorResponse(authError || "Unauthorized", 401);
    }

    const { email, password, fullName, role, organizationId } = await req.json();

    if (!email || !password || !role) {
      return errorResponse("Missing required fields: email, password, role");
    }

    // Determine target organization
    const targetOrgId = organizationId || await getUserOrganization(supabaseAdmin, requestingUser.id);
    if (!targetOrgId) {
      return errorResponse("No target organization specified or found", 400);
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
      return errorResponse("Unauthorized - admin role required", 403);
    }

    // org_admin cannot create super_admin or org_admin roles
    if (!isSA && (role === "super_admin" || role === "org_admin")) {
      return errorResponse("Only super_admin can assign admin roles", 403);
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return errorResponse(createError.message, 400);
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
      return successResponse(
        { user: newUser.user, warning: "User created but role assignment failed" },
        201
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

    return successResponse({ user: newUser.user }, 201);
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
