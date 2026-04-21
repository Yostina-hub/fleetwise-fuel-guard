import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface PassengerFeedbackEntry {
  id: string;
  rated_at: string | null;
  driver_rating: number | null;
  vehicle_rating: number | null;
  punctuality_rating: number | null;
  requester_rating: number | null;
  rating_comment: string | null;
  requester_feedback: string | null;
  requester_name: string | null;
  purpose: string | null;
  end_time: string | null;
  driver_id: string | null;
}

export interface PassengerFeedbackAggregate {
  totalRated: number;
  totalCompleted: number;
  responseRate: number;
  avgDriver: number | null;
  avgVehicle: number | null;
  avgPunctuality: number | null;
  avgOverall: number | null;
  avgDriver30d: number | null;
  avgDriver90d: number | null;
  avgVehicle90d: number | null;
  avgPunctuality90d: number | null;
  recent: PassengerFeedbackEntry[];
  trend30d: { date: string; score: number }[];
}

const safeAvg = (nums: number[]) =>
  nums.length === 0 ? null : Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;

const buildAggregate = (rows: PassengerFeedbackEntry[]): PassengerFeedbackAggregate => {
  const rated = rows.filter(r => r.rated_at && r.driver_rating != null);
  const now = Date.now();
  const d30 = now - 30 * 24 * 60 * 60 * 1000;
  const d90 = now - 90 * 24 * 60 * 60 * 1000;

  const within = (r: PassengerFeedbackEntry, since: number) =>
    r.rated_at && new Date(r.rated_at).getTime() >= since;

  const drv = rated.map(r => r.driver_rating!).filter(Boolean);
  const veh = rated.map(r => r.vehicle_rating!).filter(Boolean);
  const pun = rated.map(r => r.punctuality_rating!).filter(Boolean);

  // 30d trend buckets (per day)
  const trendMap: Record<string, number[]> = {};
  rated.filter(r => within(r, d30)).forEach(r => {
    const day = new Date(r.rated_at!).toISOString().slice(0, 10);
    (trendMap[day] = trendMap[day] || []).push(r.driver_rating!);
  });
  const trend30d = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, score: safeAvg(vals) || 0 }));

  return {
    totalRated: rated.length,
    totalCompleted: rows.length,
    responseRate: rows.length === 0 ? 0 : Math.round((rated.length / rows.length) * 100),
    avgDriver: safeAvg(drv),
    avgVehicle: safeAvg(veh),
    avgPunctuality: safeAvg(pun),
    avgOverall: safeAvg([...drv, ...veh, ...pun]),
    avgDriver30d: safeAvg(rated.filter(r => within(r, d30)).map(r => r.driver_rating!)),
    avgDriver90d: safeAvg(rated.filter(r => within(r, d90)).map(r => r.driver_rating!)),
    avgVehicle90d: safeAvg(rated.filter(r => within(r, d90)).map(r => r.vehicle_rating!)),
    avgPunctuality90d: safeAvg(rated.filter(r => within(r, d90)).map(r => r.punctuality_rating!)),
    recent: rated.slice(0, 25),
    trend30d,
  };
};

/**
 * Fetch passenger ratings (from vehicle_requests) for a single driver.
 */
export const useDriverPassengerFeedback = (driverId: string | null | undefined) => {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["driver-passenger-feedback", organizationId, driverId],
    queryFn: async () => {
      if (!organizationId || !driverId) return null;
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, rated_at, driver_rating, vehicle_rating, punctuality_rating, requester_rating, rating_comment, requester_feedback, requester_name, purpose, end_time, driver_id, status"
        )
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .in("status", ["completed", "closed"])
        .order("rated_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return buildAggregate((data || []) as PassengerFeedbackEntry[]);
    },
    enabled: !!organizationId && !!driverId,
    staleTime: 60_000,
  });
};

/**
 * Fleet-wide passenger feedback indexed by driver_id (used to flag low-rated drivers).
 */
export const useFleetPassengerFeedback = () => {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["fleet-passenger-feedback", organizationId],
    queryFn: async () => {
      if (!organizationId) return {} as Record<string, PassengerFeedbackAggregate>;
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, rated_at, driver_rating, vehicle_rating, punctuality_rating, requester_rating, rating_comment, requester_feedback, requester_name, purpose, end_time, driver_id, status"
        )
        .eq("organization_id", organizationId)
        .in("status", ["completed", "closed"])
        .not("driver_id", "is", null)
        .gte("end_time", since)
        .limit(2000);
      if (error) throw error;

      const grouped: Record<string, PassengerFeedbackEntry[]> = {};
      ((data || []) as PassengerFeedbackEntry[]).forEach(r => {
        if (!r.driver_id) return;
        (grouped[r.driver_id] = grouped[r.driver_id] || []).push(r);
      });
      const out: Record<string, PassengerFeedbackAggregate> = {};
      Object.entries(grouped).forEach(([id, rows]) => {
        out[id] = buildAggregate(rows);
      });
      return out;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
};
