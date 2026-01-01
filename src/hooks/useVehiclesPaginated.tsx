import { useState, useCallback, useEffect } from "react";
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
  vehicle_type?: string;
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
}

interface UseVehiclesPaginatedOptions {
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  vehicleTypeFilter?: string;
  fuelTypeFilter?: string;
  ownershipFilter?: string;
}

interface UseVehiclesPaginatedReturn {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  loadPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useVehiclesPaginated = (
  options: UseVehiclesPaginatedOptions = {}
): UseVehiclesPaginatedReturn => {
  const { 
    pageSize = 50, 
    searchQuery = "", 
    statusFilter = "all",
    vehicleTypeFilter = "all",
    fuelTypeFilter = "all",
    ownershipFilter = "all"
  } = options;
  const { organizationId } = useOrganization();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false); // Start with false for instant feel
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(totalCount / pageSize);

  const fetchCount = useCallback(async () => {
    if (!organizationId) return 0;

    let query = supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (vehicleTypeFilter !== "all") {
      query = query.eq("vehicle_type", vehicleTypeFilter);
    }

    if (fuelTypeFilter !== "all") {
      query = query.eq("fuel_type", fuelTypeFilter);
    }

    if (ownershipFilter !== "all") {
      query = query.eq("ownership_type", ownershipFilter);
    }

    if (searchQuery) {
      query = query.or(
        `plate_number.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,vin.ilike.%${searchQuery}%`
      );
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }, [organizationId, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, searchQuery]);

  const loadPage = useCallback(async (page: number) => {
    if (!organizationId) {
      setVehicles([]);
      setLoading(false);
      setIsFirstLoad(false);
      return;
    }

    try {
      // Only show loading on first load, otherwise update in background
      if (isFirstLoad) {
        setLoading(true);
      }
      setError(null);

      // Get total count
      const count = await fetchCount();
      setTotalCount(count);

      // Calculate offset
      const offset = (page - 1) * pageSize;

      // Build query with pagination
      let query = supabase
        .from("vehicles")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (vehicleTypeFilter !== "all") {
        query = query.eq("vehicle_type", vehicleTypeFilter);
      }

      if (fuelTypeFilter !== "all") {
        query = query.eq("fuel_type", fuelTypeFilter);
      }

      if (ownershipFilter !== "all") {
        query = query.eq("ownership_type", ownershipFilter);
      }

      if (searchQuery) {
        query = query.or(
          `plate_number.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,vin.ilike.%${searchQuery}%`
        );
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setVehicles((data as Vehicle[]) || []);
      setCurrentPage(page);
      setHasMore(offset + pageSize < count);
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  }, [organizationId, pageSize, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, searchQuery, fetchCount, isFirstLoad]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextPage = currentPage + 1;
    const offset = (nextPage - 1) * pageSize;

    try {
      setLoading(true);

      let query = supabase
        .from("vehicles")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (vehicleTypeFilter !== "all") {
        query = query.eq("vehicle_type", vehicleTypeFilter);
      }

      if (fuelTypeFilter !== "all") {
        query = query.eq("fuel_type", fuelTypeFilter);
      }

      if (ownershipFilter !== "all") {
        query = query.eq("ownership_type", ownershipFilter);
      }

      if (searchQuery) {
        query = query.or(
          `plate_number.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,vin.ilike.%${searchQuery}%`
        );
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setVehicles(prev => [...prev, ...((data as Vehicle[]) || [])]);
      setCurrentPage(nextPage);
      setHasMore(offset + pageSize < totalCount);
    } catch (err: any) {
      console.error("Error loading more vehicles:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, hasMore, loading, currentPage, pageSize, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, searchQuery, totalCount]);

  const refetch = useCallback(async () => {
    await loadPage(1);
  }, [loadPage]);

  // Initial load and reload on filter changes
  useEffect(() => {
    loadPage(1);
  }, [organizationId, searchQuery, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter]);

  // Subscribe to realtime changes with throttling
  useEffect(() => {
    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel('vehicles-paginated-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          // Debounce refetch to prevent too many queries
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            refetch();
          }, 2000); // Wait 2 seconds before refetching
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, refetch]);

  return {
    vehicles,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage,
    totalPages,
    loadPage,
    loadMore,
    refetch,
  };
};
