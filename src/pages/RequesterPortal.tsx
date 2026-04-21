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
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  XCircle,
  Inbox,
  Loader2,
  RefreshCw,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { UnifiedVehicleRequestDialog } from "@/components/vehicle-requests/UnifiedVehicleRequestDialog";
import { RequestStatusBadge, REQUEST_STATUSES } from "@/components/requester-portal/RequestStatusBadge";
import {
  RequestDetailDrawer,
  type RequestDetail,
} from "@/components/requester-portal/RequestDetailDrawer";

type StatusFilter = "all" | (typeof REQUEST_STATUSES)[number];

const RequesterPortal = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const [openNew, setOpenNew] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "history">("requests");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<RequestDetail | null>(null);

  // Fetch this user's requests
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["my-vehicle-requests", organizationId, user?.id],
    queryFn: async () => {
      if (!user || !organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)",
        )
        .eq("organization_id", organizationId)
        .eq("requester_id", user.id)
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

function RequestList({
  loading,
  items,
  onOpen,
  emptyTitle,
  emptyHint,
}: {
  loading: boolean;
  items: RequestDetail[];
  onOpen: (r: RequestDetail) => void;
  emptyTitle: string;
  emptyHint: string;
}) {
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
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {items.map((r) => (
        <RequestRow key={r.id} request={r} onOpen={onOpen} />
      ))}
    </div>
  );
}

function RequestRow({
  request,
  onOpen,
}: {
  request: RequestDetail;
  onOpen: (r: RequestDetail) => void;
}) {
  const submitted = new Date(request.created_at);
  const needed = new Date(request.needed_from);
  return (
    <button
      type="button"
      onClick={() => onOpen(request)}
      className={cn(
        "group text-left rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors",
        "p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={`Open request ${request.request_number}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              {request.request_number}
            </span>
            <RequestStatusBadge status={request.status} />
            {request.priority && request.priority !== "normal" && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                {request.priority}
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-foreground mt-1 line-clamp-1">
            {request.purpose}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {request.destination ?? "No destination"}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
            <span>
              Needed: <span className="text-foreground">{format(needed, "MMM d, HH:mm")}</span>
            </span>
            <span>·</span>
            <span>Submitted {formatDistanceToNow(submitted, { addSuffix: true })}</span>
            {request.assigned_vehicle?.plate_number && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Car className="h-3 w-3" aria-hidden="true" />
                  {request.assigned_vehicle.plate_number}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
          View →
        </div>
      </div>
    </button>
  );
}

export default RequesterPortal;
