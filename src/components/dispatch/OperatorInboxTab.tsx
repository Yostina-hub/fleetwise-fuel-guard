/**
 * OperatorInboxTab
 * ----------------
 * Unified operator workbench surfaced inside the Dispatch page.
 * Three live tabs:
 *   1. Fuel        — pending fuel requests (uses route_fuel_request_approval
 *                    + action_fuel_approval RPCs already wired in DB).
 *   2. Incidents   — open driver-reported incidents. Vehicle-technical and
 *                    accident incidents auto-spawn a work order via the
 *                    `auto_create_wo_for_incident` trigger; this tab shows
 *                    the link and lets the operator update status.
 *   3. Vehicle     — open work orders requiring triage / approval, with a
 *                    one-click "Acknowledge" + priority badge so dispatch
 *                    can route to the right mechanic queue.
 *
 * SLA timers and realtime updates are baked in so dispatchers see new
 * driver submissions the moment they arrive without refreshing.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Fuel,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Inbox,
  ExternalLink,
  ShieldAlert,
  Car,
} from "lucide-react";

/* ────────────────────────────── helpers ─────────────────────────────── */

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

// SLA windows per priority (minutes). When breached, the row is highlighted.
const SLA_MINUTES: Record<string, number> = {
  urgent: 15,
  critical: 15,
  high: 30,
  medium: 120,
  low: 240,
};

function priorityBadge(p?: string | null) {
  const key = (p ?? "medium").toLowerCase();
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${PRIORITY_STYLES[key] ?? PRIORITY_STYLES.medium}`}>
      {key}
    </Badge>
  );
}

function SlaTimer({ createdAt, priority }: { createdAt: string; priority?: string | null }) {
  const minutes = SLA_MINUTES[(priority ?? "medium").toLowerCase()] ?? 60;
  const created = new Date(createdAt).getTime();
  const deadline = created + minutes * 60_000;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const remaining = deadline - now;
  const breached = remaining <= 0;
  const cls = breached
    ? "text-destructive font-semibold"
    : remaining < 5 * 60_000
      ? "text-warning"
      : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${cls}`}>
      <Clock className="w-3 h-3" aria-hidden="true" />
      {breached
        ? `SLA breached ${formatDistanceToNow(new Date(deadline))} ago`
        : `SLA in ${formatDistanceToNow(new Date(deadline))}`}
    </span>
  );
}

/* ────────────────────────────── Fuel tab ────────────────────────────── */

interface PendingFuelRow {
  approval_id: string;
  fuel_request_id: string;
  request_number: string | null;
  step: number;
  approver_role: string;
  estimated_cost: number | null;
  liters_requested: number | null;
  requested_by_name: string | null;
  vehicle_plate: string | null;
  generator_name: string | null;
  priority: string | null;
  created_at: string;
  is_delegated: boolean | null;
}

function FuelInbox({ orgId }: { orgId: string | null | undefined }) {
  const qc = useQueryClient();
  const [actionFor, setActionFor] = useState<{ row: PendingFuelRow; action: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["operator-inbox-fuel", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_pending_fuel_approvals");
      if (error) throw error;
      return (data ?? []) as PendingFuelRow[];
    },
    refetchInterval: 30_000,
  });

  // Realtime: refetch when fuel_requests changes
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`op-inbox-fuel-${orgId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fuel_requests", filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ["operator-inbox-fuel", orgId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId, qc]);

  const action = useMutation({
    mutationFn: async ({ approvalId, act, comment }: { approvalId: string; act: "approve" | "reject"; comment: string }) => {
      const { data, error } = await supabase.rpc("action_fuel_approval", {
        p_approval_id: approvalId,
        p_action: act,
        p_comment: comment || (act === "approve" ? "Approved by operator" : "Rejected"),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.act === "approve" ? "Fuel request approved" : "Fuel request rejected");
      setActionFor(null);
      setComment("");
      qc.invalidateQueries({ queryKey: ["operator-inbox-fuel", orgId] });
      qc.invalidateQueries({ queryKey: ["fuel-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading pending fuel approvals…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-success" aria-hidden="true" />
        <p className="font-medium">No pending fuel approvals</p>
        <p className="text-sm">All driver and operator fuel requests are processed.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {data.map((row) => (
          <Card key={row.approval_id} className="glass-strong">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Fuel className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span className="font-mono text-sm font-semibold">{row.request_number ?? row.fuel_request_id.slice(0, 8)}</span>
                    {priorityBadge(row.priority)}
                    {row.is_delegated && (
                      <Badge variant="outline" className="text-[10px]">delegated</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">step {row.step}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Vehicle:</span>{" "}
                    <span className="font-medium">{row.vehicle_plate ?? row.generator_name ?? "—"}</span>
                    <span className="text-muted-foreground"> · Liters:</span>{" "}
                    <span className="font-medium">{row.liters_requested ?? "—"}</span>
                    {row.estimated_cost != null && (
                      <>
                        <span className="text-muted-foreground"> · Est:</span>{" "}
                        <span className="font-medium">{Number(row.estimated_cost).toLocaleString()} ETB</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Requested by {row.requested_by_name ?? "—"} · {formatDistanceToNow(new Date(row.created_at))} ago
                  </div>
                  <div className="mt-1.5">
                    <SlaTimer createdAt={row.created_at} priority={row.priority} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActionFor({ row, action: "reject" });
                      setComment("");
                    }}
                    disabled={action.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" aria-hidden="true" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActionFor({ row, action: "approve" });
                      setComment("");
                    }}
                    disabled={action.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" aria-hidden="true" /> Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approve / Reject confirm + comment */}
      <Dialog open={!!actionFor} onOpenChange={(o) => !o && setActionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionFor?.action === "approve" ? "Approve fuel request" : "Reject fuel request"}
            </DialogTitle>
            <DialogDescription>
              {actionFor?.row.request_number} · {actionFor?.row.liters_requested} L ·{" "}
              {actionFor?.row.vehicle_plate ?? actionFor?.row.generator_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="op-fuel-comment">Comment {actionFor?.action === "reject" && "(required)"}</Label>
            <Textarea
              id="op-fuel-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={
                actionFor?.action === "approve"
                  ? "Optional note for the audit trail…"
                  : "Reason for rejection (visible to driver and dispatch)"
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionFor(null)} disabled={action.isPending}>
              Cancel
            </Button>
            <Button
              variant={actionFor?.action === "reject" ? "destructive" : "default"}
              disabled={action.isPending || (actionFor?.action === "reject" && comment.trim().length < 3)}
              onClick={() =>
                actionFor &&
                action.mutate({ approvalId: actionFor.row.approval_id, act: actionFor.action, comment })
              }
            >
              {action.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              Confirm {actionFor?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ──────────────────────────── Incidents tab ─────────────────────────── */

interface IncidentRow {
  id: string;
  incident_number: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string | null;
  location: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  trip_id: string | null;
  created_at: string;
  auto_work_order_id: string | null;
  can_continue: string | null;
  requested_assistance: string[] | null;
  dispatch_decision: string | null;
  dispatch_decision_at: string | null;
  replacement_vehicle_id: string | null;
  replacement_driver_id: string | null;
  vehicles?: { plate_number: string | null; make: string | null; model: string | null } | null;
  drivers?: { first_name: string | null; last_name: string | null; phone: string | null } | null;
}

function IncidentsInbox({ orgId }: { orgId: string | null | undefined }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["operator-inbox-incidents", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select(
          "id, incident_number, incident_type, severity, status, description, location, vehicle_id, driver_id, trip_id, created_at, auto_work_order_id, can_continue, requested_assistance, dispatch_decision, dispatch_decision_at, replacement_vehicle_id, replacement_driver_id, vehicles:vehicles!incidents_vehicle_id_fkey(plate_number, make, model), drivers:drivers!incidents_driver_id_fkey(first_name, last_name, phone)",
        )
        .eq("organization_id", orgId!)
        .in("status", ["open", "investigating"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as IncidentRow[];
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`op-inbox-inc-${orgId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents", filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ["operator-inbox-incidents", orgId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId, qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("incidents")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Incident marked ${v.status}`);
      qc.invalidateQueries({ queryKey: ["operator-inbox-incidents", orgId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading open incidents…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-success" aria-hidden="true" />
        <p className="font-medium">No open incidents</p>
        <p className="text-sm">All driver-reported issues are resolved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const isAccident = row.incident_type === "accident";
        const Icon = isAccident ? Car : row.incident_type === "breakdown" ? Wrench : ShieldAlert;
        return (
          <Card key={row.id} className="glass-strong">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span className="font-mono text-sm font-semibold">{row.incident_number}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{row.incident_type}</Badge>
                    {priorityBadge(row.severity)}
                    <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
                    {row.auto_work_order_id && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-success/10 text-success border-success/30"
                      >
                        WO created
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm line-clamp-2">{row.description || "No description"}</p>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {row.vehicles?.plate_number && (
                      <span>
                        Vehicle:{" "}
                        <span className="font-medium text-foreground">
                          {row.vehicles.plate_number}
                          {row.vehicles.make ? ` · ${row.vehicles.make} ${row.vehicles.model ?? ""}` : ""}
                        </span>
                      </span>
                    )}
                    {row.drivers?.name && (
                      <span>
                        Driver: <span className="font-medium text-foreground">{row.drivers.name}</span>
                        {row.drivers.phone && <span className="text-muted-foreground"> · {row.drivers.phone}</span>}
                      </span>
                    )}
                    {row.location && <span>📍 {row.location}</span>}
                    <span>{formatDistanceToNow(new Date(row.created_at))} ago</span>
                  </div>
                  <div className="mt-1.5">
                    <SlaTimer createdAt={row.created_at} priority={row.severity} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {row.auto_work_order_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/work-orders?id=${row.auto_work_order_id}`, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" /> Open WO
                    </Button>
                  )}
                  {row.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: row.id, status: "investigating" })}
                      disabled={updateStatus.isPending}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: row.id, status: "resolved" })}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" aria-hidden="true" /> Resolve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ────────────────────────── Work Orders tab ─────────────────────────── */

interface WorkOrderRow {
  id: string;
  work_order_number: string;
  work_type: string;
  priority: string | null;
  status: string;
  approval_status: string | null;
  service_description: string;
  created_at: string;
  vehicle_id: string;
  vehicles?: { plate_number: string | null; make: string | null; model: string | null } | null;
}

function WorkOrdersInbox({ orgId }: { orgId: string | null | undefined }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["operator-inbox-wo", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, work_order_number, work_type, priority, status, approval_status, service_description, created_at, vehicle_id, vehicles:vehicle_id(plate_number, make, model)",
        )
        .eq("organization_id", orgId!)
        .in("status", ["pending", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as WorkOrderRow[];
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`op-inbox-wo-${orgId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders", filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ["operator-inbox-wo", orgId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId, qc]);

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("work_orders")
        .update({ status: "scheduled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Work order scheduled");
      qc.invalidateQueries({ queryKey: ["operator-inbox-wo", orgId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading open work orders…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-success" aria-hidden="true" />
        <p className="font-medium">No vehicle issues awaiting triage</p>
        <p className="text-sm">All work orders are scheduled or completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => (
        <Card key={row.id} className="glass-strong">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Wrench className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="font-mono text-sm font-semibold">{row.work_order_number}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{row.work_type}</Badge>
                  {priorityBadge(row.priority)}
                  <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
                  {row.work_order_number?.startsWith("WO-AUTO-") && (
                    <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                      auto-escalated
                    </Badge>
                  )}
                </div>
                <p className="text-sm line-clamp-2">{row.service_description}</p>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  {row.vehicles?.plate_number && (
                    <span>
                      Vehicle:{" "}
                      <span className="font-medium text-foreground">
                        {row.vehicles.plate_number}
                        {row.vehicles.make ? ` · ${row.vehicles.make} ${row.vehicles.model ?? ""}` : ""}
                      </span>
                    </span>
                  )}
                  <span>{formatDistanceToNow(new Date(row.created_at))} ago</span>
                </div>
                <div className="mt-1.5">
                  <SlaTimer createdAt={row.created_at} priority={row.priority} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/work-orders?id=${row.id}`, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" /> Open
                </Button>
                {row.status === "pending" && (
                  <Button size="sm" onClick={() => acknowledge.mutate(row.id)} disabled={acknowledge.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-1" aria-hidden="true" /> Schedule
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ───────────────────────────── container ────────────────────────────── */

export default function OperatorInboxTab() {
  const { organizationId } = useOrganization();
  const [tab, setTab] = useState("fuel");

  // Top-line counts so dispatchers see workload on each tab
  const { data: counts } = useQuery({
    queryKey: ["operator-inbox-counts", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const [fuel, inc, wo] = await Promise.all([
        supabase.rpc("get_my_pending_fuel_approvals"),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId!)
          .in("status", ["open", "investigating"]),
        supabase
          .from("work_orders")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId!)
          .in("status", ["pending", "scheduled"]),
      ]);
      return {
        fuel: (fuel.data ?? []).length,
        incidents: inc.count ?? 0,
        workOrders: wo.count ?? 0,
      };
    },
    refetchInterval: 30_000,
  });

  const totalBadge = useMemo(
    () => (counts ? counts.fuel + counts.incidents + counts.workOrders : 0),
    [counts],
  );

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5 text-primary" aria-hidden="true" />
          Operator Inbox
          {totalBadge > 0 && (
            <Badge variant="outline" className="ml-1 bg-primary/10 text-primary border-primary/30">
              {totalBadge} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full lg:w-auto lg:inline-flex">
            <TabsTrigger value="fuel" className="gap-2">
              <Fuel className="w-4 h-4" aria-hidden="true" />
              Fuel
              {counts?.fuel ? (
                <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
                  {counts.fuel}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="incidents" className="gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Incidents
              {counts?.incidents ? (
                <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
                  {counts.incidents}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="workorders" className="gap-2">
              <Wrench className="w-4 h-4" aria-hidden="true" />
              Vehicle Issues
              {counts?.workOrders ? (
                <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
                  {counts.workOrders}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fuel">
            <FuelInbox orgId={organizationId} />
          </TabsContent>
          <TabsContent value="incidents">
            <IncidentsInbox orgId={organizationId} />
          </TabsContent>
          <TabsContent value="workorders">
            <WorkOrdersInbox orgId={organizationId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
