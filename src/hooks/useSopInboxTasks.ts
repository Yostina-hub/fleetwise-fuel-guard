// Adapts SOP `workflow_instances` (engine-driven) into the inbox `WorkflowTask` shape
// so they appear in the Task Inbox alongside visual-builder tasks.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WORKFLOW_CONFIGS } from "@/lib/workflow-engine/configs";
import type { WorkflowInstance, Stage, StageAction } from "@/lib/workflow-engine/types";
import type { WorkflowTask, FormField, TaskAction } from "@/components/inbox/types";

export interface SopInboxTask extends WorkflowTask {
  __sop: true;
  __instance: WorkflowInstance;
  __stage: Stage | null;
  __stageActions: StageAction[];
}

export function useSopInboxTasks(
  organizationId: string | null,
  status: "pending" | "completed",
) {
  return useQuery<SopInboxTask[]>({
    queryKey: ["sop-inbox-tasks", organizationId, status],
    enabled: !!organizationId,
    refetchInterval: 8000,
    queryFn: async () => {
      const dbStatuses = status === "pending"
        ? ["in_progress", "open", "pending"]
        : ["completed", "archived", "closed"];

      const { data, error } = await supabase
        .from("workflow_instances")
        .select("*")
        .eq("organization_id", organizationId!)
        .in("status", dbStatuses)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      return (data ?? [])
        .map((raw): SopInboxTask | null => {
          const config = WORKFLOW_CONFIGS[raw.workflow_type];
          if (!config) return null;
          const stage = config.stages.find((s) => s.id === raw.current_stage) ?? null;
          const stageActions = stage?.actions ?? [];

          const formSchema: FormField[] = stageActions
            .flatMap((a) => a.fields ?? [])
            .map((f) => ({
              key: f.key,
              label: f.label,
              type: ((): FormField["type"] => {
                switch (f.type) {
                  case "textarea": return "textarea";
                  case "number": return "number";
                  case "date": return "date";
                  case "datetime": return "datetime";
                  case "select": return "select";
                  default: return "text";
                }
              })(),
              required: f.required,
              options: f.options,
              placeholder: f.placeholder,
            }));

          const actions: TaskAction[] = stageActions.map((a) => ({
            id: a.id,
            label: a.label,
            variant: a.variant === "outline" ? "outline" : a.variant ?? "default",
          }));

          const title = raw.title
            ? `${raw.reference_number} · ${raw.title}`
            : `${raw.reference_number} · ${config.title}`;

          return {
            id: raw.id,
            workflow_id: raw.workflow_type,        // grouping key
            run_id: raw.id,
            node_id: stage?.id ?? raw.current_stage,
            title,
            description: stage?.label
              ? `${stage.label}${raw.description ? ` — ${raw.description}` : ""}`
              : raw.description,
            assignee_role: (stage?.actions?.[0]?.allowedRoles?.[0] as string | undefined) ?? null,
            form_schema: formSchema,
            form_key: null,
            context: (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data : {}) as Record<string, any>,
            actions,
            status: status === "pending" ? "pending" : "completed",
            vehicle_id: raw.vehicle_id,
            driver_id: raw.driver_id,
            due_at: raw.due_date,
            created_at: raw.created_at,
            workflows: { name: `${config.sopCode} · ${config.title}` },
            __sop: true,
            __instance: raw as WorkflowInstance,
            __stage: stage,
            __stageActions: stageActions,
          };
        })
        .filter((t): t is SopInboxTask => t !== null);
    },
  });
}

export function isSopTask(t: WorkflowTask): t is SopInboxTask {
  return (t as any).__sop === true;
}
