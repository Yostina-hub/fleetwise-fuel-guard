import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import type { Driver } from "./useDrivers";

interface UseDriversPaginatedOptions {
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
}

interface StatusCounts {
  active: number;
  inactive: number;
  suspended: number;
}

interface UseDriversPaginatedReturn {
  drivers: Driver[];
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  statusCounts: StatusCounts;
  currentPage: number;
  totalPages: number;
  loadPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => void;
}

export const useDriversPaginated = (
  options: UseDriversPaginatedOptions = {}
): UseDriversPaginatedReturn => {
  const { pageSize = 50, searchQuery = "", statusFilter = "all" } = options;
  const { organizationId } = useOrganization();
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ active: 0, inactive: 0, suspended: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  
  const isFirstLoad = useRef(true);

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);

  const fetchStatusCounts = useCallback(async () => {
    if (!organizationId) return { active: 0, inactive: 0, suspended: 0 };
    
    // Fetch counts for each status in parallel
    const [activeResult, inactiveResult, suspendedResult] = await Promise.all([
      supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "inactive"),
      supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "suspended"),
    ]);
    
    return {
      active: activeResult.count || 0,
      inactive: inactiveResult.count || 0,
      suspended: suspendedResult.count || 0,
    };
  }, [organizationId]);

  const fetchCount = useCallback(async () => {
    if (!organizationId) return 0;
    
    let query = supabase
      .from("drivers")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (searchQuery) {
      query = query.or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,license_number.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      );
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }, [organizationId, searchQuery, statusFilter]);

  const loadPage = useCallback(async (page: number) => {
    if (!organizationId) {
      setDrivers([]);
      setLoading(false);
      setInitialLoading(false);
      return;
    }

    try {
      if (isFirstLoad.current) {
        setInitialLoading(true);
      }
      setLoading(true);
      setError(null);

      // Fetch count, status counts, and data in parallel
      const [count, counts, dataResult] = await Promise.all([
        fetchCount(),
        fetchStatusCounts(),
        (async () => {
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;

          let query = supabase
            .from("drivers")
            .select("*")
            .eq("organization_id", organizationId)
            .order("last_name", { ascending: true })
            .range(from, to);

          if (statusFilter && statusFilter !== "all") {
            query = query.eq("status", statusFilter);
          }

          if (searchQuery) {
            query = query.or(
              `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,license_number.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
            );
          }

          return query;
        })(),
      ]);

      if (dataResult.error) throw dataResult.error;

      setTotalCount(count);
      setStatusCounts(counts);
      setDrivers((dataResult.data as Driver[]) || []);
      setCurrentPage(page);
      setHasMore((page - 1) * pageSize + pageSize < count);
      isFirstLoad.current = false;
    } catch (err: any) {
      console.error("Error fetching drivers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [organizationId, pageSize, searchQuery, statusFilter, fetchCount, fetchStatusCounts]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !organizationId) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      const from = (nextPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("drivers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("last_name", { ascending: true })
        .range(from, to);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,license_number.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDrivers(prev => [...prev, ...((data as Driver[]) || [])]);
      setCurrentPage(nextPage);
      setHasMore(from + pageSize < totalCount);
    } catch (err: any) {
      console.error("Error loading more drivers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentPage, pageSize, hasMore, loading, searchQuery, statusFilter, totalCount]);

  const refetch = useCallback(() => {
    isFirstLoad.current = false; // Don't show full loader on refetch
    loadPage(currentPage);
  }, [loadPage, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    isFirstLoad.current = true;
    loadPage(1);
  }, [organizationId, searchQuery, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time subscription
  useEffect(() => {
    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel(`drivers-paginated-${organizationId.slice(0, 8)}`)
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
          debounceTimer = setTimeout(() => {
            isFirstLoad.current = false;
            loadPage(currentPage);
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    drivers,
    loading,
    initialLoading,
    error,
    hasMore,
    totalCount,
    statusCounts,
    currentPage,
    totalPages,
    loadPage,
    loadMore,
    refetch
  };
};
