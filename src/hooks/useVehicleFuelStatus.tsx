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

      // Get all telemetry records with fuel data in one query
      const { data: telemetryData, error: telemetryError } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, fuel_level_percent, last_communication_at")
        .in("vehicle_id", vehicleIds)
        .not("fuel_level_percent", "is", null)
        .order("last_communication_at", { ascending: false });

      if (telemetryError) {
        console.error("Error fetching fuel telemetry:", telemetryError);
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

      // Group by vehicle_id and get counts + latest reading
      const vehicleFuelData = new Map<string, { latest: number | null; count: number }>();
      
      telemetryData?.forEach((record) => {
        const existing = vehicleFuelData.get(record.vehicle_id);
        if (!existing) {
          vehicleFuelData.set(record.vehicle_id, {
            latest: record.fuel_level_percent,
            count: 1,
          });
        } else {
          existing.count++;
        }
      });

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
