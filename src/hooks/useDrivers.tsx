import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface Driver {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  license_number: string;
  license_class?: string;
  license_expiry?: string;
  hire_date?: string;
  employee_id?: string;
  status: 'active' | 'inactive' | 'suspended';
  rfid_tag?: string;
  ibutton_id?: string;
  bluetooth_id?: string;
  user_id?: string;
  avatar_url?: string;
  notes?: string;
  total_trips: number;
  total_distance_km: number;
  safety_score: number;
  created_at: string;
  updated_at: string;
}

export const useDrivers = () => {
  const { organizationId } = useOrganization();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("drivers")
          .select("*")
          .eq("organization_id", organizationId)
          .order("last_name", { ascending: true });

        if (error) throw error;
        setDrivers((data as any) || []);
      } catch (err: any) {
        console.error("Error fetching drivers:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return {
    drivers,
    loading,
    error
  };
};
