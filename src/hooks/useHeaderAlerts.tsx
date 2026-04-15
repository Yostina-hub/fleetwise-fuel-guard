import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface RealtimeAlert {
  id: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  alert_type: string;
  alert_time: string;
  vehicle_id?: string;
  lat?: number;
  lng?: number;
}

/**
 * Lightweight hook for the header alert bell.
 * Fetches unresolved alert counts + recent alerts, subscribes to realtime.
 */
export const useHeaderAlerts = () => {
  const { organizationId } = useOrganization();
  const [criticalCount, setCriticalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [infoCount, setInfoCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<RealtimeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCountRef = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (!organizationId) {
      setCriticalCount(0);
      setWarningCount(0);
      setInfoCount(0);
      setRecentAlerts([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch counts in parallel
      const [critRes, warnRes, infoRes, recentRes] = await Promise.all([
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("severity", "critical")
          .neq("status", "resolved"),
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("severity", "warning")
          .neq("status", "resolved"),
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("severity", "info")
          .neq("status", "resolved"),
        supabase
          .from("alerts")
          .select("id, severity, title, message, status, alert_type, alert_time, vehicle_id, lat, lng")
          .eq("organization_id", organizationId)
          .neq("status", "resolved")
          .order("alert_time", { ascending: false })
          .limit(8),
      ]);

      const newCritical = critRes.count || 0;
      const newWarning = warnRes.count || 0;
      const newInfo = infoRes.count || 0;
      const newTotal = newCritical + newWarning + newInfo;

      // Show toast if new alerts arrived
      if (prevCountRef.current > 0 && newTotal > prevCountRef.current) {
        const diff = newTotal - prevCountRef.current;
        toast({
          title: `🚨 ${diff} new alert${diff > 1 ? 's' : ''}`,
          description: "Check your alerts for details.",
          variant: newCritical > (criticalCount) ? "destructive" : "default",
        });
      }
      prevCountRef.current = newTotal;

      setCriticalCount(newCritical);
      setWarningCount(newWarning);
      setInfoCount(newInfo);
      setRecentAlerts((recentRes.data as any) || []);
    } catch (err) {
      console.error("Error fetching header alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCounts();

    if (!organizationId) return;

    let debounce: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`header-alerts-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(fetchCounts, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchCounts]);

  const totalUnresolved = criticalCount + warningCount + infoCount;

  return {
    criticalCount,
    warningCount,
    infoCount,
    totalUnresolved,
    recentAlerts,
    loading,
    refetch: fetchCounts,
  };
};
