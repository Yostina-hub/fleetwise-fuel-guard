import {
  createAdminClient,
  verifyAuth,
  isSuperAdmin,
  logSecurityEvent,
  getClientInfo,
} from "../_shared/security.ts";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseAdmin = createAdminClient();
    const { user: requestingUser, error: authError } = await verifyAuth(
      supabaseAdmin,
      req.headers.get("Authorization")
    );

    if (authError || !requestingUser) {
      return secureJsonResponse({ success: false, error: authError || "Unauthorized" }, req, 401);
    }

    const isSA = await isSuperAdmin(supabaseAdmin, requestingUser.id);
    if (!isSA) {
      return secureJsonResponse({ success: false, error: "Unauthorized - super_admin required" }, req, 403);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ success: false, error: "Invalid request body" }, req, 400);
    }

    const { action, userId, newPassword } = body;

    if (!action || !userId) {
      return secureJsonResponse({ success: false, error: "action and userId are required" }, req, 400);
    }

    const { ipAddress, userAgent } = getClientInfo(req);

    switch (action) {
      case "reset_password": {
        if (!newPassword || newPassword.length < 8) {
          return secureJsonResponse({ success: false, error: "Password must be at least 8 characters" }, req, 400);
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) {
          return secureJsonResponse({ success: false, error: error.message }, req, 400);
        }
        await logSecurityEvent(supabaseAdmin, {
          eventType: "password_reset_by_admin",
          userId: requestingUser.id,
          severity: "warning",
          description: `Admin reset password for user ${userId}`,
          metadata: { targetUserId: userId },
          ipAddress,
          userAgent,
        });
        return secureJsonResponse({ success: true, message: "Password reset successfully" }, req);
      }

      case "deactivate": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // ~100 years
        });
        if (error) {
          return secureJsonResponse({ success: false, error: error.message }, req, 400);
        }
        await logSecurityEvent(supabaseAdmin, {
          eventType: "user_deactivated",
          userId: requestingUser.id,
          severity: "warning",
          description: `Admin deactivated user ${userId}`,
          metadata: { targetUserId: userId },
          ipAddress,
          userAgent,
        });
        return secureJsonResponse({ success: true, message: "User deactivated" }, req);
      }

      case "activate": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (error) {
          return secureJsonResponse({ success: false, error: error.message }, req, 400);
        }
        await logSecurityEvent(supabaseAdmin, {
          eventType: "user_activated",
          userId: requestingUser.id,
          severity: "info",
          description: `Admin activated user ${userId}`,
          metadata: { targetUserId: userId },
          ipAddress,
          userAgent,
        });
        return secureJsonResponse({ success: true, message: "User activated" }, req);
      }

      case "delete": {
        // Remove user roles first
        const { error: rolesError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId);
        if (rolesError) {
          console.error("Failed to delete user roles:", rolesError);
        }

        // Delete from profiles
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("id", userId);
        if (profileError) {
          console.error("Failed to delete profile:", profileError);
        }

        // Delete auth user
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) {
          return secureJsonResponse({ success: false, error: error.message }, req, 400);
        }
        await logSecurityEvent(supabaseAdmin, {
          eventType: "user_deleted",
          userId: requestingUser.id,
          severity: "critical",
          description: `Admin permanently deleted user ${userId}`,
          metadata: { targetUserId: userId },
          ipAddress,
          userAgent,
        });
        return secureJsonResponse({ success: true, message: "User permanently deleted" }, req);
      }

      case "get_status": {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (error) {
          return secureJsonResponse({ success: false, error: error.message }, req, 400);
        }
        const banned = data?.user?.banned_until
          ? new Date(data.user.banned_until).getTime() > Date.now()
          : false;
        return secureJsonResponse({ success: true, banned }, req);
      }

      default:
        return secureJsonResponse({ success: false, error: `Unknown action: ${action}` }, req, 400);
    }
  } catch (error: unknown) {
    console.error("manage-user error:", error);
    return secureJsonResponse({ success: false, error: "Internal server error" }, req, 500);
  }
});
