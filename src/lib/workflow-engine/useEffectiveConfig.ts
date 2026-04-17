// Phase D — Loads the latest seeded/edited graph for an SOP from the
// `workflows` table and returns an "effective" WorkflowConfig that overrides
// the legacy hardcoded base whenever a DB version exists. Falls back to the
// hardcoded config if the SOP has not been seeded yet (or the org has none).
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { WorkflowConfig } from "./types";
import { graphToConfig } from "./graphToConfig";

export interface EffectiveConfigResult {
  config: WorkflowConfig;
  /** True when the active config was reconstructed from the DB graph. */
  fromBuilder: boolean;
  /** The DB workflow id (if any) — useful for "Edit in builder" deep-links. */
  workflowId: string | null;
  /** Last update timestamp from the DB row, when applicable. */
  updatedAt: string | null;
  isLoading: boolean;
}

export function useEffectiveConfig(base: WorkflowConfig): EffectiveConfigResult {
  const { organizationId } = useOrganization();
  const seededName = `${base.sopCode} — ${base.title}`;

  const { data, isLoading } = useQuery({
    queryKey: ["sop-effective-config", organizationId, base.type],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("id, name, description, nodes, edges, updated_at")
        .eq("organization_id", organizationId!)
        .eq("category", "sop")
        .eq("name", seededName)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    staleTime: 60_000,
  });

  return useMemo<EffectiveConfigResult>(() => {
    if (!data) {
      return {
        config: base,
        fromBuilder: false,
        workflowId: null,
        updatedAt: null,
        isLoading,
      };
    }
    return {
      config: graphToConfig(data as any, base),
      fromBuilder: true,
      workflowId: data.id,
      updatedAt: data.updated_at,
      isLoading,
    };
  }, [data, base, isLoading]);
}
