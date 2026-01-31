import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface DeviceFuelStatus {
  device_id: string;
  has_fuel_data: boolean;
  last_fuel_reading: number | null;
  fuel_records_count: number;
}

export function useDeviceFuelStatus() {
  const { organizationId } = useOrganization();

  const { data: fuelStatusMap, isLoading } = useQuery({
    queryKey: ["device-fuel-status", organizationId],
    queryFn: async () => {
      if (!organizationId) return new Map<string, DeviceFuelStatus>();

      // Get all devices with their fuel telemetry data
      const { data: devices, error: devicesError } = await supabase
        .from("devices")
        .select("id, vehicle_id")
        .eq("organization_id", organizationId);

      if (devicesError) throw devicesError;

      const statusMap = new Map<string, DeviceFuelStatus>();

      // For each device with a vehicle, check if there's fuel data
      for (const device of devices || []) {
        if (!device.vehicle_id) {
          statusMap.set(device.id, {
            device_id: device.id,
            has_fuel_data: false,
            last_fuel_reading: null,
            fuel_records_count: 0,
          });
          continue;
        }

        // Check for fuel telemetry data
        const { data: telemetry, error: telemetryError } = await supabase
          .from("vehicle_telemetry")
          .select("fuel_level_percent")
          .eq("vehicle_id", device.vehicle_id)
          .not("fuel_level_percent", "is", null)
          .order("last_communication_at", { ascending: false })
          .limit(1);

        if (telemetryError) {
          console.error("Error fetching fuel telemetry:", telemetryError);
          statusMap.set(device.id, {
            device_id: device.id,
            has_fuel_data: false,
            last_fuel_reading: null,
            fuel_records_count: 0,
          });
          continue;
        }

        // Get count of fuel records
        const { count } = await supabase
          .from("vehicle_telemetry")
          .select("*", { count: "exact", head: true })
          .eq("vehicle_id", device.vehicle_id)
          .not("fuel_level_percent", "is", null);

        statusMap.set(device.id, {
          device_id: device.id,
          has_fuel_data: (telemetry?.length || 0) > 0,
          last_fuel_reading: telemetry?.[0]?.fuel_level_percent || null,
          fuel_records_count: count || 0,
        });
      }

      return statusMap;
    },
    enabled: !!organizationId,
    staleTime: 60000, // Cache for 1 minute
  });

  const devicesWithFuel = Array.from(fuelStatusMap?.values() || []).filter(
    (s) => s.has_fuel_data
  ).length;

  return {
    fuelStatusMap: fuelStatusMap || new Map<string, DeviceFuelStatus>(),
    devicesWithFuel,
    isLoading,
  };
}
