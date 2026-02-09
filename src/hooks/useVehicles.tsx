import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface AssignedDriver {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
}

export interface Depot {
  id: string;
  name: string;
  address?: string;
}

export interface Vehicle {
  id: string;
  organization_id: string;
  depot_id?: string;
  depot?: Depot;
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
  assigned_driver_id?: string;
  assigned_driver?: AssignedDriver;
  vehicle_type?: string;
  // Computed fields
  current_fuel?: number;
  current_speed?: number;
  current_location?: { lat: number; lng: number };
  current_driver?: any;
}

export const useVehicles = (skip = false) => {
  const { organizationId } = useOrganization();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (skip || !organizationId) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let debounceTimer: NodeJS.Timeout;
    let retryTimer: NodeJS.Timeout;

    const fetchVehicles = async (attempt = 0) => {
      try {
        if (isMounted) setLoading(true);
        const { data, error } = await supabase
          .from("vehicles")
          .select(`
            *,
            assigned_driver:drivers!vehicles_assigned_driver_id_fkey(id, first_name, last_name, phone, avatar_url),
            depot:depots!vehicles_depot_id_fkey(id, name, address)
          `)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (error) throw error;
        if (isMounted) {
          setVehicles((data as any) || []);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        console.error(`Error fetching vehicles (attempt ${attempt + 1}):`, err);
        if (isMounted) {
          if (attempt < 4) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.log(`Retrying vehicles fetch in ${delay}ms...`);
            retryTimer = setTimeout(() => fetchVehicles(attempt + 1), delay);
          } else {
            setError(err.message);
            setLoading(false);
          }
        }
      }
    };

    fetchVehicles();

    // Subscribe to realtime changes with debouncing
    const channel = supabase
      .channel(`vehicles-changes-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (isMounted) {
              fetchVehicles();
            }
          }, 500);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      clearTimeout(retryTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, skip]);

  return {
    vehicles,
    loading,
    error,
    refetch: () => {
      if (organizationId) {
        setLoading(true);
        supabase
          .from("vehicles")
          .select(`
            *,
            assigned_driver:drivers!vehicles_assigned_driver_id_fkey(id, first_name, last_name, phone, avatar_url),
            depot:depots!vehicles_depot_id_fkey(id, name, address)
          `)
          .eq("organization_id", organizationId)
          .then(({ data }) => {
            setVehicles((data as any) || []);
            setLoading(false);
          });
      }
    }
  };
};
