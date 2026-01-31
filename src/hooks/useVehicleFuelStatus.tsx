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

      // Fetch per-vehicle latest fuel + count via RPC (avoids row-limit issues)
      const { data: fuelRows, error: fuelError } = await supabase.rpc(
        "get_vehicle_fuel_status",
        {
          p_vehicle_ids: vehicleIds,
        }
      );

      if (fuelError) {
        console.error("Error fetching fuel status:", fuelError);
      }

      const fuelByVehicleId = new Map<
        string,
        { last: number | null; count: number }
      >();

      (fuelRows || []).forEach((row: any) => {
        const vehicleId = String(row.vehicle_id);
        const lastRaw = row.last_fuel_reading;
        const countRaw = row.fuel_records_count;

        const last =
          lastRaw === null || lastRaw === undefined ? null : Number(lastRaw);
        const count =
          countRaw === null || countRaw === undefined ? 0 : Number(countRaw);

        fuelByVehicleId.set(vehicleId, {
          last: Number.isFinite(last as number) ? (last as number) : null,
          count: Number.isFinite(count) ? count : 0,
        });
      });

      // Build status map for all vehicles
      vehicleIds.forEach((id) => {
        const fuelData = fuelByVehicleId.get(id);
        statusMap.set(id, {
          vehicle_id: id,
          has_fuel_sensor: !!fuelData,
          last_fuel_reading: fuelData?.last ?? null,
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
