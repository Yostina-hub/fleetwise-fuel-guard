import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface DueSchedule {
  schedule_id: string;
  vehicle_id: string;
  plate_number: string;
  service_type: string;
  interval_type: string;
  next_due_date: string | null;
  next_due_odometer: number | null;
  next_due_hours: number | null;
  current_odometer: number;
  current_hours: number;
  due_reason:
    | "date_overdue"
    | "date_upcoming"
    | "odometer_overdue"
    | "odometer_upcoming"
    | "hours_overdue"
    | "hours_upcoming"
    | null;
  is_overdue: boolean;
  priority: string;
}

interface Options {
  vehicleId?: string;
  lookaheadDays?: number;
  lookaheadKm?: number;
  lookaheadHours?: number;
  enabled?: boolean;
}

export const useDuePreventiveSchedules = (opts: Options = {}) => {
  const { organizationId } = useOrganization();
  const {
    vehicleId,
    lookaheadDays = 7,
    lookaheadKm = 500,
    lookaheadHours = 25,
    enabled = true,
  } = opts;

  return useQuery({
    queryKey: [
      "due-preventive-schedules",
      organizationId,
      vehicleId ?? null,
      lookaheadDays,
      lookaheadKm,
      lookaheadHours,
    ],
    queryFn: async () => {
      if (!organizationId) return [] as DueSchedule[];
      const { data, error } = await (supabase as any).rpc("get_due_preventive_schedules", {
        p_organization_id: organizationId,
        p_vehicle_id: vehicleId ?? null,
        p_lookahead_days: lookaheadDays,
        p_lookahead_km: lookaheadKm,
        p_lookahead_hours: lookaheadHours,
      });
      if (error) throw error;
      return (data ?? []) as DueSchedule[];
    },
    enabled: enabled && !!organizationId,
    staleTime: 60_000,
  });
};

export const useTriggerPreventiveScan = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("trigger-preventive-maintenance", {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      return data as { created: number; requests: unknown[] };
    },
    onSuccess: (res) => {
      const n = res?.created ?? 0;
      if (n > 0) {
        toast.success(`Created ${n} preventive maintenance request${n === 1 ? "" : "s"}`);
      } else {
        toast.info("No schedules currently overdue");
      }
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["due-preventive-schedules"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to scan schedules"),
  });
};
