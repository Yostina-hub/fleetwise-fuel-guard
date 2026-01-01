import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface FuelConsumptionAlert {
  id: string;
  organization_id: string;
  vehicle_id: string;
  alert_type: 'high_consumption' | 'low_fuel' | 'abnormal_pattern' | 'refuel_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  expected_value?: number;
  actual_value?: number;
  variance_percent?: number;
  trip_id?: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

interface UseFuelAlertsFilters {
  vehicleId?: string;
  alertType?: string;
  isResolved?: boolean;
  severity?: string;
}

export const useFuelConsumptionAlerts = (filters?: UseFuelAlertsFilters) => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FuelConsumptionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      let query = (supabase as any)
        .from("fuel_consumption_alerts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }
      if (filters?.alertType) {
        query = query.eq("alert_type", filters.alertType);
      }
      if (filters?.isResolved !== undefined) {
        query = query.eq("is_resolved", filters.isResolved);
      }
      if (filters?.severity) {
        query = query.eq("severity", filters.severity);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAlerts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchAlerts();
    }
  }, [organizationId, filters?.vehicleId, filters?.alertType, filters?.isResolved, filters?.severity]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel("fuel_consumption_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fuel_consumption_alerts",
        },
        (payload) => {
          const newAlert = payload.new as FuelConsumptionAlert;
          if (newAlert.organization_id === organizationId) {
            setAlerts((prev) => [newAlert, ...prev]);
            
            // Show toast for critical/high alerts
            if (newAlert.severity === 'critical' || newAlert.severity === 'high') {
              toast.error(newAlert.title, {
                description: newAlert.message,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const createAlert = async (
    alert: Omit<FuelConsumptionAlert, 'id' | 'organization_id' | 'created_at' | 'is_acknowledged' | 'is_resolved'>
  ) => {
    if (!organizationId) return null;

    try {
      const { data, error } = await (supabase as any)
        .from("fuel_consumption_alerts")
        .insert({
          ...alert,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      toast.error("Failed to create alert: " + err.message);
      return null;
    }
  };

  const acknowledgeAlert = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from("fuel_consumption_alerts")
        .update({
          is_acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === id
            ? { ...alert, is_acknowledged: true, acknowledged_by: user.id, acknowledged_at: new Date().toISOString() }
            : alert
        )
      );
      toast.success("Alert acknowledged");
    } catch (err: any) {
      toast.error("Failed to acknowledge alert: " + err.message);
    }
  };

  const resolveAlert = async (id: string, notes?: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from("fuel_consumption_alerts")
        .update({
          is_resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq("id", id);

      if (error) throw error;

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === id
            ? {
                ...alert,
                is_resolved: true,
                resolved_by: user.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: notes,
              }
            : alert
        )
      );
      toast.success("Alert resolved");
    } catch (err: any) {
      toast.error("Failed to resolve alert: " + err.message);
    }
  };

  // Get alert statistics
  const getAlertStats = () => {
    const unresolvedAlerts = alerts.filter((a) => !a.is_resolved);
    return {
      total: alerts.length,
      unresolved: unresolvedAlerts.length,
      critical: unresolvedAlerts.filter((a) => a.severity === 'critical').length,
      high: unresolvedAlerts.filter((a) => a.severity === 'high').length,
      medium: unresolvedAlerts.filter((a) => a.severity === 'medium').length,
      low: unresolvedAlerts.filter((a) => a.severity === 'low').length,
    };
  };

  return {
    alerts,
    loading,
    error,
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    getAlertStats,
    refetch: fetchAlerts,
  };
};
