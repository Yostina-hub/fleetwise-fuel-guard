/**
 * Requester Portal — for users with the basic 'user' role.
 *
 * What it does
 * ------------
 *  1. Shows KPI cards (Pending / Approved / In-Progress / Completed) for the
 *     signed-in user's own vehicle requests.
 *  2. Lets the user create a new vehicle request via the existing
 *     UnifiedVehicleRequestDialog (battle-tested form with validation,
 *     pool routing, and approval RPC).
 *  3. Lists all of the user's requests with search + status filter.
 *  4. Opens a detail drawer with status timeline + comment thread per request.
 *
 * RLS isolation: the basic 'user' role only sees their own requests
 * (enforced server-side by `is_basic_user_only` policy).
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  ClipboardList,
  Clock,
  CheckCircle2,
  Hourglass,
  PlayCircle,
  Plus,
  Search,
  Inbox,
  Loader2,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { formatInOrgTz } from "@/components/ui/date-time-picker";
import { cn } from "@/lib/utils";
import { UnifiedVehicleRequestDialog } from "@/components/vehicle-requests/UnifiedVehicleRequestDialog";
import { REQUEST_STATUSES } from "@/components/requester-portal/RequestStatusBadge";
import { PageDateRangeProvider, usePageDateRange } from "@/contexts/PageDateRangeContext";
import PageDateRangeFilter from "@/components/common/PageDateRangeFilter";
import {
  RequestDetailDrawer,
  type RequestDetail,
} from "@/components/requester-portal/RequestDetailDrawer";
import { EditRequestDialog } from "@/components/requester-portal/EditRequestDialog";
import { RateTripDialog } from "@/components/ratings/RateTripDialog";
import type { PendingRatingTrip } from "@/hooks/usePendingRatings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type StatusFilter = "all" | (typeof REQUEST_STATUSES)[number];

const RequesterPortal = () => (
  <PageDateRangeProvider>
    <RequesterPortalInner />
  </PageDateRangeProvider>
);

const RequesterPortalInner = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { startISO, endISO } = usePageDateRange();

  const [openNew, setOpenNew] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "history">("requests");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<RequestDetail | null>(null);
  // Edit / delete are only available while a request is still `pending`
  // (i.e. the approver has not acted on it yet). After approval the
  // requester can only view / cancel via the detail drawer.
  const [editing, setEditing] = useState<RequestDetail | null>(null);
  const [deleting, setDeleting] = useState<RequestDetail | null>(null);
  // Trip rating dialog (opened via notification deep-link `?rate=<id>`)
  const [ratingTrip, setRatingTrip] = useState<PendingRatingTrip | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const deleteRequest = useMutation({
    mutationFn: async (r: RequestDetail) => {
      // Server-side gate via `.eq('status','pending')` — if status changed
      // since render the row simply isn't matched, preventing accidental loss.
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .delete()
        .eq("id", r.id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request deleted" });
      qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] });
      setDeleting(null);
    },
    onError: (e: any) =>
      toast({
        title: "Delete failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  // Fetch this user's requests in the selected page-level date range.
  // We match a row when EITHER its trip start (`needed_from`) OR its
  // submission time (`created_at`) falls within the selected window. This
  // ensures freshly-submitted requests always appear in the table even when
  // their `needed_from` is in a different timezone than the page filter
  // (e.g. user picks 00:00 local time which serializes as the previous UTC
  // day after timezone normalization).
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["my-vehicle-requests", organizationId, user?.id, startISO, endISO],
    queryFn: async () => {
      if (!user || !organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)",
        )
        .eq("organization_id", organizationId)
        .eq("requester_id", user.id)
        .or(
          `and(needed_from.gte.${startISO},needed_from.lte.${endISO}),` +
            `and(needed_from.is.null,created_at.gte.${startISO},created_at.lte.${endISO}),` +
            `and(created_at.gte.${startISO},created_at.lte.${endISO})`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestDetail[];
    },
    enabled: !!user && !!organizationId,
  });

  // Realtime — refresh on any change to my requests
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my-vehicle-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_requests",
          filter: `requester_id=eq.${user.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  // Deep-link from notifications: `/my-requests?rate=<request-id>` opens the
  // RateTripDialog for that completed trip. We fetch the row so the dialog
  // works even if the request isn't in the current date-range filter.
  useEffect(() => {
    const rateId = searchParams.get("rate");
    if (!rateId || !user || !organizationId) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          `id, request_number, purpose, destination, departure_place,
           needed_from, completed_at, driver_checked_out_at,
           assigned_vehicle_id, assigned_driver_id, rated_at,
           vehicles:assigned_vehicle_id ( plate_number, make, model ),
           drivers:assigned_driver_id ( full_name )`,
        )
        .eq("id", rateId)
        .eq("requester_id", user.id)
        .maybeSingle();

      const { data: existingRating } = await (supabase as any)
        .from("vehicle_request_ratings")
        .select("id")
        .eq("vehicle_request_id", rateId)
        .eq("rated_by", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data || data.rated_at || existingRating) {
        const next = new URLSearchParams(searchParams);
        next.delete("rate");
        setSearchParams(next, { replace: true });
        return;
      }
      setRatingTrip(data as PendingRatingTrip);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user, organizationId, setSearchParams]);

  // KPIs
  const kpis = useMemo(() => {
    const counts = {
      pending: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      total: requests.length,
    };
    let totalApprovalMs = 0;
    let approvedCount = 0;
    requests.forEach((r) => {
      const s = r.status as keyof typeof counts;
      if (s in counts) (counts as any)[s] += 1;
      if (r.assigned_at) {
        // assignment counts as in_progress for KPI
        counts.in_progress += 0;
      }
      if (r.approved_at) {
        totalApprovalMs += new Date(r.approved_at).getTime() - new Date(r.created_at).getTime();
        approvedCount += 1;
      }
    });
    const avgApprovalH =
      approvedCount > 0 ? totalApprovalMs / approvedCount / (1000 * 60 * 60) : null;
    return { ...counts, avgApprovalH };
  }, [requests]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.request_number?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  const history = useMemo(
    () => requests.filter((r) => ["completed", "rejected", "cancelled"].includes(r.status)),
    [requests],
  );

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Hero header */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <Car className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">My Fleet Requests</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit a new vehicle request and track every step until your trip is completed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                aria-label="Refresh requests"
                className="gap-1.5"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} aria-hidden="true" />
                Refresh
              </Button>
              <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Request
              </Button>
            </div>
          </div>
        </div>

        {/* Page-level date range filter — drives the requests table & history */}
        <PageDateRangeFilter hint="filters requests by needed-from date" />

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            label="Pending"
            value={kpis.pending}
            icon={Hourglass}
            tone="bg-warning/15 text-warning border-warning/30"
          />
          <KPICard
            label="Approved"
            value={kpis.approved}
            icon={CheckCircle2}
            tone="bg-primary/15 text-primary border-primary/30"
          />
          <KPICard
            label="In Progress"
            value={kpis.in_progress}
            icon={PlayCircle}
            tone="bg-success/15 text-success border-success/30"
          />
          <KPICard
            label="Completed"
            value={kpis.completed}
            icon={CheckCircle2}
            tone="bg-success/15 text-success border-success/30"
            sub={
              kpis.avgApprovalH != null
                ? `Avg approval ${kpis.avgApprovalH.toFixed(1)}h`
                : undefined
            }
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="requests" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              All Requests
              <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                ({requests.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              History
              <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                ({history.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* All requests */}
          <TabsContent value="requests" className="space-y-4 mt-4">
            <FiltersRow
              search={search}
              onSearch={setSearch}
              status={statusFilter}
              onStatus={setStatusFilter}
            />
            <RequestList
              loading={isLoading}
              items={filtered}
              onOpen={(r) => setSelected(r)}
              onEdit={(r) => setEditing(r)}
              onDelete={(r) => setDeleting(r)}
              emptyTitle="No requests yet"
              emptyHint='Click "New Request" to submit your first vehicle request.'
            />
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <RequestList
              loading={isLoading}
              items={history}
              onOpen={(r) => setSelected(r)}
              onEdit={(r) => setEditing(r)}
              onDelete={(r) => setDeleting(r)}
              emptyTitle="No closed requests"
              emptyHint="Completed, rejected and cancelled requests appear here."
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <UnifiedVehicleRequestDialog
        open={openNew}
        onOpenChange={(o) => {
          setOpenNew(o);
          if (!o) refetch();
        }}
        source="requester-portal"
      />
      <RequestDetailDrawer
        request={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        canCancel
      />
      <EditRequestDialog
        request={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <RateTripDialog
        trip={ratingTrip}
        open={!!ratingTrip}
        onOpenChange={(o) => {
          if (!o) {
            setRatingTrip(null);
            // Strip the `rate` query param so refreshes don't re-open the dialog.
            const next = new URLSearchParams(searchParams);
            if (next.has("rate")) {
              next.delete("rate");
              setSearchParams(next, { replace: true });
            }
          }
        }}
        onRated={() => qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] })}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>
              Request <span className="font-mono">{deleting?.request_number}</span> will
              be permanently removed. This can only be done while the request is still pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRequest.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) deleteRequest.mutate(deleting);
              }}
              disabled={deleteRequest.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRequest.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

/* ---------- Sub-components ---------- */

function KPICard({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string;
  value: number;
  icon: typeof Hourglass;
  tone: string;
  sub?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg border flex items-center justify-center shrink-0", tone)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tabular-nums leading-tight">{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function FiltersRow({
  search,
  onSearch,
  status,
  onStatus,
}: {
  search: string;
  onSearch: (s: string) => void;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Label htmlFor="rp-search" className="sr-only">
          Search requests
        </Label>
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="rp-search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by number, purpose, destination…"
          className="pl-9"
          maxLength={120}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="rp-status" className="sr-only">
          Filter by status
        </Label>
        <Select value={status} onValueChange={(v) => onStatus(v as StatusFilter)}>
          <SelectTrigger id="rp-status" className="w-[180px]" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ---------- Table-based request list (mirrors dispatcher VehicleRequestsPanel) ---------- */

const requestTypeLabels: Record<string, string> = {
  daily_operation: "Daily",
  nighttime_operation: "Nighttime",
  project_operation: "Project",
  field_operation: "Field",
  group_operation: "Group",
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  assigned: "default",
  in_progress: "default",
  completed: "outline",
  rejected: "destructive",
  cancelled: "secondary",
  closed: "outline",
};

type SortKey =
  | "request_number"
  | "request_type"
  | "purpose"
  | "route"
  | "needed_from"
  | "needed_until"
  | "vehicle"
  | "status";

function RequestList({
  loading,
  items,
  onOpen,
  onEdit,
  onDelete,
  emptyTitle,
  emptyHint,
}: {
  loading: boolean;
  items: RequestDetail[];
  onOpen: (r: RequestDetail) => void;
  onEdit: (r: RequestDetail) => void;
  onDelete: (r: RequestDetail) => void;
  emptyTitle: string;
  emptyHint: string;
}) {
  // Default to newest first by needed_from; date columns flip to desc on first
  // click so users see "latest day first" without an extra toggle.
  const [sortKey, setSortKey] = useState<SortKey>("needed_from");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const isDateKey = (k: SortKey) => k === "needed_from" || k === "needed_until";
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(isDateKey(k) ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...items];
    const dir = sortDir === "asc" ? 1 : -1;
    const tsOrZero = (v: any) => (v ? new Date(v).getTime() : 0);
    const getVal = (r: RequestDetail): string | number => {
      switch (sortKey) {
        case "request_number": return (r.request_number || "").toLowerCase();
        case "request_type":   return ((r as any).request_type || "").toLowerCase();
        case "purpose":        return (r.purpose || "").toLowerCase();
        case "route":          return (((r as any).departure_place || "") + " " + (r.destination || "")).toLowerCase();
        case "needed_from":    return tsOrZero(r.needed_from);
        case "needed_until":   return tsOrZero((r as any).needed_until);
        case "vehicle":        return (r.assigned_vehicle?.plate_number || "").toLowerCase();
        case "status":         return (r.status || "").toLowerCase();
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      // Stable tiebreaker: newest created_at first so freshly-submitted
      // requests always surface at the top of any equal/empty-date group.
      return tsOrZero((b as any).created_at) - tsOrZero((a as any).created_at);
    });
    return arr;
  }, [items, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
        Loading requests…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="text-sm font-medium text-foreground">{emptyTitle}</div>
          <div className="text-xs text-muted-foreground mt-1">{emptyHint}</div>
        </CardContent>
      </Card>
    );
  }

  // Sortable column header. Mirrors VehicleRequestsPanel.SortHeader to keep
  // visual parity between the dispatcher and requester views.
  const SortHeader = ({
    label,
    field,
    align = "left",
  }: { label: string; field: SortKey; align?: "left" | "center" }) => {
    const active = sortKey === field;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th className={cn(`text-${align} py-2 px-3`)}>
        <button
          type="button"
          onClick={() => toggleSort(field)}
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
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs">
                <SortHeader label="Request #"    field="request_number" />
                <SortHeader label="Type"         field="request_type" />
                <SortHeader label="Purpose"      field="purpose" />
                <SortHeader label="Route"        field="route" />
                <SortHeader label="Needed From"  field="needed_from" />
                <SortHeader label="Needed Until" field="needed_until" />
                <SortHeader label="Vehicle"      field="vehicle" />
                <SortHeader label="Status"       field="status" align="center" />
                <th className="text-center py-2 px-3 text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const dep = (r as any).departure_place;
                const route = dep && r.destination
                  ? `${dep} → ${r.destination}`
                  : (r.destination || dep || "—");
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium font-mono text-xs">{r.request_number}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px]">
                        {requestTypeLabels[(r as any).request_type] || (r as any).request_type || "—"}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate" title={r.purpose}>{r.purpose}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs max-w-[180px] truncate" title={route}>
                      {route}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">
                      {r.needed_from ? formatInOrgTz(r.needed_from, "MMM dd, HH:mm") : "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">
                      {(r as any).needed_until ? formatInOrgTz((r as any).needed_until, "MMM dd, HH:mm") : "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {r.assigned_vehicle?.plate_number || "—"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={statusBadgeVariant[r.status] || "secondary"} className="text-[10px]">
                        {r.status?.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {/* Edit / Delete are gated on `pending` — once the
                          approver acts the requester can only view. */}
                      <div className="inline-flex items-center gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="View"
                          onClick={() => onOpen(r)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {r.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              title="Edit"
                              onClick={() => onEdit(r)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              title="Delete"
                              onClick={() => onDelete(r)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default RequesterPortal;
