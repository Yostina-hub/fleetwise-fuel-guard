import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

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
  startDate?: string;
  endDate?: string;
}) => {
  const { organizationId } = useOrganization();
  const [fuelEvents, setFuelEvents] = useState<FuelEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFuelEvents = useCallback(async () => {
    if (!organizationId) {
      setFuelEvents([]);
      setLoading(false);
      return;
    }

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
      if (filters?.startDate) {
        query = query.gte("event_time", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("event_time", filters.endDate);
      }

      const { data, error } = await query.order("event_time", { ascending: false }).limit(500);

      if (error) throw error;
      setFuelEvents((data as any) || []);
    } catch (err: any) {
      console.error("Error fetching fuel events:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters?.vehicleId, filters?.eventType, filters?.status, filters?.startDate, filters?.endDate]);

  useEffect(() => {
    fetchFuelEvents();

    if (!organizationId) return;

    // Subscribe to realtime changes with debounce
    const channelName = `fuel-events-${organizationId.slice(0, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fuel_events',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          debounceRef.current = setTimeout(() => {
            fetchFuelEvents();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.vehicleId, filters?.eventType, filters?.status, filters?.startDate, filters?.endDate, fetchFuelEvents]);

  const updateEvent = async (id: string, updates: Partial<FuelEvent>) => {
    try {
      const { error } = await supabase
        .from("fuel_events")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Event updated", description: "Fuel event status updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const markAsInvestigating = async (id: string) => {
    await updateEvent(id, { 
      status: 'investigating',
      investigated_at: new Date().toISOString(),
    });
  };

  const markAsFalsePositive = async (id: string) => {
    await updateEvent(id, { 
      status: 'false_positive',
      investigated_at: new Date().toISOString(),
    });
  };

  return {
    fuelEvents,
    loading,
    error,
    updateEvent,
    markAsInvestigating,
    markAsFalsePositive,
    refetch: fetchFuelEvents,
  };
};
