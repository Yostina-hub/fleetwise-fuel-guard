import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "./useOrganization";

export interface DeviceTerminalSettings {
  id: string;
  organization_id: string;
  device_id: string;
  // Device Configuration
  timezone: string;
  sms_password: string;
  auth_number: string | null;
  // Fuel & Mileage
  tank_volume: number;
  oil_calibration: number;
  initial_mileage: number;
  unit_system: string;
  // Alerts & Sensitivity
  acc_notify_on: boolean;
  acc_notify_off: boolean;
  turning_angle: number;
  alarm_send_times: number;
  sensitivity: number;
  // Connectivity & System
  speaker_enabled: boolean;
  bluetooth_enabled: boolean;
  // Alarm Settings
  alarm_sos: boolean;
  alarm_vibration: boolean;
  alarm_power_cut: boolean;
  alarm_low_battery: boolean;
  alarm_overspeed: boolean;
  alarm_geofence: boolean;
  // Driving Behavior Thresholds
  harsh_braking_threshold: number;
  harsh_acceleration_threshold: number;
  sharp_turn_threshold: number;
  idling_threshold: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_TERMINAL_SETTINGS: Omit<DeviceTerminalSettings, 'id' | 'organization_id' | 'device_id' | 'created_at' | 'updated_at'> = {
  timezone: 'E03',
  sms_password: '123456',
  auth_number: null,
  tank_volume: 60,
  oil_calibration: 100,
  initial_mileage: 0,
  unit_system: 'metric',
  acc_notify_on: true,
  acc_notify_off: true,
  turning_angle: 30,
  alarm_send_times: 3,
  sensitivity: 5,
  speaker_enabled: true,
  bluetooth_enabled: true,
  alarm_sos: true,
  alarm_vibration: true,
  alarm_power_cut: true,
  alarm_low_battery: true,
  alarm_overspeed: false,
  alarm_geofence: true,
  harsh_braking_threshold: 50,
  harsh_acceleration_threshold: 50,
  sharp_turn_threshold: 50,
  idling_threshold: 50,
};

export const useDeviceTerminalSettings = (deviceId?: string) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["device-terminal-settings", deviceId],
    queryFn: async () => {
      if (!deviceId || !organizationId) return null;

      const { data, error } = await supabase
        .from("device_terminal_settings")
        .select("*")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (error) throw error;
      return data as DeviceTerminalSettings | null;
    },
    enabled: !!deviceId && !!organizationId,
  });

  const saveSettings = useMutation({
    mutationFn: async (newSettings: Partial<Omit<DeviceTerminalSettings, 'id' | 'organization_id' | 'device_id' | 'created_at' | 'updated_at'>>) => {
      if (!deviceId || !organizationId) throw new Error("Device or organization not found");

      // Check if settings exist
      const { data: existing } = await supabase
        .from("device_terminal_settings")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("device_terminal_settings")
          .update(newSettings)
          .eq("device_id", deviceId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("device_terminal_settings")
          .insert({
            device_id: deviceId,
            organization_id: organizationId,
            ...newSettings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-terminal-settings", deviceId] });
      toast({
        title: "Settings Saved",
        description: "Terminal settings have been persisted to the database",
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

  // Merge saved settings with defaults
  const mergedSettings: typeof DEFAULT_TERMINAL_SETTINGS = {
    ...DEFAULT_TERMINAL_SETTINGS,
    ...(settings ? {
      timezone: settings.timezone,
      sms_password: settings.sms_password,
      auth_number: settings.auth_number,
      tank_volume: settings.tank_volume,
      oil_calibration: settings.oil_calibration,
      initial_mileage: settings.initial_mileage,
      unit_system: settings.unit_system,
      acc_notify_on: settings.acc_notify_on,
      acc_notify_off: settings.acc_notify_off,
      turning_angle: settings.turning_angle,
      alarm_send_times: settings.alarm_send_times,
      sensitivity: settings.sensitivity,
      speaker_enabled: settings.speaker_enabled,
      bluetooth_enabled: settings.bluetooth_enabled,
      alarm_sos: settings.alarm_sos,
      alarm_vibration: settings.alarm_vibration,
      alarm_power_cut: settings.alarm_power_cut,
      alarm_low_battery: settings.alarm_low_battery,
      alarm_overspeed: settings.alarm_overspeed,
      alarm_geofence: settings.alarm_geofence,
      harsh_braking_threshold: settings.harsh_braking_threshold,
      harsh_acceleration_threshold: settings.harsh_acceleration_threshold,
      sharp_turn_threshold: settings.sharp_turn_threshold,
      idling_threshold: settings.idling_threshold,
    } : {}),
  };

  return {
    settings: mergedSettings,
    rawSettings: settings,
    isLoading,
    saveSettings,
  };
};
