// Returns the set of vehicle IDs that are currently allocated to an active
// vehicle request (assigned/in_progress, not checked out, not deleted).
// Used to disable double-allocation in the UI before the DB trigger fires.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface LockedVehicle {
  vehicle_id: string;
  request_number: string;
  needed_from: string;
  needed_until: string;
  assigned_driver_id: string | null;
}

export const useLockedVehicles = () => {
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["locked-vehicles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select("assigned_vehicle_id, request_number, needed_from, needed_until, assigned_driver_id, status, driver_checked_out_at, deleted_at")
        .not("assigned_vehicle_id", "is", null)
        .is("deleted_at", null)
        .is("driver_checked_out_at", null)
        .in("status", ["assigned", "in_progress"]);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        vehicle_id: r.assigned_vehicle_id,
        request_number: r.request_number,
        needed_from: r.needed_from,
        needed_until: r.needed_until,
        assigned_driver_id: r.assigned_driver_id,
      })) as LockedVehicle[];
    },
    staleTime: 15_000,
  });

  // Keep cache fresh on assignment changes
  useEffect(() => {
    const ch = supabase
      .channel("locked-vehicles-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["locked-vehicles"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const lockedIds = new Set(data.map(d => d.vehicle_id));
  const lockedById: Record<string, LockedVehicle> = {};
  data.forEach(d => { lockedById[d.vehicle_id] = d; });

  return { locked: data, lockedIds, lockedById, isLoading };
};
