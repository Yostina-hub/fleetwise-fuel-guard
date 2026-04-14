import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useSocketGateway, SocketTelemetryEvent } from "./useSocketGateway";

export interface VehicleTelemetryData {
  vehicle_id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  engine_on: boolean;
  ignition_on?: boolean;
  device_connected: boolean;
  last_communication_at: string | null;
  gps_signal_strength: number | null;
  gps_jamming_detected?: boolean;
  gps_spoofing_detected?: boolean;
  altitude_meters?: number | null;
  odometer_km?: number | null;
}

export function useVehicleTelemetryBatch(vehicleIds: string[]) {
  const { organizationId } = useOrganization();
  const [telemetryMap, setTelemetryMap] = useState<Record<string, VehicleTelemetryData>>({});
  const [loading, setLoading] = useState(true);

  const vehicleIdsKey = useMemo(() => vehicleIds.join(","), [vehicleIds]);
  const vehicleIdsSet = useMemo(() => new Set(vehicleIds), [vehicleIdsKey]);

  // ── Socket.io Fast Lane ──
  const handleSocketTelemetry = useCallback((data: SocketTelemetryEvent) => {
    if (!data.vehicle_id || !vehicleIdsSet.has(data.vehicle_id)) return;

    setTelemetryMap(prev => {
      const existing = prev[data.vehicle_id];
      return {
        ...prev,
        [data.vehicle_id]: {
          vehicle_id: data.vehicle_id,
          latitude: data.latitude ?? existing?.latitude ?? null,
          longitude: data.longitude ?? existing?.longitude ?? null,
          speed_kmh: data.speed_kmh ?? existing?.speed_kmh ?? null,
          fuel_level_percent: data.fuel_level_percent ?? existing?.fuel_level_percent ?? null,
          engine_on: data.engine_on ?? existing?.engine_on ?? false,
          ignition_on: data.ignition_on ?? existing?.ignition_on,
          device_connected: data.device_connected ?? existing?.device_connected ?? false,
          last_communication_at: data.last_communication_at || new Date().toISOString(),
          gps_signal_strength: data.gps_signal_strength ?? existing?.gps_signal_strength ?? null,
          gps_jamming_detected: data.gps_jamming_detected ?? existing?.gps_jamming_detected,
          gps_spoofing_detected: data.gps_spoofing_detected ?? existing?.gps_spoofing_detected,
          altitude_meters: data.altitude_meters ?? existing?.altitude_meters ?? null,
          odometer_km: data.odometer_km ?? existing?.odometer_km ?? null,
        },
      };
    });
  }, [vehicleIdsSet]);

  useSocketGateway({
    onTelemetry: handleSocketTelemetry,
    enabled: vehicleIds.length > 0 && !!organizationId,
  });

  // ── Initial DB Fetch ──
  const fetchTelemetry = useCallback(async () => {
    if (!organizationId || vehicleIds.length === 0) {
      setTelemetryMap({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, latitude, longitude, speed_kmh, fuel_level_percent, engine_on, device_connected, last_communication_at, gps_signal_strength, gps_jamming_detected, gps_spoofing_detected")
        .in("vehicle_id", vehicleIds)
        .eq("organization_id", organizationId)
        .order("last_communication_at", { ascending: false });

      if (error) {
        console.error("Error fetching telemetry:", error);
        return;
      }

      if (data) {
        const map: Record<string, VehicleTelemetryData> = {};
        data.forEach(t => {
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
  }, [organizationId, vehicleIdsKey]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // ── Supabase Realtime (Storage Lane — guaranteed delivery) ──
  useEffect(() => {
    if (vehicleIds.length === 0 || !organizationId) return;

    const channel = supabase
      .channel(`vehicle-telemetry-batch-${vehicleIdsKey.slice(0, 50)}`)
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
  }, [vehicleIdsKey, organizationId]);

  return { telemetryMap, loading, refetch: fetchTelemetry };
}
