// Phase E — Per-SOP seeding & drift detection.
// Allows reseeding a single workflow from its baseline (configs.ts) and
// detecting whether the DB graph still matches the canonical hardcoded one.
import { supabase } from "@/integrations/supabase/client";
import { convertSopConfigToGraph } from "./sopConverter";
import { WORKFLOW_CONFIGS } from "./configs";
import type { WorkflowConfig } from "./types";

export interface SingleSeedResult {
  workflowId: string;
  inserted: boolean;
  updated: boolean;
}

/** Seed (insert or overwrite) a single SOP from its canonical baseline. */
export async function seedSingleSOP(
  organizationId: string,
  config: WorkflowConfig,
  userId?: string,
): Promise<SingleSeedResult> {
  if (!organizationId) throw new Error("No organization");
  const graph = convertSopConfigToGraph(config);

  // Lookup precedence: sop_type (new key) → legacy name match.
  const { data: existingByType } = await supabase
    .from("workflows")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("sop_type", config.type)
    .maybeSingle();
  let existing = existingByType;
  if (!existing) {
    const { data: existingByName, error: fetchErr } = await supabase
      .from("workflows")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("category", "sop")
      .eq("name", graph.name)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    existing = existingByName;
  }

  const { icon: _icon, ...definition } = config;
  const sopRow = {
    kind: "sop" as const,
    sop_type: config.type,
    sop_code: config.sopCode,
    definition: definition as any,
    description: graph.description,
    category: graph.category,
    nodes: graph.nodes as any,
    edges: graph.edges as any,
  };

  if (existing) {
    const { error } = await supabase
      .from("workflows")
      .update(sopRow)
      .eq("id", existing.id);
    if (error) throw error;
    return { workflowId: existing.id, inserted: false, updated: true };
  }

  const { data: inserted, error } = await supabase
    .from("workflows")
    .insert({
      organization_id: organizationId,
      name: graph.name,
      status: "draft",
      created_by: userId || null,
      ...sopRow,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { workflowId: inserted!.id, inserted: true, updated: false };
}

/** Lookup the canonical baseline config for a seeded workflow row by name. */
export function findBaselineConfigForWorkflow(name: string): WorkflowConfig | null {
  for (const cfg of Object.values(WORKFLOW_CONFIGS)) {
    if (`${cfg.sopCode} — ${cfg.title}` === name) return cfg;
  }
  return null;
}

/** Cheap drift check — compares node IDs + edge count + decision IDs. */
export function detectDrift(
  baseline: WorkflowConfig,
  dbNodes: any[],
  dbEdges: any[],
): { drifted: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const baseGraph = convertSopConfigToGraph(baseline);

  const baseNodeIds = new Set(baseGraph.nodes.map((n) => n.id));
  const dbNodeIds = new Set((dbNodes || []).map((n) => n.id));

  if (baseNodeIds.size !== dbNodeIds.size) {
    reasons.push(`${dbNodeIds.size} nodes vs ${baseNodeIds.size} in baseline`);
  }
  for (const id of baseNodeIds) {
    if (!dbNodeIds.has(id)) reasons.push(`Missing baseline node: ${id}`);
  }
  for (const id of dbNodeIds) {
    if (!baseNodeIds.has(id)) reasons.push(`Custom node added: ${id}`);
  }

  if ((dbEdges || []).length !== baseGraph.edges.length) {
    reasons.push(`${(dbEdges || []).length} edges vs ${baseGraph.edges.length} in baseline`);
  }

  return { drifted: reasons.length > 0, reasons };
}
