import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface Vehicle {
  id: string;
  organization_id: string;
  depot_id?: string;
  vin?: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  fuel_type?: string;
  tank_capacity_liters?: number;
  odometer_km?: number;
  engine_hours?: number;
  ownership_type?: string;
  acquisition_date?: string;
  acquisition_cost?: number;
  depreciation_rate?: number;
  status: 'active' | 'maintenance' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  current_fuel?: number;
  current_speed?: number;
  current_location?: { lat: number; lng: number };
  current_driver?: any;
}

export const useVehicles = () => {
  const { organizationId } = useOrganization();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const fetchVehicles = async () => {
      try {
        setLoading(true);
        // Use explicit limit to handle large fleets (up to 5000 vehicles)
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (error) throw error;
        setVehicles((data as any) || []);
      } catch (err: any) {
        console.error("Error fetching vehicles:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();

    // Subscribe to realtime changes with debouncing
    let debounceTimer: NodeJS.Timeout;
    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          // Debounce to prevent rapid refetches
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchVehicles();
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return {
    vehicles,
    loading,
    error,
    refetch: () => {
      if (organizationId) {
        setLoading(true);
        supabase
          .from("vehicles")
          .select("*")
          .eq("organization_id", organizationId)
          .then(({ data }) => {
            setVehicles((data as any) || []);
            setLoading(false);
          });
      }
    }
  };
};
