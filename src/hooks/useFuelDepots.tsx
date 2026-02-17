import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface FuelDepot {
  id: string;
  organization_id: string;
  name: string;
  location_name?: string;
  lat?: number;
  lng?: number;
  fuel_type: string;
  capacity_liters: number;
  current_stock_liters: number;
  min_stock_threshold?: number;
  is_active?: boolean;
  geofence_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FuelDepotDispensing {
  id: string;
  organization_id: string;
  depot_id: string;
  vehicle_id?: string;
  driver_id?: string;
  dispensed_at: string;
  liters_dispensed: number;
  odometer_km?: number;
  pump_number?: string;
  authorization_code?: string;
  attendant_id?: string;
  stock_before_liters?: number;
  stock_after_liters?: number;
  notes?: string;
  created_at: string;
}

export const useFuelDepots = () => {
  const { organizationId } = useOrganization();
  const [depots, setDepots] = useState<FuelDepot[]>([]);
  const [dispensingLogs, setDispensingLogs] = useState<FuelDepotDispensing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const depotsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dispensingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchDepots = useCallback(async () => {
    if (!organizationId) {
      setDepots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("fuel_depots")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");

      if (error) throw error;
      if (isMountedRef.current) {
        setDepots((data as FuelDepot[]) || []);
      }
    } catch (err: any) {
      console.error("Error fetching fuel depots:", err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organizationId]);

  const fetchDispensingLogs = useCallback(async (depotId?: string) => {
    if (!organizationId) return;

    try {
      let query = supabase
        .from("fuel_depot_dispensing")
        .select("*")
        .eq("organization_id", organizationId);

      if (depotId) {
        query = query.eq("depot_id", depotId);
      }

      const { data, error } = await query
        .order("dispensed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      if (isMountedRef.current) {
        setDispensingLogs((data as FuelDepotDispensing[]) || []);
      }
    } catch (err: any) {
      console.error("Error fetching dispensing logs:", err);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchDepots();
    fetchDispensingLogs();

    if (!organizationId) return;

    // Subscribe to realtime changes with debounce
    const depotsChannelName = `fuel-depots-${organizationId.slice(0, 8)}`;
    const dispensingChannelName = `fuel-dispensing-${organizationId.slice(0, 8)}`;
    
    const depotsChannel = supabase
      .channel(depotsChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fuel_depots',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          if (depotsDebounceRef.current) {
            clearTimeout(depotsDebounceRef.current);
          }
          depotsDebounceRef.current = setTimeout(() => {
            fetchDepots();
          }, 500);
        }
      )
      .subscribe();

    const dispensingChannel = supabase
      .channel(dispensingChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fuel_depot_dispensing',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          if (dispensingDebounceRef.current) {
            clearTimeout(dispensingDebounceRef.current);
          }
          dispensingDebounceRef.current = setTimeout(() => {
            fetchDispensingLogs();
          }, 500);
        }
      )
      .subscribe();

    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (depotsDebounceRef.current) {
        clearTimeout(depotsDebounceRef.current);
      }
      if (dispensingDebounceRef.current) {
        clearTimeout(dispensingDebounceRef.current);
      }
      supabase.removeChannel(depotsChannel);
      supabase.removeChannel(dispensingChannel);
    };
  }, [organizationId, fetchDepots, fetchDispensingLogs]);

  const lastDepotCreateRef = useRef<number>(0);

  const createDepot = async (depot: Omit<FuelDepot, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) return null;

    // Finding #7: Prevent batch fuel depot creation
    const now = Date.now();
    if (now - lastDepotCreateRef.current < 5000) {
      toast({ title: "Please Wait", description: "You can add a depot every 5 seconds.", variant: "destructive" });
      return null;
    }
    lastDepotCreateRef.current = now;

    // Reject null/empty payload
    if (!depot.name?.trim()) {
      toast({ title: "Validation Error", description: "Depot name is required.", variant: "destructive" });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("fuel_depots")
        .insert({
          ...depot,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Depot created", description: "Fuel depot added successfully" });
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const updateDepot = async (id: string, updates: Partial<FuelDepot>) => {
    try {
      const { error } = await supabase
        .from("fuel_depots")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Depot updated", description: "Fuel depot updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteDepot = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fuel_depots")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Depot deleted", description: "Fuel depot removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const recordDispensing = async (dispensing: Omit<FuelDepotDispensing, 'id' | 'organization_id' | 'created_at'>) => {
    if (!organizationId) return null;

    try {
      // Get current stock
      const depot = depots.find(d => d.id === dispensing.depot_id);
      const stockBefore = depot?.current_stock_liters || 0;
      const stockAfter = stockBefore - dispensing.liters_dispensed;

      const { data, error } = await supabase
        .from("fuel_depot_dispensing")
        .insert({
          ...dispensing,
          organization_id: organizationId,
          stock_before_liters: stockBefore,
          stock_after_liters: stockAfter,
        })
        .select()
        .single();

      if (error) throw error;

      // Update depot stock
      await supabase
        .from("fuel_depots")
        .update({ current_stock_liters: stockAfter })
        .eq("id", dispensing.depot_id);

      toast({ title: "Fuel dispensed", description: `${dispensing.liters_dispensed}L recorded` });
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const receiveFuel = async (depotId: string, litersReceived: number, notes?: string) => {
    try {
      const depot = depots.find(d => d.id === depotId);
      if (!depot) throw new Error("Depot not found");

      const newStock = depot.current_stock_liters + litersReceived;

      const { error } = await supabase
        .from("fuel_depots")
        .update({ current_stock_liters: newStock })
        .eq("id", depotId);

      if (error) throw error;
      toast({ title: "Fuel received", description: `${litersReceived}L added to ${depot.name}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateDepotStock = async (depotId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from("fuel_depots")
        .update({ current_stock_liters: newStock })
        .eq("id", depotId);

      if (error) throw error;
      toast({ title: "Stock updated", description: "Depot stock level updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return {
    depots,
    dispensingLogs,
    loading,
    error,
    createDepot,
    updateDepot,
    deleteDepot,
    recordDispensing,
    receiveFuel,
    updateDepotStock,
    refetch: fetchDepots,
    refetchDispensing: fetchDispensingLogs,
  };
};
