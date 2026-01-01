import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

interface DriverStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  avgScore: number;
}

export const useDriverStats = () => {
  const { organizationId } = useOrganization();
  const [stats, setStats] = useState<DriverStats>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    avgScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!organizationId) {
      setStats({ total: 0, active: 0, inactive: 0, suspended: 0, avgScore: 0 });
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        if (isFirstLoad.current) {
          setLoading(true);
        }

        // Fetch all counts and average in parallel
        const [totalResult, activeResult, inactiveResult, suspendedResult, avgResult] = await Promise.all([
          supabase
            .from("drivers")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId),
          supabase
            .from("drivers")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("status", "active"),
          supabase
            .from("drivers")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("status", "inactive"),
          supabase
            .from("drivers")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("status", "suspended"),
          supabase
            .from("drivers")
            .select("safety_score")
            .eq("organization_id", organizationId)
            .not("safety_score", "is", null),
        ]);

        // Calculate average score
        let avgScore = 0;
        if (avgResult.data && avgResult.data.length > 0) {
          const sum = avgResult.data.reduce((acc, d) => acc + (d.safety_score || 0), 0);
          avgScore = Math.round(sum / avgResult.data.length);
        }

        setStats({
          total: totalResult.count || 0,
          active: activeResult.count || 0,
          inactive: inactiveResult.count || 0,
          suspended: suspendedResult.count || 0,
          avgScore,
        });
        isFirstLoad.current = false;
      } catch (err: any) {
        console.error("Error fetching driver stats:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Real-time subscription with debouncing
    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel(`driver-stats-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchStats, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return {
    stats,
    loading,
    error
  };
};
