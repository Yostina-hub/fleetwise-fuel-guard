import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

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

export const useAlerts = (filters?: { 
  severity?: string; 
  status?: string;
  vehicleId?: string;
}) => {
  const { organizationId } = useOrganization();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const fetchAlerts = async () => {
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

        const { data, error } = await query.order("alert_time", { ascending: false });

        if (error) throw error;
        setAlerts((data as any) || []);
      } catch (err: any) {
        console.error("Error fetching alerts:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.severity, filters?.status, filters?.vehicleId]);

  return {
    alerts,
    loading,
    error
  };
};
