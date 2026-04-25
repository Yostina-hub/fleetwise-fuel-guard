import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useRegistryRefresh } from "./useRegistryRefresh";

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
  // Emergency contact fields
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  // Medical info
  medical_info?: {
    blood_type?: string;
    allergies?: string;
    medical_conditions?: string;
    medications?: string;
  };
  medical_certificate_expiry?: string;
  driver_type?: string;
  employment_type?: string;
  department?: string;
  outsource_company?: string;
  // Identity & demographics
  middle_name?: string;
  gender?: string;
  date_of_birth?: string;
  national_id?: string;
  national_id_verified?: boolean;
  national_id_url?: string;
  govt_id_type?: string;
  // License extra
  license_type?: string;
  license_issue_date?: string;
  license_verified?: boolean;
  license_front_url?: string;
  license_back_url?: string;
  // Address
  address_region?: string;
  address_zone?: string;
  address_woreda?: string;
  address_specific?: string;
  // Employment extra
  joining_date?: string;
  experience_years?: number;
  route_type?: string;
  assigned_pool?: string;
  // Verification
  verification_status?: string;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  processing_restricted?: boolean;
  processing_restricted_at?: string;
  processing_restricted_reason?: string;
  // Banking
  bank_name?: string;
  bank_account?: string;
  telebirr_account?: string;
  // Misc
  blood_type?: string;
}

export const useDrivers = () => {
  const { organizationId } = useOrganization();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    if (!organizationId) {
      setDrivers([]);
      setLoading(false);
      return;
    }
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
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    fetchDrivers();

    // Subscribe to realtime changes with debouncing
    let debounceTimer: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel(`drivers-all-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchDrivers, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchDrivers]);

  // Refresh instantly when any code invalidates the "drivers" query key
  useRegistryRefresh("drivers", fetchDrivers);

  return {
    drivers,
    loading,
    error,
    refetch: fetchDrivers,
  };
};
