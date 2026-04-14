import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface TelemetryEvent {
  id: string;
  event_id: string;
  organization_id: string;
  vehicle_id: string | null;
  device_id: string | null;
  event_type: string;
  event_time: string;
  payload: Record<string, any>;
  lat: number | null;
  lng: number | null;
  speed_kmh: number | null;
  heading: number | null;
  source: string;
  created_at: string;
}

interface UseTelemetryEventsOptions {
  vehicleId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for querying the time-series telemetry_events table.
 * Does NOT interfere with existing vehicle_telemetry hooks.
 */
export function useTelemetryEvents(options: UseTelemetryEventsOptions = {}) {
  const { organizationId } = useOrganization();
  const { vehicleId, eventType, from, to, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ["telemetry-events", organizationId, vehicleId, eventType, from, to, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from("telemetry_events")
        .select("*")
        .eq("organization_id", organizationId)
        .order("event_time", { ascending: false })
        .limit(limit);

      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      if (eventType) query = query.eq("event_type", eventType);
      if (from) query = query.gte("event_time", from);
      if (to) query = query.lte("event_time", to);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TelemetryEvent[];
    },
    enabled: !!organizationId && enabled,
    staleTime: 30_000,
  });
}
