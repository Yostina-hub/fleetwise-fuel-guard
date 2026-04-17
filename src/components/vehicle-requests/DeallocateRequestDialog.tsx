import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Undo2, Truck, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
}

/**
 * Deallocate = free the vehicle + driver from a request and return it to "approved"
 * so fleet ops can re-assign different resources. Allowed only BEFORE driver check-in.
 */
export const DeallocateRequestDialog = ({ request, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const blocked = !!request.driver_checked_in_at;

  const deallocateMutation = useMutation({
    mutationFn: async () => {
      if (blocked) throw new Error("Cannot deallocate after driver check-in");
      if (!reason.trim()) throw new Error("Please provide a reason for deallocation");

      const user = (await supabase.auth.getUser()).data.user;

      // Free vehicle
      if (request.assigned_vehicle_id) {
        await (supabase as any)
          .from("vehicles")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_vehicle_id);
      }

      // Free driver
      if (request.assigned_driver_id) {
        await (supabase as any)
          .from("drivers")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_driver_id);
      }

      // Reset request
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          status: "approved",
          assigned_vehicle_id: null,
          assigned_driver_id: null,
          assigned_at: null,
          assigned_by: null,
          actual_assignment_minutes: null,
          deallocated_at: new Date().toISOString(),
          deallocated_by: user?.id,
          deallocation_reason: reason,
          deallocation_count: (request.deallocation_count || 0) + 1,
        })
        .eq("id", request.id);
      if (error) throw error;

      // Audit
      try {
        await (supabase as any).from("audit_logs").insert({
          organization_id: request.organization_id,
          user_id: user?.id,
          action: "deallocate",
          resource_type: "vehicle_request",
          resource_id: request.id,
          status: "success",
          new_values: { reason, vehicle_id: request.assigned_vehicle_id, driver_id: request.assigned_driver_id },
        });
      } catch (e) { console.error("audit log failed:", e); }
    },
    onSuccess: () => {
      toast.success("Vehicle & driver deallocated — request returned for reassignment");
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
            <Undo2 className="w-5 h-5 text-amber-500" /> Deallocate Vehicle & Driver
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request:</span>
              <span className="font-medium">{request.request_number}</span>
            </div>
            {request.assigned_vehicle && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {request.assigned_vehicle.plate_number}</span>
              </div>
            )}
            {request.assigned_driver && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver:</span>
                <span>{request.assigned_driver.first_name} {request.assigned_driver.last_name}</span>
              </div>
            )}
            {(request.deallocation_count || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previously deallocated:</span>
                <Badge variant="outline">{request.deallocation_count}×</Badge>
              </div>
            )}
          </div>

          {blocked && (
            <div className="flex items-start gap-2 text-xs bg-destructive/10 text-destructive rounded p-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Driver has already checked in. Use "Cancel Request" instead.</span>
            </div>
          )}

          <div>
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why are you deallocating? (e.g., vehicle breakdown, driver unavailable...)"
              rows={3}
              disabled={blocked}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            The request will go back to <Badge variant="outline" className="text-[10px]">approved</Badge> status
            and the vehicle + driver will be freed for other assignments.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => deallocateMutation.mutate()}
            disabled={blocked || !reason.trim() || deallocateMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" />
            {deallocateMutation.isPending ? "Deallocating..." : "Deallocate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
