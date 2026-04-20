import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface OwnershipBucket {
  key: string;          // raw value used in DB / filter
  count: number;
}

export interface FleetOwnershipStatsResult {
  total: number;
  buckets: Record<string, number>;
  loading: boolean;
  refetch: () => void;
}

/**
 * Aggregates vehicle counts per `ownership_type` value for the active org.
 * Anything null/empty rolls into the "unspecified" bucket so the UI can still
 * surface those vehicles for triage.
 */
export const useFleetOwnershipStats = (): FleetOwnershipStatsResult => {
  const { organizationId } = useOrganization();
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!organizationId) {
      setBuckets({});
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("ownership_type")
        .eq("organization_id", organizationId);
      if (error) throw error;

      const map: Record<string, number> = {};
      (data ?? []).forEach((row: { ownership_type: string | null }) => {
        const key = (row.ownership_type ?? "").trim().toLowerCase() || "unspecified";
        map[key] = (map[key] ?? 0) + 1;
      });

      setBuckets(map);
      setTotal((data ?? []).length);
    } catch (err) {
      console.error("Error loading ownership stats", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Live updates when vehicles change
  useEffect(() => {
    if (!organizationId) return;
    let debounce: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`fleet-ownership-${organizationId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles", filter: `organization_id=eq.${organizationId}` },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(fetchStats, 500);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchStats]);

  return { total, buckets, loading, refetch: fetchStats };
};
