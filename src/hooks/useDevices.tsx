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
  created_at: string;
  updated_at: string;
}

export interface TestEndpointResult {
  success: boolean;
  status: number;
  responseTime: number;
  response: any;
  request: {
    imei: string;
    lat: number;
    lng: number;
    speed: number;
    fuel: number;
    ignition: string;
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
          vehicles(plate_number, make, model)
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
      const { data: existing } = await supabase
        .from("devices")
        .select("id, imei")
        .eq("organization_id", organizationId!)
        .eq("imei", device.imei!)
        .maybeSingle();

      if (existing) {
        throw new Error(`A device with IMEI ${device.imei} already exists`);
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
        const { data: existing } = await supabase
          .from("devices")
          .select("id, imei")
          .eq("organization_id", organizationId!)
          .eq("imei", device.imei)
          .neq("id", id)
          .maybeSingle();

        if (existing) {
          throw new Error(`A device with IMEI ${device.imei} already exists`);
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

  const testHeartbeat = useMutation({
    mutationFn: async (deviceId: string) => {
      // Get device info
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("vehicle_id, organization_id")
        .eq("id", deviceId)
        .single();

      if (deviceError) throw deviceError;
      
      // Update heartbeat regardless of vehicle assignment
      const { error: heartbeatError } = await supabase
        .from("devices")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("id", deviceId);

      if (heartbeatError) throw heartbeatError;

      // Only insert telemetry if assigned to a vehicle
      if (device?.vehicle_id) {
        const { error: telemetryError } = await supabase
          .from("vehicle_telemetry")
          .insert({
            vehicle_id: device.vehicle_id,
            organization_id: device.organization_id,
            latitude: 9.0214 + (Math.random() - 0.5) * 0.01,
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
      }
    },
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-telemetry"] });
      
      // Check if device was assigned to a vehicle
      const device = devices?.find(d => d.id === deviceId);
      if (device?.vehicle_id) {
        toast({
          title: "Test successful",
          description: "Device heartbeat and telemetry data sent",
        });
      } else {
        toast({
          title: "Heartbeat updated",
          description: "Device heartbeat sent. Assign to a vehicle to send telemetry data.",
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

  // Test the actual GPS data receiver endpoint
  const testEndpoint = useMutation({
    mutationFn: async (device: { id: string; imei: string; vehicle_id?: string }): Promise<TestEndpointResult> => {
      const startTime = Date.now();
      
      // Generate test GPS data
      const testData = {
        imei: device.imei,
        lat: 9.0214 + (Math.random() - 0.5) * 0.01,
        lng: 38.7624 + (Math.random() - 0.5) * 0.01,
        speed: Math.floor(Math.random() * 80),
        fuel: Math.floor(50 + Math.random() * 50),
        ignition: '1',
        heading: Math.floor(Math.random() * 360),
        satellites: 8 + Math.floor(Math.random() * 4),
        signal_strength: 70 + Math.floor(Math.random() * 30),
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
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-telemetry"] });
      
      if (result.success) {
        toast({
          title: "Endpoint Test Successful",
          description: `Response received in ${result.responseTime}ms`,
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

  return {
    devices,
    isLoading,
    createDevice,
    updateDevice,
    deleteDevice,
    testHeartbeat,
    testEndpoint,
    refetch,
  };
};
