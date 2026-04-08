import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVehicleFullData(vehicleId: string | undefined) {
  // Full vehicle record from DB
  const { data: vehicleRecord, isLoading: vehicleLoading } = useQuery({
    queryKey: ["vehicle-full-record", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          drivers:assigned_driver_id(id, first_name, last_name, phone, email, license_number, license_expiry, avatar_url, status, total_trips, total_distance_km),
          devices!devices_vehicle_id_fkey(id, imei, serial_number, tracker_model, sim_iccid, sim_msisdn, apn, firmware_version, last_firmware_update, install_date, installed_by, status, last_heartbeat, notes)
        `)
        .eq("id", vehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  // Latest telemetry
  const { data: telemetry, isLoading: telemetryLoading } = useQuery({
    queryKey: ["vehicle-telemetry-full", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("last_communication_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
    refetchInterval: 15000,
  });

  // Recent device commands
  const { data: commands = [], isLoading: commandsLoading } = useQuery({
    queryKey: ["vehicle-commands", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const device = vehicleRecord?.devices?.[0];
      if (!device) return [];
      const { data, error } = await supabase
        .from("device_commands")
        .select("*")
        .eq("device_id", device.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId && !!vehicleRecord?.devices?.[0]?.id,
  });

  // Service history
  const { data: serviceHistory = [], isLoading: serviceLoading } = useQuery({
    queryKey: ["vehicle-service-history", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("service_history")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("service_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });

  // Active alerts for this vehicle
  const { data: vehicleAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["vehicle-alerts-full", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .gte("alert_time", thirtyDaysAgo.toISOString())
        .order("alert_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });

  return {
    vehicleRecord,
    telemetry,
    commands,
    serviceHistory,
    vehicleAlerts,
    isLoading: vehicleLoading || telemetryLoading,
    commandsLoading,
    serviceLoading,
    alertsLoading,
  };
}
