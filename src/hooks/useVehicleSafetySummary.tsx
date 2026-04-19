import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SafetyFlaggedItem {
  key: string;
  label: string;
  status: string;
  usability_period?: string;
  notes?: string;
}

export interface SafetyReport {
  id: string;
  reference: string;
  stage: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  title?: string;
  severity?: string;
  vehicleGroupLabel?: string;
  flaggedItems: SafetyFlaggedItem[];
  raw: any;
}

export interface VehicleSafetySummary {
  lastInspectionAt: string | null;
  lastReference: string | null;
  lastStage: string | null;
  lastStatus: string | null;
  flaggedItems: SafetyFlaggedItem[];
  totalOpen: number;
  totalCompleted: number;
  reports: SafetyReport[];
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

const labelFor = (key: string) =>
  KNOWN_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const extractFlagged = (data: any): SafetyFlaggedItem[] => {
  const checklist = data?.safety_comfort_checklist ?? {};
  const notes = data?.item_notes ?? {};
  return Object.entries(checklist)
    .filter(([, v]: [string, any]) => v && v.status && v.status !== "ok")
    .map(([key, v]: [string, any]) => ({
      key,
      label: labelFor(key),
      status: v.status,
      usability_period: v.usability_period,
      notes: notes[key],
    }));
};

export const useVehicleSafetySummary = (vehicleId: string | undefined) => {
  return useQuery<VehicleSafetySummary | null>({
    queryKey: ["vehicle-safety-summary", vehicleId],
    enabled: !!vehicleId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .select("id, reference_number, current_stage, status, data, title, created_at, completed_at")
        .eq("workflow_type", "safety_comfort")
        .eq("vehicle_id", vehicleId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const reports: SafetyReport[] = data.map(d => {
        const dataObj = (d.data as any) ?? {};
        return {
          id: d.id,
          reference: d.reference_number,
          stage: d.current_stage,
          status: d.status,
          createdAt: d.created_at,
          completedAt: d.completed_at,
          title: d.title ?? dataObj.title,
          severity: dataObj.severity,
          vehicleGroupLabel: dataObj.vehicle_group_label,
          flaggedItems: extractFlagged(dataObj),
          raw: dataObj,
        };
      });

      const latest = reports[0];
      const totalOpen = reports.filter(r => r.status !== "completed").length;
      const totalCompleted = reports.filter(r => r.status === "completed").length;

      return {
        lastInspectionAt: latest.completedAt ?? latest.createdAt,
        lastReference: latest.reference,
        lastStage: latest.stage,
        lastStatus: latest.status,
        flaggedItems: latest.flaggedItems,
        totalOpen,
        totalCompleted,
        reports,
      };
    },
  });
};
