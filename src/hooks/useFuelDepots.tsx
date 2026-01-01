import { useEffect, useState } from "react";
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

  const fetchDepots = async () => {
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
      setDepots((data as FuelDepot[]) || []);
    } catch (err: any) {
      console.error("Error fetching fuel depots:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDispensingLogs = async (depotId?: string) => {
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
      setDispensingLogs((data as FuelDepotDispensing[]) || []);
    } catch (err: any) {
      console.error("Error fetching dispensing logs:", err);
    }
  };

  useEffect(() => {
    fetchDepots();
    fetchDispensingLogs();

    if (!organizationId) return;

    // Subscribe to realtime changes
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
          fetchDepots();
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
          fetchDispensingLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(depotsChannel);
      supabase.removeChannel(dispensingChannel);
    };
  }, [organizationId]);

  const createDepot = async (depot: Omit<FuelDepot, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) return null;

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
      fetchDepots();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
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
      fetchDepots();
      fetchDispensingLogs();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
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
      fetchDepots();
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
    recordDispensing,
    updateDepotStock,
    refetch: fetchDepots,
    refetchDispensing: fetchDispensingLogs,
  };
};
