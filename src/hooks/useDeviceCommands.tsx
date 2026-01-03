import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "./useOrganization";

export interface DeviceCommand {
  id: string;
  organization_id: string;
  device_id: string;
  vehicle_id?: string;
  command_type: string;
  command_payload: Record<string, any>;
  status: 'pending' | 'sent' | 'acknowledged' | 'executed' | 'failed' | 'expired';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_by?: string;
  sent_at?: string;
  acknowledged_at?: string;
  executed_at?: string;
  response_data?: Record<string, any>;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  devices?: { imei: string; tracker_model: string };
  vehicles?: { plate_number: string };
}

export const COMMAND_TYPES = [
  { value: 'set_speed_limit', label: 'Set Speed Limit', description: 'Configure maximum speed limit' },
  { value: 'engine_cut', label: 'Engine Cut', description: 'Remotely cut engine (safety feature)' },
  { value: 'engine_restore', label: 'Engine Restore', description: 'Restore engine after cut' },
  { value: 'get_location', label: 'Get Location', description: 'Request current GPS position' },
  { value: 'set_interval', label: 'Set Interval', description: 'Set tracking interval in seconds' },
  { value: 'restart_device', label: 'Restart Device', description: 'Remotely restart the GPS device' },
  { value: 'set_timezone', label: 'Set Timezone', description: 'Configure device timezone' },
  { value: 'set_apn', label: 'Set APN', description: 'Configure mobile network APN settings' },
  { value: 'firmware_update', label: 'Firmware Update', description: 'Initiate OTA firmware update' },
  { value: 'custom', label: 'Custom Command', description: 'Send raw command to device' },
] as const;

export const useDeviceCommands = (deviceId?: string) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: commands, isLoading, refetch } = useQuery({
    queryKey: ["device-commands", organizationId, deviceId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from("device_commands")
        .select(`
          *,
          devices(imei, tracker_model),
          vehicles(plate_number)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (deviceId) {
        query = query.eq("device_id", deviceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DeviceCommand[];
    },
    enabled: !!organizationId,
  });

  const sendCommand = useMutation({
    mutationFn: async (command: {
      device_id: string;
      vehicle_id?: string;
      command_type: string;
      command_payload: Record<string, any>;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      expires_in_minutes?: number;
    }) => {
      const expiresAt = command.expires_in_minutes 
        ? new Date(Date.now() + command.expires_in_minutes * 60 * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default 24 hours

      const { data, error } = await supabase
        .from("device_commands")
        .insert({
          organization_id: organizationId,
          device_id: command.device_id,
          vehicle_id: command.vehicle_id,
          command_type: command.command_type,
          command_payload: command.command_payload,
          priority: command.priority || 'normal',
          status: 'pending',
          expires_at: expiresAt,
          max_retries: 3,
          retry_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-commands"] });
      toast({
        title: "Command Queued",
        description: "Command has been queued and will be sent to the device",
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

  const cancelCommand = useMutation({
    mutationFn: async (commandId: string) => {
      const { error } = await supabase
        .from("device_commands")
        .update({ status: 'expired', error_message: 'Cancelled by user' })
        .eq("id", commandId)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-commands"] });
      toast({
        title: "Command Cancelled",
        description: "The pending command has been cancelled",
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

  const retryCommand = useMutation({
    mutationFn: async (commandId: string) => {
      const { data: originalCommand, error: fetchError } = await supabase
        .from("device_commands")
        .select("*")
        .eq("id", commandId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("device_commands")
        .insert({
          organization_id: originalCommand.organization_id,
          device_id: originalCommand.device_id,
          vehicle_id: originalCommand.vehicle_id,
          command_type: originalCommand.command_type,
          command_payload: originalCommand.command_payload,
          priority: originalCommand.priority,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          max_retries: 3,
          retry_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-commands"] });
      toast({
        title: "Command Retried",
        description: "A new command has been queued",
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
    commands,
    isLoading,
    sendCommand,
    cancelCommand,
    retryCommand,
    refetch,
  };
};
