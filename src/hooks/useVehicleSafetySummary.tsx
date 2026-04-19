import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleSafetySummary {
  lastInspectionAt: string | null;
  lastReference: string | null;
  lastStage: string | null;
  lastStatus: string | null;
  flaggedItems: Array<{ key: string; label: string; status: string; usability_period?: string }>;
  totalOpen: number;
  totalCompleted: number;
}

const KNOWN_LABELS: Record<string, string> = {
  fire_extinguisher: "Fire Extinguisher",
  first_aid_kit: "First Aid Kit",
  warning_triangle: "Warning Triangle",
  spare_tire: "Spare Tire",
  jack: "Jack",
  reflective_vest: "Reflective Vest",
  seat_belts: "Seat Belts",
  ac_system: "A/C System",
};

export const useVehicleSafetySummary = (vehicleId: string | undefined) => {
  return useQuery<VehicleSafetySummary | null>({
    queryKey: ["vehicle-safety-summary", vehicleId],
    enabled: !!vehicleId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .select("id, reference_number, current_stage, status, data, created_at, completed_at")
        .eq("workflow_type", "safety_comfort")
        .eq("vehicle_id", vehicleId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const latest = data[0];
      const checklist = (latest.data as any)?.safety_comfort_checklist ?? {};

      const flaggedItems = Object.entries(checklist)
        .filter(([, v]: [string, any]) => v && v.status && v.status !== "ok")
        .map(([key, v]: [string, any]) => ({
          key,
          label: KNOWN_LABELS[key] ?? key.replace(/_/g, " "),
          status: v.status,
          usability_period: v.usability_period,
        }));

      const totalOpen = data.filter(d => d.status !== "completed").length;
      const totalCompleted = data.filter(d => d.status === "completed").length;

      return {
        lastInspectionAt: latest.completed_at ?? latest.created_at,
        lastReference: latest.reference_number,
        lastStage: latest.current_stage,
        lastStatus: latest.status,
        flaggedItems,
        totalOpen,
        totalCompleted,
      };
    },
  });
};
