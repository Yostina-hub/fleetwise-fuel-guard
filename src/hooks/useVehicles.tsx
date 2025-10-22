import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface Vehicle {
  id: string;
  organization_id: string;
  license_plate: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  fuel_type?: string;
  fuel_capacity_liters?: number;
  tank_count?: number;
  odometer_km?: number;
  status: 'active' | 'maintenance' | 'inactive';
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
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("organization_id", organizationId)
          .order("license_plate", { ascending: true });

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

    // Subscribe to realtime changes
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
          fetchVehicles();
        }
      )
      .subscribe();

    return () => {
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
