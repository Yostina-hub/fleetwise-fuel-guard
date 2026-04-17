import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
  /** Set to true when the current user is the requester deleting their own draft. */
  isOwnDraft?: boolean;
}

/**
 * Soft-delete a vehicle request. Logs reason + actor to audit_logs.
 * Cannot delete in-progress (driver checked-in/out) or completed requests.
 */
export const DeleteRequestDialog = ({ request, open, onClose, isOwnDraft }: Props) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState(isOwnDraft ? "Removed by requester" : "");

  const inProgress = !!request.driver_checked_in_at && !request.driver_checked_out_at;
  const completed = request.status === "completed" || !!request.driver_checked_out_at;
  const blocked = inProgress || completed;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (blocked) throw new Error("Cannot remove a request that is in-progress or completed");
      if (!isOwnDraft && !reason.trim()) throw new Error("Please provide a reason");

      const user = (await supabase.auth.getUser()).data.user;

      // Free up vehicle/driver if currently assigned
      if (request.assigned_vehicle_id) {
        await (supabase as any).from("vehicles")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_vehicle_id);
      }
      if (request.assigned_driver_id) {
        await (supabase as any).from("drivers")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_driver_id);
      }

      // Soft delete
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          deletion_reason: reason || "Removed by requester",
          status: "cancelled",
          cancellation_reason: reason || "Removed by requester",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (error) throw error;

      // Audit
      try {
        await (supabase as any).from("audit_logs").insert({
          organization_id: request.organization_id,
          user_id: user?.id,
          action: "delete",
          resource_type: "vehicle_request",
          resource_id: request.id,
          status: "success",
          new_values: { reason, request_number: request.request_number, by_requester: !!isOwnDraft },
        });
      } catch (e) { console.error("audit log failed:", e); }
    },
    onSuccess: () => {
      toast.success("Request removed");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" /> Remove Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request:</span>
              <span className="font-medium">{request.request_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span>{request.status}</span>
            </div>
          </div>

          {blocked && (
            <div className="flex items-start gap-2 text-xs bg-destructive/10 text-destructive rounded p-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {completed
                  ? "Cannot remove a completed request — it forms part of the trip history."
                  : "Driver has already checked in. Wait for completion or contact ops."}
              </span>
            </div>
          )}

          <div>
            <Label>{isOwnDraft ? "Reason (optional)" : "Reason (required)"}</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why are you removing this request?"
              rows={3}
              disabled={blocked}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            The request will be soft-deleted and hidden from lists. Audit trail is retained.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={blocked || (!isOwnDraft && !reason.trim()) || deleteMutation.isPending}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {deleteMutation.isPending ? "Removing..." : "Remove Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
