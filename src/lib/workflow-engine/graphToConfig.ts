// Phase D — Reverse converter: takes a workflow graph (nodes, edges) loaded
// from the `workflows` table and reconstructs a runtime WorkflowConfig that
// the WorkflowPage / NewWorkflowDialog / WorkflowSwimlane already understand.
//
// This is what makes builder edits (drag a node, change a role, add a button)
// actually drive SOP behavior end-to-end. The reconstructed config inherits
// metadata (sopCode, title, lanes, intake) from the legacy hardcoded base
// config — only the operational graph (stages + actions) comes from the DB.
import type { WorkflowConfig, Stage, StageAction, AppRole, FieldType } from "./types";
import type { WorkflowNode, WorkflowEdge } from "@/components/workflow/types";
import type { Json } from "@/integrations/supabase/types";

interface GraphRow {
  id: string;
  name: string;
  description: string | null;
  nodes: Json;
  edges: Json;
  updated_at: string;
}

/** Map builder field types back to the SOP engine field types. */
function mapFieldType(t: string): FieldType {
  switch (t) {
    case "datetime-local":
      return "datetime";
    case "text":
    case "textarea":
    case "number":
    case "date":
    case "select":
    case "checkbox":
    case "file":
      return t as FieldType;
    default:
      return "text";
  }
}

export function graphToConfig(
  graph: GraphRow,
  base: WorkflowConfig,
): WorkflowConfig {
  const nodes = (Array.isArray(graph.nodes) ? graph.nodes : []) as unknown as WorkflowNode[];
  const edges = (Array.isArray(graph.edges) ? graph.edges : []) as unknown as WorkflowEdge[];

  // Index outgoing edges per source node for O(1) action lookup.
  const outgoing = new Map<string, WorkflowEdge[]>();
  for (const e of edges) {
    const arr = outgoing.get(e.source) ?? [];
    arr.push(e);
    outgoing.set(e.source, arr);
  }

  // Find the trigger node — its single outgoing edge identifies the initial stage.
  const trigger = nodes.find((n) => n.type === "trigger");
  const initialStage =
    (trigger && outgoing.get(trigger.id)?.[0]?.target) || base.initialStage;

  // Collect every non-trigger node as a stage.
  const stages: Stage[] = [];
  for (const node of nodes) {
    if (node.type === "trigger") continue;
    const cfg = (node.data?.config ?? {}) as Record<string, any>;
    const isTerminal =
      !!cfg.terminal || node.data?.nodeType === "data_log_history";

    // Prefer cfg.actions (Inbox button schema) for action labels/roles. Fall
    // back to outgoing edges so a freshly drawn node still produces actions.
    const cfgActions: any[] = Array.isArray(cfg.actions) ? cfg.actions : [];
    const cfgFields: any[] = Array.isArray(cfg.fields) ? cfg.fields : [];

    const edgesFromHere = outgoing.get(node.id) ?? [];
    const actions: StageAction[] = edgesFromHere.map((edge) => {
      // Match an inbox-button by sourceHandle (the converter sets handle = action.id).
      const buttonMeta =
        cfgActions.find((a) => a?.id === edge.sourceHandle) ??
        cfgActions.find((a) => a?.label === edge.label);

      // Prefer per-action fields (new schema). Fall back to the merged
      // node-level field set ONLY when there's a single action on this stage,
      // so legacy graphs (saved before per-action fields existed) still work.
      // Multi-action stages without per-action fields would otherwise leak
      // every action's fields into every button — see fix in sopConverter.
      const perActionFields: any[] = Array.isArray(buttonMeta?.fields)
        ? buttonMeta.fields
        : [];
      const fieldsForAction =
        perActionFields.length > 0
          ? perActionFields
          : edgesFromHere.length === 1
          ? cfgFields
          : [];

      return {
        id: (buttonMeta?.id as string) || edge.sourceHandle || edge.id,
        label: (buttonMeta?.label as string) || (edge.label as string) || "Continue",
        toStage: edge.target,
        variant: (buttonMeta?.variant as StageAction["variant"]) || "default",
        allowedRoles:
          (buttonMeta?.allowed_roles as AppRole[] | undefined) ??
          (cfg.assignee_roles as AppRole[] | undefined) ??
          undefined,
        fields: fieldsForAction.map((f: any) => ({
          key: f.key,
          label: f.label,
          type: mapFieldType(f.type),
          required: !!f.required,
          options: f.options,
          placeholder: f.placeholder,
          helpText: f.helpText,
        })),
        confirm: buttonMeta?.confirm,
        completes: !!buttonMeta?.completes || isTerminal,
      };
    });

    stages.push({
      id: node.id,
      label:
        (cfg.title as string) ||
        (node.data?.label as string) ||
        node.id,
      lane: (cfg.lane as string) || base.lanes[0]?.id || "fleet_ops",
      description:
        (cfg.description as string) ||
        (node.data?.description as string) ||
        undefined,
      actions,
      terminal: isTerminal,
    });
  }

  // If conversion produced nothing useful, fall back to the legacy config.
  if (stages.length === 0) return base;

  return {
    ...base,
    initialStage,
    stages,
    // Lanes are intentionally inherited from `base` so the swimlane layout
    // and color hints remain consistent with the SOP's known org structure.
  };
}
