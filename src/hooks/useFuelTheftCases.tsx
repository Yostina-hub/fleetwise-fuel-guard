import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface FuelTheftCase {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id?: string;
  fuel_event_id?: string;
  case_number: string;
  event_type: string;
  detected_at: string;
  fuel_lost_liters: number;
  estimated_value?: number;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  evidence_data?: Record<string, any>;
  status: string;
  priority?: string;
  assigned_to?: string;
  investigation_notes?: string;
  outcome?: string;
  recovery_amount?: number;
  closed_at?: string;
  closed_by?: string;
  created_at: string;
  updated_at: string;
}

export const useFuelTheftCases = (filters?: {
  status?: string;
  priority?: string;
  vehicleId?: string;
}) => {
  const { organizationId } = useOrganization();
  const [cases, setCases] = useState<FuelTheftCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = async () => {
    if (!organizationId) {
      setCases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("fuel_theft_cases")
        .select("*")
        .eq("organization_id", organizationId);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }

      const { data, error } = await query
        .order("detected_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setCases((data as FuelTheftCase[]) || []);
    } catch (err: any) {
      console.error("Error fetching theft cases:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();

    if (!organizationId) return;

    // Subscribe to realtime changes
    const channelName = `fuel-theft-cases-${organizationId.slice(0, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fuel_theft_cases',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.status, filters?.priority, filters?.vehicleId]);

  const createCase = async (caseData: Omit<FuelTheftCase, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) return null;

    try {
      const { data, error } = await supabase
        .from("fuel_theft_cases")
        .insert([{
          case_number: caseData.case_number,
          event_type: caseData.event_type,
          vehicle_id: caseData.vehicle_id,
          driver_id: caseData.driver_id,
          fuel_event_id: caseData.fuel_event_id,
          detected_at: caseData.detected_at,
          fuel_lost_liters: caseData.fuel_lost_liters,
          estimated_value: caseData.estimated_value,
          location_lat: caseData.location_lat,
          location_lng: caseData.location_lng,
          location_name: caseData.location_name,
          status: caseData.status,
          priority: caseData.priority,
          organization_id: organizationId,
        }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Case created", description: "Fuel theft case opened for investigation" });
      fetchCases();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const updateCase = async (id: string, updates: Partial<FuelTheftCase>) => {
    try {
      const { error } = await supabase
        .from("fuel_theft_cases")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Case updated", description: "Investigation details saved" });
      fetchCases();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const closeCase = async (id: string, resolution: 'confirmed' | 'false_positive', notes: string) => {
    try {
      const { error } = await supabase
        .from("fuel_theft_cases")
        .update({
          status: resolution === 'confirmed' ? 'closed' : 'false_positive',
          outcome: resolution,
          investigation_notes: notes,
          closed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Case closed", description: `Case marked as ${resolution}` });
      fetchCases();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return {
    cases,
    loading,
    error,
    createCase,
    updateCase,
    closeCase,
    refetch: fetchCases,
  };
};
