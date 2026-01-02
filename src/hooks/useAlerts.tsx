import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface Alert {
  id: string;
  organization_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  status: 'unacknowledged' | 'acknowledged' | 'resolved';
  vehicle_id?: string;
  driver_id?: string;
  trip_id?: string;
  alert_time: string;
  location_name?: string;
  lat?: number;
  lng?: number;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  alert_data?: any;
  created_at: string;
  updated_at: string;
}

export interface AlertFilters {
  severity?: string;
  status?: string;
  vehicleId?: string;
  alertType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useAlerts = (filters?: AlertFilters) => {
  const { organizationId } = useOrganization();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!organizationId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("alerts")
        .select("*")
        .eq("organization_id", organizationId);

      if (filters?.severity && filters.severity !== 'all') {
        query = query.eq("severity", filters.severity);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }
      if (filters?.alertType && filters.alertType !== 'all') {
        query = query.eq("alert_type", filters.alertType);
      }
      if (filters?.dateFrom) {
        query = query.gte("alert_time", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("alert_time", filters.dateTo);
      }

      const { data, error } = await query.order("alert_time", { ascending: false });

      if (error) throw error;
      setAlerts((data as any) || []);
    } catch (err: any) {
      console.error("Error fetching alerts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters?.severity, filters?.status, filters?.vehicleId, filters?.alertType, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => {
    let isMounted = true;
    
    const doFetch = async () => {
      await fetchAlerts();
    };
    
    if (isMounted) {
      doFetch();
    }

    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`alerts-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchAlerts, 500);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchAlerts]);

  const acknowledgeAlert = async (alertId: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("alerts")
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id,
          resolution_notes: notes || null
        })
        .eq("id", alertId);

      if (error) throw error;
      
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as acknowledged."
      });
      
      await fetchAlerts();
      return true;
    } catch (err: any) {
      console.error("Error acknowledging alert:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("alerts")
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: notes || null
        })
        .eq("id", alertId);

      if (error) throw error;
      
      toast({
        title: "Alert resolved",
        description: "The alert has been marked as resolved."
      });
      
      await fetchAlerts();
      return true;
    } catch (err: any) {
      console.error("Error resolving alert:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const bulkAcknowledge = async (alertIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("alerts")
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id
        })
        .in("id", alertIds);

      if (error) throw error;
      
      toast({
        title: "Alerts acknowledged",
        description: `${alertIds.length} alert(s) have been acknowledged.`
      });
      
      await fetchAlerts();
      return true;
    } catch (err: any) {
      console.error("Error bulk acknowledging alerts:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const bulkResolve = async (alertIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("alerts")
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .in("id", alertIds);

      if (error) throw error;
      
      toast({
        title: "Alerts resolved",
        description: `${alertIds.length} alert(s) have been resolved.`
      });
      
      await fetchAlerts();
      return true;
    } catch (err: any) {
      console.error("Error bulk resolving alerts:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  };

  // Compute stats from actual data
  const stats = {
    critical: alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
    warning: alerts.filter(a => a.severity === 'warning' && a.status !== 'resolved').length,
    info: alerts.filter(a => a.severity === 'info' && a.status !== 'resolved').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    unacknowledged: alerts.filter(a => a.status === 'unacknowledged').length,
    total: alerts.length
  };

  // Get unique alert types for filter
  const alertTypes = [...new Set(alerts.map(a => a.alert_type))];

  return {
    alerts,
    loading,
    error,
    stats,
    alertTypes,
    acknowledgeAlert,
    resolveAlert,
    bulkAcknowledge,
    bulkResolve,
    refetch: fetchAlerts
  };
};