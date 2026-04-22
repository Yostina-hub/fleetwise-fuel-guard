import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClipboardList, Plus, Clock, CheckCircle, Truck, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UnifiedVehicleRequestDialog } from "@/components/vehicle-requests/UnifiedVehicleRequestDialog";
import { VehicleRequestApprovalFlow } from "@/components/vehicle-requests/VehicleRequestApprovalFlow";
import { DriverCheckInDialog } from "@/components/vehicle-requests/DriverCheckInDialog";
import { CrossPoolAssignmentDialog } from "@/components/vehicle-requests/CrossPoolAssignmentDialog";
import VehicleRequestWorkflowProgress from "@/components/vehicle-requests/VehicleRequestWorkflowProgress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDriverScope } from "@/hooks/useDriverScope";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { subDays, startOfDay, endOfDay } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "secondary", approved: "default", assigned: "default",
  rejected: "destructive", completed: "outline", cancelled: "secondary",
};

const requestTypeLabels: Record<string, string> = {
  daily_operation: "Daily",
  nighttime_operation: "Nighttime",
  project_operation: "Project",
  field_operation: "Field",
  group_operation: "Group",
};

// Sortable column keys — must map 1:1 to a comparator branch in `sorted`.
type SortKey =
  | "request_number"
  | "request_type"
  | "requester_name"
  | "route"
  | "needed_from"
  | "created_at"
  | "vehicle"
  | "status";

export const VehicleRequestsPanel = () => {
  const { organizationId } = useOrganization();
  const { isDriverOnly, driverId, userId, loading: scopeLoading } = useDriverScope();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showCheckIn, setShowCheckIn] = useState<any>(null);
  const [showCrossPool, setShowCrossPool] = useState<any>(null);
  // CRUD: pending confirmation targets. Cancel = soft (status update), Delete = hard.
  const [confirmCancel, setConfirmCancel] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [actionPending, setActionPending] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [poolFilter, setPoolFilter] = useState("all");
  // Date-range filter — defaults to last 30 days of `needed_from`. Inclusive at both ends.
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  });

  // Sorting — default newest first by created_at so the most recently submitted request appears at the top.
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Dates default desc (most recent first), text columns default asc.
      setSortDir(key === "needed_from" || key === "created_at" ? "desc" : "asc");
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel("vr-panel-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel", organizationId] });
          queryClient.invalidateQueries({ queryKey: ["vr-approvals-panel", organizationId] });
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, organizationId]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["vehicle-requests-panel", organizationId, isDriverOnly, driverId, userId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("vehicle_requests")
        .select("*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(50);

      // RBAC: drivers only see requests they raised themselves.
      if (isDriverOnly) {
        if (!userId) return [];
        query = query.eq("requester_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !scopeLoading,
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["vr-approvals-panel", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_approvals")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Distinct pools (for filter dropdown) — derived from current data.
  const pools = useMemo(() => {
    const set = new Set<string>();
    for (const r of requests as any[]) if (r.pool_name) set.add(r.pool_name);
    return Array.from(set).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let filtered = requests as any[];
    // Date range filter — inclusive on `needed_from`. Skip rows without a date.
    const startMs = startOfDay(dateRange.start).getTime();
    const endMs = endOfDay(dateRange.end).getTime();
    filtered = filtered.filter((r: any) => {
      if (!r.needed_from) return false;
      const t = new Date(r.needed_from).getTime();
      return t >= startMs && t <= endMs;
    });
    if (statusFilter !== "all") {
      filtered = filtered.filter((r: any) => r.status === statusFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((r: any) => r.request_type === typeFilter);
    }
    if (poolFilter !== "all") {
      filtered = filtered.filter((r: any) => r.pool_name === poolFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r: any) =>
        r.request_number?.toLowerCase().includes(q) ||
        r.requester_name?.toLowerCase().includes(q) ||
        r.departure_place?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q) ||
        r.assigned_vehicle?.plate_number?.toLowerCase().includes(q) ||
        r.pool_name?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.department_name?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [requests, search, statusFilter, typeFilter, poolFilter, dateRange]);

  // Apply sorting on top of filtering. Comparator is column-aware — strings are
  // compared with locale, dates by epoch, numbers numerically.
  const sortedRequests = useMemo(() => {
    const arr = [...filteredRequests];
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (r: any): string | number => {
      switch (sortKey) {
        case "request_number": return (r.request_number || "").toLowerCase();
        case "request_type": return (r.request_type || "").toLowerCase();
        case "requester_name": return (r.requester_name || "").toLowerCase();
        case "route": return ((r.departure_place || "") + " " + (r.destination || "")).toLowerCase();
        case "needed_from": return r.needed_from ? new Date(r.needed_from).getTime() : 0;
        case "created_at": return r.created_at ? new Date(r.created_at).getTime() : 0;
        case "vehicle": return (r.assigned_vehicle?.plate_number || "").toLowerCase();
        case "status": return (r.status || "").toLowerCase();
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredRequests, sortKey, sortDir]);

  const pending = (requests as any[]).filter((r) => r.status === "pending").length;
  const assigned = (requests as any[]).filter((r) => r.status === "assigned").length;
  const completed = (requests as any[]).filter((r) => r.status === "completed").length;

  const hasActiveFilters =
    !!search || statusFilter !== "all" || typeFilter !== "all" || poolFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPoolFilter("all");
  };

  // Soft cancel: keep the row, mark status='cancelled'. Allowed pre-completion.
  const handleCancel = async () => {
    if (!confirmCancel) return;
    setActionPending(true);
    try {
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({ status: "cancelled" })
        .eq("id", confirmCancel.id);
      if (error) throw error;
      toast.success(`Request ${confirmCancel.request_number} cancelled`);
      setConfirmCancel(null);
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel", organizationId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel request");
    } finally {
      setActionPending(false);
    }
  };

  // Hard delete: only allowed for pending/cancelled/rejected to avoid losing
  // operational history on assigned/completed requests.
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionPending(true);
    try {
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .delete()
        .eq("id", confirmDelete.id);
      if (error) throw error;
      toast.success(`Request ${confirmDelete.request_number} deleted`);
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel", organizationId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete request");
    } finally {
      setActionPending(false);
    }
  };

  const canCancel = (r: any) => ["pending", "approved", "assigned"].includes(r.status);
  const canDelete = (r: any) => ["pending", "cancelled", "rejected"].includes(r.status);
  // (asc/desc/none) and toggles direction on subsequent clicks.
  const SortHeader = ({
    label,
    sortField,
    align = "left",
    className,
  }: {
    label: string;
    sortField: SortKey;
    align?: "left" | "center";
    className?: string;
  }) => {
    const active = sortKey === sortField;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th className={cn(`text-${align} py-2 px-3`, className)}>
        <button
          type="button"
          onClick={() => toggleSort(sortField)}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground transition-colors",
            active ? "text-foreground font-semibold" : "text-muted-foreground",
          )}
          aria-label={`Sort by ${label}`}
        >
          {label}
          <Icon className={cn("w-3 h-3", active ? "opacity-100" : "opacity-50")} />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      {/* Date Filter (top) + Quick Stats + Create */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">{pending}</span>
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold">{assigned}</span>
              <span className="text-muted-foreground">Assigned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="font-semibold">{completed}</span>
              <span className="text-muted-foreground">Completed</span>
            </div>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Request
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by request #, requester, route, plate, pool, department…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="daily_operation">Daily</SelectItem>
            <SelectItem value="nighttime_operation">Nighttime</SelectItem>
            <SelectItem value="project_operation">Project</SelectItem>
            <SelectItem value="field_operation">Field</SelectItem>
            <SelectItem value="group_operation">Group</SelectItem>
          </SelectContent>
        </Select>
        {pools.length > 0 && (
          <Select value={poolFilter} onValueChange={setPoolFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All Pools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pools</SelectItem>
              {pools.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {sortedRequests.length} of {(requests as any[]).length}
        </span>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : sortedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{hasActiveFilters ? "No matching requests" : "No vehicle requests yet"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs">
                    <SortHeader label="Request #" sortField="request_number" />
                    <SortHeader label="Type" sortField="request_type" />
                    <SortHeader label="Requester" sortField="requester_name" />
                    <SortHeader label="Route" sortField="route" />
                    <SortHeader label="Needed From" sortField="needed_from" />
                    <SortHeader label="Vehicle" sortField="vehicle" />
                    <SortHeader label="Status" sortField="status" align="center" />
                    <th className="text-center py-2 px-3 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRequests.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{r.request_number}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[10px]">
                          {requestTypeLabels[r.request_type] || r.request_type || "—"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{r.requester_name}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs max-w-[150px] truncate">
                        {r.departure_place && r.destination
                          ? `${r.departure_place} → ${r.destination}`
                          : r.destination || r.departure_place || "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {r.needed_from ? format(new Date(r.needed_from), "MMM dd, HH:mm") : "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{r.assigned_vehicle?.plate_number || "—"}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={(statusColors[r.status] || "secondary") as any} className="text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            title="View"
                            onClick={() => setShowDetail(r)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {canCancel(r) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700"
                              title="Cancel request"
                              onClick={() => setConfirmCancel(r)}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canDelete(r) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              title="Delete request"
                              onClick={() => setConfirmDelete(r)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UnifiedVehicleRequestDialog open={showCreate} onOpenChange={setShowCreate} />

      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request {showDetail.request_number}</DialogTitle>
            </DialogHeader>
            <VehicleRequestWorkflowProgress request={showDetail} />
            <VehicleRequestApprovalFlow
              request={showDetail}
              approvals={approvals}
              onClose={() => setShowDetail(null)}
              onCheckIn={() => { setShowDetail(null); setShowCheckIn(showDetail); }}
              onCrossPool={() => { setShowDetail(null); setShowCrossPool(showDetail); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {showCheckIn && (
        <DriverCheckInDialog request={showCheckIn} open={!!showCheckIn} onClose={() => setShowCheckIn(null)} />
      )}
      {showCrossPool && (
        <CrossPoolAssignmentDialog request={showCrossPool} open={!!showCrossPool} onClose={() => setShowCrossPool(null)} />
      )}

      {/* Cancel confirmation — soft action, status flipped to 'cancelled'. */}
      <AlertDialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel request {confirmCancel?.request_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              The request will be marked as cancelled. This is reversible by the dispatcher
              but will release any pending vehicle/driver assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Keep request</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending}
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionPending ? "Cancelling…" : "Cancel request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation — hard, irreversible. Restricted by `canDelete`. */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request {confirmDelete?.request_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the request and its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Keep request</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionPending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
