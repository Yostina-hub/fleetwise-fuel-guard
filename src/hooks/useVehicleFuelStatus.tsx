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

      // Get all vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("organization_id", organizationId);

      if (vehiclesError) throw vehiclesError;

      const statusMap = new Map<string, VehicleFuelStatus>();
      const vehicleIds = (vehicles || []).map((v) => v.id);
      
      if (vehicleIds.length === 0) return statusMap;

      // Use a raw SQL query via RPC or get all fuel records grouped
      // First, get distinct vehicles that have fuel data
      const { data: vehiclesWithFuel, error: fuelError } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, fuel_level_percent, last_communication_at")
        .in("vehicle_id", vehicleIds)
        .not("fuel_level_percent", "is", null)
        .order("last_communication_at", { ascending: false })
        .limit(5000); // Increase limit to capture more records

      if (fuelError) {
        console.error("Error fetching fuel telemetry:", fuelError);
      }

      // Group by vehicle_id to get count and latest reading
      const vehicleFuelData = new Map<string, { latest: number; count: number; latestTime: string }>();
      
      (vehiclesWithFuel || []).forEach((record) => {
        const existing = vehicleFuelData.get(record.vehicle_id);
        if (!existing) {
          // First record for this vehicle (already sorted by time desc, so this is the latest)
          vehicleFuelData.set(record.vehicle_id, {
            latest: record.fuel_level_percent!,
            count: 1,
            latestTime: record.last_communication_at || '',
          });
        } else {
          // Just increment count
          existing.count++;
        }
      });

      console.log("Vehicles with fuel data:", Array.from(vehicleFuelData.entries()));

      // Build status map for all vehicles
      vehicleIds.forEach((id) => {
        const fuelData = vehicleFuelData.get(id);
        statusMap.set(id, {
          vehicle_id: id,
          has_fuel_sensor: !!fuelData,
          last_fuel_reading: fuelData?.latest ?? null,
          fuel_records_count: fuelData?.count ?? 0,
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
