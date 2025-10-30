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
  device_connected: boolean;
  last_communication_at: string;
  created_at: string;
  updated_at: string;
}

export const useVehicleTelemetry = () => {
  const { organizationId } = useOrganization();
  const [telemetry, setTelemetry] = useState<Record<string, VehicleTelemetry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setTelemetry({});
      setLoading(false);
      return;
    }

    const fetchTelemetry = async () => {
      try {
        setLoading(true);
        // Get the latest telemetry for each vehicle
        const { data, error } = await supabase
          .from("vehicle_telemetry")
          .select("*")
          .eq("organization_id", organizationId)
          .order("last_communication_at", { ascending: false });

        if (error) throw error;

        // Group by vehicle_id, keeping only the latest entry for each vehicle
        const telemetryMap: Record<string, VehicleTelemetry> = {};
        (data || []).forEach((item: any) => {
          if (!telemetryMap[item.vehicle_id]) {
            telemetryMap[item.vehicle_id] = item;
          }
        });

        setTelemetry(telemetryMap);
      } catch (err: any) {
        console.error("Error fetching vehicle telemetry:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('vehicle-telemetry-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_telemetry',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchTelemetry();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  // Helper function to check if a vehicle is online (last communication within 5 minutes)
  const isVehicleOnline = (vehicleId: string): boolean => {
    const vehicleTelemetry = telemetry[vehicleId];
    if (!vehicleTelemetry || !vehicleTelemetry.device_connected) {
      return false;
    }
    
    const lastComm = new Date(vehicleTelemetry.last_communication_at);
    const now = new Date();
    const minutesSinceLastComm = (now.getTime() - lastComm.getTime()) / 1000 / 60;
    
    return minutesSinceLastComm <= 5;
  };

  return {
    telemetry,
    loading,
    error,
    isVehicleOnline,
  };
};

