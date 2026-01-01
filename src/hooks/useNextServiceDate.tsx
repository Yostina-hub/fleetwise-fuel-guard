import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { format } from "date-fns";

export function useNextServiceDate(vehicleIds: string[]) {
  const { organizationId } = useOrganization();
  const [nextServiceMap, setNextServiceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Memoize the vehicle IDs key to prevent unnecessary re-renders
  const vehicleIdsKey = useMemo(() => vehicleIds.join(","), [vehicleIds]);

  const fetchNextService = useCallback(async () => {
    if (!organizationId || vehicleIds.length === 0) {
      setNextServiceMap({});
      setLoading(false);
      return;
    }

    try {
      // Get scheduled work orders for vehicles
      const { data, error } = await supabase
        .from("work_orders")
        .select("vehicle_id, scheduled_date")
        .in("vehicle_id", vehicleIds)
        .eq("organization_id", organizationId)
        .in("status", ["pending", "scheduled", "in_progress"])
        .order("scheduled_date", { ascending: true });

      if (error) {
        console.error("Error fetching work orders:", error);
        return;
      }

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(wo => {
          // Keep only the earliest scheduled date per vehicle
          if (!map[wo.vehicle_id] && wo.scheduled_date) {
            try {
              map[wo.vehicle_id] = format(new Date(wo.scheduled_date), "MMM d, yyyy");
            } catch {
              map[wo.vehicle_id] = wo.scheduled_date;
            }
          }
        });
        setNextServiceMap(map);
      }
    } catch (err) {
      console.error("Error in service date fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, vehicleIdsKey]);

  useEffect(() => {
    fetchNextService();
  }, [fetchNextService]);

  return { nextServiceMap, loading, refetch: fetchNextService };
}
