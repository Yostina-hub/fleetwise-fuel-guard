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
      const { error } = await supabase
        .from("devices")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("id", deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Heartbeat sent",
        description: "Device heartbeat updated successfully",
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
