import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface VehicleTelemetryData {
  vehicle_id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  engine_on: boolean;
  device_connected: boolean;
  last_communication_at: string | null;
  gps_signal_strength: number | null;
}

export function useVehicleTelemetryBatch(vehicleIds: string[]) {
  const { organizationId } = useOrganization();
  const [telemetryMap, setTelemetryMap] = useState<Record<string, VehicleTelemetryData>>({});
  const [loading, setLoading] = useState(true);

  const fetchTelemetry = useCallback(async () => {
    if (!organizationId || vehicleIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, latitude, longitude, speed_kmh, fuel_level_percent, engine_on, device_connected, last_communication_at, gps_signal_strength")
        .in("vehicle_id", vehicleIds)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error fetching telemetry:", error);
        return;
      }

      if (data) {
        const map: Record<string, VehicleTelemetryData> = {};
        data.forEach(t => {
          // Keep only the latest telemetry per vehicle (assuming data is ordered or we just take first)
          if (!map[t.vehicle_id]) {
            map[t.vehicle_id] = t as VehicleTelemetryData;
          }
        });
        setTelemetryMap(map);
      }
    } catch (err) {
      console.error("Error in telemetry fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, vehicleIds.join(",")]);

  useEffect(() => {
    fetchTelemetry();

    // Set up real-time subscription for telemetry updates
    if (vehicleIds.length > 0 && organizationId) {
      const channel = supabase
        .channel('vehicle-telemetry-batch')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'vehicle_telemetry',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            const newData = payload.new as VehicleTelemetryData;
            if (newData && vehicleIds.includes(newData.vehicle_id)) {
              setTelemetryMap(prev => ({
                ...prev,
                [newData.vehicle_id]: newData,
              }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchTelemetry, vehicleIds.join(","), organizationId]);

  return { telemetryMap, loading, refetch: fetchTelemetry };
}
