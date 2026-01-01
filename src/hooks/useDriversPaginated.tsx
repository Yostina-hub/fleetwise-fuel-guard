import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import type { Driver } from "./useDrivers";

interface UseDriversPaginatedOptions {
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
}

interface UseDriversPaginatedReturn {
  drivers: Driver[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
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
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);

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
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const count = await fetchCount();
      setTotalCount(count);

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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDrivers((data as Driver[]) || []);
      setCurrentPage(page);
      setHasMore(from + pageSize < count);
    } catch (err: any) {
      console.error("Error fetching drivers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, pageSize, searchQuery, statusFilter, fetchCount]);

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
    loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    loadPage(1);
  }, [organizationId, searchQuery, statusFilter]);

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
          debounceTimer = setTimeout(refetch, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, refetch]);

  return {
    drivers,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage,
    totalPages,
    loadPage,
    loadMore,
    refetch
  };
};
