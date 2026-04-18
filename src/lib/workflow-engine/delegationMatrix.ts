// Generic delegation-matrix approver resolver for ALL SOP workflows.
//
// Strategy (per SOP diagram "Get approval as per delegation matrix"):
//   1) authority_matrix  — scope-based, supports thresholds + multi-step ladder
//   2) approval_levels   — sequential level_order (legacy fallback)
//   3) Hard default      — fleet_manager / operations_manager
//
// Used by WorkflowDetailDrawer to dynamically gate approve/reject buttons on
// any stage whose id ends in "_pending_approval".
import { supabase } from "@/integrations/supabase/client";

export type ApproverSource = "authority_matrix" | "approval_levels" | "default";

export interface ApproverResolution {
  /** Roles allowed to approve at this step. */
  roles: string[];
  /** Where the rule came from. */
  source: ApproverSource;
  /** Optional human-readable rule label. */
  ruleLabel?: string;
  /** Step order resolved from authority_matrix (1-based). */
  stepOrder?: number;
}

const DEFAULT_ROLES = ["fleet_manager", "operations_manager"];

/** Map workflow_type → authority_matrix scopes to try (in order). */
function scopesForWorkflowType(workflowType: string): string[] {
  switch (workflowType) {
    case "fleet_inspection":
      return ["fleet_inspection", "inspection"];
    case "fleet_transfer":
      return ["fleet_transfer", "vehicle_transfer", "transfer"];
    case "vehicle_handover":
      return ["vehicle_handover", "handover"];
    case "vehicle_dispatch":
      return ["vehicle_dispatch", "dispatch", "trip"];
    case "preventive_maintenance":
    case "breakdown_maintenance":
      return ["maintenance"];
    case "tire_request":
      return ["tire_request", "maintenance"];
    case "driver_allowance":
      return ["driver_allowance", "allowance"];
    case "outsource_rental":
      return ["outsource_rental", "rental", "outsource"];
    default:
      return [workflowType];
  }
}

/**
 * Resolve the approver(s) for the next step of a given workflow.
 *
 * @param organizationId  Tenant org id (required)
 * @param workflowType    Workflow type key (e.g. "fleet_transfer")
 * @param stepOrder       1-based step number for multi-step approval ladders
 * @param amount          Optional amount used to filter authority_matrix by
 *                        min_amount/max_amount thresholds
 */
export async function resolveApprover(
  organizationId: string,
  workflowType: string,
  stepOrder: number = 1,
  amount?: number,
): Promise<ApproverResolution> {
  if (!organizationId) {
    return { roles: DEFAULT_ROLES, source: "default" };
  }
  const scopes = scopesForWorkflowType(workflowType);

  // 1) authority_matrix lookup (preferred)
  try {
    let q = supabase
      .from("authority_matrix")
      .select("approver_role, rule_name, scope, step_order, priority, min_amount, max_amount, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("scope", scopes)
      .eq("step_order", stepOrder);

    const { data: rows } = await q
      .order("priority", { ascending: true });

    let candidates = rows || [];
    if (typeof amount === "number") {
      candidates = candidates.filter((r: any) => {
        const okMin = r.min_amount == null || amount >= Number(r.min_amount);
        const okMax = r.max_amount == null || amount <= Number(r.max_amount);
        return okMin && okMax;
      });
    }
    if (candidates.length > 0) {
      const roles = Array.from(
        new Set(candidates.map((r: any) => r.approver_role).filter(Boolean)),
      );
      if (roles.length > 0) {
        return {
          roles,
          source: "authority_matrix",
          ruleLabel: candidates[0]?.rule_name,
          stepOrder,
        };
      }
    }
  } catch (e) {
    console.warn("[delegationMatrix] authority_matrix lookup failed", e);
  }

  // 2) approval_levels fallback (legacy sequential ladder)
  try {
    const { data: levels } = await supabase
      .from("approval_levels")
      .select("role, level_name, level_order, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("level_order", { ascending: true });
    const pick = (levels || []).find((l: any) => l.level_order === stepOrder)
      || (levels || [])[stepOrder - 1];
    if (pick && pick.role) {
      return {
        roles: [pick.role],
        source: "approval_levels",
        ruleLabel: pick.level_name,
        stepOrder,
      };
    }
  } catch (e) {
    console.warn("[delegationMatrix] approval_levels lookup failed", e);
  }

  return { roles: DEFAULT_ROLES, source: "default", stepOrder };
}

/** Backward-compat alias for the old fleet-inspection-only API. */
export async function resolveInspectionApprover(
  organizationId: string,
): Promise<ApproverResolution> {
  return resolveApprover(organizationId, "fleet_inspection", 1);
}
