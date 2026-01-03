import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface RawTelemetryRecord {
  id: string;
  organization_id: string;
  device_id?: string;
  protocol?: string;
  raw_hex?: string;
  parsed_payload?: Record<string, any>;
  processing_status?: 'pending' | 'processed' | 'failed';
  processing_error?: string;
  source_ip?: string;
  received_at: string;
  processed_at?: string;
  created_at: string;
  // Joined data
  devices?: { imei: string; tracker_model: string };
}

interface UseRawTelemetryOptions {
  deviceId?: string;
  protocol?: string;
  status?: string;
  limit?: number;
}

export const useRawTelemetry = (options: UseRawTelemetryOptions = {}) => {
  const { organizationId } = useOrganization();
  const { deviceId, protocol, status, limit = 50 } = options;

  const { data: telemetry, isLoading, refetch } = useQuery({
    queryKey: ["raw-telemetry", organizationId, deviceId, protocol, status, limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from("telemetry_raw")
        .select(`
          *,
          devices(imei, tracker_model)
        `)
        .eq("organization_id", organizationId)
        .order("received_at", { ascending: false })
        .limit(limit);

      if (deviceId) {
        query = query.eq("device_id", deviceId);
      }

      if (protocol) {
        query = query.eq("protocol", protocol);
      }

      if (status) {
        query = query.eq("processing_status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RawTelemetryRecord[];
    },
    enabled: !!organizationId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return {
    telemetry,
    isLoading,
    refetch,
  };
};
