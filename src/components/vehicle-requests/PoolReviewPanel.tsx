import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Users,
  UserCheck,
  Layers,
  FileSignature,
  RotateCcw,
  ScrollText,
  Zap,
  Loader2,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { PoolAssignmentPicker } from "./PoolAssignmentPicker";
import { QuickAssignDialog } from "./QuickAssignDialog";

const sendAssignmentSMS = async (request: any, vehicleId: string, driverId?: string) => {
  try {
    const { data: vehicle } = await (supabase as any)
      .from("vehicles").select("plate_number, make, model").eq("id", vehicleId).single();

    const driverInfo = driverId
      ? await (supabase as any).from("drivers").select("first_name, last_name, phone").eq("id", driverId).single()
      : null;

    // SMS to driver with trip details
    if (driverInfo?.data?.phone) {
      const msg = `Trip Assignment ${request.request_number}: Vehicle ${vehicle?.plate_number || ""}. From ${request.departure_place || "—"} to ${request.destination || "—"} at ${format(new Date(request.needed_from), "MMM dd HH:mm")}. Purpose: ${(request.purpose || "").substring(0, 60)}`;
      await supabase.functions.invoke("send-sms", { body: { to: driverInfo.data.phone, message: msg, type: "trip_assignment" } });
    }

    // SMS to requester with feedback link
    const { data: requesterProfile } = await (supabase as any)
      .from("profiles").select("phone").eq("id", request.requester_id).single();
    if (requesterProfile?.phone) {
      const link = `${window.location.origin}/vehicle-requests?feedback=${request.id}`;
      const driverName = driverInfo?.data ? `${driverInfo.data.first_name} ${driverInfo.data.last_name}` : "TBA";
      const msg = `Your request ${request.request_number} is assigned. Vehicle: ${vehicle?.plate_number}, Driver: ${driverName}. Feedback after trip: ${link}`;
      await supabase.functions.invoke("send-sms", { body: { to: requesterProfile.phone, message: msg, type: "trip_assignment" } });
    }
  } catch (e) {
    console.warn("SMS notification failed (non-blocking):", e);
  }
};

interface Props {
  requests: any[];
  organizationId: string;
}

interface ConsolidatedGroup {
  key: string;
  departure: string;
  destination: string;
  date: string;
  requests: any[];
  totalPassengers: number;
}

/**
 * Group requests that share similar route + date for consolidation
 */
const consolidateRequests = (requests: any[]): { groups: ConsolidatedGroup[]; ungrouped: any[] } => {
  const groups: Map<string, ConsolidatedGroup> = new Map();
  const ungrouped: any[] = [];

  for (const r of requests) {
    const dep = (r.departure_place || "").toLowerCase().trim();
    const dest = (r.destination || "").toLowerCase().trim();
    const date = r.needed_from ? format(new Date(r.needed_from), "yyyy-MM-dd") : "";

    if (!dep || !dest || !date) {
      ungrouped.push(r);
      continue;
    }

    const key = `${dep}|${dest}|${date}`;
    const existing = groups.get(key);
    if (existing) {
      existing.requests.push(r);
      existing.totalPassengers += r.passengers || 1;
    } else {
      groups.set(key, {
        key,
        departure: r.departure_place,
        destination: r.destination,
        date,
        requests: [r],
        totalPassengers: r.passengers || 1,
      });
    }
  }

  // Only return groups with 2+ requests as consolidated
  const consolidatedGroups: ConsolidatedGroup[] = [];
  for (const g of groups.values()) {
    if (g.requests.length >= 2) {
      consolidatedGroups.push(g);
    } else {
      ungrouped.push(...g.requests);
    }
  }

  return { groups: consolidatedGroups, ungrouped };
};

type ContractDecision = "approved" | "rejected" | "changes_requested";

export const PoolReviewPanel = ({ requests, organizationId }: Props) => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showConsolidated, setShowConsolidated] = useState(true);

  // Contract-style decision dialog state
  const [contractTarget, setContractTarget] = useState<{ requestId: string; requestNumber: string } | null>(null);
  const [contractDecision, setContractDecision] = useState<ContractDecision>("approved");
  const [contractConditions, setContractConditions] = useState("");
  const [contractNotes, setContractNotes] = useState("");

  const openContractDialog = (r: any, decision: ContractDecision = "approved") => {
    setContractTarget({ requestId: r.id, requestNumber: r.request_number });
    setContractDecision(decision);
    setContractConditions(r.pool_review_conditions || "");
    setContractNotes(r.pool_review_notes || "");
  };
  const closeContractDialog = () => {
    setContractTarget(null);
    setContractConditions("");
    setContractNotes("");
  };

  // Requests that are approved and need pool review/assignment
  const approvedRequests = requests.filter(
    (r: any) => r.status === "approved" && r.pool_review_status !== "reviewed"
  );

  const { groups, ungrouped } = useMemo(
    () => consolidateRequests(approvedRequests),
    [approvedRequests]
  );

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "reviewed" | "unavailable" }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("vehicle_requests").update({
        pool_review_status: action,
        pool_reviewer_id: user!.id,
        pool_reviewed_at: new Date().toISOString(),
      }).eq("id", requestId);
    },
    onSuccess: () => {
      toast.success("Pool review updated");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Contract-style decision: approve with conditions, reject, or request changes.
  // - approved          → keeps status=approved, awaiting vehicle assignment, conditions stored as a contract clause
  // - rejected          → status=rejected, requester sees pool reason
  // - changes_requested → status=pending so requester can edit & resubmit; clears prior pool decision flags
  const contractMutation = useMutation({
    mutationFn: async ({
      requestId,
      decision,
      conditions,
      notes,
    }: {
      requestId: string;
      decision: ContractDecision;
      conditions: string;
      notes: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const now = new Date().toISOString();
      const updates: any = {
        pool_review_decision: decision,
        pool_review_conditions: conditions || null,
        pool_review_notes: notes || null,
        pool_reviewer_id: user!.id,
        pool_reviewed_at: now,
      };

      if (decision === "approved") {
        // Keep request in pool queue for vehicle assignment, but mark contract signed.
        updates.pool_review_status = "contract_signed";
      } else if (decision === "rejected") {
        updates.pool_review_status = "rejected";
        updates.status = "rejected";
        updates.rejected_at = now;
        updates.rejection_reason = notes || "Rejected by pool supervisor";
      } else if (decision === "changes_requested") {
        // Send back to the requester for edits & resubmission.
        updates.pool_review_status = "changes_requested";
        updates.status = "pending";
      }

      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(updates)
        .eq("id", requestId);
      if (error) throw error;

      // Notify the requester so they see the contract decision in-app.
      const request = requests.find((r: any) => r.id === requestId);
      if (request?.requester_id) {
        const titleMap: Record<ContractDecision, string> = {
          approved: "Pool Contract Approved",
          rejected: "Pool Contract Rejected",
          changes_requested: "Pool Supervisor Requested Changes",
        };
        try {
          await supabase.rpc("send_notification", {
            _user_id: request.requester_id,
            _type: "vehicle_request_pool_review",
            _title: titleMap[decision],
            _message: `Request ${request.request_number}: ${notes || conditions || decision.replace("_", " ")}`,
            _link: "/vehicle-requests",
          });
        } catch (e) {
          console.error("In-app notification error:", e);
        }
      }
    },
    onSuccess: (_d, vars) => {
      const msgMap: Record<ContractDecision, string> = {
        approved: "Contract approved — request ready for vehicle assignment",
        rejected: "Request rejected with reason",
        changes_requested: "Request sent back to requester for edits",
      };
      toast.success(msgMap[vars.decision]);
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      closeContractDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ requestId, vehicleId, driverId }: { requestId: string; vehicleId: string; driverId?: string }) => {
      const request = requests.find((r: any) => r.id === requestId);
      const mins = Math.round((Date.now() - new Date(request.created_at).getTime()) / 60000);
      
      const updates: any = {
        status: "assigned",
        assigned_vehicle_id: vehicleId,
        assigned_at: new Date().toISOString(),
        actual_assignment_minutes: mins,
        pool_review_status: "reviewed",
        pool_reviewed_at: new Date().toISOString(),
      };
      
      if (driverId) {
        updates.assigned_driver_id = driverId;
      }

      const user = (await supabase.auth.getUser()).data.user;
      updates.pool_reviewer_id = user!.id;
      updates.assigned_by = user!.id;

      await (supabase as any).from("vehicle_requests").update(updates).eq("id", requestId);

      // Set vehicle to in_use
      await (supabase as any).from("vehicles").update({
        status: "in_use", updated_at: new Date().toISOString(),
      }).eq("id", vehicleId);

      // Set driver to on_trip
      if (driverId) {
        await (supabase as any).from("drivers").update({
          status: "on_trip", updated_at: new Date().toISOString(),
        }).eq("id", driverId);
      }

      // Send in-app notification to requester
      if (request?.requester_id) {
        const { data: vehicle } = await (supabase as any).from("vehicles").select("plate_number").eq("id", vehicleId).single();
        try {
          await supabase.rpc("send_notification", {
            _user_id: request.requester_id,
            _type: "vehicle_assigned",
            _title: "Vehicle Assigned",
            _message: `Vehicle ${vehicle?.plate_number || "N/A"} assigned to request ${request.request_number}`,
            _link: "/vehicle-requests",
          });
        } catch (e) { console.error("In-app notification error:", e); }
      }

      // Send SMS notifications to driver + requester
      await sendAssignmentSMS(request, vehicleId, driverId);
    },
    onSuccess: () => {
      toast.success("Vehicle assigned from pool");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      setExpandedId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Batch assign: assign same vehicle to all requests in a group
  const batchAssignMutation = useMutation({
    mutationFn: async ({ requestIds, vehicleId, driverId }: { requestIds: string[]; vehicleId: string; driverId?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      for (const requestId of requestIds) {
        const request = requests.find((r: any) => r.id === requestId);
        const mins = Math.round((Date.now() - new Date(request.created_at).getTime()) / 60000);
        const updates: any = {
          status: "assigned",
          assigned_vehicle_id: vehicleId,
          assigned_at: new Date().toISOString(),
          actual_assignment_minutes: mins,
          pool_review_status: "reviewed",
          pool_reviewed_at: new Date().toISOString(),
          pool_reviewer_id: user!.id,
          assigned_by: user!.id,
        };
        if (driverId) updates.assigned_driver_id = driverId;
        await (supabase as any).from("vehicle_requests").update(updates).eq("id", requestId);
      }
      // Set vehicle to in_use for batch
      await (supabase as any).from("vehicles").update({
        status: "in_use", updated_at: new Date().toISOString(),
      }).eq("id", vehicleId);
      if (driverId) {
        await (supabase as any).from("drivers").update({
          status: "on_trip", updated_at: new Date().toISOString(),
        }).eq("id", driverId);
      }
      // Send SMS to each requester + driver (driver only once)
      const seenDriver = new Set<string>();
      for (const requestId of requestIds) {
        const request = requests.find((r: any) => r.id === requestId);
        if (!request) continue;
        const driverKey = driverId ? `${driverId}` : "";
        if (driverId && seenDriver.has(driverKey)) {
          // Skip duplicate driver SMS but still notify requester
          await sendAssignmentSMS(request, vehicleId, undefined);
        } else {
          await sendAssignmentSMS(request, vehicleId, driverId);
          if (driverId) seenDriver.add(driverKey);
        }
      }
    },
    onSuccess: () => {
      toast.success("Batch assignment complete — consolidated trip assigned");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      setExpandedId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Auto-Dispatch (server-side route merge + closest-vehicle assignment) ──
  const autoDispatchMutation = useMutation({
    mutationFn: async ({ dryRun }: { dryRun: boolean }) => {
      const { data, error } = await supabase.functions.invoke("auto-dispatch-pool", {
        body: { organization_id: organizationId, dry_run: dryRun },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Auto-dispatch failed");
      return data as {
        groups: number;
        assigned: number;
        skipped: number;
        dry_run: boolean;
        details: any[];
      };
    },
    onSuccess: (data) => {
      if (data.dry_run) {
        const wouldAssign = data.details.filter((d: any) => d.chosen_vehicle).length;
        toast.info(`Preview: ${data.groups} route group(s), would assign ${wouldAssign}`);
      } else if (data.assigned === 0) {
        toast.warning(
          data.skipped > 0
            ? `No assignments — ${data.skipped} request(s) skipped (no free pool vehicle)`
            : "Nothing eligible to dispatch",
        );
      } else {
        toast.success(
          `Auto-dispatched ${data.assigned} request(s) across ${data.groups} consolidated trip(s)`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      queryClient.invalidateQueries({ queryKey: ["pool-supervisors-queue", organizationId] });
    },
    onError: (err: any) => toast.error(err?.message || "Auto-dispatch failed"),
  });

  const AutoDispatchBar = (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-primary mt-0.5 sm:mt-0 shrink-0" />
          <div>
            <div className="font-medium">Auto-Dispatch Pool</div>
            <div className="text-xs text-muted-foreground">
              Merges same-route requests and assigns the closest available pool vehicle by live GPS.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => autoDispatchMutation.mutate({ dryRun: true })}
            disabled={autoDispatchMutation.isPending}
          >
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => autoDispatchMutation.mutate({ dryRun: false })}
            disabled={autoDispatchMutation.isPending}
          >
            {autoDispatchMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 mr-1.5" />
            )}
            Run Auto-Dispatch
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (approvedRequests.length === 0) {
    return (
      <div className="space-y-3">
        {AutoDispatchBar}
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No requests pending pool review</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline expanded panel content for a single request
  const renderExpandedContent = (r: any) => (
    <div className="space-y-3 p-3 bg-muted/30 border-l-4 border-primary">
      {r.pool_review_decision && (
        <div
          className={`rounded-md border px-2.5 py-2 text-xs space-y-1 ${
            r.pool_review_decision === "approved"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : r.pool_review_decision === "rejected"
              ? "border-rose-500/30 bg-rose-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <FileSignature className="w-3 h-3" />
            Pool contract:{" "}
            <span className="capitalize">{r.pool_review_decision.replace("_", " ")}</span>
            {r.pool_reviewed_at && (
              <span className="text-muted-foreground font-normal">
                · {format(new Date(r.pool_reviewed_at), "MMM dd, HH:mm")}
              </span>
            )}
          </div>
          {r.pool_review_conditions && (
            <div>
              <span className="text-muted-foreground">Conditions:</span>{" "}
              {r.pool_review_conditions}
            </div>
          )}
          {r.pool_review_notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span> {r.pool_review_notes}
            </div>
          )}
        </div>
      )}

      {/* Contract decision strip */}
      <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <FileSignature className="w-3.5 h-3.5 text-primary" />
          Pool Supervisor Contract Decision
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="text-xs gap-1" onClick={() => openContractDialog(r, "approved")}>
            <CheckCircle className="w-3 h-3" /> Approve with Conditions
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1"
            onClick={() => openContractDialog(r, "changes_requested")}
          >
            <RotateCcw className="w-3 h-3" /> Request Changes
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1 text-destructive hover:text-destructive"
            onClick={() => openContractDialog(r, "rejected")}
          >
            <XCircle className="w-3 h-3" /> Reject
          </Button>
        </div>
      </div>

      {/* Smart pool-aware assignment picker */}
      <PoolAssignmentPicker
        request={r}
        organizationId={organizationId}
        isAssigning={assignMutation.isPending}
        onAssign={(vehicleId, driverId) =>
          assignMutation.mutate({ requestId: r.id, vehicleId, driverId })
        }
        onUnavailable={() => reviewMutation.mutate({ requestId: r.id, action: "unavailable" })}
      />
    </div>
  );

  // ── Table row for a single request ──
  const renderTableRow = (r: any) => {
    const isOpen = expandedId === r.id;
    return (
      <>
        <TableRow
          key={r.id}
          className="cursor-pointer hover:bg-muted/40"
          onClick={() => setExpandedId(isOpen ? null : r.id)}
        >
          <TableCell className="w-8 text-muted-foreground">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </TableCell>
          <TableCell className="font-mono text-xs font-semibold">{r.request_number}</TableCell>
          <TableCell>
            <div className="text-xs font-medium">{r.requester_name}</div>
            <div className="text-[10px] text-muted-foreground">
              {format(new Date(r.created_at), "MMM dd, HH:mm")}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1 text-xs">
              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[180px]" title={`${r.departure_place} → ${r.destination}`}>
                {r.departure_place || "—"} → {r.destination || "—"}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-xs">
            {r.needed_from ? format(new Date(r.needed_from), "MMM dd, HH:mm") : "—"}
          </TableCell>
          <TableCell className="text-center text-xs">
            <Badge variant="outline" className="text-[10px]">
              <Users className="w-2.5 h-2.5 mr-0.5" />
              {r.passengers || 1}
            </Badge>
          </TableCell>
          <TableCell>
            {r.pool_name ? (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {r.pool_name}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="text-[10px]">
              {r.request_type === "daily_operation"
                ? "Daily"
                : r.request_type === "project_operation"
                ? "Project"
                : "Field"}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <Button
              size="sm"
              variant={isOpen ? "secondary" : "default"}
              className="text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId(isOpen ? null : r.id);
              }}
            >
              {isOpen ? "Close" : "Assign"}
            </Button>
          </TableCell>
        </TableRow>
        {isOpen && (
          <TableRow key={`${r.id}-expanded`} className="bg-transparent hover:bg-transparent">
            <TableCell colSpan={9} className="p-0">
              {renderExpandedContent(r)}
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };

  return (
    <div className="space-y-3">
      {AutoDispatchBar}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Pool Supervisor Review ({approvedRequests.length})
            </span>
            {groups.length > 0 && (
              <Button
                size="sm"
                variant={showConsolidated ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => setShowConsolidated(!showConsolidated)}
              >
                <Layers className="w-3 h-3 mr-1" />
                {showConsolidated ? "Showing Consolidated" : "Show Consolidated"} ({groups.length})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Consolidated trips */}
          {showConsolidated && groups.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Consolidated Trips ({groups.length})
              </div>
              {groups.map((group) => {
                const isOpen = expandedId === group.key;
                // Use the first request as the "template" for pool / pickup data
                const lead = group.requests[0];
                return (
                  <div
                    key={group.key}
                    className="border-2 border-primary/30 rounded-lg bg-primary/5"
                  >
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isOpen ? null : group.key)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Layers className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Consolidated Trip</span>
                        <Badge variant="default" className="text-[10px]">
                          {group.requests.length} requests
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          <Users className="w-2.5 h-2.5 mr-0.5" /> {group.totalPassengers} pax
                        </Badge>
                        {lead.pool_name && (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {lead.pool_name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-1">
                          {group.departure} → {group.destination} ·{" "}
                          {format(new Date(group.date), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-xs h-7">
                        {isOpen ? "Collapse" : "Review"}
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="border-t border-primary/20 p-3 space-y-3">
                        <div className="grid sm:grid-cols-2 gap-1">
                          {group.requests.map((r: any) => (
                            <div
                              key={r.id}
                              className="text-xs bg-background rounded px-2 py-1.5 flex justify-between items-center border"
                            >
                              <span className="font-mono">
                                {r.request_number}
                                <span className="font-sans text-muted-foreground ml-2">
                                  {r.requester_name} · {r.passengers || 1} pax
                                </span>
                              </span>
                              <span className="text-muted-foreground">
                                {format(new Date(r.needed_from), "HH:mm")}
                              </span>
                            </div>
                          ))}
                        </div>
                        <PoolAssignmentPicker
                          request={lead}
                          organizationId={organizationId}
                          isAssigning={batchAssignMutation.isPending}
                          primaryLabel={`Assign to all ${group.requests.length} requests`}
                          onAssign={(vehicleId, driverId) =>
                            batchAssignMutation.mutate({
                              requestIds: group.requests.map((r: any) => r.id),
                              vehicleId,
                              driverId,
                            })
                          }
                          onUnavailable={() =>
                            group.requests.forEach((r: any) =>
                              reviewMutation.mutate({ requestId: r.id, action: "unavailable" }),
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ungrouped requests — professional table */}
          {ungrouped.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Request #</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Needed From</TableHead>
                    <TableHead className="text-center">Pax</TableHead>
                    <TableHead>Pool</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{ungrouped.map(renderTableRow)}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>

      {/* === Contract decision dialog === */}
      <Dialog open={!!contractTarget} onOpenChange={(v) => !v && closeContractDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              Pool Supervisor Contract
            </DialogTitle>
            <DialogDescription>
              Record your decision on request{" "}
              <span className="font-medium text-foreground">{contractTarget?.requestNumber}</span>.
              The requester will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Decision</Label>
              <Select value={contractDecision} onValueChange={(v) => setContractDecision(v as ContractDecision)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">✅ Approve with conditions</SelectItem>
                  <SelectItem value="changes_requested">✏️ Request changes (resubmit)</SelectItem>
                  <SelectItem value="rejected">❌ Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contractDecision === "approved" && (
              <div>
                <Label className="text-xs">Conditions / Contract Clauses</Label>
                <Textarea
                  value={contractConditions}
                  onChange={(e) => setContractConditions(e.target.value)}
                  placeholder="e.g. Vehicle to be returned by 18:00. Max 200km. Driver must log fuel receipts."
                  rows={3}
                  maxLength={1000}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  These terms become part of the trip contract and are visible to the requester & driver.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">
                {contractDecision === "rejected"
                  ? "Reason for rejection"
                  : contractDecision === "changes_requested"
                  ? "What needs to change?"
                  : "Additional notes (optional)"}
                {contractDecision !== "approved" && <span className="text-destructive"> *</span>}
              </Label>
              <Textarea
                value={contractNotes}
                onChange={(e) => setContractNotes(e.target.value)}
                placeholder={
                  contractDecision === "rejected"
                    ? "e.g. No vehicles in this pool can serve a project of this duration."
                    : contractDecision === "changes_requested"
                    ? "e.g. Please reduce passenger count to 4 or pick a smaller vehicle class."
                    : "Optional notes for the requester."
                }
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeContractDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                contractMutation.isPending ||
                (contractDecision !== "approved" && !contractNotes.trim())
              }
              onClick={() =>
                contractTarget &&
                contractMutation.mutate({
                  requestId: contractTarget.requestId,
                  decision: contractDecision,
                  conditions: contractConditions,
                  notes: contractNotes,
                })
              }
              className="gap-1.5"
            >
              <FileSignature className="w-4 h-4" />
              {contractMutation.isPending ? "Saving..." : "Sign & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
};