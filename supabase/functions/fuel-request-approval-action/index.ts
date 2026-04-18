import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientId, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

type ApprovalAction = "approve" | "reject";

interface ApprovalRequestBody {
  action: ApprovalAction;
  approvalId: string;
  fuelRequestId: string;
  comment?: string;
  litersApproved?: number;
  effectiveApproverId?: string | null;
  impersonatedUserId?: string | null;
  impersonationSessionId?: string | null;
}

const isUuidLike = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    if (req.method !== "POST") {
      return secureJsonResponse({ error: "Method not allowed" }, req, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return secureJsonResponse({ error: "Authorization required" }, req, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return secureJsonResponse({ error: "Unauthorized" }, req, 401);
    }

    let body: ApprovalRequestBody;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: "Invalid or missing request body" }, req, 400);
    }

    const {
      action,
      approvalId,
      fuelRequestId,
      comment,
      litersApproved,
      effectiveApproverId,
      impersonatedUserId,
      impersonationSessionId,
    } = body;

    if (!["approve", "reject"].includes(action)) {
      return secureJsonResponse({ error: "Invalid action" }, req, 400);
    }

    if (!approvalId || !fuelRequestId || !effectiveApproverId) {
      return secureJsonResponse({ error: "Missing required fields" }, req, 400);
    }

    if (![approvalId, fuelRequestId, effectiveApproverId].every(isUuidLike)) {
      return secureJsonResponse({ error: "Invalid identifier format" }, req, 400);
    }

    if (impersonatedUserId && !isUuidLike(impersonatedUserId)) {
      return secureJsonResponse({ error: "Invalid impersonated user format" }, req, 400);
    }

    if (action === "reject" && (!comment || !comment.trim())) {
      return secureJsonResponse({ error: "Rejection reason is required" }, req, 400);
    }

    if (litersApproved !== undefined && (!Number.isFinite(litersApproved) || litersApproved <= 0)) {
      return secureJsonResponse({ error: "Approved liters must be greater than zero" }, req, 400);
    }

    const isImpersonating = Boolean(impersonatedUserId || impersonationSessionId);
    if (isImpersonating) {
      if (!impersonatedUserId || !impersonationSessionId) {
        return secureJsonResponse({ error: "Incomplete impersonation context" }, req, 400);
      }

      if (impersonatedUserId !== effectiveApproverId) {
        return secureJsonResponse({ error: "Impersonation context is invalid" }, req, 403);
      }

      const { data: roles, error: rolesError } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .limit(1);

      if (rolesError || !roles?.length) {
        return secureJsonResponse({ error: "Forbidden" }, req, 403);
      }
    } else if (effectiveApproverId !== user.id) {
      return secureJsonResponse({ error: "Approver mismatch" }, req, 403);
    }

    const { data: approval, error: approvalLookupError } = await admin
      .from("fuel_request_approvals")
      .select("id, fuel_request_id, approver_id, action, organization_id")
      .eq("id", approvalId)
      .single();

    if (approvalLookupError || !approval) {
      return secureJsonResponse({ error: "Approval record not found" }, req, 404);
    }

    if (approval.fuel_request_id !== fuelRequestId) {
      return secureJsonResponse({ error: "Approval does not match fuel request" }, req, 400);
    }

    if (approval.approver_id !== effectiveApproverId) {
      return secureJsonResponse({ error: "This approval is not assigned to the effective approver" }, req, 403);
    }

    if (approval.action !== "pending") {
      return secureJsonResponse({ error: "This approval has already been processed" }, req, 409);
    }

    const { data: fuelRequest, error: fuelRequestError } = await admin
      .from("fuel_requests")
      .select("id, liters_requested, organization_id, status")
      .eq("id", fuelRequestId)
      .single();

    if (fuelRequestError || !fuelRequest) {
      return secureJsonResponse({ error: "Fuel request not found" }, req, 404);
    }

    if (fuelRequest.organization_id !== approval.organization_id) {
      return secureJsonResponse({ error: "Approval organization mismatch" }, req, 400);
    }

    const actedAt = new Date().toISOString();
    const normalizedComment = comment?.trim() || null;

    const { error: updateApprovalError } = await admin
      .from("fuel_request_approvals")
      .update({
        action,
        comment: normalizedComment,
        acted_at: actedAt,
      })
      .eq("id", approvalId)
      .eq("action", "pending");

    if (updateApprovalError) {
      return secureJsonResponse({ error: updateApprovalError.message }, req, 400);
    }

    let allApproved = false;

    if (action === "approve") {
      const { data: allApprovals, error: allApprovalsError } = await admin
        .from("fuel_request_approvals")
        .select("action")
        .eq("fuel_request_id", fuelRequestId);

      if (allApprovalsError) {
        return secureJsonResponse({ error: allApprovalsError.message }, req, 400);
      }

      const pendingCount = (allApprovals ?? []).filter((item) => item.action === "pending").length;
      allApproved = pendingCount === 0;

      if (allApproved) {
        const { error: requestUpdateError } = await admin
          .from("fuel_requests")
          .update({
            status: "approved",
            approved_by: effectiveApproverId,
            approved_at: actedAt,
            rejected_reason: null,
            liters_approved: litersApproved ?? fuelRequest.liters_requested,
          })
          .eq("id", fuelRequestId);

        if (requestUpdateError) {
          return secureJsonResponse({ error: requestUpdateError.message }, req, 400);
        }
      }
    } else {
      const { error: rejectUpdateError } = await admin
        .from("fuel_requests")
        .update({
          status: "rejected",
          rejected_reason: normalizedComment,
          approved_by: effectiveApproverId,
          approved_at: actedAt,
        })
        .eq("id", fuelRequestId);

      if (rejectUpdateError) {
        return secureJsonResponse({ error: rejectUpdateError.message }, req, 400);
      }
    }

    if (isImpersonating && impersonatedUserId && impersonationSessionId) {
      const { error: auditError } = await admin.from("impersonation_activity_logs").insert({
        impersonation_session_id: impersonationSessionId,
        super_admin_id: user.id,
        impersonated_user_id: impersonatedUserId,
        organization_id: approval.organization_id,
        activity_type: "approval",
        resource_type: "fuel_request",
        resource_id: fuelRequestId,
        action: action === "approve" ? "fuel_request_approved" : "fuel_request_rejected",
        details: {
          approval_id: approvalId,
          comment: normalizedComment,
          liters_approved: action === "approve" ? (litersApproved ?? fuelRequest.liters_requested) : null,
          fully_approved: allApproved,
        },
        metadata: {
          edge_function: "fuel-request-approval-action",
          acted_at: actedAt,
          real_user_id: user.id,
        },
      });

      if (auditError) {
        console.error("Failed to log impersonation approval activity", auditError);
      }
    }

    return secureJsonResponse({ fuelRequestId, allApproved }, req, 200);
  } catch (error) {
    console.error("Fuel approval action failed", error);
    return secureJsonResponse({ error: "Internal server error" }, req, 500);
  }
});