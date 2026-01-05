import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "./useOrganization";
import { useEffect, useState } from "react";

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
  auth_token?: string;
  auth_token_created_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TestEndpointResult {
  success: boolean;
  status: number;
  responseTime: number;
  response: {
    success?: boolean;
    message?: string;
    device_id?: string;
    protocol?: string;
    error?: string;
    [key: string]: any;
  };
  request: {
    imei: string;
    lat: number;
    lng: number;
    speed: number;
    dry_run?: boolean;
  };
}

export const useDevices = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ["devices", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("devices")
        .select(`
          *,
          vehicles(plate_number, make, model),
          device_protocols(id, vendor, protocol_name, version, is_active)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!organizationId,
  });

  // Real-time subscription for device updates
  useEffect(() => {
    if (!organizationId) return;

    const channelName = `devices-hook-${organizationId.slice(0, 8)}`;
    let debounceTimeout: NodeJS.Timeout;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            refetch();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [organizationId, refetch]);

  const createDevice = useMutation({
    mutationFn: async (device: Partial<Device>) => {
      // Server-side duplicate IMEI check
      const { data: existingImei } = await supabase
        .from("devices")
        .select("id, imei")
        .eq("organization_id", organizationId!)
        .eq("imei", device.imei!)
        .maybeSingle();

      if (existingImei) {
        throw new Error(`A device with IMEI ${device.imei} already exists`);
      }

      // Server-side duplicate SIM phone number check
      if (device.sim_msisdn) {
        const { data: existingPhone } = await supabase
          .from("devices")
          .select("id, sim_msisdn")
          .eq("organization_id", organizationId!)
          .eq("sim_msisdn", device.sim_msisdn)
          .maybeSingle();

        if (existingPhone) {
          throw new Error(`A device with phone number ${device.sim_msisdn} already exists`);
        }
      }

      // If assigning a vehicle, unassign it from any other device first
      if (device.vehicle_id) {
        await supabase
          .from("devices")
          .update({ vehicle_id: null })
          .eq("organization_id", organizationId!)
          .eq("vehicle_id", device.vehicle_id);
      }

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
      // Server-side duplicate IMEI check (if IMEI is being changed)
      if (device.imei) {
        const { data: existingImei } = await supabase
          .from("devices")
          .select("id, imei")
          .eq("organization_id", organizationId!)
          .eq("imei", device.imei)
          .neq("id", id)
          .maybeSingle();

        if (existingImei) {
          throw new Error(`A device with IMEI ${device.imei} already exists`);
        }
      }

      // Server-side duplicate SIM phone number check
      if (device.sim_msisdn) {
        const { data: existingPhone } = await supabase
          .from("devices")
          .select("id, sim_msisdn")
          .eq("organization_id", organizationId!)
          .eq("sim_msisdn", device.sim_msisdn)
          .neq("id", id)
          .maybeSingle();

        if (existingPhone) {
          throw new Error(`A device with phone number ${device.sim_msisdn} already exists`);
        }
      }

      // If assigning a vehicle, unassign it from any other device first
      if (device.vehicle_id) {
        await supabase
          .from("devices")
          .update({ vehicle_id: null })
          .eq("organization_id", organizationId!)
          .eq("vehicle_id", device.vehicle_id)
          .neq("id", id);
      }

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

  // Test connectivity only - does NOT update device status or create fake data
  const testHeartbeat = useMutation({
    mutationFn: async (deviceId: string) => {
      // Get device info to verify it exists
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("imei, vehicle_id, last_heartbeat")
        .eq("id", deviceId)
        .single();

      if (deviceError) throw deviceError;
      
      // Return device info for display - NO database updates
      return {
        imei: device.imei,
        hasVehicle: !!device.vehicle_id,
        lastRealHeartbeat: device.last_heartbeat,
      };
    },
    onSuccess: (result) => {
      const lastSeen = result.lastRealHeartbeat 
        ? new Date(result.lastRealHeartbeat).toLocaleString()
        : 'Never';
      
      toast({
        title: "Device Status Check",
        description: `IMEI: ${result.imei} | Last real heartbeat: ${lastSeen} | ${result.hasVehicle ? 'Assigned to vehicle' : 'No vehicle assigned'}`,
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

  // Test endpoint connectivity only - uses dry_run flag to prevent database writes
  const testEndpoint = useMutation({
    mutationFn: async (device: { id: string; imei: string; vehicle_id?: string }): Promise<TestEndpointResult> => {
      const startTime = Date.now();
      
      // Test data with dry_run flag - NO database writes
      const testData = {
        imei: device.imei,
        lat: 9.0214,
        lng: 38.7624,
        speed: 0,
        dry_run: true, // Prevents any database writes
      };

      try {
        const response = await supabase.functions.invoke('gps-data-receiver', {
          body: testData,
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (response.error) {
          return {
            success: false,
            status: 500,
            responseTime,
            response: response.error,
            request: testData,
          };
        }

        return {
          success: true,
          status: 200,
          responseTime,
          response: response.data,
          request: testData,
        };
      } catch (error: any) {
        const endTime = Date.now();
        return {
          success: false,
          status: error.status || 500,
          responseTime: endTime - startTime,
          response: { error: error.message },
          request: testData,
        };
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Endpoint Reachable",
          description: `Connection test passed (${result.responseTime}ms). No data was written.`,
        });
      } else {
        toast({
          title: "Endpoint Test Failed",
          description: result.response?.error || "Unknown error",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate authentication token for a device
  const generateAuthToken = useMutation({
    mutationFn: async (deviceId: string) => {
      // Generate a secure random token
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      const { data, error } = await supabase
        .from("devices")
        .update({
          auth_token: token,
          auth_token_created_at: new Date().toISOString(),
        })
        .eq("id", deviceId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, auth_token: token }; // Return the plain token for display
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Token Generated",
        description: "Device authentication token has been created. Copy it now - it won't be shown again.",
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

  // Revoke authentication token for a device
  const revokeAuthToken = useMutation({
    mutationFn: async (deviceId: string) => {
      const { data, error } = await supabase
        .from("devices")
        .update({
          auth_token: null,
          auth_token_created_at: null,
        })
        .eq("id", deviceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Token Revoked",
        description: "Device authentication token has been revoked.",
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
    testEndpoint,
    generateAuthToken,
    revokeAuthToken,
    refetch,
  };
};
