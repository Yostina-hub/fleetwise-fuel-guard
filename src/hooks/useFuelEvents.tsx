import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface FuelEvent {
  id: string;
  organization_id: string;
  vehicle_id: string;
  trip_id?: string;
  event_type: 'refuel' | 'theft' | 'leak' | 'drain';
  event_time: string;
  fuel_before_liters?: number;
  fuel_after_liters?: number;
  fuel_change_liters: number;
  fuel_change_percent: number;
  lat?: number;
  lng?: number;
  location_name?: string;
  speed_kmh?: number;
  ignition_status?: boolean;
  confidence_score?: number;
  status: 'pending' | 'confirmed' | 'false_positive' | 'investigating';
  investigated_at?: string;
  investigated_by?: string;
  investigation_notes?: string;
  created_at: string;
  updated_at: string;
}

export const useFuelEvents = (filters?: { 
  vehicleId?: string;
  eventType?: string;
  status?: string;
}) => {
  const { organizationId } = useOrganization();
  const [fuelEvents, setFuelEvents] = useState<FuelEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setFuelEvents([]);
      setLoading(false);
      return;
    }

    const fetchFuelEvents = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("fuel_events")
          .select("*")
          .eq("organization_id", organizationId);

        if (filters?.vehicleId) {
          query = query.eq("vehicle_id", filters.vehicleId);
        }
        if (filters?.eventType && filters.eventType !== 'all') {
          query = query.eq("event_type", filters.eventType);
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq("status", filters.status);
        }

        const { data, error } = await query.order("event_time", { ascending: false }).limit(100);

        if (error) throw error;
        setFuelEvents((data as any) || []);
      } catch (err: any) {
        console.error("Error fetching fuel events:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFuelEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('fuel-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fuel_events',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchFuelEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.vehicleId, filters?.eventType, filters?.status]);

  return {
    fuelEvents,
    loading,
    error
  };
};
