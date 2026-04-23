/**
 * AssignmentCheckInDialog
 * -----------------------
 * Per-vehicle check-in / check-out for one row of `vehicle_request_assignments`
 * (used by multi-vehicle requests). Mirrors the single-vehicle DriverCheckInDialog
 * but operates on the assignment row instead of the parent request.
 *
 * Side effects:
 *   - On check-in:  marks vehicle in_use, driver on_trip.
 *   - On check-out: marks vehicle available, driver active, computes
 *                   distance from odometer, and — if every assignment
 *                   for the parent request is now checked out — flips
 *                   the parent request to "completed".
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Car, Gauge, UserCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { RequestAssignment } from "@/hooks/useRequestAssignments";

interface Props {
  request: any;
  assignment: RequestAssignment;
  open: boolean;
  onClose: () => void;
}

export const AssignmentCheckInDialog = ({ request, assignment, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const isCheckedIn = !!assignment.driver_checked_in_at;
  const isCheckedOut = !!assignment.driver_checked_out_at;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicle-request-assignments", request.id] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("vehicle_request_assignments")
        .update({
          driver_checked_in_at: new Date().toISOString(),
          checkin_odometer: odometer ? parseFloat(odometer) : null,
          notes: notes || assignment.notes,
          status: "checked_in",
        })
        .eq("id", assignment.id);
      if (error) throw error;

      // Vehicle/driver status side-effects
      await (supabase as any)
        .from("vehicles")
        .update({ status: "in_use", updated_at: new Date().toISOString() })
        .eq("id", assignment.vehicle_id);
      if (assignment.driver_id) {
        await (supabase as any)
          .from("drivers")
          .update({ status: "on_trip", updated_at: new Date().toISOString() })
          .eq("id", assignment.driver_id);
      }
    },
    onSuccess: () => {
      toast.success(`Vehicle ${assignment.vehicle?.plate_number} checked in`);
      refresh();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const checkoutOdo = odometer ? parseFloat(odometer) : null;
      const checkinOdo = assignment.checkin_odometer;
      const distanceKm = checkoutOdo && checkinOdo ? checkoutOdo - checkinOdo : null;

      const updates: any = {
        driver_checked_out_at: new Date().toISOString(),
        checkout_odometer: checkoutOdo,
        status: "completed",
      };
      const { error } = await (supabase as any)
        .from("vehicle_request_assignments")
        .update(updates)
        .eq("id", assignment.id);
      if (error) throw error;

      await (supabase as any)
        .from("vehicles")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", assignment.vehicle_id);
      if (assignment.driver_id) {
        await (supabase as any)
          .from("drivers")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", assignment.driver_id);
      }

      // Auto-complete the parent request once *every* assignment is checked out.
      const { data: siblings } = await (supabase as any)
        .from("vehicle_request_assignments")
        .select("id, driver_checked_out_at")
        .eq("vehicle_request_id", request.id);
      const allDone = (siblings || []).every((s: any) => !!s.driver_checked_out_at);
      if (allDone) {
        await (supabase as any)
          .from("vehicle_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            distance_log_km: distanceKm,
          })
          .eq("id", request.id);
      }
    },
    onSuccess: () => {
      toast.success(`Vehicle ${assignment.vehicle?.plate_number} checked out`);
      refresh();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCheckedIn && !isCheckedOut ? (
              <><LogOut className="w-5 h-5 text-warning" /> Check Out — {assignment.vehicle?.plate_number}</>
            ) : (
              <><LogIn className="w-5 h-5 text-success" /> Start Now — {assignment.vehicle?.plate_number}</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request:</span>
              <span className="font-medium">{request.request_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {assignment.vehicle?.plate_number}</span>
            </div>
            {assignment.driver && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver:</span>
                <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> {assignment.driver.first_name} {assignment.driver.last_name}</span>
              </div>
            )}
          </div>

          {isCheckedIn && (
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-success text-success-foreground">Started</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(assignment.driver_checked_in_at!), "MMM dd, HH:mm")}
              </span>
              {assignment.checkin_odometer && (
                <span className="text-xs text-muted-foreground">| {assignment.checkin_odometer} km</span>
              )}
            </div>
          )}

          <div>
            <Label className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" /> Odometer Reading (km)
            </Label>
            <Input
              type="number"
              value={odometer}
              onChange={e => setOdometer(e.target.value)}
              placeholder="Enter current odometer"
            />
          </div>

          {!isCheckedIn && (
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Vehicle condition, observations..."
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {isCheckedIn && !isCheckedOut ? (
            <Button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              {checkOutMutation.isPending ? "Finishing…" : "Finish Trip"}
            </Button>
          ) : !isCheckedIn ? (
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              <LogIn className="w-3.5 h-3.5 mr-1" />
              {checkInMutation.isPending ? "Starting…" : "Start Now"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
