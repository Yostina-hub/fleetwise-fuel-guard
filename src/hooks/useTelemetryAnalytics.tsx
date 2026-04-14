import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface TelemetryAnalyticsParams {
  action: "aggregates" | "events" | "summary" | "cron-status";
  granularity?: "hourly" | "daily";
  vehicleId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  limit?: number;
  enabled?: boolean;
}

export interface VehicleTelemetrySummary {
  vehicle_id: string;
  total_days: number;
  total_events: number;
  avg_speed: number;
  max_speed: number;
  avg_fuel: number;
  total_distance_km: number;
  total_alarms: number;
}

/**
 * Hook that calls the telemetry-analytics edge function.
 * Provides a unified API for aggregates, raw events, vehicle summaries,
 * and cron job status — all org-scoped via JWT.
 */
export function useTelemetryAnalytics(params: TelemetryAnalyticsParams) {
  const { organizationId } = useOrganization();
  const {
    action,
    granularity = "hourly",
    vehicleId,
    eventType,
    from,
    to,
    limit = 200,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: [
      "telemetry-analytics",
      action,
      organizationId,
      granularity,
      vehicleId,
      eventType,
      from,
      to,
      limit,
    ],
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const queryParams = new URLSearchParams({ action });
      if (granularity) queryParams.set("granularity", granularity);
      if (vehicleId) queryParams.set("vehicle_id", vehicleId);
      if (eventType) queryParams.set("event_type", eventType);
      if (from) queryParams.set("from", from);
      if (to) queryParams.set("to", to);
      if (limit) queryParams.set("limit", String(limit));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/telemetry-analytics?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    enabled: !!organizationId && enabled,
    staleTime: action === "aggregates" ? 60_000 : 30_000,
    refetchInterval: action === "aggregates" ? 300_000 : undefined,
  });
}

/**
 * Convenience hook for vehicle telemetry summary (30-day overview)
 */
export function useVehicleTelemetrySummary(vehicleId: string | undefined) {
  return useTelemetryAnalytics({
    action: "summary",
    vehicleId,
    enabled: !!vehicleId,
  });
}

/**
 * Convenience hook for hourly/daily aggregates via edge function
 */
export function useTelemetryAggregatesViaEdge(options: {
  granularity?: "hourly" | "daily";
  vehicleId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  limit?: number;
  enabled?: boolean;
}) {
  return useTelemetryAnalytics({
    action: "aggregates",
    ...options,
  });
}

/**
 * Convenience hook for cron job execution status
 */
export function useCronJobStatus(enabled = true) {
  return useTelemetryAnalytics({
    action: "cron-status",
    enabled,
  });
}
