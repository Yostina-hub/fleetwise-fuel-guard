// Functional Approvals tab for the Trip Management page.
// Shows live pending vehicle_requests, lets approvers approve/reject
// with a mandatory comment on rejection, supports search & bulk approve,
// and notifies the requester via SMS — mirroring VehicleRequestApprovalFlow.
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, CheckCircle, XCircle, Loader2, Inbox, Eye,
  Calendar, MapPin, Users, AlertTriangle, Briefcase,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { notifyRequesterDecisionSms, getAppUrl } from "@/services/vehicleRequestSmsService";
import { notifyFleetOpsRequestApproved } from "@/services/fleetApprovalPushService";
import VehicleRequestWorkflowProgress from "@/components/vehicle-requests/VehicleRequestWorkflowProgress";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
  high:   "bg-warning/15 text-warning border-warning/30",
  normal: "bg-secondary/15 text-secondary-foreground border-secondary/30",
  low:    "bg-muted text-muted-foreground border-border",
};

const TYPE_LABELS: Record<string, string> = {
  daily_operation: "Daily",
  project_operation: "Project",
  field_operation: "Field",
};

interface ActionState {
  action: "approve" | "reject";
  ids: string[];
}

export const PendingApprovalsPanel = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<ActionState | null>(null);
  const [comment, setComment] = useState("");
  const [detailRequest, setDetailRequest] = useState<any>(null);

  // ── Fetch all pending vehicle_requests for the org ────────────────
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-approvals-panel", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(`
          *,
          requester:requester_id(id, full_name, email, phone)
        `)
        .eq("organization_id", organizationId)
        .in("status", ["pending", "submitted"])
        .order("priority", { ascending: false })
        .order("needed_from", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Realtime — refresh when any vehicle_request changes status.
  useEffect(() => {
    if (!organizationId) return;
    const ch = supabase
      .channel("pending-approvals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_requests" },
        () => queryClient.invalidateQueries({ queryKey: ["pending-approvals-panel", organizationId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [organizationId, queryClient]);

  // ── Filters ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return pending.filter((r: any) => {
      if (priorityFilter !== "all" && (r.priority || "normal") !== priorityFilter) return false;
      if (typeFilter !== "all" && r.request_type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.request_number?.toLowerCase().includes(q) ||
          r.requester_name?.toLowerCase().includes(q) ||
          r.purpose?.toLowerCase().includes(q) ||
          r.destination?.toLowerCase().includes(q) ||
          r.departure_place?.toLowerCase().includes(q) ||
          r.project_number?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pending, search, priorityFilter, typeFilter]);

  const allSelected = filtered.length > 0 && filtered.every((r: any) => selected.has(r.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((r: any) => r.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // ── Approve / Reject mutation ─────────────────────────────────────
  const decideMutation = useMutation({
    mutationFn: async ({ ids, decision, comment }: { ids: string[]; decision: "approved" | "rejected"; comment: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      const profile = (await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()).data;
      const approverName = profile?.full_name || user.email || "Unknown";

      for (const id of ids) {
        const req = pending.find((r: any) => r.id === id);
        if (!req) continue;

        // 1. Insert approval audit row
        const { error: appErr } = await (supabase as any).from("vehicle_request_approvals").insert({
          organization_id: req.organization_id,
          request_id: id,
          approver_id: user.id,
          approver_name: approverName,
          approval_level: 1,
          status: decision,
          decision_at: new Date().toISOString(),
          comments: comment || null,
        });
        if (appErr) throw appErr;

        // 2. Update vehicle_request status
        const updates: Record<string, any> = {
          status: decision,
          approval_status: decision,
          updated_at: new Date().toISOString(),
        };
        if (decision === "rejected") updates.rejection_reason = comment;

        const { error: upErr } = await (supabase as any)
          .from("vehicle_requests")
          .update(updates)
          .eq("id", id);
        if (upErr) throw upErr;

        // 3. SMS notify requester (best effort)
        try {
          const phone = req.requester?.phone;
          if (phone) {
            await notifyRequesterDecisionSms({
              requesterPhone: phone,
              requestNumber: req.request_number,
              decision,
              rejectionReason: decision === "rejected" ? comment : undefined,
              appUrl: getAppUrl(),
            });
          }
        } catch (e) {
          console.warn("SMS notify failed for", req.request_number, e);
        }

        // 4. Push notify fleet operators / fleet managers on approval (best effort)
        if (decision === "approved") {
          await notifyFleetOpsRequestApproved({
            organizationId: req.organization_id,
            requestNumber: req.request_number,
            requesterName: req.requester_name || req.requester?.full_name,
            departure: req.departure_place,
            destination: req.destination,
            neededFrom: req.needed_from,
            requestId: id,
          });
        }
      }
    },
    onSuccess: (_data, vars) => {
      const verb = vars.decision === "approved" ? "approved" : "rejected";
      toast.success(`${vars.ids.length} request${vars.ids.length > 1 ? "s" : ""} ${verb}`);
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-panel"] });
      queryClient.invalidateQueries({ queryKey: ["trip-mgmt-vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      setSelected(new Set());
      setAction(null);
      setComment("");
    },
    onError: (e: any) => toast.error(e.message || "Action failed"),
  });

  const openAction = (act: "approve" | "reject", ids: string[]) => {
    if (!ids.length) return;
    setComment("");
    setAction({ action: act, ids });
  };

  const submitAction = () => {
    if (!action) return;
    if (action.action === "reject" && !comment.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    decideMutation.mutate({
      ids: action.ids,
      decision: action.action === "approve" ? "approved" : "rejected",
      comment: comment.trim(),
    });
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <Card className="p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request #, purpose, requester…"
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="daily_operation">Daily</SelectItem>
              <SelectItem value="project_operation">Project</SelectItem>
              <SelectItem value="field_operation">Field</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} pending`}
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs gap-1"
            disabled={selected.size === 0 || decideMutation.isPending}
            onClick={() => openAction("reject", Array.from(selected))}
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={selected.size === 0 || decideMutation.isPending}
            onClick={() => openAction("approve", Array.from(selected))}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </Button>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold mb-1">No pending approvals</h3>
          <p className="text-xs text-muted-foreground">
            {search || priorityFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters."
              : "All caught up! 🎉"}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Header row with select-all */}
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            <Checkbox
              checked={allSelected || (someSelected ? "indeterminate" : false)}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
            <span className="flex-1">Request</span>
            <span className="w-24 text-center hidden md:block">Type</span>
            <span className="w-24 text-center hidden md:block">Priority</span>
            <span className="w-32 hidden lg:block">Needed</span>
            <span className="w-32 text-right">Actions</span>
          </div>

          <AnimatePresence mode="popLayout">
            {filtered.map((r: any) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <Checkbox
                  checked={selected.has(r.id)}
                  onCheckedChange={() => toggleOne(r.id)}
                  aria-label={`Select ${r.request_number}`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{r.request_number}</span>
                    <span className="text-sm font-medium truncate">{r.purpose || "(no purpose)"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />{r.requester_name || r.requester?.full_name || "—"}
                    </span>
                    {(r.departure_place || r.destination) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {r.departure_place ? `${r.departure_place} → ` : ""}{r.destination || "—"}
                      </span>
                    )}
                    {r.project_number && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />{r.project_number}
                      </span>
                    )}
                    <span className="text-muted-foreground/70">
                      Submitted {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="w-24 text-center hidden md:block">
                  <Badge variant="outline" className="text-[10px]">
                    {TYPE_LABELS[r.request_type] || r.request_type || "—"}
                  </Badge>
                </div>

                <div className="w-24 text-center hidden md:block">
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize ${PRIORITY_STYLES[r.priority || "normal"]}`}
                  >
                    {(r.priority || "normal") === "urgent" && <AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" />}
                    {r.priority || "normal"}
                  </Badge>
                </div>

                <div className="w-32 text-xs text-muted-foreground hidden lg:block">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {r.needed_from ? format(new Date(r.needed_from), "MMM dd, HH:mm") : "—"}
                  </div>
                </div>

                <div className="w-32 flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title="View details"
                    onClick={() => setDetailRequest(r)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    title="Reject"
                    onClick={() => openAction("reject", [r.id])}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1"
                    onClick={() => openAction("approve", [r.id])}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      )}

      {/* Approve/Reject confirmation dialog */}
      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.action === "approve" ? "Approve" : "Reject"}{" "}
              {action && action.ids.length > 1 ? `${action.ids.length} requests` : "request"}
            </DialogTitle>
            <DialogDescription>
              {action?.action === "approve"
                ? "Approved requests move to the assignment queue. Requesters are notified by SMS."
                : "Rejection is final. The requester will be notified by SMS with your reason."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">
              {action?.action === "reject" ? "Reason for rejection *" : "Comment (optional)"}
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={action?.action === "reject"
                ? "Explain why this is being rejected…"
                : "Optional notes…"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={decideMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant={action?.action === "approve" ? "default" : "destructive"}
              onClick={submitAction}
              disabled={decideMutation.isPending || (action?.action === "reject" && !comment.trim())}
            >
              {decideMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {action?.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailRequest} onOpenChange={(o) => !o && setDetailRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request {detailRequest?.request_number}</DialogTitle>
            <DialogDescription>{detailRequest?.purpose}</DialogDescription>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-4">
              <VehicleRequestWorkflowProgress request={detailRequest} />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Info label="Requester" value={detailRequest.requester_name || detailRequest.requester?.full_name} />
                <Info label="Type" value={TYPE_LABELS[detailRequest.request_type] || detailRequest.request_type} />
                <Info label="Priority" value={detailRequest.priority || "normal"} className="capitalize" />
                <Info label="Pool" value={detailRequest.pool_name || detailRequest.pool_location || "—"} />
                <Info label="From" value={detailRequest.departure_place || "—"} />
                <Info label="To" value={detailRequest.destination || "—"} />
                <Info label="Needed From" value={detailRequest.needed_from ? format(new Date(detailRequest.needed_from), "PPp") : "—"} />
                <Info label="Needed Until" value={detailRequest.needed_until ? format(new Date(detailRequest.needed_until), "PPp") : "—"} />
                <Info label="Passengers" value={detailRequest.passengers ?? "—"} />
                <Info label="Vehicles" value={detailRequest.num_vehicles ?? 1} />
                {detailRequest.project_number && <Info label="Project #" value={detailRequest.project_number} />}
                {detailRequest.distance_estimate_km && <Info label="Est. Distance" value={`${detailRequest.distance_estimate_km} km`} />}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { openAction("reject", [detailRequest.id]); setDetailRequest(null); }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => { openAction("approve", [detailRequest.id]); setDetailRequest(null); }}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Info = ({ label, value, className }: { label: string; value: any; className?: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`font-medium ${className ?? ""}`}>{value ?? "—"}</div>
  </div>
);
