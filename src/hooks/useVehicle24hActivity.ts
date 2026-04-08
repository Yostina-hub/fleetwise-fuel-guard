import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

/**
 * Fetches real 24h activity data for vehicles based on trips table.
 * Returns a map of vehicleId -> 24-element array of statuses.
 */
export const useVehicle24hActivity = (vehicleIds: string[]) => {
  const since = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d.toISOString();
  }, []);

  const { data: tripsMap } = useQuery({
    queryKey: ["vehicle-24h-activity", vehicleIds.length, since],
    queryFn: async () => {
      if (vehicleIds.length === 0) return {};

      // Fetch trips from last 24h for all vehicles in one query
      const { data: trips } = await supabase
        .from("trips")
        .select("vehicle_id, start_time, end_time, status")
        .in("vehicle_id", vehicleIds.slice(0, 200)) // Limit for performance
        .gte("start_time", since)
        .order("start_time", { ascending: true });

      if (!trips) return {};

      const now = new Date();
      const hourStart = new Date(now);
      hourStart.setHours(hourStart.getHours() - 23, 0, 0, 0);

      const result: Record<string, string[]> = {};

      for (const vid of vehicleIds) {
        const vehicleTrips = trips.filter(t => t.vehicle_id === vid);
        const hours: string[] = [];

        for (let h = 0; h < 24; h++) {
          const slotStart = new Date(hourStart);
          slotStart.setHours(slotStart.getHours() + h);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(slotEnd.getHours() + 1);

          // Check if any trip overlaps this hour
          const overlapping = vehicleTrips.find(t => {
            const ts = new Date(t.start_time);
            const te = t.end_time ? new Date(t.end_time) : now;
            return ts < slotEnd && te > slotStart;
          });

          if (overlapping) {
            if (overlapping.status === 'in_progress') {
              hours.push('moving');
            } else if (overlapping.status === 'completed') {
              hours.push('moving');
            } else {
              hours.push('idle');
            }
          } else {
            hours.push('offline');
          }
        }

        result[vid] = hours;
      }

      return result;
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
    enabled: vehicleIds.length > 0,
  });

  return tripsMap || {};
};
