import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "./useOrganization";

export interface Device {
  id: string;
  organization_id: string;
  vehicle_id?: string;
  imei: string;
  tracker_model: string;
  serial_number?: string;
  sim_msisdn?: string;
  sim_iccid?: string;
  apn?: string;
  status: 'active' | 'inactive' | 'maintenance';
  protocol_id?: string;
  firmware_version?: string;
  last_firmware_update?: string;
  install_date?: string;
  installed_by?: string;
  last_heartbeat?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useDevices = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("devices")
        .select(`
          *,
          vehicles(plate_number, make, model)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!organizationId,
  });

  const createDevice = useMutation({
    mutationFn: async (device: Partial<Device>) => {
      const { data, error } = await supabase
        .from("devices")
        .insert([{
          ...device,
          organization_id: organizationId,
        } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Success",
        description: "Device created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDevice = useMutation({
    mutationFn: async ({ id, ...device }: Partial<Device> & { id: string }) => {
      const { data, error } = await supabase
        .from("devices")
        .update(device)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Success",
        description: "Device updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Success",
        description: "Device deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testHeartbeat = useMutation({
    mutationFn: async (deviceId: string) => {
      // Get device info
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("vehicle_id, organization_id")
        .eq("id", deviceId)
        .single();

      if (deviceError) throw deviceError;
      if (!device?.vehicle_id) throw new Error("Device not assigned to a vehicle");

      // Update heartbeat
      const { error: heartbeatError } = await supabase
        .from("devices")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("id", deviceId);

      if (heartbeatError) throw heartbeatError;

      // Insert sample telemetry data
      const { error: telemetryError } = await supabase
        .from("vehicle_telemetry")
        .insert({
          vehicle_id: device.vehicle_id,
          organization_id: device.organization_id,
          latitude: 9.0214 + (Math.random() - 0.5) * 0.01, // Small random offset
          longitude: 38.7624 + (Math.random() - 0.5) * 0.01,
          speed_kmh: Math.random() * 80,
          heading: Math.random() * 360,
          fuel_level_percent: 50 + Math.random() * 50,
          engine_on: true,
          device_connected: true,
          last_communication_at: new Date().toISOString(),
          gps_satellites_count: 8 + Math.floor(Math.random() * 4),
          gps_signal_strength: 70 + Math.floor(Math.random() * 30),
          gps_fix_type: '3d_fix'
        });

      if (telemetryError) throw telemetryError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-telemetry"] });
      toast({
        title: "Test successful",
        description: "Device heartbeat and telemetry data sent",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    devices,
    isLoading,
    createDevice,
    updateDevice,
    deleteDevice,
    testHeartbeat,
  };
};
