/**
 * RequestTrackingDialog
 * ---------------------
 * Unified read-only progress tracker for driver-side submissions:
 *   • Fuel requests        (table: fuel_requests)
 *   • Incidents            (table: incidents)
 *   • Maintenance requests (table: maintenance_requests)
 *
 * Shows the same shape as the vehicle-request tracker the driver already
 * knows: a stage timeline, current status, key details, and a footer
 * close action.  No mutations — drivers can only watch progress here.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, Circle, Clock, Loader2, XCircle, Fuel, AlertTriangle, Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type TrackingKind = "fuel" | "incident" | "maintenance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: TrackingKind | null;
  recordId: string | null;
}

interface StageDef {
  id: string;
  label: string;
  description?: string;
}

/** Stage pipelines (kept aligned with workflow-engine configs). */
const PIPELINES: Record<TrackingKind, StageDef[]> = {
  fuel: [
    { id: "submitted",  label: "Submitted",          description: "Request filed and queued for approval." },
    { id: "pending",    label: "Pending approval",   description: "Awaiting authority-matrix approver." },
    { id: "approved",   label: "Approved",           description: "Approved liters & cost locked." },
    { id: "fulfilled",  label: "Fulfilled",          description: "Fuel dispensed and reconciled." },
  ],
  incident: [
    { id: "open",          label: "Reported",        description: "Incident filed and visible to operators." },
    { id: "investigating", label: "Investigating",   description: "Operations team triaging the report." },
    { id: "resolved",      label: "Resolved",        description: "Resolution notes recorded." },
    { id: "closed",        label: "Closed",          description: "Case closed." },
  ],
  maintenance: [
    { id: "submitted",          label: "Submitted",        description: "Maintenance request received." },
    { id: "pending_approval",   label: "Pending approval", description: "Awaiting fleet supervisor sign-off." },
    { id: "work_order_created", label: "Work order issued", description: "Workshop assigned to perform repair." },
    { id: "completed",          label: "Completed",        description: "Repair completed and signed off." },
  ],
};

/** Map any record status / stage onto pipeline index. */
function resolveCurrentStage(kind: TrackingKind, record: any): { idx: number; rejected: boolean } {
  const stages = PIPELINES[kind];
  if (!record) return { idx: -1, rejected: false };

  if (kind === "fuel") {
    const s = (record.status || "").toLowerCase();
    if (s === "rejected" || s === "cancelled") return { idx: 1, rejected: true };
    if (s === "fulfilled") return { idx: 3, rejected: false };
    if (s === "approved" || s === "auto_approved") return { idx: 2, rejected: false };
    if (s === "pending") return { idx: 1, rejected: false };
    return { idx: 0, rejected: false };
  }

  if (kind === "incident") {
    const s = (record.status || "").toLowerCase();
    if (s === "closed") return { idx: 3, rejected: false };
    if (s === "resolved") return { idx: 2, rejected: false };
    if (s === "investigating") return { idx: 1, rejected: false };
    return { idx: 0, rejected: false };
  }

  // maintenance
  const stage = (record.workflow_stage || record.status || "").toLowerCase();
  const idx = stages.findIndex((st) => st.id === stage);
  if (idx >= 0) return { idx, rejected: false };
  if (stage === "rejected" || stage === "cancelled") return { idx: 1, rejected: true };
  if (stage === "under_review") return { idx: 1, rejected: false };
  if (stage === "maintenance_section") return { idx: 2, rejected: false };
  return { idx: 0, rejected: false };
}

const TABLE_FOR_KIND: Record<TrackingKind, string> = {
  fuel: "fuel_requests",
  incident: "incidents",
  maintenance: "maintenance_requests",
};

const SELECT_FOR_KIND: Record<TrackingKind, string> = {
  fuel: "id, request_number, status, fuel_type, liters_requested, liters_approved, actual_liters, estimated_cost, actual_cost, purpose, current_odometer, requested_at, approved_at, fulfilled_at, rejected_reason, notes, clearance_status, request_type, attachments",
  incident: "id, incident_number, incident_type, severity, status, description, reason, location, incident_time, attachments, resolution_notes, resolved_at, sla_deadline_at, auto_work_order_id, created_at",
  maintenance: "id, request_number, request_type, priority, status, workflow_stage, description, created_at, updated_at",
};

const ICON_FOR_KIND: Record<TrackingKind, React.ComponentType<{ className?: string }>> = {
  fuel: Fuel,
  incident: AlertTriangle,
  maintenance: Wrench,
};

const TITLE_FOR_KIND: Record<TrackingKind, string> = {
  fuel: "Fuel request",
  incident: "Incident report",
  maintenance: "Maintenance request",
};

export default function RequestTrackingDialog({ open, onOpenChange, kind, recordId }: Props) {
  const { data: record, isLoading } = useQuery({
    queryKey: ["request-tracking", kind, recordId],
    enabled: !!open && !!kind && !!recordId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_FOR_KIND[kind!])
        .select(SELECT_FOR_KIND[kind!])
        .eq("id", recordId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { idx: currentIdx, rejected } = useMemo(
    () => (kind ? resolveCurrentStage(kind, record) : { idx: -1, rejected: false }),
    [kind, record],
  );

  const stages = kind ? PIPELINES[kind] : [];
  const Icon = kind ? ICON_FOR_KIND[kind] : Clock;
  const refLabel = (record?.request_number || record?.incident_number || "—") as string;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" aria-hidden="true" />
            {kind ? TITLE_FOR_KIND[kind] : "Request"} progress
          </DialogTitle>
          <DialogDescription>
            Reference <span className="font-mono">{refLabel}</span> — track each
            step as operators handle your submission.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !record ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header summary */}
            <SummaryHeader kind={kind!} record={record} rejected={rejected} />

            <Separator />

            {/* Pipeline */}
            <ol className="space-y-3">
              {stages.map((stage, i) => {
                const done = !rejected && i < currentIdx;
                const active = !rejected && i === currentIdx;
                const failed = rejected && i === currentIdx;
                return (
                  <li key={stage.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                      ) : failed ? (
                        <XCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
                      ) : active ? (
                        <Clock className="w-5 h-5 text-primary animate-pulse" aria-hidden="true" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/40" aria-hidden="true" />
                      )}
                      {i < stages.length - 1 && (
                        <div className={cn(
                          "w-px flex-1 mt-1",
                          done ? "bg-primary/50" : "bg-border",
                        )} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={cn(
                        "text-sm font-medium",
                        active && "text-primary",
                        failed && "text-destructive",
                        !active && !failed && !done && "text-muted-foreground",
                      )}>
                        {stage.label}
                      </p>
                      {stage.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryHeader({ kind, record, rejected }: { kind: TrackingKind; record: any; rejected: boolean }) {
  if (kind === "fuel") {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Status" value={
          <Badge variant={rejected ? "destructive" : record.status === "fulfilled" ? "default" : "outline"} className="capitalize">
            {record.status?.replace(/_/g, " ")}
          </Badge>
        } />
        <Field label="Fuel type" value={<span className="capitalize">{record.fuel_type || "—"}</span>} />
        <Field label="Liters requested" value={record.liters_requested ?? "—"} />
        <Field label="Liters approved" value={record.liters_approved ?? "—"} />
        {record.actual_liters != null && <Field label="Actual dispensed" value={record.actual_liters} />}
        {record.estimated_cost != null && <Field label="Est. cost" value={`${record.estimated_cost} ETB`} />}
        {record.purpose && <Field label="Purpose" value={record.purpose} className="col-span-2" />}
        {rejected && record.rejected_reason && (
          <Field label="Rejection reason" value={record.rejected_reason} className="col-span-2" />
        )}
      </div>
    );
  }
  if (kind === "incident") {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Status" value={
          <Badge variant={record.status === "closed" || record.status === "resolved" ? "default" : "outline"} className="capitalize">
            {record.status?.replace(/_/g, " ")}
          </Badge>
        } />
        <Field label="Type" value={<span className="capitalize">{(record.incident_type || "—").replace(/_/g, " ")}</span>} />
        <Field label="Severity" value={
          <Badge variant={["high", "critical"].includes(record.severity) ? "destructive" : "outline"} className="capitalize">
            {record.severity}
          </Badge>
        } />
        {record.location && <Field label="Location" value={record.location} />}
        {record.description && <Field label="Description" value={record.description} className="col-span-2" />}
        {record.auto_work_order_id && (
          <Field
            label="Auto work order"
            value={<Badge variant="outline" className="text-xs">Linked</Badge>}
          />
        )}
        {record.resolution_notes && (
          <Field label="Resolution" value={record.resolution_notes} className="col-span-2" />
        )}
      </div>
    );
  }
  // maintenance
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <Field label="Status" value={
        <Badge variant={record.status === "completed" ? "default" : "outline"} className="capitalize">
          {record.status?.replace(/_/g, " ")}
        </Badge>
      } />
      <Field label="Type" value={<span className="capitalize">{record.request_type}</span>} />
      <Field label="Priority" value={
        <Badge variant={["high", "critical"].includes(record.priority) ? "destructive" : "outline"} className="capitalize">
          {record.priority}
        </Badge>
      } />
      <Field label="Stage" value={
        <Badge variant="outline" className="text-xs capitalize">{(record.workflow_stage || record.status).replace(/_/g, " ")}</Badge>
      } />
      {record.description && <Field label="Description" value={record.description} className="col-span-2" />}
      <Field label="Submitted" value={format(new Date(record.created_at), "MMM dd, yyyy HH:mm")} />
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
