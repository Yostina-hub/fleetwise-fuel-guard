import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface AssignedDriver {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
}

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
  assigned_driver_id?: string;
  assigned_driver?: AssignedDriver;
}

interface UseVehiclesPaginatedOptions {
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  vehicleTypeFilter?: string;
  fuelTypeFilter?: string;
  ownershipFilter?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  vehicleIdFilter?: string | null; // Filter to a specific vehicle ID
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
    ownershipFilter = "all",
    sortField = "created_at",
    sortDirection = "desc",
    vehicleIdFilter = null
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

      // Calculate offset
      const offset = (page - 1) * pageSize;

      // Build query with pagination - get count in same query, include assigned driver
      let query = supabase
        .from("vehicles")
        .select("*, assigned_driver:drivers!vehicles_assigned_driver_id_fkey(id, first_name, last_name, phone, avatar_url)", { count: "exact" })
        .eq("organization_id", organizationId)
        .order(sortField, { ascending: sortDirection === "asc" })
        .range(offset, offset + pageSize - 1);

      // If filtering to specific vehicle, bypass other filters
      if (vehicleIdFilter) {
        query = query.eq("id", vehicleIdFilter);
      } else {
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
      }

      const { data, count, error: queryError } = await query;

      if (queryError) throw queryError;

      const totalRecords = count || 0;
      setTotalCount(totalRecords);
      setVehicles((data as Vehicle[]) || []);
      setCurrentPage(page);
      setHasMore(offset + pageSize < totalRecords);
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  }, [organizationId, pageSize, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, searchQuery, sortField, sortDirection, isFirstLoad, vehicleIdFilter]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || vehicleIdFilter) return; // Skip loadMore if filtering to single vehicle
    
    const nextPage = currentPage + 1;
    const offset = (nextPage - 1) * pageSize;

    try {
      setLoading(true);

      let query = supabase
        .from("vehicles")
        .select("*, assigned_driver:drivers!vehicles_assigned_driver_id_fkey(id, first_name, last_name, phone, avatar_url)")
        .eq("organization_id", organizationId)
        .order(sortField, { ascending: sortDirection === "asc" })
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
  }, [organizationId, hasMore, loading, currentPage, pageSize, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, searchQuery, sortField, sortDirection, totalCount, vehicleIdFilter]);

  const refetch = useCallback(async () => {
    await loadPage(1);
  }, [loadPage]);

  // Initial load and reload on filter/sort changes
  useEffect(() => {
    loadPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, searchQuery, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, sortField, sortDirection, vehicleIdFilter]);

  // Subscribe to realtime changes with throttling
  useEffect(() => {
    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel(`vehicles-paginated-${organizationId.slice(0, 8)}`)
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
          }, 500); // 500ms debounce for responsive updates
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
