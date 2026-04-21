import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useSocketGateway, SocketTelemetryEvent } from "./useSocketGateway";

export interface VehicleTelemetry {
  id: string;
  vehicle_id: string;
  organization_id: string;
  latitude?: number;
  longitude?: number;
  speed_kmh?: number;
  heading?: number;
  fuel_level_percent?: number;
  engine_on: boolean;
  ignition_on?: boolean;
  device_connected: boolean;
  last_communication_at: string;
  created_at: string;
  updated_at: string;
  gps_satellites_count?: number;
  gps_signal_strength?: number;
  gps_hdop?: number;
  gps_fix_type?: 'no_fix' | '2d_fix' | '3d_fix';
  gps_jamming_detected?: boolean;
  gps_spoofing_detected?: boolean;
  altitude_meters?: number;
  odometer_km?: number;
}

export const useVehicleTelemetry = () => {
  const { organizationId } = useOrganization();
  const [telemetry, setTelemetry] = useState<Record<string, VehicleTelemetry>>({});
  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Socket.io Fast Lane (sub-second updates from TCP gateway) ──
  const handleSocketTelemetry = useCallback((data: SocketTelemetryEvent) => {
    if (!data.vehicle_id) return;

    setTelemetry(prev => {
      const existing = prev[data.vehicle_id];
      // Merge socket data into existing telemetry (socket sends partial updates)
      const merged: VehicleTelemetry = {
        ...(existing || {} as VehicleTelemetry),
        vehicle_id: data.vehicle_id,
        organization_id: organizationId || "",
        latitude: data.latitude ?? existing?.latitude,
        longitude: data.longitude ?? existing?.longitude,
        speed_kmh: data.speed_kmh ?? existing?.speed_kmh,
        heading: data.heading ?? existing?.heading,
        fuel_level_percent: data.fuel_level_percent ?? existing?.fuel_level_percent,
        engine_on: data.engine_on ?? existing?.engine_on ?? false,
        ignition_on: data.ignition_on ?? existing?.ignition_on,
        device_connected: data.device_connected ?? existing?.device_connected ?? false,
        last_communication_at: data.last_communication_at || new Date().toISOString(),
        altitude_meters: data.altitude_meters ?? existing?.altitude_meters,
        odometer_km: data.odometer_km ?? existing?.odometer_km,
        gps_satellites_count: data.gps_satellites_count ?? existing?.gps_satellites_count,
        gps_signal_strength: data.gps_signal_strength ?? existing?.gps_signal_strength,
        gps_jamming_detected: data.gps_jamming_detected ?? existing?.gps_jamming_detected,
        gps_spoofing_detected: data.gps_spoofing_detected ?? existing?.gps_spoofing_detected,
        // Keep DB-only fields
        id: existing?.id || "",
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return { ...prev, [data.vehicle_id]: merged };
    });
  }, [organizationId]);

  const { connected: socketConnected, isAvailable: socketAvailable } = useSocketGateway({
    onTelemetry: handleSocketTelemetry,
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (!organizationId) {
      setTelemetry({});
      setLoading(false);
      setIsFirstLoad(false);
      return;
    }

    let isMounted = true;
    let throttleTimer: ReturnType<typeof setTimeout>;

    const fetchTelemetry = async (showLoading = true) => {
      try {
        if (showLoading && isFirstLoad) {
          setLoading(true);
        }
        const { data, error } = await supabase
          .from("vehicle_telemetry")
          .select("*")
          .eq("organization_id", organizationId)
          .order("last_communication_at", { ascending: false })
          .limit(5000);

        if (error) throw error;

        const telemetryMap: Record<string, VehicleTelemetry> = {};
        (data || []).forEach((item: any) => {
          if (!telemetryMap[item.vehicle_id]) {
            telemetryMap[item.vehicle_id] = item;
          }
        });

        if (isMounted) {
          setTelemetry(telemetryMap);
          setIsFirstLoad(false);
        }
      } catch (err: any) {
        console.error("Error fetching vehicle telemetry:", err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTelemetry();

    // ── Supabase Realtime (Storage Lane — guaranteed delivery) ──
    // This remains the primary source of truth even when Socket.io is active
    const channel = supabase
      .channel(`vehicle-telemetry-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_telemetry',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          if (!isMounted) return;
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new as VehicleTelemetry;
            setTelemetry(prev => ({
              ...prev,
              [newData.vehicle_id]: newData
            }));
          } else {
            clearTimeout(throttleTimer);
            throttleTimer = setTimeout(() => {
              if (isMounted) {
                fetchTelemetry(false);
              }
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(throttleTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVehicleOnline = (vehicleId: string): boolean => {
    const vehicleTelemetry = telemetry[vehicleId];
    if (!vehicleTelemetry || !vehicleTelemetry.device_connected) {
      return false;
    }
    
    const lastComm = new Date(vehicleTelemetry.last_communication_at);
    const now = new Date();
    const minutesSinceLastComm = (now.getTime() - lastComm.getTime()) / 1000 / 60;
    
    return minutesSinceLastComm <= 15;
  };

  return {
    telemetry,
    loading,
    error,
    isVehicleOnline,
    // New: expose Socket.io status for UI indicators
    socketConnected,
    socketAvailable,
  };
};
