// React-Query powered hook for the generic workflow engine.
// Used by all 14 ET FMG SOP pages via a per-workflow config.
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type {
  WorkflowConfig,
  WorkflowInstance,
  WorkflowTransition,
  StageAction,
} from "./types";

interface CreateInstanceArgs {
  title?: string;
  description?: string;
  vehicleId?: string | null;
  driverId?: string | null;
  data?: Record<string, any>;
  documents?: string[];
  priority?: string;
  dueDate?: string | null;
}

interface PerformActionArgs {
  instance: WorkflowInstance;
  action: StageAction;
  payload?: Record<string, any>;
  notes?: string;
  documents?: string[];
}

export function useWorkflow(config: WorkflowConfig) {
  const { organizationId } = useOrganization();
  const { user, profile, roles } = useAuth() as any;
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["workflow-instances", config.type, organizationId],
    [config.type, organizationId],
  );

  const instancesQuery = useQuery({
    queryKey,
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("workflow_type", config.type)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as WorkflowInstance[];
    },
  });

  const userRoles: string[] = useMemo(() => {
    if (Array.isArray(roles)) return roles.map((r: any) => r?.role).filter(Boolean);
    return [];
  }, [roles]);

  const canPerform = (action: StageAction) => {
    if (!action.allowedRoles?.length) return true;
    if (userRoles.includes("super_admin")) return true;
    return action.allowedRoles.some((r) => userRoles.includes(r));
  };

  const createInstance = useMutation({
    mutationFn: async (args: CreateInstanceArgs) => {
      if (!organizationId) throw new Error("No organization");
      const { data: refRes, error: refErr } = await supabase.rpc(
        "generate_workflow_reference",
        { _org_id: organizationId, _workflow_type: config.type },
      );
      if (refErr) throw refErr;

      const initialStage = config.stages.find((s) => s.id === config.initialStage);
      const { data, error } = await supabase
        .from("workflow_instances")
        .insert({
          organization_id: organizationId,
          workflow_type: config.type,
          reference_number: refRes as string,
          title: args.title || null,
          description: args.description || null,
          current_stage: config.initialStage,
          current_lane: initialStage?.lane || null,
          status: "in_progress",
          priority: args.priority || "normal",
          due_date: args.dueDate || null,
          vehicle_id: args.vehicleId || null,
          driver_id: args.driverId || null,
          created_by: user?.id || null,
          data: args.data || {},
          documents: args.documents || [],
        })
        .select()
        .single();
      if (error) throw error;

      // Initial transition
      await supabase.from("workflow_transitions").insert({
        organization_id: organizationId,
        instance_id: data.id,
        workflow_type: config.type,
        from_stage: null,
        to_stage: config.initialStage,
        from_lane: null,
        to_lane: initialStage?.lane || null,
        decision: "create",
        notes: "Workflow instance created",
        performed_by: user?.id || null,
        performed_by_name: profile?.full_name || user?.email || "Unknown",
        performed_by_role: userRoles[0] || null,
        payload: args.data || {},
        documents: args.documents || [],
      });

      return data as WorkflowInstance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${config.title} filed`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create workflow"),
  });

  const performAction = useMutation({
    mutationFn: async ({ instance, action, payload, notes, documents }: PerformActionArgs) => {
      if (!organizationId) throw new Error("No organization");
      if (!canPerform(action)) throw new Error("You don't have permission for this action");

      const toStage = config.stages.find((s) => s.id === action.toStage);
      const newStatus = action.completes || toStage?.terminal ? "completed" : "in_progress";
      const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

      // Merge action payload into instance.data
      const mergedData = { ...(instance.data || {}), ...(payload || {}) };
      const mergedDocs = [...(instance.documents || []), ...(documents || [])];

      const { error: updErr } = await supabase
        .from("workflow_instances")
        .update({
          current_stage: action.toStage,
          current_lane: toStage?.lane || instance.current_lane,
          status: newStatus,
          completed_at: completedAt,
          data: mergedData,
          documents: mergedDocs,
        })
        .eq("id", instance.id);
      if (updErr) throw updErr;

      const { error: trErr } = await supabase.from("workflow_transitions").insert({
        organization_id: organizationId,
        instance_id: instance.id,
        workflow_type: config.type,
        from_stage: instance.current_stage,
        to_stage: action.toStage,
        from_lane: instance.current_lane,
        to_lane: toStage?.lane || instance.current_lane,
        decision: action.id,
        notes: notes || null,
        performed_by: user?.id || null,
        performed_by_name: profile?.full_name || user?.email || "Unknown",
        performed_by_role: userRoles[0] || null,
        payload: payload || {},
        documents: documents || [],
      });
      if (trErr) throw trErr;

      // Inspection hook: when Vehicle Dispatch reaches "completed", auto-create post-trip inspection
      if (config.type === "vehicle_dispatch" && action.toStage === "completed") {
        try {
          await supabase.functions.invoke("auto-create-posttrip-inspection", {
            body: {
              organization_id: organizationId,
              vehicle_id: mergedData.__vehicle_id || mergedData.vehicle_id || null,
              driver_id: mergedData.__driver_id || mergedData.driver_id || null,
              trip_id: instance.id,
              odometer_km: Number(mergedData.odometer_end) || null,
            },
          });
        } catch (e) {
          console.warn("post-trip auto-create failed", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Action completed");
    },
    onError: (e: any) => toast.error(e.message || "Action failed"),
  });

  return {
    instances: instancesQuery.data || [],
    isLoading: instancesQuery.isLoading,
    createInstance,
    performAction,
    canPerform,
    userRoles,
  };
}

export function useWorkflowTransitions(instanceId: string | null) {
  return useQuery({
    queryKey: ["workflow-transitions", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_transitions")
        .select("*")
        .eq("instance_id", instanceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as WorkflowTransition[];
    },
  });
}
