import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface Incident {
  id: string;
  organization_id: string;
  incident_number: string;
  incident_type: 'accident' | 'breakdown' | 'violation' | 'theft' | 'damage' | 'other';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  vehicle_id?: string;
  driver_id?: string;
  incident_time: string;
  location?: string;
  description: string;
  estimated_cost?: number;
  actual_cost?: number;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export const useIncidents = (filters?: { 
  status?: string;
  severity?: string;
  vehicleId?: string;
}) => {
  const { organizationId } = useOrganization();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setIncidents([]);
      setLoading(false);
      return;
    }

    const fetchIncidents = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("incidents")
          .select("*")
          .eq("organization_id", organizationId);

        if (filters?.status && filters.status !== 'all') {
          query = query.eq("status", filters.status);
        }
        if (filters?.severity && filters.severity !== 'all') {
          query = query.eq("severity", filters.severity);
        }
        if (filters?.vehicleId) {
          query = query.eq("vehicle_id", filters.vehicleId);
        }

        const { data, error } = await query.order("incident_time", { ascending: false });

        if (error) throw error;
        setIncidents((data as any) || []);
      } catch (err: any) {
        console.error("Error fetching incidents:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('incidents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.status, filters?.severity, filters?.vehicleId]);

  return {
    incidents,
    loading,
    error
  };
};
