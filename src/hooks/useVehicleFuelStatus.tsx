import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface VehicleFuelStatus {
  vehicle_id: string;
  has_fuel_sensor: boolean;
  last_fuel_reading: number | null;
  fuel_records_count: number;
}

export function useVehicleFuelStatus() {
  const { organizationId } = useOrganization();

  const { data: fuelStatusMap, isLoading } = useQuery({
    queryKey: ["vehicle-fuel-status", organizationId],
    queryFn: async () => {
      if (!organizationId) return new Map<string, VehicleFuelStatus>();

      // Get all vehicles with their latest fuel telemetry
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("organization_id", organizationId);

      if (vehiclesError) throw vehiclesError;

      const statusMap = new Map<string, VehicleFuelStatus>();

      // Batch query for all vehicles with fuel data
      const vehicleIds = (vehicles || []).map((v) => v.id);
      
      if (vehicleIds.length === 0) return statusMap;

      // Get fuel record counts per vehicle
      const { data: countData, error: countError } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id")
        .in("vehicle_id", vehicleIds)
        .not("fuel_level_percent", "is", null);

      // Group by vehicle_id to get counts
      const vehicleFuelCounts = new Map<string, number>();
      countData?.forEach((record) => {
        vehicleFuelCounts.set(record.vehicle_id, (vehicleFuelCounts.get(record.vehicle_id) || 0) + 1);
      });

      // Get latest fuel reading for each vehicle (limit to 1 per vehicle)
      // Query each vehicle separately to ensure we get the latest reading
      const vehicleFuelData = new Map<string, { latest: number | null; count: number }>();
      
      // Get vehicles that have fuel data
      const vehiclesWithFuelIds = Array.from(vehicleFuelCounts.keys());
      
      for (const vehicleId of vehiclesWithFuelIds) {
        const { data: latestReading } = await supabase
          .from("vehicle_telemetry")
          .select("fuel_level_percent")
          .eq("vehicle_id", vehicleId)
          .not("fuel_level_percent", "is", null)
          .order("last_communication_at", { ascending: false })
          .limit(1)
          .single();
        
        if (latestReading) {
          vehicleFuelData.set(vehicleId, {
            latest: latestReading.fuel_level_percent,
            count: vehicleFuelCounts.get(vehicleId) || 0,
          });
        }
      }

      if (countError) {
        console.error("Error fetching fuel telemetry:", countError);
        // Initialize all vehicles as no fuel data
        vehicleIds.forEach((id) => {
          statusMap.set(id, {
            vehicle_id: id,
            has_fuel_sensor: false,
            last_fuel_reading: null,
            fuel_records_count: 0,
          });
        });
        return statusMap;
      }

      // Build status map for all vehicles
      vehicleIds.forEach((id) => {
        const fuelData = vehicleFuelData.get(id);
        statusMap.set(id, {
          vehicle_id: id,
          has_fuel_sensor: !!fuelData,
          last_fuel_reading: fuelData?.latest || null,
          fuel_records_count: fuelData?.count || 0,
        });
      });

      return statusMap;
    },
    enabled: !!organizationId,
    staleTime: 60000, // Cache for 1 minute
  });

  const vehiclesWithFuel = Array.from(fuelStatusMap?.values() || []).filter(
    (s) => s.has_fuel_sensor
  ).length;

  return {
    fuelStatusMap: fuelStatusMap || new Map<string, VehicleFuelStatus>(),
    vehiclesWithFuel,
    isLoading,
  };
}
