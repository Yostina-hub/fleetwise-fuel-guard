// Live preview hook — given an authority_matrix scope + step + amount, returns
// the role(s) that will be resolved at runtime by the SOP engine. Powers the
// "Resolved approver" badge inside the workflow-builder Approval node editor.
import { useQuery } from "@tanstack/react-query";
import { resolveApprover, type ApproverResolution } from "@/lib/workflow-engine/delegationMatrix";
import { useOrganization } from "@/hooks/useOrganization";

export function useResolvedApprover(
  scope: string | null | undefined,
  stepOrder: number = 1,
  amount?: number,
  enabled: boolean = true,
) {
  const { organizationId } = useOrganization();
  return useQuery<ApproverResolution>({
    queryKey: ["wf-builder-resolved-approver", organizationId, scope, stepOrder, amount ?? null],
    enabled: !!organizationId && !!scope && enabled,
    staleTime: 30_000,
    queryFn: () => resolveApprover(organizationId!, scope!, stepOrder, amount),
  });
}
