import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useRegistryRefresh } from "./useRegistryRefresh";
import type { Driver } from "./useDrivers";

export type DriverSortField =
  | "last_name"
  | "first_name"
  | "employee_id"
  | "hire_date"
  | "license_expiry"
  | "created_at"
  | "status";

interface UseDriversPaginatedOptions {
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  driverTypeFilter?: string;
  employmentTypeFilter?: string;
  assignmentFilter?: "all" | "assigned" | "unassigned";
  sortBy?: DriverSortField;
  sortDir?: "asc" | "desc";
}

interface StatusCounts {
  active: number;
  inactive: number;
  suspended: number;
}

interface CategoryCounts {
  total: number;
  assigned: number;
  unassigned: number;
  byDriverType: Record<string, number>;
  byEmploymentType: Record<string, number>;
}

interface UseDriversPaginatedReturn {
  drivers: Driver[];
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  statusCounts: StatusCounts;
  categoryCounts: CategoryCounts;
  currentPage: number;
  totalPages: number;
  loadPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => void;
}

const EMPTY_CATEGORY: CategoryCounts = {
  total: 0,
  assigned: 0,
  unassigned: 0,
  byDriverType: {},
  byEmploymentType: {},
};

export const useDriversPaginated = (
  options: UseDriversPaginatedOptions = {}
): UseDriversPaginatedReturn => {
  const {
    pageSize = 50,
    searchQuery = "",
    statusFilter = "all",
    driverTypeFilter = "all",
    employmentTypeFilter = "all",
    assignmentFilter = "all",
    sortBy = "last_name",
    sortDir = "asc",
  } = options;
  const { organizationId } = useOrganization();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ active: 0, inactive: 0, suspended: 0 });
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>(EMPTY_CATEGORY);
  const [assignedDriverIds, setAssignedDriverIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const isFirstLoad = useRef(true);

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);

  // Fetch the set of driver IDs currently assigned to a vehicle
  const fetchAssignedDriverIds = useCallback(async (): Promise<Set<string>> => {
    if (!organizationId) return new Set();
    const { data, error } = await supabase
      .from("vehicles")
      .select("assigned_driver_id")
      .eq("organization_id", organizationId)
      .not("assigned_driver_id", "is", null);
    if (error) throw error;
    return new Set((data || []).map((v: any) => v.assigned_driver_id).filter(Boolean));
  }, [organizationId]);

  const fetchCategoryCounts = useCallback(async (assignedSet: Set<string>): Promise<CategoryCounts> => {
    if (!organizationId) return EMPTY_CATEGORY;
    const { data, error } = await supabase
      .from("drivers")
      .select("id, driver_type, employment_type")
      .eq("organization_id", organizationId);
    if (error) throw error;

    const counts: CategoryCounts = {
      total: data?.length || 0,
      assigned: 0,
      unassigned: 0,
      byDriverType: {},
      byEmploymentType: {},
    };
    (data || []).forEach((d: any) => {
      if (assignedSet.has(d.id)) counts.assigned++;
      else counts.unassigned++;
      const dt = d.driver_type || "unspecified";
      counts.byDriverType[dt] = (counts.byDriverType[dt] || 0) + 1;
      const et = d.employment_type || "unspecified";
      counts.byEmploymentType[et] = (counts.byEmploymentType[et] || 0) + 1;
    });
    return counts;
  }, [organizationId]);

  const fetchStatusCounts = useCallback(async () => {
    if (!organizationId) return { active: 0, inactive: 0, suspended: 0 };
    const [activeResult, inactiveResult, suspendedResult] = await Promise.all([
      supabase.from("drivers").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
      supabase.from("drivers").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "inactive"),
      supabase.from("drivers").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "suspended"),
    ]);
    return {
      active: activeResult.count || 0,
      inactive: inactiveResult.count || 0,
      suspended: suspendedResult.count || 0,
    };
  }, [organizationId]);

  const applyFilters = useCallback((q: any, assignedSet: Set<string>) => {
    if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
    if (driverTypeFilter && driverTypeFilter !== "all") {
      if (driverTypeFilter === "unspecified") q = q.is("driver_type", null);
      else q = q.eq("driver_type", driverTypeFilter);
    }
    if (employmentTypeFilter && employmentTypeFilter !== "all") {
      if (employmentTypeFilter === "unspecified") q = q.is("employment_type", null);
      else q = q.eq("employment_type", employmentTypeFilter);
    }
    if (assignmentFilter === "assigned") {
      const ids = Array.from(assignedSet);
      q = ids.length > 0 ? q.in("id", ids) : q.eq("id", "00000000-0000-0000-0000-000000000000");
    } else if (assignmentFilter === "unassigned") {
      const ids = Array.from(assignedSet);
      if (ids.length > 0) q = q.not("id", "in", `(${ids.join(",")})`);
    }
    if (searchQuery) {
      q = q.or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,license_number.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      );
    }
    return q;
  }, [statusFilter, driverTypeFilter, employmentTypeFilter, assignmentFilter, searchQuery]);

  // Cache so filter-only changes don't refetch counts/assignments (instant feel)
  const assignedCacheRef = useRef<{ key: string; set: Set<string> } | null>(null);
  const statusCountsCacheRef = useRef<{ key: string; counts: StatusCounts } | null>(null);
  const categoryCountsCacheRef = useRef<{ key: string; counts: CategoryCounts } | null>(null);

  const loadPage = useCallback(async (page: number, opts?: { forceCountsRefresh?: boolean }) => {
    if (!organizationId) {
      setDrivers([]);
      setLoading(false);
      setInitialLoading(false);
      return;
    }

    try {
      if (isFirstLoad.current) setInitialLoading(true);
      setLoading(true);
      setError(null);

      // Counts/assignments only depend on the org — cache them so card clicks are instant.
      const cacheKey = organizationId;
      const force = opts?.forceCountsRefresh === true;

      let assignedSet: Set<string>;
      if (!force && assignedCacheRef.current?.key === cacheKey) {
        assignedSet = assignedCacheRef.current.set;
      } else {
        assignedSet = await fetchAssignedDriverIds();
        assignedCacheRef.current = { key: cacheKey, set: assignedSet };
      }
      setAssignedDriverIds(assignedSet);

      const needCounts = force || statusCountsCacheRef.current?.key !== cacheKey || categoryCountsCacheRef.current?.key !== cacheKey;
      let counts: StatusCounts;
      let catCounts: CategoryCounts;
      if (needCounts) {
        [counts, catCounts] = await Promise.all([
          fetchStatusCounts(),
          fetchCategoryCounts(assignedSet),
        ]);
        statusCountsCacheRef.current = { key: cacheKey, counts };
        categoryCountsCacheRef.current = { key: cacheKey, counts: catCounts };
      } else {
        counts = statusCountsCacheRef.current!.counts;
        catCounts = categoryCountsCacheRef.current!.counts;
      }

      // count query
      let countQ = supabase.from("drivers").select("*", { count: "exact", head: true }).eq("organization_id", organizationId);
      countQ = applyFilters(countQ, assignedSet);
      const { count: cnt, error: cntErr } = await countQ;
      if (cntErr) throw cntErr;
      const total = cnt || 0;

      // data query
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let dataQ = supabase
        .from("drivers")
        .select("*")
        .eq("organization_id", organizationId)
        .order(sortBy, { ascending: sortDir === "asc", nullsFirst: false })
        // Stable secondary sort so paging stays deterministic when many rows tie
        .order("last_name", { ascending: true })
        .range(from, to);
      dataQ = applyFilters(dataQ, assignedSet);
      const { data, error: dErr } = await dataQ;
      if (dErr) throw dErr;

      setTotalCount(total);
      setStatusCounts(counts);
      setCategoryCounts(catCounts);
      setDrivers((data as Driver[]) || []);
      setCurrentPage(page);
      setHasMore((page - 1) * pageSize + pageSize < total);
      isFirstLoad.current = false;
    } catch (err: any) {
      console.error("Error fetching drivers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [organizationId, pageSize, applyFilters, fetchAssignedDriverIds, fetchCategoryCounts, fetchStatusCounts, sortBy, sortDir]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !organizationId) return;
    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      const from = (nextPage - 1) * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from("drivers")
        .select("*")
        .eq("organization_id", organizationId)
        .order(sortBy, { ascending: sortDir === "asc", nullsFirst: false })
        .order("last_name", { ascending: true })
        .range(from, to);
      q = applyFilters(q, assignedDriverIds);
      const { data, error: fErr } = await q;
      if (fErr) throw fErr;
      setDrivers(prev => [...prev, ...((data as Driver[]) || [])]);
      setCurrentPage(nextPage);
      setHasMore(from + pageSize < totalCount);
    } catch (err: any) {
      console.error("Error loading more drivers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentPage, pageSize, hasMore, loading, applyFilters, assignedDriverIds, totalCount, sortBy, sortDir]);

  const refetch = useCallback(() => {
    isFirstLoad.current = false;
    loadPage(currentPage, { forceCountsRefresh: true });
  }, [loadPage, currentPage]);

  // Refresh instantly when any code invalidates the "drivers" query key
  // (covers all CreateDriverDialog / EditDriverDialog success paths).
  useRegistryRefresh("drivers", refetch);

  // Only treat the very first mount per organization as "initial loading"
  // so filter/sort changes do NOT trigger the full-page skeleton (avoids reload feel).
  const hasMountedRef = useRef(false);
  useEffect(() => {
    const isFirst = !hasMountedRef.current;
    if (isFirst) {
      isFirstLoad.current = true;
      hasMountedRef.current = true;
    } else {
      isFirstLoad.current = false;
    }
    // First mount = full fetch (incl counts). Subsequent filter/sort changes
    // reuse cached counts/assignments => no extra round-trips, instant feel.
    loadPage(1, { forceCountsRefresh: isFirst });
  }, [organizationId, searchQuery, statusFilter, driverTypeFilter, employmentTypeFilter, assignmentFilter, sortBy, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the mount + caches when org changes so a new org gets a fresh load
  useEffect(() => {
    hasMountedRef.current = false;
    assignedCacheRef.current = null;
    statusCountsCacheRef.current = null;
    categoryCountsCacheRef.current = null;
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`drivers-paginated-${organizationId.slice(0, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers', filter: `organization_id=eq.${organizationId}` }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          isFirstLoad.current = false;
          // Real driver changes => invalidate counts cache so badges stay accurate
          loadPage(currentPage, { forceCountsRefresh: true });
        }, 500);
      })
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
    categoryCounts,
    currentPage,
    totalPages,
    loadPage,
    loadMore,
    refetch,
  };
};
