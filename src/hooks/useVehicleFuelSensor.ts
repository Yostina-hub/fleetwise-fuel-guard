import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleFuelSensorReading {
  vehicle_id: string;
  last_fuel_reading: number;
  last_communication_at: string;
  fuel_records_count: number;
}

export function useVehicleFuelSensor(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["vehicle-fuel-sensor", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;

      const { data, error } = await supabase.rpc("get_vehicle_fuel_status", {
        p_vehicle_ids: [vehicleId],
      });

      if (error) throw error;
      const row = (data || [])[0] as any;
      if (!row) return null;

      const last = row.last_fuel_reading;
      const count = row.fuel_records_count;

      return {
        vehicle_id: String(row.vehicle_id),
        last_fuel_reading: last === null || last === undefined ? NaN : Number(last),
        last_communication_at: String(row.last_communication_at),
        fuel_records_count:
          count === null || count === undefined ? 0 : Number(count),
      } satisfies VehicleFuelSensorReading;
    },
    enabled: !!vehicleId,
    staleTime: 60_000,
  });

  // Note: caller can interpret null as "no sensor data".
}
