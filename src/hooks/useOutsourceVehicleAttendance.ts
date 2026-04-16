import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface VehicleAttendance {
  id: string;
  organization_id: string;
  rental_vehicle_id: string | null;
  vehicle_id: string | null;
  attendance_date: string;
  status: "present" | "absent" | "partial" | "maintenance";
  source: "manual" | "auto_gps" | "override";
  km_driven: number;
  hours_active: number;
  fuel_consumed_liters: number;
  notes: string | null;
}

export const useOutsourceVehicleAttendance = (rentalVehicleId?: string) => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["outsource-vehicle-attendance", organizationId, rentalVehicleId],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase
        .from("outsource_vehicle_attendance")
        .select("*")
        .eq("organization_id", organizationId)
        .order("attendance_date", { ascending: false })
        .limit(200);
      if (rentalVehicleId) q = q.eq("rental_vehicle_id", rentalVehicleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as VehicleAttendance[];
    },
    enabled: !!organizationId,
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<VehicleAttendance> & { attendance_date: string; rental_vehicle_id: string }) => {
      if (!organizationId) throw new Error("No org");
      const { error } = await supabase.from("outsource_vehicle_attendance").upsert({
        organization_id: organizationId,
        ...payload,
      } as any, { onConflict: "rental_vehicle_id,attendance_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-vehicle-attendance"] });
      toast.success("Attendance saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { records, isLoading, upsert };
};
