import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight, Truck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVehicles } from "@/hooks/useVehicles";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface Props {
  request: any;
  approvals: any[];
  onClose: () => void;
}

export const VehicleRequestApprovalFlow = ({ request, approvals, onClose }: Props) => {
  const { t } = useTranslation();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const requestApprovals = approvals.filter((a: any) => a.request_id === request.id);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const profile = (await supabase.from("profiles").select("full_name").eq("id", user!.id).single()).data;
      
      await (supabase as any).from("vehicle_request_approvals").insert({
        organization_id: request.organization_id,
        request_id: request.id,
        approver_id: user!.id,
        approver_name: profile?.full_name || user!.email,
        approval_level: 1,
        decision: "approved",
        decided_at: new Date().toISOString(),
      });

      await (supabase as any).from("vehicle_requests").update({
        status: "approved",
        approval_status: "approved",
      }).eq("id", request.id);
    },
    onSuccess: () => {
      toast.success("Request approved");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-request-approvals"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectionReason.trim()) {
        throw new Error("Rejection reason is mandatory");
      }
      const user = (await supabase.auth.getUser()).data.user;
      const profile = (await supabase.from("profiles").select("full_name").eq("id", user!.id).single()).data;

      await (supabase as any).from("vehicle_request_approvals").insert({
        organization_id: request.organization_id,
        request_id: request.id,
        approver_id: user!.id,
        approver_name: profile?.full_name || user!.email,
        approval_level: 1,
        decision: "rejected",
        decided_at: new Date().toISOString(),
        comments: rejectionReason,
      });

      await (supabase as any).from("vehicle_requests").update({
        status: "rejected",
        approval_status: "rejected",
        rejection_reason: rejectionReason,
      }).eq("id", request.id);
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-request-approvals"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const mins = Math.round((Date.now() - new Date(request.created_at).getTime()) / 60000);
      await (supabase as any).from("vehicle_requests").update({
        status: "assigned",
        assigned_vehicle_id: vehicleId,
        assigned_at: new Date().toISOString(),
        actual_assignment_minutes: mins,
      }).eq("id", request.id);
    },
    onSuccess: () => {
      toast.success("Vehicle assigned");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("vehicle_requests").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", request.id);
    },
    onSuccess: () => {
      toast.success("Request completed");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const requestTypeLabel = {
    daily_operation: "Daily Operation",
    project_operation: "Project Operation",
    field_operation: "Field Operation",
  }[request.request_type] || request.request_type || "General";

  return (
    <div className="space-y-4">
      {/* Request Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline">{requestTypeLabel}</Badge></div>
        <div><span className="text-muted-foreground">Status:</span> <Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "secondary"}>{request.status}</Badge></div>
        <div><span className="text-muted-foreground">Requester:</span> {request.requester_name}</div>
        <div><span className="text-muted-foreground">Priority:</span> {request.priority || "normal"}</div>
        <div><span className="text-muted-foreground">From:</span> {format(new Date(request.needed_from), "MMM dd, yyyy HH:mm")}</div>
        {request.needed_until && <div><span className="text-muted-foreground">Until:</span> {format(new Date(request.needed_until), "MMM dd, yyyy HH:mm")}</div>}
        {request.departure_place && <div><span className="text-muted-foreground">Departure:</span> {request.departure_place}</div>}
        {request.destination && <div><span className="text-muted-foreground">Destination:</span> {request.destination}</div>}
        {request.trip_type && <div><span className="text-muted-foreground">Trip:</span> {request.trip_type === "one_way" ? "One Way" : "Round Trip"}</div>}
        {request.vehicle_type && <div><span className="text-muted-foreground">Vehicle Type:</span> {request.vehicle_type}</div>}
        {request.pool_category && <div><span className="text-muted-foreground">Pool:</span> {request.pool_category} / {request.pool_name}</div>}
        {request.num_vehicles && <div><span className="text-muted-foreground">Vehicles:</span> {request.num_vehicles}</div>}
        {request.passengers && <div><span className="text-muted-foreground">Passengers:</span> {request.passengers}</div>}
        {request.trip_duration_days && <div><span className="text-muted-foreground">Duration:</span> {request.trip_duration_days} days</div>}
      </div>

      {request.purpose && (
        <div className="text-sm"><span className="text-muted-foreground">Purpose:</span> {request.purpose}</div>
      )}

      {/* Approval routing info */}
      {request.approval_routed_to && (
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg p-2">
          <ArrowRight className="w-3.5 h-3.5 text-primary" />
          <span>
            {request.approval_status === "auto_approved"
              ? "Auto-approved (requester is manager or above)"
              : `Routed to ${request.approval_routed_to} for approval (${request.trip_duration_days || 1} day${(request.trip_duration_days || 1) > 1 ? "s" : ""} trip)`}
          </span>
        </div>
      )}

      {/* Assigned vehicle/driver */}
      {request.assigned_vehicle && (
        <div className="flex items-center gap-2 text-sm bg-primary/5 rounded-lg p-2">
          <Truck className="w-4 h-4 text-primary" />
          <span>Assigned: {request.assigned_vehicle.plate_number} ({request.assigned_vehicle.make} {request.assigned_vehicle.model})</span>
        </div>
      )}
      {request.assigned_driver && (
        <div className="text-sm text-muted-foreground pl-6">
          Driver: {request.assigned_driver.first_name} {request.assigned_driver.last_name}
        </div>
      )}

      {/* Rejection reason */}
      {request.rejection_reason && (
        <div className="flex items-start gap-2 text-sm bg-destructive/10 rounded-lg p-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div><span className="font-medium">Rejection Reason:</span> {request.rejection_reason}</div>
        </div>
      )}

      {/* Approval History */}
      {requestApprovals.length > 0 && (
        <div className="border-t pt-3">
          <p className="font-medium text-sm mb-2">Approval History</p>
          {requestApprovals.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                {a.decision === "approved" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                <span>{a.approver_name}</span>
                <Badge variant={a.decision === "approved" ? "default" : "destructive"} className="text-[10px]">{a.decision}</Badge>
              </div>
              <span className="text-muted-foreground">{a.decided_at ? format(new Date(a.decided_at), "MMM dd, HH:mm") : "Pending"}</span>
            </div>
          ))}
          {requestApprovals.some((a: any) => a.comments) && (
            <div className="text-xs text-muted-foreground mt-1 italic">
              {requestApprovals.filter((a: any) => a.comments).map((a: any) => (
                <p key={a.id}>"{a.comments}" — {a.approver_name}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejection Form */}
      {showRejectForm && (
        <div className="border rounded-lg p-3 space-y-2">
          <Label className="text-sm font-medium text-destructive">Rejection Reason (required)</Label>
          <Textarea
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejection..."
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {request.status === "pending" && !showRejectForm && (
          <>
            <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowRejectForm(true)}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </>
        )}
        {request.status === "approved" && (
          <Select onValueChange={v => assignMutation.mutate(v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Assign Vehicle..." /></SelectTrigger>
            <SelectContent>
              {vehicles.filter((v: any) => v.status === "active").slice(0, 30).map((v: any) => (
                <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {request.status === "assigned" && (
          <Button size="sm" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Complete
          </Button>
        )}
        {["pending", "approved"].includes(request.status) && !showRejectForm && (
          <Button size="sm" variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        )}
      </div>
    </div>
  );
};
