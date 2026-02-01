import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface ServiceHistory {
  id: string;
  organization_id: string;
  vehicle_id: string;
  work_order_id?: string;
  maintenance_schedule_id?: string;
  inspection_id?: string;
  service_type: string;
  service_category?: string;
  service_date: string;
  odometer_km?: number;
  engine_hours?: number;
  parts_cost?: number;
  labor_cost?: number;
  total_cost?: number;
  vendor_id?: string;
  mechanic_id?: string;
  technician_name?: string;
  description?: string;
  notes?: string;
  warranty_claim?: boolean;
  warranty_amount?: number;
  downtime_hours?: number;
  attachments?: any;
  created_at: string;
  updated_at: string;
  vehicle?: {
    plate_number: string;
    make: string;
    model: string;
  };
}

export const useServiceHistory = (vehicleId?: string) => {
  const { organizationId } = useOrganization();

  const { data: serviceHistory, isLoading, error, refetch } = useQuery({
    queryKey: ['service-history', organizationId, vehicleId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('service_history')
        .select(`
          *,
          vehicle:vehicles(plate_number, make, model)
        `)
        .eq('organization_id', organizationId)
        .order('service_date', { ascending: false });

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as ServiceHistory[];
    },
    enabled: !!organizationId,
  });

  // Calculate summary stats
  const stats = {
    totalServices: serviceHistory?.length || 0,
    totalSpent: serviceHistory?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0,
    avgCostPerService: serviceHistory?.length 
      ? (serviceHistory.reduce((sum, s) => sum + (s.total_cost || 0), 0) / serviceHistory.length)
      : 0,
    vehiclesServiced: new Set(serviceHistory?.map(s => s.vehicle_id)).size,
    warrantyClaimsTotal: serviceHistory?.reduce((sum, s) => sum + (s.warranty_amount || 0), 0) || 0,
  };

  return {
    serviceHistory: serviceHistory || [],
    loading: isLoading,
    error,
    stats,
    refetch,
  };
};
