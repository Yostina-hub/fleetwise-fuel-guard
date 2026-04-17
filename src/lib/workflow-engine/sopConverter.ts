// Phase A — Converts a legacy WorkflowConfig (SOP) into the visual builder graph
// shape ({ nodes, edges }) used by the workflows table. Each Stage becomes a
// human_task node carrying the stage's role + form fields. Each StageAction
// becomes an outgoing edge labeled with the action label. Lanes are preserved
// in node.data.lane so the canvas swimlanes still render correctly.
import type { WorkflowConfig, StageField } from "./types";
import type { WorkflowNode, WorkflowEdge } from "@/components/workflow/types";
import { autoLayout } from "@/components/workflow/canvasLayout";

interface ConverterOutput {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  /** Categorization for the workflows.category column */
  category: string;
  /** Friendly name for the workflows.name column */
  name: string;
  description: string;
  /** Stable slug used to detect existing seeded SOPs (idempotent reseed) */
  slug: string;
}

/** Map legacy field types to the form builder field types used by builder forms. */
function mapFieldType(t: StageField["type"]): string {
  switch (t) {
    case "datetime":
      return "datetime-local";
    case "vehicle":
    case "driver":
      return "text"; // builder doesn't yet have these pickers — degrade to text id input
    default:
      return t;
  }
}

function fieldsToFormSchema(fields?: StageField[]) {
  return (fields || []).map((f) => ({
    key: f.key,
    label: f.label,
    type: mapFieldType(f.type),
    required: !!f.required,
    options: f.options,
    placeholder: f.placeholder,
    helpText: f.helpText,
  }));
}

export function convertSopConfigToGraph(config: WorkflowConfig): ConverterOutput {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // 1) Trigger node — "File new" entry point
  const triggerId = `trigger_${config.type}`;
  nodes.push({
    id: triggerId,
    type: "trigger",
    position: { x: 0, y: 0 },
    data: {
      label: `File new ${config.title}`,
      description: `${config.sopCode} — ${config.description}`,
      category: "triggers",
      nodeType: "trigger_event",
      isConfigured: true,
      config: {
        sop_code: config.sopCode,
        intake_fields: fieldsToFormSchema(config.intakeFields),
        intake_form_key: config.intakeFormKey,
        intake_form_choices: config.intakeFormChoices,
        intake_roles: config.intakeRoles,
        requires_vehicle: !!config.requiresVehicle,
        requires_driver: !!config.requiresDriver,
      },
    },
  });

  // 2) One node per Stage. In-flight stages → human_task (pause + Inbox row).
  //    Terminal stages → data_log_history (auto-completes the run).
  for (const stage of config.stages) {
    const isTerminal = !!stage.terminal;
    // Aggregate every form field across the stage's actions into a single
    // `fields` array so the Inbox renders one form regardless of which
    // action button the user picks.
    const allFields: Array<ReturnType<typeof fieldsToFormSchema>[number]> = [];
    const seenKeys = new Set<string>();
    for (const action of stage.actions || []) {
      for (const f of fieldsToFormSchema(action.fields)) {
        if (seenKeys.has(f.key)) continue;
        seenKeys.add(f.key);
        allFields.push(f);
      }
    }
    // Build inbox action buttons from stage actions.
    const actionButtons = (stage.actions || []).map((a) => ({
      id: a.id,
      label: a.label,
      variant: a.variant || "default",
      allowed_roles: a.allowedRoles || [],
      confirm: a.confirm,
      completes: !!a.completes,
    }));

    nodes.push({
      id: stage.id,
      type: "action",
      position: { x: 0, y: 0 },
      data: {
        label: stage.label,
        description: stage.description,
        category: "actions",
        nodeType: isTerminal ? "data_log_history" : "human_task",
        isConfigured: true,
        config: {
          // SOP context (for runtime overlay & analytics)
          stage_id: stage.id,
          lane: stage.lane,
          terminal: isTerminal,
          sop_code: config.sopCode,
          // Inbox routing — first allowed role becomes the primary assignee
          assignee_role: (stage.actions || []).flatMap((a) => a.allowedRoles || [])[0] || null,
          assignee_roles: Array.from(
            new Set((stage.actions || []).flatMap((a) => a.allowedRoles || [])),
          ),
          // Inbox form schema (runner reads cfg.fields)
          fields: allFields,
          // Inbox action buttons (runner reads cfg.actions)
          actions: actionButtons,
          // Title shown in inbox card (runner reads cfg.title)
          title: stage.label,
          description: stage.description,
        },
      },
    });
  }

  // 3) Trigger → initial stage edge
  edges.push({
    id: `${triggerId}__${config.initialStage}`,
    source: triggerId,
    target: config.initialStage,
    type: "smoothstep",
    label: "Start",
  });

  // 4) Stage → action edges. `sourceHandle` = action.id so the runner can route
  //    resume traffic to the correct child after the user picks a decision.
  for (const stage of config.stages) {
    for (const action of stage.actions || []) {
      if (action.toStage === stage.id && (stage.terminal || action.completes)) continue;
      edges.push({
        id: `${stage.id}__${action.id}__${action.toStage}`,
        source: stage.id,
        sourceHandle: action.id,
        target: action.toStage,
        type: "smoothstep",
        label: action.label,
        data: {
          decision_id: action.id,
          variant: action.variant,
          allowed_roles: action.allowedRoles,
          completes: !!action.completes,
        },
      });
    }
  }

  // 5) Auto-layout vertically (top → bottom) so the seeded graph is readable.
  const laid = autoLayout(nodes, edges, "TB");

  return {
    nodes: laid.nodes,
    edges: laid.edges,
    category: "sop",
    name: `${config.sopCode} — ${config.title}`,
    description: config.description,
    slug: `sop:${config.type}`,
  };
}
