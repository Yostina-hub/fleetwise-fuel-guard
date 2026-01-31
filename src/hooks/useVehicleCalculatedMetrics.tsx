import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface VehicleCalculatedMetrics {
  todayDistance: number;
  distanceFromLastStop: number | null;
  durationFromLastStop: number | null; // in minutes
  lastStopTime: string | null;
}

interface TripData {
  vehicle_id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  status: string;
}

export function useVehicleCalculatedMetrics(vehicleIds: string[]) {
  const { organizationId } = useOrganization();
  
  // Memoize the vehicle IDs to prevent unnecessary re-renders
  const vehicleIdsKey = useMemo(() => vehicleIds.sort().join(","), [vehicleIds]);

  const { data: metricsMap = {}, isLoading } = useQuery({
    queryKey: ["vehicle-calculated-metrics", organizationId, vehicleIdsKey],
    queryFn: async () => {
      if (!organizationId || vehicleIds.length === 0) return {};

      // Get today's start (midnight)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch today's trips for all vehicles in a single query
      const { data: trips, error } = await supabase
        .from("trips")
        .select("vehicle_id, start_time, end_time, distance_km, status")
        .in("vehicle_id", vehicleIds)
        .gte("start_time", todayStart.toISOString())
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Error fetching trip metrics:", error);
        return {};
      }

      // Also fetch the last completed trip for each vehicle (for "from last stop" metrics)
      const { data: lastCompletedTrips, error: lastTripError } = await supabase
        .from("trips")
        .select("vehicle_id, start_time, end_time, distance_km, status")
        .in("vehicle_id", vehicleIds)
        .eq("status", "completed")
        .order("end_time", { ascending: false })
        .limit(vehicleIds.length * 2); // Get enough to have at least one per vehicle

      if (lastTripError) {
        console.error("Error fetching last trips:", lastTripError);
      }

      // Build metrics map for each vehicle
      const result: Record<string, VehicleCalculatedMetrics> = {};

      vehicleIds.forEach((vehicleId) => {
        // Calculate today's distance
        const vehicleTodayTrips = (trips || []).filter(
          (t: TripData) => t.vehicle_id === vehicleId
        );
        const todayDistance = vehicleTodayTrips.reduce(
          (sum: number, t: TripData) => sum + (t.distance_km || 0),
          0
        );

        // Find the last completed trip for this vehicle
        const lastCompletedTrip = (lastCompletedTrips || []).find(
          (t: TripData) => t.vehicle_id === vehicleId && t.status === "completed"
        );

        // Find current in-progress trip
        const inProgressTrip = vehicleTodayTrips.find(
          (t: TripData) => t.status === "in_progress"
        );

        let distanceFromLastStop: number | null = null;
        let durationFromLastStop: number | null = null;
        let lastStopTime: string | null = null;

        if (lastCompletedTrip?.end_time) {
          lastStopTime = lastCompletedTrip.end_time;
          
          // Calculate duration since last stop
          const lastStopDate = new Date(lastCompletedTrip.end_time);
          const now = new Date();
          durationFromLastStop = Math.round((now.getTime() - lastStopDate.getTime()) / 60000);

          // Distance from last stop = distance of current trip (if any)
          if (inProgressTrip) {
            distanceFromLastStop = inProgressTrip.distance_km || 0;
          } else {
            // If no in-progress trip, check if there was any trip after the last stop
            const tripsAfterLastStop = vehicleTodayTrips.filter((t: TripData) => {
              const tripStart = new Date(t.start_time);
              return tripStart > lastStopDate;
            });
            distanceFromLastStop = tripsAfterLastStop.reduce(
              (sum: number, t: TripData) => sum + (t.distance_km || 0),
              0
            );
          }
        }

        result[vehicleId] = {
          todayDistance: Math.round(todayDistance * 100) / 100,
          distanceFromLastStop: distanceFromLastStop !== null 
            ? Math.round(distanceFromLastStop * 100) / 100 
            : null,
          durationFromLastStop,
          lastStopTime,
        };
      });

      return result;
    },
    enabled: !!organizationId && vehicleIds.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  return {
    metricsMap,
    isLoading,
    getMetrics: (vehicleId: string): VehicleCalculatedMetrics => 
      metricsMap[vehicleId] || {
        todayDistance: 0,
        distanceFromLastStop: null,
        durationFromLastStop: null,
        lastStopTime: null,
      },
  };
}
