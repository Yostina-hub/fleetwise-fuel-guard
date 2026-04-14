import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface TelemetryAggregate {
  organization_id: string;
  vehicle_id: string;
  event_type: string;
  bucket: string;
  event_count: number;
  avg_speed: number | null;
  max_speed: number | null;
  avg_fuel: number | null;
  min_fuel: number | null;
  max_fuel: number | null;
  distance_km: number | null;
  alarm_count: number;
}

type Granularity = "hourly" | "daily";

interface UseTelemetryAggregatesOptions {
  vehicleId?: string;
  eventType?: string;
  granularity?: Granularity;
  from?: string;
  to?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for querying pre-calculated hourly/daily aggregates
 * from materialized views. Lightweight alternative to raw events.
 */
export function useTelemetryAggregates(options: UseTelemetryAggregatesOptions = {}) {
  const { organizationId } = useOrganization();
  const {
    vehicleId,
    eventType,
    granularity = "hourly",
    from,
    to,
    limit = 200,
    enabled = true,
  } = options;

  const viewName = granularity === "daily" ? "telemetry_daily_agg" : "telemetry_hourly_agg";

  return useQuery({
    queryKey: ["telemetry-agg", viewName, organizationId, vehicleId, eventType, from, to, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from(viewName as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("bucket", { ascending: false })
        .limit(limit);

      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      if (eventType) query = query.eq("event_type", eventType);
      if (from) query = query.gte("bucket", from);
      if (to) query = query.lte("bucket", to);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as TelemetryAggregate[];
    },
    enabled: !!organizationId && enabled,
    staleTime: 60_000,
  });
}
