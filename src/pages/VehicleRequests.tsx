import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/Layout";
import { Can } from "@/components/auth/Can";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  Pencil,
  RotateCcw,
  MessageSquare,
  LogIn,
  Shuffle,
  Trash2,
  Undo2,
  Users,
  Search,
  Download,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  X,
  FileText,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  GitMerge,
} from "lucide-react";
import { VehicleRequestKPI } from "@/components/vehicle-requests/VehicleRequestKPI";
import { VehicleRequestForm } from "@/components/vehicle-requests/VehicleRequestForm";
import { VehicleRequestApprovalFlow } from "@/components/vehicle-requests/VehicleRequestApprovalFlow";
import { RequesterFeedbackDialog } from "@/components/vehicle-requests/RequesterFeedbackDialog";
import { DriverCheckInDialog } from "@/components/vehicle-requests/DriverCheckInDialog";
import { CrossPoolAssignmentDialog } from "@/components/vehicle-requests/CrossPoolAssignmentDialog";
// Pool-supervisor functionality is now embedded inline below the requests
// table via the "Assignments" view-mode toggle (no separate page needed).
import { PoolReviewPanel } from "@/components/vehicle-requests/PoolReviewPanel";
// ConsolidationPanel removed — consolidation now lives exclusively in the
// dedicated "Consolidate" workspace (TripConsolidationWorkspace) to avoid
// redundancy and free space in the Assignments view.
import { OpsMapView } from "@/components/vehicle-requests/OpsMapView";
import { TripConsolidationWorkspace } from "@/components/vehicle-requests/TripConsolidationWorkspace";
import { MergedTripsHistory } from "@/components/vehicle-requests/MergedTripsHistory";
import VehicleRequestWorkflowProgress from "@/components/vehicle-requests/VehicleRequestWorkflowProgress";

import { DeallocateRequestDialog } from "@/components/vehicle-requests/DeallocateRequestDialog";
import { DeleteRequestDialog } from "@/components/vehicle-requests/DeleteRequestDialog";
import { EditRequestDialog } from "@/components/vehicle-requests/EditRequestDialog";
import { MultiVehicleAssignDialog } from "@/components/vehicle-requests/MultiVehicleAssignDialog";
import { QuickAssignDialog } from "@/components/vehicle-requests/QuickAssignDialog";
import BulkImportVehicleRequestsDialog from "@/components/vehicle-requests/BulkImportVehicleRequestsDialog";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDriverScope } from "@/hooks/useDriverScope";
import { useVehicleRequestScope, applyVRScope } from "@/hooks/useVehicleRequestScope";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageDateRangeProvider, usePageDateRange } from "@/contexts/PageDateRangeContext";
import PageDateRangeFilter from "@/components/common/PageDateRangeFilter";
import { formatRequestNumber } from "@/lib/formatRequestNumber";

type StatusKey = "all" | "pending" | "approved" | "assigned" | "completed" | "rejected" | "cancelled";

const STATUS_TABS: { key: StatusKey; label: string; icon: any; tone: string }[] = [
  { key: "all", label: "All", icon: ClipboardList, tone: "from-slate-500/20 to-slate-500/5 text-slate-600 dark:text-slate-300" },
  { key: "pending", label: "Pending", icon: Clock, tone: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400" },
  { key: "approved", label: "Approved", icon: CheckCircle, tone: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
  { key: "assigned", label: "Assigned", icon: Truck, tone: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400" },
  { key: "completed", label: "Completed", icon: CheckCircle, tone: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400" },
  { key: "rejected", label: "Rejected", icon: XCircle, tone: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400" },
];

const PAGE_SIZE = 10;

const REQUEST_TYPE_LABELS: Record<string, string> = {
  daily_operation: "Daily",
  project_operation: "Project",
  field_operation: "Field",
};

const VehicleRequests = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { isDriverOnly, driverId, userId, loading: scopeLoading } = useDriverScope();
  const vrScope = useVehicleRequestScope();
  const queryClient = useQueryClient();
  const { startISO, endISO } = usePageDateRange();

  // Drivers don't manage requests — they consume their assigned trips on the
  // Driver Portal. Redirect once we know they're driver-only.
  useEffect(() => {
    if (!scopeLoading && isDriverOnly) {
      window.location.replace("/driver-portal");
    }
  }, [scopeLoading, isDriverOnly]);

  /**
   * Action permissions by tier (mirrors row-visibility scoping).
   * - all      → admins/managers/dispatchers/auditor → full toolkit
   * - operator → pool reviewers → assign/deallocate/check-in but no
   *              destructive bulk import/export
   * - driver   → only check-in/out on rows assigned to them, plus own
   *              feedback/delete on their own filed requests
   * - self     → basic users / requesters → only manage their own rows
   */
  const isAdminTier = vrScope.tier === "all";
  const isOperatorTier = vrScope.tier === "operator";
  const isDriverTier = vrScope.tier === "driver";
  const canManageAll = isAdminTier || isOperatorTier;
  const canExportImport = isAdminTier;
  const isOwnRow = (r: any) => r.requester_id && r.requester_id === vrScope.userId;
  const isAssignedDriverRow = (r: any) =>
    isDriverTier && vrScope.driverId && r.assigned_driver_id === vrScope.driverId;

  // dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState<any>(null);
  const [showCheckIn, setShowCheckIn] = useState<any>(null);
  const [showCrossPool, setShowCrossPool] = useState<any>(null);
  const [showDeallocate, setShowDeallocate] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<any>(null);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [showMultiAssign, setShowMultiAssign] = useState<any>(null);
  const [showQuickAssign, setShowQuickAssign] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);

  // View mode — "requests" (default table) or "assignments" (pool supervisor
  // workspace with consolidation + per-request review/assign panels).
  // Synced to URL ?view=assignments so the legacy /pool-supervisors redirect
  // can deep-link straight into this mode.
  const [viewMode, setViewMode] = useState<"requests" | "assignments" | "ops_map" | "consolidation" | "merged_history">(() => {
    if (typeof window === "undefined") return "requests";
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "assignments") return "assignments";
    if (v === "ops_map") return "ops_map";
    if (v === "consolidation") return "consolidation";
    if (v === "merged_history") return "merged_history";
    return "requests";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (viewMode === "assignments") url.searchParams.set("view", "assignments");
    else if (viewMode === "ops_map") url.searchParams.set("view", "ops_map");
    else if (viewMode === "consolidation") url.searchParams.set("view", "consolidation");
    else if (viewMode === "merged_history") url.searchParams.set("view", "merged_history");
    else url.searchParams.delete("view");
    window.history.replaceState({}, "", url.toString());
  }, [viewMode]);

  // filters / search / pagination
  const [activeStatus, setActiveStatus] = useState<StatusKey>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [poolFilter, setPoolFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // sorting
  type SortKey =
    | "request_number"
    | "request_type"
    | "requester_name"
    | "route"
    | "pool_name"
    | "needed_from"
    | "vehicle"
    | "trip_type"
    | "status";
  const [sortKey, setSortKey] = useState<SortKey>("needed_from");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "needed_from" ? "desc" : "asc");
    }
  };

  // Realtime subscription for vehicle_requests
  useEffect(() => {
    const channel = supabase
      .channel("vehicle-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vehicle-requests", organizationId] });
          queryClient.invalidateQueries({ queryKey: ["vehicle-request-approvals", organizationId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, organizationId]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: [
      "vehicle-requests",
      organizationId,
      vrScope.tier,
      vrScope.userId,
      vrScope.driverId,
    ],
    queryFn: async () => {
      let query = (supabase as any)
        .from("vehicle_requests")
        .select(
          "*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)",
        )
        .eq("organization_id", organizationId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);

      // Role-based row scoping (super_admin/org_admin/etc see all;
      // operator → pool queue + own; driver → assigned + own;
      // basic user/requester → own only).
      query = applyVRScope(query, vrScope);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !scopeLoading && !vrScope.loading,
  });

  // Auto-open detail dialog when navigated with ?id=<request_id>
  // (e.g. driver clicks "View Request" from the Trip Management hub).
  useEffect(() => {
    if (!requests || requests.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;
    const match = (requests as any[]).find((r) => r.id === id);
    if (match) {
      setShowDetail(match);
      // Strip the param so reopening the page later doesn't re-trigger.
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    }
  }, [requests]);

  const { data: approvals = [] } = useQuery({
    queryKey: ["vehicle-request-approvals", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_approvals")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Date-range scoped requests — drives KPIs and tab counts so all summary
  // numbers reflect the picker on top of the page. We accept a row when EITHER
  // its `needed_from` OR its `created_at` falls within the window. Using only
  // `needed_from` would silently hide freshly-submitted requests whose trip
  // start sits in the next local day after timezone normalization (e.g. a
  // request created at 11:00 EAT for "tonight at midnight" → needed_from
  // serializes as 21:00 UTC = next-day in EAT, which a user who picked
  // "today" in the date filter would not expect to lose).
  const dateScopedRequests = useMemo(() => {
    const startMs = new Date(startISO).getTime();
    const endMs = new Date(endISO).getTime();
    const inRange = (iso?: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return !Number.isNaN(t) && t >= startMs && t <= endMs;
    };
    return requests.filter((r: any) => {
      // No timestamps at all → keep (nothing to filter on).
      if (!r.needed_from && !r.created_at) return true;
      return inRange(r.needed_from) || inRange(r.created_at);
    });
  }, [requests, startISO, endISO]);

  // counts per status (for tab badges)
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: dateScopedRequests.length };
    for (const r of dateScopedRequests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [dateScopedRequests]);

  // Pool-supervisor backlog: approved requests still awaiting vehicle/driver
  // allocation. Drives the "Assignments" toggle badge.
  const awaitingAssignmentCount = useMemo(
    () =>
      requests.filter(
        (r: any) => r.status === "approved" && r.pool_review_status !== "reviewed",
      ).length,
    [requests],
  );

  // distinct pools (for filter dropdown)
  const poolOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of requests) if (r.pool_name) set.add(r.pool_name);
    return Array.from(set).sort();
  }, [requests]);

  // filtered list
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const startMs = new Date(startISO).getTime();
    const endMs = new Date(endISO).getTime();
    return requests.filter((r: any) => {
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      if (typeFilter !== "all" && r.request_type !== typeFilter) return false;
      if (poolFilter !== "all" && r.pool_name !== poolFilter) return false;
      // Date range — match on `needed_from` (trip date) and fall back to
      // `created_at` for drafts that don't yet have a scheduled date.
      const ref = r.needed_from || r.created_at;
      if (ref) {
        const t = new Date(ref).getTime();
        if (!Number.isNaN(t) && (t < startMs || t > endMs)) return false;
      }
      if (!q) return true;
      const haystack = [
        r.request_number,
        r.requester_name,
        r.departure_place,
        r.destination,
        r.pool_name,
        r.purpose,
        r.assigned_vehicle?.plate_number,
        r.assigned_driver?.first_name,
        r.assigned_driver?.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, activeStatus, debouncedSearch, typeFilter, poolFilter, startISO, endISO]);

  // sorted (apply on top of filtered)
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (r: any): string | number => {
      switch (sortKey) {
        case "request_number":
          return String(r.request_number ?? "").toLowerCase();
        case "request_type":
          return String(r.request_type ?? "").toLowerCase();
        case "requester_name":
          return String(r.requester_name ?? "").toLowerCase();
        case "route":
          return `${r.departure_place ?? ""} ${r.destination ?? ""}`.trim().toLowerCase();
        case "pool_name":
          return String(r.pool_name ?? "").toLowerCase();
        case "needed_from":
          return r.needed_from ? new Date(r.needed_from).getTime() : 0;
        case "vehicle":
          return String(r.assigned_vehicle?.plate_number ?? "").toLowerCase();
        case "trip_type":
          return String(r.trip_type ?? "").toLowerCase();
        case "status":
          return String(r.status ?? "").toLowerCase();
        default:
          return "";
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      const aEmpty = av === "" || av === 0;
      const bEmpty = bv === "" || bv === 0;
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeStatus, debouncedSearch, typeFilter, poolFilter]);

  // KPI quick numbers
  const total = requests.length;
  const pending = counts["pending"] || 0;
  const approved = counts["approved"] || 0;
  const assigned = counts["assigned"] || 0;
  const completed = counts["completed"] || 0;

  // -------- export / import handlers --------
  const buildExportRows = () => {
    const headers = [
      "request_number",
      "request_type",
      "status",
      "priority",
      "requester_name",
      "departure_place",
      "destination",
      "pool_name",
      "needed_from",
      "needed_until",
      "passengers",
      "num_vehicles",
      "vehicle_type",
      "trip_type",
      "project_number",
      "distance_estimate_km",
      "vehicle_plate",
      "vehicle_make_model",
      "driver",
      "purpose",
      "created_at",
    ];
    const rows = filtered.map((r: any) => [
      r.request_number,
      r.request_type,
      r.status,
      r.priority,
      r.requester_name,
      r.departure_place,
      r.destination,
      r.pool_name,
      r.needed_from,
      r.needed_until,
      r.passengers,
      r.num_vehicles,
      r.vehicle_type,
      r.trip_type,
      r.project_number,
      r.distance_estimate_km,
      r.assigned_vehicle?.plate_number,
      r.assigned_vehicle ? `${r.assigned_vehicle.make ?? ""} ${r.assigned_vehicle.model ?? ""}`.trim() : "",
      [r.assigned_driver?.first_name, r.assigned_driver?.last_name].filter(Boolean).join(" "),
      r.purpose,
      r.created_at,
    ]);
    return { headers, rows };
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info("Nothing to export with the current filter.");
      return;
    }
    const { headers, rows } = buildExportRows();
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((v) => {
            if (v === null || v === undefined) return "";
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vehicle-requests-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} requests as CSV`);
  };

  const exportXlsx = () => {
    if (filtered.length === 0) {
      toast.info("Nothing to export with the current filter.");
      return;
    }
    const { headers, rows } = buildExportRows();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicle Requests");
    XLSX.writeFile(wb, `vehicle-requests-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`);
    toast.success(`Exported ${filtered.length} requests as XLSX`);
  };

  const exportPrint = () => {
    if (filtered.length === 0) {
      toast.info("Nothing to print with the current filter.");
      return;
    }
    const { headers, rows } = buildExportRows();
    const printedAt = format(new Date(), "yyyy-MM-dd HH:mm");
    const statusLabel = activeStatus === "all" ? "All Statuses" : activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1);
    const typeLabel = typeFilter === "all" ? "All Types" : (REQUEST_TYPE_LABELS[typeFilter] ?? typeFilter);

    const headerLabels: Record<string, string> = {
      request_number: "Req #",
      request_type: "Type",
      status: "Status",
      priority: "Priority",
      requester_name: "Requester",
      departure_place: "From",
      destination: "To",
      pool_name: "Pool",
      needed_from: "Needed From",
      needed_until: "Needed Until",
      passengers: "Pax",
      num_vehicles: "Veh #",
      vehicle_type: "Veh Type",
      trip_type: "Trip",
      project_number: "Project",
      distance_estimate_km: "Dist (km)",
      vehicle_plate: "Plate",
      vehicle_make_model: "Make/Model",
      driver: "Driver",
      purpose: "Purpose",
      created_at: "Created",
    };

    const escapeHtml = (v: any) => {
      if (v === null || v === undefined || v === "") return "—";
      return String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    };

    const statusBadgeClass = (s: string) => {
      const k = String(s || "").toLowerCase();
      if (k === "approved" || k === "completed") return "badge ok";
      if (k === "pending") return "badge pending";
      if (k === "assigned") return "badge info";
      if (k === "rejected" || k === "cancelled") return "badge danger";
      return "badge muted";
    };

    const tbodyHtml = rows
      .map((row) => {
        const cells = row
          .map((v, i) => {
            const key = headers[i];
            if (key === "status") {
              return `<td><span class="${statusBadgeClass(String(v))}">${escapeHtml(v)}</span></td>`;
            }
            return `<td>${escapeHtml(v)}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const theadHtml = headers.map((h) => `<th>${escapeHtml(headerLabels[h] ?? h)}</th>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Vehicle Requests Report — ${printedAt}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #0f172a; margin-bottom: 14px; }
  .brand { display: flex; flex-direction: column; gap: 2px; }
  .brand h1 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }
  .brand .sub { color: #475569; font-size: 11px; }
  .meta { text-align: right; font-size: 10px; color: #475569; line-height: 1.5; }
  .meta strong { color: #0f172a; }
  .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
  .kpi .l { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi .v { font-size: 16px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead th { background: #0f172a; color: #fff; font-weight: 600; text-align: left; padding: 6px 5px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.03em; }
  tbody td { padding: 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; font-size: 9px; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 999px; font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
  .badge.ok { background: #dcfce7; color: #166534; }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.info { background: #dbeafe; color: #1e40af; }
  .badge.danger { background: #fee2e2; color: #991b1b; }
  .badge.muted { background: #e2e8f0; color: #334155; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; }
  @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>Vehicle Requests Report</h1>
      <div class="sub">Filter: <strong>${escapeHtml(statusLabel)}</strong> · Type: <strong>${escapeHtml(typeLabel)}</strong>${search ? ` · Search: <strong>${escapeHtml(search)}</strong>` : ""}</div>
    </div>
    <div class="meta">
      <div><strong>Generated</strong> ${escapeHtml(printedAt)}</div>
      <div><strong>Records</strong> ${filtered.length}</div>
    </div>
  </div>
  <div class="summary">
    <div class="kpi"><div class="l">Total</div><div class="v">${total}</div></div>
    <div class="kpi"><div class="l">Pending</div><div class="v">${pending}</div></div>
    <div class="kpi"><div class="l">Approved</div><div class="v">${approved}</div></div>
    <div class="kpi"><div class="l">Assigned</div><div class="v">${assigned}</div></div>
    <div class="kpi"><div class="l">Completed</div><div class="v">${completed}</div></div>
  </div>
  <table>
    <thead><tr>${theadHtml}</tr></thead>
    <tbody>${tbodyHtml}</tbody>
  </table>
  <div class="footer">
    <span>Confidential — Fleet Management</span>
    <span>Generated by Fleet System · ${escapeHtml(printedAt)}</span>
  </div>
  <script>
    window.addEventListener('load', () => { setTimeout(() => { window.focus(); window.print(); }, 200); });
  </script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) {
      toast.error("Pop-up blocked. Please allow pop-ups to print.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success(`Prepared ${filtered.length} requests for printing`);
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setPoolFilter("all");
    setActiveStatus("all");
  };

  const hasActiveFilters =
    !!search || typeFilter !== "all" || poolFilter !== "all" || activeStatus !== "all";

    return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
        {showCreate ? (
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-border/60 bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreate(false)}
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Requests
              </Button>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                New Vehicle Request
              </span>
            </div>
            <VehicleRequestForm
              open
              embedded
              source="vehicle_requests_page"
              onOpenChange={(v) => !v && setShowCreate(false)}
              onSubmitted={() => setShowCreate(false)}
            />
          </Card>
        ) : (
          <>
        {/* ============== PAGE HEADER ============== */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-4 md:p-5 shadow-sm">
          {/* Decorative accent */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shadow-sm">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
                  {t("pages.vehicle_requests.title", "Vehicle Requests")}
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
                  {t(
                    "pages.vehicle_requests.description",
                    "Request, approve & assign vehicles across pools",
                  )}
                </p>
              </div>
            </div>

            {/* Action toolbar — grouped: data ops · workspace toggles · primary */}
            <div className="flex flex-wrap items-center gap-2">
              {canExportImport && (
                <div className="flex items-center gap-1.5">
                  <Can resource="vehicle_requests" action="export">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 h-9">
                          <Download className="w-3.5 h-3.5" /> Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Export {filtered.length} requests</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={exportCsv}>
                          <FileText className="w-4 h-4 mr-2" /> CSV (.csv)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportXlsx}>
                          <FileText className="w-4 h-4 mr-2" /> Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={exportPrint}>
                          <Printer className="w-4 h-4 mr-2" /> Print / PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Can>
                  <Can resource="vehicle_requests" action="create">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() => setShowImport(true)}
                    >
                      <Upload className="w-3.5 h-3.5" /> Import
                    </Button>
                  </Can>
                </div>
              )}

              {canManageAll && (
                <>
                  <div className="hidden md:block h-6 w-px bg-border/70" aria-hidden="true" />
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={viewMode === "assignments" ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() =>
                        setViewMode((m) => (m === "assignments" ? "requests" : "assignments"))
                      }
                      title="Pool supervisor workspace — review approved requests and allocate vehicles + drivers"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Assignments
                      {awaitingAssignmentCount > 0 && (
                        <Badge
                          variant={viewMode === "assignments" ? "secondary" : "destructive"}
                          className="ml-1 h-4 min-w-[1rem] px-1 text-[10px]"
                        >
                          {awaitingAssignmentCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant={viewMode === "ops_map" ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() =>
                        setViewMode((m) => (m === "ops_map" ? "requests" : "ops_map"))
                      }
                      title="Operations control map — pool demand, idle vehicles, merge suggestions, cross-pool borrow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ops Map
                    </Button>
                    <Button
                      variant={viewMode === "consolidation" ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() =>
                        setViewMode((m) => (m === "consolidation" ? "requests" : "consolidation"))
                      }
                      title="Trip Consolidation — merge requests by pool, route, and time"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      Consolidate
                    </Button>
                    <Button
                      variant={viewMode === "merged_history" ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() =>
                        setViewMode((m) => (m === "merged_history" ? "requests" : "merged_history"))
                      }
                      title="Merged Trips History — view every consolidated parent trip with its merged places"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Merged History
                    </Button>
                  </div>
                </>
              )}

              <div className="hidden md:block h-6 w-px bg-border/70" aria-hidden="true" />
              <Can resource="vehicle_requests" action="create">
                <Button
                  size="sm"
                  className="gap-1.5 h-9 shadow-sm"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> New Request
                </Button>
              </Can>
            </div>
          </div>
        </div>

        <PageDateRangeFilter hint="Filters KPIs and the table below" />

        <VehicleRequestKPI
          requests={dateScopedRequests}
          activeStatus={activeStatus}
          onStatusChange={(s) => {
            setActiveStatus(s);
            if (viewMode !== "requests") setViewMode("requests");
            // Scroll the table into view so users see the filter applied.
            setTimeout(() => {
              document
                .getElementById("vehicle-requests-table")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          }}
        />

        {/* ============== ASSIGNMENTS WORKSPACE (formerly /pool-supervisors) ============== */}
        {viewMode === "assignments" && canManageAll && organizationId && (
          <div className="space-y-4 animate-fade-in" data-assignments-workspace>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Assignment Workspace</div>
                    <div className="text-xs text-muted-foreground">
                      Review approved requests and allocate a vehicle + driver from your pool.
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setViewMode("requests")}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back to Requests
                </Button>
              </CardContent>
            </Card>
            <PoolReviewPanel requests={requests} organizationId={organizationId} />
          </div>
        )}

        {/* ============== OPS MAP WORKSPACE ============== */}
        {viewMode === "ops_map" && canManageAll && organizationId && (
          <div className="space-y-4 animate-fade-in">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Operations Control Map</div>
                    <div className="text-xs text-muted-foreground">
                      Live view of pending routes, idle vehicles by pool, merge candidates, and cross-pool borrow suggestions.
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setViewMode("requests")}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back to Requests
                </Button>
              </CardContent>
            </Card>
            <OpsMapView organizationId={organizationId} />
          </div>
        )}

        {/* ============== TRIP CONSOLIDATION WORKSPACE ============== */}
        {viewMode === "consolidation" && canManageAll && organizationId && (
          <div className="space-y-4 animate-fade-in">
            <TripConsolidationWorkspace organizationId={organizationId} />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setViewMode("requests")}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Requests
              </Button>
            </div>
          </div>
        )}

        {/* ============== MERGED TRIPS HISTORY ============== */}
        {viewMode === "merged_history" && canManageAll && organizationId && (
          <div className="space-y-4 animate-fade-in">
            <MergedTripsHistory organizationId={organizationId} />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setViewMode("requests")}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Requests
              </Button>
            </div>
          </div>
        )}

        {/* ============== MAIN PANEL ============== */}
        {/* Hide the full requests table when a workspace view is active so
            the same approved requests don't appear twice (workspace +
            duplicate row in the all-requests table below). */}
        {viewMode === "requests" && (
        <Card id="vehicle-requests-table" className="overflow-hidden border-border/60 shadow-sm scroll-mt-20">
          <CardHeader className="pb-4 border-b bg-gradient-to-b from-muted/40 to-transparent">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold leading-tight">
                      All Requests
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {filtered.length} of {requests.length} requests
                      {activeStatus !== "all" && ` · filtered by ${activeStatus}`}
                    </p>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={clearFilters}>
                    <X className="w-3.5 h-3.5" /> Clear filters
                  </Button>
                )}
              </div>

              {/* Segmented status tabs — clean pill group with clear active state */}
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/40 overflow-x-auto scrollbar-thin w-full md:w-auto">
                {STATUS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeStatus === tab.key;
                  const count = counts[tab.key] ?? 0;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveStatus(tab.key)}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", isActive && "text-primary")} />
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center text-[10px] font-bold rounded-md min-w-[1.25rem] h-4 px-1.5 tabular-nums",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Smart search + filters */}
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by request #, requester, route, pool, plate, driver…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-9 h-10 bg-background"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-10 w-[140px] gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="daily_operation">Daily</SelectItem>
                      <SelectItem value="project_operation">Project</SelectItem>
                      <SelectItem value="field_operation">Field</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={poolFilter} onValueChange={setPoolFilter}>
                    <SelectTrigger className="h-10 w-[160px] gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Pool" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All pools</SelectItem>
                      {poolOptions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                  <ClipboardList className="w-8 h-8 opacity-40" />
                </div>
                <p className="font-medium">No vehicle requests found</p>
                <p className="text-xs mt-1">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search terms."
                    : "Create a new request to get started."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr className="border-b-2 border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <SortableTh sortKey="request_number" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-4">Request #</SortableTh>
                        <SortableTh sortKey="request_type"   currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3">Type</SortableTh>
                        <SortableTh sortKey="requester_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3">Requester</SortableTh>
                        <SortableTh sortKey="route"          currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3">Route</SortableTh>
                        <SortableTh sortKey="pool_name"      currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3">Pool</SortableTh>
                        <SortableTh sortKey="needed_from"    currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3">Needed From</SortableTh>
                        <th className="text-left py-3 px-3 font-semibold">Needed Until</th>
                        <SortableTh sortKey="vehicle"        currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3">Vehicle</SortableTh>
                        <SortableTh sortKey="trip_type"      currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3" align="center">Trip</SortableTh>
                        <th className="text-center py-3 px-3 font-semibold">Check-in</th>
                        <SortableTh sortKey="status"         currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="py-3 px-3" align="center">Status</SortableTh>
                        <th className="text-center py-3 px-4 font-semibold sticky right-0 bg-muted/40 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((r: any) => (
                        <tr
                          key={r.id}
                          className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <button
                              onClick={() => setShowDetail(r)}
                              className="hover:text-blue-500 hover:underline underline-offset-2 text-left"
                              title={r.request_number}
                            >
                              {formatRequestNumber(r.request_number, { requestType: r.request_type, compact: true })}
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {REQUEST_TYPE_LABELS[r.request_type] || r.request_type || "—"}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-foreground">
                            <div className="flex flex-col gap-0.5">
                              <span>{r.requester_name}</span>
                              {r.filed_on_behalf && r.filed_by_name && (
                                <span
                                  className="text-[10px] text-muted-foreground italic"
                                  title={`Filed on behalf of ${r.requester_name} by ${r.filed_by_name}`}
                                >
                                  filed by {r.filed_by_name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground text-xs max-w-[180px] truncate">
                            {r.departure_place && r.destination
                              ? `${r.departure_place} → ${r.destination}`
                              : r.destination || r.departure_place || "—"}
                          </td>
                          <td className="py-3 px-3 text-xs">
                            {r.cross_pool_assignment ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1"
                              >
                                <Shuffle className="w-2.5 h-2.5" /> {r.pool_name || "—"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{r.pool_name || "—"}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground text-xs">
                            {r.needed_from ? format(new Date(r.needed_from), "MMM dd, HH:mm") : "—"}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground text-xs">
                            {r.needed_until ? format(new Date(r.needed_until), "MMM dd, HH:mm") : "—"}
                          </td>
                          <td className="py-3 px-3 text-xs">
                            {r.assigned_vehicle?.plate_number ? (
                              <button
                                type="button"
                                onClick={() => setShowDetail(r)}
                                className="inline-flex items-center gap-1 hover:text-primary"
                                title={
                                  (r.num_vehicles || 1) > 1
                                    ? `Multi-vehicle request — open to see all ${r.num_vehicles} assignments`
                                    : `${r.assigned_vehicle.make || ""} ${r.assigned_vehicle.model || ""}`.trim()
                                }
                              >
                                <Truck className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium text-foreground">{r.assigned_vehicle.plate_number}</span>
                                {(r.num_vehicles || 1) > 1 && (
                                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
                                    +{(r.num_vehicles || 1) - 1}
                                  </Badge>
                                )}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {r.assigned_driver && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" />
                                {r.assigned_driver.first_name} {r.assigned_driver.last_name}
                                {(r.num_vehicles || 1) > 1 && (
                                  <span className="opacity-60">+{(r.num_vehicles || 1) - 1}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {r.trip_type ? (
                              <Badge variant="outline" className="text-[10px]">
                                {r.trip_type === "one_way" ? "One Way" : "Round"}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {(() => {
                              // Check-in/out: admins/operators always; drivers only on rows assigned to them
                              const canCheckRow =
                                canManageAll || isAssignedDriverRow(r);
                              if (r.driver_checked_in_at && !r.driver_checked_out_at) {
                                return canCheckRow ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5"
                                    onClick={() => setShowCheckIn(r)}
                                    title="Check out driver"
                                  >
                                    <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                                      In
                                    </Badge>
                                  </Button>
                                ) : (
                                  <Badge className="text-[10px] bg-emerald-600">In</Badge>
                                );
                              }
                              if (r.driver_checked_out_at) {
                                return <Badge variant="secondary" className="text-[10px]">Out</Badge>;
                              }
                              if (r.status === "assigned" && canCheckRow) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5"
                                    onClick={() => setShowCheckIn(r)}
                                  >
                                    <LogIn className="w-3 h-3" />
                                  </Button>
                                );
                              }
                              return <span className="text-muted-foreground">—</span>;
                            })()}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <StatusPill status={r.status} autoClosed={r.auto_closed} />
                          </td>
                          <td className="py-3 px-4 text-center sticky right-0 bg-background hover:bg-muted/40 transition-colors shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                            <div className="flex items-center justify-center gap-0.5">
                              {/* View — always available (rows are already scoped) */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setShowDetail(r)}
                                title="View"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {/* Assign — pool supervisors / admins on approved rows
                                  awaiting vehicle+driver allocation. Opens an
                                  inline assignment modal so the supervisor never
                                  leaves the table. */}
                              {canManageAll &&
                                r.status === "approved" &&
                                r.pool_review_status !== "reviewed" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setShowQuickAssign(r)}
                                    title="Assign vehicle & driver"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                )}
                              {/* Feedback — only the requester who filed the row */}
                              {r.status === "completed" &&
                                !r.requester_rating &&
                                !r.auto_closed &&
                                isOwnRow(r) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setShowFeedback(r)}
                                    title="Give feedback"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              {/* Multi-vehicle assign — admins & operators only */}
                              {canManageAll &&
                                r.pool_category === "outsource" &&
                                (r.num_vehicles || 1) > 1 &&
                                ["approved", "pending"].includes(r.status) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setShowMultiAssign(r)}
                                    title="Multi-vehicle assign"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              {/* Deallocate — admins & operators only */}
                              {canManageAll &&
                                r.status === "assigned" &&
                                !r.driver_checked_in_at && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setShowDeallocate(r)}
                                    title="Deallocate vehicle/driver"
                                  >
                                    <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                                  </Button>
                                )}
                              {/* Edit / Resubmit — requester on pending or rejected rows
                                  (before any approval check-in); admins anytime pre-check-in */}
                              {!r.driver_checked_in_at &&
                                (canManageAll ||
                                  (isOwnRow(r) && ["pending", "rejected"].includes(r.status))) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setShowEdit(r)}
                                    title={r.status === "rejected" ? "Fix & resubmit" : "Edit request"}
                                  >
                                    {r.status === "rejected" ? (
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                                    ) : (
                                      <Pencil className="w-3.5 h-3.5 text-primary" />
                                    )}
                                  </Button>
                                )}
                              {/* Delete — admins/operators always; requester only on
                                  their own pending row before any check-in */}
                              {!["completed"].includes(r.status) &&
                                !r.driver_checked_in_at &&
                                (canManageAll ||
                                  (isOwnRow(r) && ["pending", "rejected", "cancelled"].includes(r.status))) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setShowDelete(r)}
                                    title="Remove request"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {(safePage - 1) * PAGE_SIZE + 1}
                    </span>
                    –
                    <span className="font-semibold text-foreground">
                      {Math.min(safePage * PAGE_SIZE, filtered.length)}
                    </span>{" "}
                    of <span className="font-semibold text-foreground">{filtered.length}</span> requests
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {buildPageList(safePage, totalPages).map((p, i) =>
                      p === "…" ? (
                        <span key={`e-${i}`} className="px-2 text-xs text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === safePage ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-8 min-w-8 px-2.5 text-xs",
                            p === safePage &&
                              "bg-gradient-to-br from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 border-transparent",
                          )}
                          onClick={() => setPage(p as number)}
                        >
                          {p}
                        </Button>
                      ),
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}
          </>
        )}

        {/* Dialogs */}
        {/* Inline form rendered in-page above — see "showCreate ? ..." panel */}

        {showDetail && (
          <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-4 h-4 text-primary" />
                  Request {formatRequestNumber(showDetail.request_number, { requestType: showDetail.request_type })}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Vehicle request details, workflow progress, and approval actions.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 py-4 overflow-y-auto overflow-x-hidden flex-1 space-y-4 min-w-0">
                <VehicleRequestWorkflowProgress request={showDetail} />
                <VehicleRequestApprovalFlow
                  request={showDetail}
                  approvals={approvals}
                  onClose={() => setShowDetail(null)}
                  onCheckIn={() => {
                    setShowDetail(null);
                    setShowCheckIn(showDetail);
                  }}
                  onCrossPool={() => {
                    setShowDetail(null);
                    setShowCrossPool(showDetail);
                  }}
                  onEdit={() => {
                    const req = showDetail;
                    setShowDetail(null);
                    setShowEdit(req);
                  }}
                  onDelete={() => {
                    const req = showDetail;
                    setShowDetail(null);
                    setShowDelete(req);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showFeedback && (
          <RequesterFeedbackDialog
            request={showFeedback}
            open={!!showFeedback}
            onClose={() => setShowFeedback(null)}
          />
        )}
        {showCheckIn && (
          <DriverCheckInDialog
            request={showCheckIn}
            open={!!showCheckIn}
            onClose={() => setShowCheckIn(null)}
          />
        )}
        {showCrossPool && (
          <CrossPoolAssignmentDialog
            request={showCrossPool}
            open={!!showCrossPool}
            onClose={() => setShowCrossPool(null)}
            onBack={() => {
              const req = showCrossPool;
              setShowCrossPool(null);
              setShowDetail(req);
            }}
          />
        )}
        {showDeallocate && (
          <DeallocateRequestDialog
            request={showDeallocate}
            open={!!showDeallocate}
            onClose={() => setShowDeallocate(null)}
          />
        )}
        {showDelete && (
          <DeleteRequestDialog
            request={showDelete}
            open={!!showDelete}
            onClose={() => setShowDelete(null)}
            isOwnDraft={
              isDriverOnly &&
              showDelete.requester_id === userId &&
              showDelete.status === "pending"
            }
          />
        )}
        {showEdit && (
          <EditRequestDialog
            request={showEdit}
            open={!!showEdit}
            onClose={() => setShowEdit(null)}
          />
        )}
        {showMultiAssign && (
          <MultiVehicleAssignDialog
            request={showMultiAssign}
            open={!!showMultiAssign}
            onClose={() => setShowMultiAssign(null)}
          />
        )}
        {showQuickAssign && organizationId && (
          <QuickAssignDialog
            request={showQuickAssign}
            organizationId={organizationId}
            open={!!showQuickAssign}
            onClose={() => setShowQuickAssign(null)}
          />
        )}
        <BulkImportVehicleRequestsDialog
          open={showImport}
          onOpenChange={setShowImport}
        />
      </div>
    </Layout>
  );
};

// ============== sub-components ==============

const KpiCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: "amber" | "blue" | "emerald";
}) => {
  const palette: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    blue: "from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20",
    emerald:
      "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };
  return (
    <Card
      className={cn(
        "border bg-gradient-to-br hover:shadow-md transition-shadow",
        palette[color],
      )}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center backdrop-blur-sm bg-background/40",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-black leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const StatusPill = ({ status, autoClosed }: { status: string; autoClosed?: boolean }) => {
  // Ethio Telecom brand palette: blue #0072BC, teal/green #00A693, orange #F7941D, lime #8DC63F
  const map: Record<string, string> = {
    pending: "bg-[#F7941D]/15 text-[#F7941D] border-[#F7941D]/30",
    approved: "bg-[#8DC63F]/15 text-[#6BA52F] dark:text-[#8DC63F] border-[#8DC63F]/30",
    assigned: "bg-[#0072BC]/15 text-[#0072BC] dark:text-[#3DA1E0] border-[#0072BC]/30",
    completed: "bg-[#00A693]/15 text-[#00A693] border-[#00A693]/30",
    rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    cancelled: "bg-muted text-muted-foreground border-border",
    closed: "bg-[#0072BC]/10 text-[#0072BC] dark:text-[#3DA1E0] border-[#0072BC]/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
        map[status] || "bg-muted text-muted-foreground border-border",
      )}
    >
      {status}
      {autoClosed && <span className="text-[9px]">⚡</span>}
    </span>
  );
};

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// ===== Sortable header cell =====
function SortableTh({
  sortKey,
  currentKey,
  dir,
  onSort,
  children,
  className,
  align = "left",
}: {
  sortKey: string;
  currentKey: string;
  dir: "asc" | "desc";
  onSort: (key: any) => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const isActive = currentKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const alignCls =
    align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
  const thAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <th className={cn("font-semibold", thAlign, className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 select-none transition-colors hover:text-foreground w-full",
          alignCls,
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
        aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{children}</span>
        <Icon className={cn("h-3 w-3 shrink-0", isActive ? "opacity-100" : "opacity-40")} />
      </button>
    </th>
  );
}

const VehicleRequestsPage = () => (
  <PageDateRangeProvider>
    <VehicleRequests />
  </PageDateRangeProvider>
);

export default VehicleRequestsPage;
