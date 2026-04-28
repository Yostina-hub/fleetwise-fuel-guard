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
import ConfirmActionDialog from "@/components/users/ConfirmActionDialog";

const sendAssignmentSMS = async (request: any, vehicleId: string, driverId?: string) => {
  try {
    const { data: vehicle } = await (supabase as any)
      .from("vehicles").select("plate_number, make, model").eq("id", vehicleId).single();

    const driverInfo = driverId
      ? await (supabase as any).from("drivers").select("first_name, last_name, phone").eq("id", driverId).single()
      : null;

    // SMS to driver with trip details
    if (driverInfo?.data?.phone) {
      const msg = `Trip Assignment ${request.request_number}: Vehicle ${vehicle?.plate_number || ""}. From ${request.departure_place || "—"} to ${request.destination || "—"} at ${format(new Date(request.needed_from), "MMM dd h:mm a")}. Purpose: ${(request.purpose || "").substring(0, 60)}`;
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
  // Inline assignment dialog (opened from a table row's "Assign" button)
  const [assignTarget, setAssignTarget] = useState<any>(null);

  // Contract-style decision dialog state
  const [contractTarget, setContractTarget] = useState<{ requestId: string; requestNumber: string } | null>(null);
  const [contractDecision, setContractDecision] = useState<ContractDecision>("approved");
  const [contractConditions, setContractConditions] = useState("");
  const [contractNotes, setContractNotes] = useState("");
  const [confirmContract, setConfirmContract] = useState(false);

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    groups: number;
    assigned: number;
    skipped: number;
    dry_run: boolean;
    details: any[];
  } | null>(null);
  const [confirmRunOpen, setConfirmRunOpen] = useState(false);

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
        // Open the preview dialog with full breakdown
        setPreviewData(data);
        setPreviewOpen(true);
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
        setPreviewOpen(false);
        setConfirmRunOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      queryClient.invalidateQueries({ queryKey: ["pool-supervisors-queue", organizationId] });
    },
    onError: (err: any) => toast.error(err?.message || "Auto-dispatch failed"),
  });

  const eligibleCount = approvedRequests.length;

  const AutoDispatchBar = (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-primary mt-0.5 sm:mt-0 shrink-0" />
          <div>
            <div className="font-medium flex items-center gap-2">
              Auto-Dispatch Pool
              <Badge variant="outline" className="text-[10px] h-4">
                {eligibleCount} eligible
              </Badge>
            </div>
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
            disabled={autoDispatchMutation.isPending || eligibleCount === 0}
            title={eligibleCount === 0 ? "No eligible requests" : "Preview the dispatch plan"}
          >
            {autoDispatchMutation.isPending && autoDispatchMutation.variables?.dryRun ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : null}
            Preview Plan
          </Button>
          <Button
            size="sm"
            onClick={() => setConfirmRunOpen(true)}
            disabled={autoDispatchMutation.isPending || eligibleCount === 0}
            title={eligibleCount === 0 ? "No eligible requests" : "Execute auto-dispatch"}
          >
            {autoDispatchMutation.isPending && autoDispatchMutation.variables?.dryRun === false ? (
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

  // Preview plan dialog (shown after a dry-run completes)
  const PreviewDialog = (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Auto-Dispatch Preview
          </DialogTitle>
          <DialogDescription>
            This is a dry-run. Nothing has been assigned yet. Review the plan, then run dispatch.
          </DialogDescription>
        </DialogHeader>

        {previewData && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Card>
                <CardContent className="p-3">
                  <div className="text-2xl font-semibold">{previewData.groups}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Route groups
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-3">
                  <div className="text-2xl font-semibold text-emerald-500">
                    {previewData.details.filter((d: any) => d.chosen_vehicle).reduce(
                      (s: number, d: any) => s + ((d.requests?.length) || 1),
                      0,
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Will assign
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-3">
                  <div className="text-2xl font-semibold text-amber-500">
                    {previewData.details
                      .filter((d: any) => !d.chosen_vehicle)
                      .reduce((s: number, d: any) => s + (typeof d.requests === "number" ? d.requests : 0), 0)}
                  </div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Will skip
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="max-h-[360px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route + Day</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Pax</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.details.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        No groups produced — nothing eligible.
                      </TableCell>
                    </TableRow>
                  )}
                  {previewData.details.map((d: any, i: number) => {
                    const parts = String(d.key || "").split("|");
                    const route = `${parts[1] || "—"} → ${parts[2] || "—"}`;
                    const day = parts[3] || "";
                    const reqList = Array.isArray(d.requests) ? d.requests : [];
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          <div className="font-medium truncate max-w-[220px]">{route}</div>
                          <div className="text-muted-foreground">{day}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {reqList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {reqList.slice(0, 3).map((rn: string) => (
                                <Badge key={rn} variant="outline" className="text-[10px] h-4">
                                  {rn}
                                </Badge>
                              ))}
                              {reqList.length > 3 && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  +{reqList.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{d.requests || 0}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{d.passengers ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {d.chosen_vehicle ? (
                            <div className="flex items-center gap-1">
                              <Badge className="text-[10px] h-4 bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                                {d.chosen_vehicle}
                              </Badge>
                              {d.in_pickup_geofence && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  <MapPin className="w-2.5 h-2.5 mr-0.5" /> in zone
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-500">{d.reason || "Skipped"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {d.chosen_vehicle
                            ? d.distance_km != null
                              ? `${d.distance_km} km`
                              : "no GPS"
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
          <Button
            onClick={() => autoDispatchMutation.mutate({ dryRun: false })}
            disabled={
              autoDispatchMutation.isPending ||
              !previewData ||
              previewData.details.every((d: any) => !d.chosen_vehicle)
            }
          >
            {autoDispatchMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 mr-1.5" />
            )}
            Confirm & Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Confirm dialog when user clicks "Run Auto-Dispatch" without previewing
  const ConfirmRunDialog = (
    <Dialog open={confirmRunOpen} onOpenChange={setConfirmRunOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Run Auto-Dispatch?</DialogTitle>
          <DialogDescription>
            This will immediately assign vehicles and drivers to{" "}
            <span className="font-semibold text-foreground">{eligibleCount}</span> approved
            request(s) based on closest live GPS. Requesters will be notified.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmRunOpen(false);
              autoDispatchMutation.mutate({ dryRun: true });
            }}
            disabled={autoDispatchMutation.isPending}
          >
            Preview First
          </Button>
          <Button
            onClick={() => autoDispatchMutation.mutate({ dryRun: false })}
            disabled={autoDispatchMutation.isPending}
          >
            {autoDispatchMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 mr-1.5" />
            )}
            Dispatch Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                · {format(new Date(r.pool_reviewed_at), "MMM dd, h:mm a")}
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

  // ── Clean professional table row — Assign opens a modal, contract actions
  // are tucked into a row-level dropdown so the table stays scannable. ──
  const renderTableRow = (r: any) => {
    const hasContract = !!r.pool_review_decision;
    return (
      <TableRow key={r.id} className="hover:bg-muted/40">
        <TableCell className="font-mono text-xs font-semibold">
          {r.request_number}
          {hasContract && (
            <Badge
              variant="outline"
              className={`ml-1.5 text-[9px] capitalize ${
                r.pool_review_decision === "approved"
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : r.pool_review_decision === "rejected"
                  ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400"
              }`}
              title={r.pool_review_conditions || r.pool_review_notes || ""}
            >
              <FileSignature className="w-2.5 h-2.5 mr-0.5" />
              {r.pool_review_decision.replace("_", " ")}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="text-xs font-medium">{r.requester_name}</div>
          <div className="text-[10px] text-muted-foreground">
            {format(new Date(r.created_at), "MMM dd, h:mm a")}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-xs">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[200px]" title={`${r.departure_place} → ${r.destination}`}>
              {r.departure_place || "—"} → {r.destination || "—"}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-xs whitespace-nowrap">
          {r.needed_from ? format(new Date(r.needed_from), "MMM dd, h:mm a") : "—"}
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
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setAssignTarget(r)}
            >
              <UserCheck className="w-3 h-3" />
              Assign
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="More">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => openContractDialog(r, "approved")}>
                  <CheckCircle className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                  Approve with conditions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openContractDialog(r, "changes_requested")}>
                  <RotateCcw className="w-3.5 h-3.5 mr-2 text-amber-600" />
                  Request changes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => openContractDialog(r, "rejected")}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="w-3.5 h-3.5 mr-2" />
                  Reject request
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => reviewMutation.mutate({ requestId: r.id, action: "unavailable" })}
                >
                  <XCircle className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Mark "no vehicle"
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    );
  };


  return (
    <div className="space-y-3">
      {AutoDispatchBar}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="pb-4 border-b bg-gradient-to-b from-muted/40 to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-bold leading-tight">
                  Pool Supervisor Review
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {approvedRequests.length} approved request{approvedRequests.length === 1 ? "" : "s"} awaiting allocation
                </p>
              </div>
            </div>
            {groups.length > 0 && (
              <Button
                size="sm"
                variant={showConsolidated ? "default" : "outline"}
                className="text-xs h-8 gap-1.5"
                onClick={() => setShowConsolidated(!showConsolidated)}
              >
                <Layers className="w-3.5 h-3.5" />
                {showConsolidated ? "Hide" : "Show"} Consolidated ({groups.length})
              </Button>
            )}
          </div>
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
                                {format(new Date(r.needed_from), "h:mm a")}
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
            <div>
              {groups.length > 0 && showConsolidated && (
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Individual Requests ({ungrouped.length})
                </div>
              )}
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b-2 border-border/60 hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10">Request #</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10">Requester</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10">Route</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10">Needed From</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10 text-center">Pax</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10">Pool</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10">Type</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-10 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{ungrouped.map(renderTableRow)}</TableBody>
                </Table>
              </div>
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
              onClick={() => setConfirmContract(true)}
              className="gap-1.5"
            >
              <FileSignature className="w-4 h-4" />
              {contractMutation.isPending ? "Saving..." : "Sign & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmContract}
        onOpenChange={setConfirmContract}
        title={
          contractDecision === "approved"
            ? "Sign & approve with conditions?"
            : contractDecision === "rejected"
            ? "Reject this request?"
            : "Send back for changes?"
        }
        description={
          contractDecision === "approved"
            ? `This will sign the pool contract for request ${contractTarget?.requestNumber ?? ""} and move it to vehicle assignment. The requester will be notified.`
            : contractDecision === "rejected"
            ? `This will reject request ${contractTarget?.requestNumber ?? ""} with the reason provided. The requester will be notified.`
            : `This will return request ${contractTarget?.requestNumber ?? ""} to the requester for edits. They will be able to update and resubmit.`
        }
        confirmLabel={contractDecision === "rejected" ? "Reject" : contractDecision === "changes_requested" ? "Send back" : "Sign & Submit"}
        loading={contractMutation.isPending}
        variant={contractDecision === "rejected" ? "destructive" : "default"}
        onConfirm={() => {
          if (!contractTarget) return;
          setConfirmContract(false);
          contractMutation.mutate({
            requestId: contractTarget.requestId,
            decision: contractDecision,
            conditions: contractConditions,
            notes: contractNotes,
          });
        }}
      />
    </Card>

    {/* Inline assign dialog (opens from a row's "Assign" button) */}
    {assignTarget && (
      <QuickAssignDialog
        request={assignTarget}
        organizationId={organizationId}
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
      />
    )}
    </div>
  );
};