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

  // 2) One human_task node per Stage (terminal stages render as completion).
  for (const stage of config.stages) {
    const isTerminal = !!stage.terminal;
    nodes.push({
      id: stage.id,
      type: isTerminal ? "action" : "action",
      position: { x: 0, y: 0 },
      data: {
        label: stage.label,
        description: stage.description,
        category: "actions",
        // Terminal stages become a notify/log node; in-flight stages become human tasks.
        nodeType: isTerminal ? "data_log_history" : "human_task",
        isConfigured: true,
        // @ts-expect-error custom runtime fields tolerated by Json column
        lane: stage.lane,
        config: {
          stage_id: stage.id,
          lane: stage.lane,
          terminal: isTerminal,
          // Aggregate role permissions from the stage's actions (so the inbox
          // can route the task to the correct role bucket immediately).
          assignee_roles: Array.from(
            new Set(
              (stage.actions || []).flatMap((a) => a.allowedRoles || []),
            ),
          ),
          // Aggregate decisions / form fields the user must answer to advance.
          decisions: (stage.actions || []).map((a) => ({
            id: a.id,
            label: a.label,
            to_stage: a.toStage,
            variant: a.variant || "default",
            allowed_roles: a.allowedRoles || [],
            confirm: a.confirm,
            completes: !!a.completes,
            fields: fieldsToFormSchema(a.fields),
          })),
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

  // 4) Stage → action edges (one edge per StageAction)
  for (const stage of config.stages) {
    for (const action of stage.actions || []) {
      // Self-loops on terminal stages don't need an edge — the node IS the end.
      if (action.toStage === stage.id && (stage.terminal || action.completes)) continue;
      edges.push({
        id: `${stage.id}__${action.id}__${action.toStage}`,
        source: stage.id,
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
