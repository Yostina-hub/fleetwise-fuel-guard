// Resolves the next approver role for a Fleet Inspection request.
// Strategy: try authority_matrix first (scope-based, supports thresholds),
// then fall back to approval_levels (sequential level_order).
// If neither table has a rule, returns the safe default (fleet_manager / operations_manager).
import { supabase } from "@/integrations/supabase/client";

export type ApproverSource = "authority_matrix" | "approval_levels" | "default";

export interface ApproverResolution {
  /** Roles allowed to approve this inspection request. */
  roles: string[];
  /** Where the rule came from. */
  source: ApproverSource;
  /** Optional human-readable rule label (rule_name / level_name). */
  ruleLabel?: string;
}

const DEFAULT_ROLES = ["fleet_manager", "operations_manager"];

/** Look up the next-step approver role for an inspection request in this org. */
export async function resolveInspectionApprover(
  organizationId: string,
): Promise<ApproverResolution> {
  if (!organizationId) {
    return { roles: DEFAULT_ROLES, source: "default" };
  }

  // 1) authority_matrix — prefer rules scoped to inspection / fleet_inspection.
  try {
    const { data: amRules } = await supabase
      .from("authority_matrix")
      .select("approver_role, rule_name, scope, step_order, priority, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("scope", ["inspection", "fleet_inspection"])
      .order("step_order", { ascending: true })
      .order("priority", { ascending: true });

    if (amRules && amRules.length > 0) {
      const roles = Array.from(
        new Set(amRules.map((r: any) => r.approver_role).filter(Boolean)),
      );
      if (roles.length > 0) {
        return {
          roles,
          source: "authority_matrix",
          ruleLabel: amRules[0]?.rule_name,
        };
      }
    }
  } catch (e) {
    console.warn("authority_matrix lookup failed", e);
  }

  // 2) approval_levels — pick the lowest level_order active rule.
  try {
    const { data: levels } = await supabase
      .from("approval_levels")
      .select("role, level_name, level_order, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("level_order", { ascending: true })
      .limit(1);

    if (levels && levels.length > 0 && levels[0].role) {
      return {
        roles: [levels[0].role],
        source: "approval_levels",
        ruleLabel: levels[0].level_name,
      };
    }
  } catch (e) {
    console.warn("approval_levels lookup failed", e);
  }

  return { roles: DEFAULT_ROLES, source: "default" };
}
