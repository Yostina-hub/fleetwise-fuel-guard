import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

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
  const [loading, setLoading] = useState(true); // Start true - we're loading
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      // Still waiting for organization - keep loading state
      return;
    }

    let isMounted = true;
    let throttleTimer: NodeJS.Timeout;

    const fetchTelemetry = async () => {
      try {
        setLoading(true);
        // Get latest telemetry per vehicle
        const { data, error } = await supabase
          .from("vehicle_telemetry")
          .select("*")
          .eq("organization_id", organizationId)
          .order("last_communication_at", { ascending: false })
          .limit(5000);

        if (error) throw error;

        // Group by vehicle_id, keeping only the latest entry for each vehicle
        const telemetryMap: Record<string, VehicleTelemetry> = {};
        (data || []).forEach((item: any) => {
          if (!telemetryMap[item.vehicle_id]) {
            telemetryMap[item.vehicle_id] = item;
          }
        });

        if (isMounted) {
          setTelemetry(telemetryMap);
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

    // Subscribe to realtime changes with throttling for large fleets
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
          
          // For INSERT/UPDATE, update single vehicle telemetry directly
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new as VehicleTelemetry;
            setTelemetry(prev => ({
              ...prev,
              [newData.vehicle_id]: newData
            }));
          } else {
            // For DELETE or other events, debounce full refetch
            clearTimeout(throttleTimer);
            throttleTimer = setTimeout(() => {
              if (isMounted) {
                fetchTelemetry();
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
  }, [organizationId]);

  // Helper function to check if a vehicle is online (last communication within 15 minutes)
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
  };
};

