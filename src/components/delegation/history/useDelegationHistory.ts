import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  APPROVAL_DECISION_TOKENS,
  APPROVAL_STAGE_FRAGMENTS,
  CONFIG_SOURCES,
  DELEGATION_ACTIONS,
  ROUTING_DECISIONS,
} from "./constants";
import type { DelegationHistoryRow } from "./types";

type WorkflowTransition = {
  id: string;
  workflow_type: string | null;
  from_stage: string | null;
  to_stage: string | null;
  decision: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  notes: string | null;
  created_at: string;
};

const WORKFLOW_TRANSITION_FIELDS =
  "id, instance_id, workflow_type, from_stage, to_stage, decision, performed_by, performed_by_name, performed_by_role, notes, created_at";

const isApprovalRow = (row: WorkflowTransition) => {
  const stage = String(row.from_stage ?? "").toLowerCase();
  const decision = String(row.decision ?? "").toLowerCase();
  const stageMatches =
    APPROVAL_STAGE_FRAGMENTS.some((f) => stage.includes(f)) ||
    stage.endsWith("_review") ||
    stage.includes("_review_");
  const decisionMatches = APPROVAL_DECISION_TOKENS.some((tok) => decision.includes(tok));
  return stageMatches || decisionMatches;
};

const buildActor = (
  row: WorkflowTransition,
  fallback?: { name?: string; role?: string },
) => {
  const name = row.performed_by_name || fallback?.name;
  const role = row.performed_by_role || fallback?.role;
  if (name && role) return `${name} (${role})`;
  return name || role || "System";
};

const mapTransitionToHistoryRow = (
  row: WorkflowTransition,
  normalizedAction: string,
  actor: string,
): DelegationHistoryRow => ({
  id: `wt-${row.id}`,
  created_at: row.created_at,
  action: normalizedAction,
  source_table: row.workflow_type ?? "workflow_transitions",
  entity_name: row.workflow_type
    ? `${row.workflow_type.replace(/_/g, " ")} ${
        normalizedAction === "route" ? "routing" : normalizedAction
      }`
    : "Workflow event",
  scope: row.workflow_type,
  summary: `${row.from_stage ?? "—"} → ${row.to_stage ?? "—"} · decision "${row.decision}"${
    row.notes ? ` · ${row.notes}` : ""
  }`,
  actor_name: actor,
});

export const useDelegationHistory = () => {
  const { organizationId, isViewingAllOrgs } = useOrganization();

  return useQuery({
    queryKey: ["delegation-history", organizationId ?? "all-orgs", isViewingAllOrgs],
    enabled: isViewingAllOrgs || !!organizationId,
    staleTime: 15_000,
    queryFn: async (): Promise<DelegationHistoryRow[]> => {
      if (!organizationId && !isViewingAllOrgs) return [];

      const orgFilter = isViewingAllOrgs ? "" : organizationId!;

      // Source 1 — explicit delegation_audit_log entries.
      let auditQuery = supabase.from("delegation_audit_log").select("*");
      if (orgFilter) auditQuery = auditQuery.eq("organization_id", orgFilter);
      const auditPromise = auditQuery
        .or(
          `source_table.in.(${CONFIG_SOURCES.join(",")}),action.in.(${DELEGATION_ACTIONS.join(",")})`,
        )
        .order("created_at", { ascending: false })
        .limit(500);

      // Source 2 — workflow_transitions whose decision represents routing.
      let routingQuery = supabase
        .from("workflow_transitions")
        .select(WORKFLOW_TRANSITION_FIELDS);
      if (orgFilter) routingQuery = routingQuery.eq("organization_id", orgFilter);
      const routingPromise = routingQuery
        .in("decision", ROUTING_DECISIONS as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(500);

      // Source 3 — recent workflow_transitions filtered client-side for
      // approval/rejection decisions on matrix-governed stages.
      let approvalsQuery = supabase
        .from("workflow_transitions")
        .select(WORKFLOW_TRANSITION_FIELDS);
      if (orgFilter) approvalsQuery = approvalsQuery.eq("organization_id", orgFilter);
      const approvalsPromise = approvalsQuery
        .order("created_at", { ascending: false })
        .limit(1000);

      const [
        { data: auditRows, error: auditErr },
        { data: routingRows, error: routingErr },
        { data: candidateRows, error: candidateErr },
      ] = await Promise.all([auditPromise, routingPromise, approvalsPromise]);
      if (auditErr) throw auditErr;
      if (routingErr) throw routingErr;
      if (candidateErr) throw candidateErr;

      const approvalRows = ((candidateRows ?? []) as WorkflowTransition[]).filter(
        isApprovalRow,
      );
      const allTransitions = [
        ...((routingRows ?? []) as WorkflowTransition[]),
        ...approvalRows,
      ];

      // Resolve missing actor names/roles in one batched lookup.
      const actorIds = Array.from(
        new Set(
          allTransitions
            .filter((t) => t.performed_by && (!t.performed_by_name || !t.performed_by_role))
            .map((t) => t.performed_by!),
        ),
      );

      const actorMap: Record<string, { name?: string; role?: string }> = {};
      if (actorIds.length > 0) {
        const [{ data: profiles }, { data: roles }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name, email")
            .in("id", actorIds),
          supabase.from("user_roles").select("user_id, role").in("user_id", actorIds),
        ]);
        (profiles ?? []).forEach((p: any) => {
          const name =
            p.full_name ||
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            p.email;
          actorMap[p.id] = { ...(actorMap[p.id] ?? {}), name };
        });
        (roles ?? []).forEach((r: any) => {
          actorMap[r.user_id] = { ...(actorMap[r.user_id] ?? {}), role: r.role };
        });
      }

      const mappedRouting = ((routingRows ?? []) as WorkflowTransition[]).map((row) =>
        mapTransitionToHistoryRow(
          row,
          row.decision === "auto_route" ? "route" : (row.decision ?? "route"),
          buildActor(row, actorMap[row.performed_by ?? ""]),
        ),
      );

      const mappedApprovals = approvalRows.map((row) => {
        const decision = String(row.decision ?? "").toLowerCase();
        const normalized = decision.includes("reject") ? "reject" : "approve";
        return mapTransitionToHistoryRow(
          row,
          normalized,
          buildActor(row, actorMap[row.performed_by ?? ""]),
        );
      });

      const combined: DelegationHistoryRow[] = [
        ...((auditRows ?? []) as DelegationHistoryRow[]),
        ...mappedRouting,
        ...mappedApprovals,
      ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      const seen = new Set<string>();
      return combined.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      }).slice(0, 500);
    },
  });
};
