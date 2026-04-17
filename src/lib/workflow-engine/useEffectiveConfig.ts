// Phase D + E — Loads the latest seeded/edited graph for an SOP from the
// `workflows` table and returns an "effective" WorkflowConfig that overrides
// the legacy hardcoded base whenever a DB version exists. Falls back to the
// hardcoded config if the SOP has not been seeded yet (or the org has none).
// Also reports drift vs the canonical baseline so users can see when their
// edited graph has diverged from `configs.ts`.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { WorkflowConfig } from "./types";
import { graphToConfig } from "./graphToConfig";
import { detectDrift } from "./sopGovernance";

export interface EffectiveConfigResult {
  config: WorkflowConfig;
  /** True when the active config was reconstructed from the DB graph. */
  fromBuilder: boolean;
  /** The DB workflow id (if any) — useful for "Edit in builder" deep-links. */
  workflowId: string | null;
  /** Last update timestamp from the DB row, when applicable. */
  updatedAt: string | null;
  /** True when the DB graph has diverged from the canonical baseline. */
  drifted: boolean;
  /** Human-readable drift reasons. */
  driftReasons: string[];
  isLoading: boolean;
  refetch: () => void;
}

export function useEffectiveConfig(base: WorkflowConfig): EffectiveConfigResult {
  const { organizationId } = useOrganization();
  const seededName = `${base.sopCode} — ${base.title}`;

  const { data, isLoading, refetch } = useQuery({
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
        drifted: false,
        driftReasons: [],
        isLoading,
        refetch: () => { void refetch(); },
      };
    }
    const drift = detectDrift(
      base,
      (data.nodes as any[]) || [],
      (data.edges as any[]) || [],
    );
    return {
      config: graphToConfig(data as any, base),
      fromBuilder: true,
      workflowId: data.id,
      updatedAt: data.updated_at,
      drifted: drift.drifted,
      driftReasons: drift.reasons,
      isLoading,
      refetch: () => { void refetch(); },
    };
  }, [data, base, isLoading, refetch]);
}
