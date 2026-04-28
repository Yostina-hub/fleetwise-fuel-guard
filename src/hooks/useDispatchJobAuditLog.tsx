/**
 * useDispatchJobAuditLog
 * ----------------------
 * Loads the immutable audit trail for a dispatch_job: every status
 * transition, vehicle/driver assignment, and notable edit recorded by
 * the database trigger. Visible to operations & auditor roles per RLS.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DispatchJobAuditEntry {
  id: string;
  organization_id: string;
  job_id: string | null;
  job_number: string | null;
  event_type:
    | "created"
    | "status_changed"
    | "vehicle_assigned"
    | "driver_assigned"
    | "unassigned"
    | "updated";
  from_value: string | null;
  to_value: string | null;
  changed_fields: string[] | null;
  actor_id: string | null;
  actor_role: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export const useDispatchJobAuditLog = (
  jobId: string | null | undefined,
  enabled = true,
) => {
  return useQuery({
    queryKey: ["dispatch-job-audit-log", jobId],
    queryFn: async (): Promise<DispatchJobAuditEntry[]> => {
      if (!jobId) return [];
      const { data, error } = await (supabase as any)
        .from("dispatch_job_audit_log")
        .select(
          "id, organization_id, job_id, job_number, event_type, from_value, to_value, changed_fields, actor_id, actor_role, notes, metadata, created_at",
        )
        .eq("job_id", jobId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as DispatchJobAuditEntry[];
    },
    enabled: !!jobId && enabled,
    staleTime: 15_000,
  });
};
