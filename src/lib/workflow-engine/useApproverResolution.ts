// React hook wrapper around delegationMatrix.resolveApprover.
// Activates ONLY for stages whose id ends in "_pending_approval", which is the
// convention used by all SOP configs that follow the "Get approval as per
// delegation matrix" pattern from the FMG diagrams.
import { useQuery } from "@tanstack/react-query";
import { resolveApprover, type ApproverResolution } from "./delegationMatrix";
import { useOrganization } from "@/hooks/useOrganization";

export function isApprovalStage(stageId: string | null | undefined): boolean {
  if (!stageId) return false;
  return /(^|_)pending_approval$/i.test(stageId)
      || /^authority_approval$/i.test(stageId);
}

/** 1-based step index based on stage id prefix (2a → 1, 2b → 2). */
export function stepOrderForStage(stageId: string): number {
  // Detect "2b" prefix on stages from fleetTransferConfig (plan_pending_approval).
  if (/^plan_pending_approval$/i.test(stageId)) return 2;
  return 1;
}

export function useApproverResolution(
  workflowType: string | undefined,
  stageId: string | null | undefined,
  amount?: number,
) {
  const { organizationId } = useOrganization();
  const enabled = !!organizationId && !!workflowType && isApprovalStage(stageId);
  return useQuery<ApproverResolution>({
    queryKey: ["approver-resolution", organizationId, workflowType, stageId, amount ?? null],
    enabled,
    staleTime: 60_000,
    queryFn: () =>
      resolveApprover(
        organizationId!,
        workflowType!,
        stepOrderForStage(stageId!),
        amount,
      ),
  });
}
