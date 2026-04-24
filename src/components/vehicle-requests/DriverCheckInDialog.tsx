import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Car, Gauge } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAppUrl } from "@/services/vehicleRequestSmsService";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
}

export const DriverCheckInDialog = ({ request, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const isCheckedIn = !!request.driver_checked_in_at;
  const isCheckedOut = !!request.driver_checked_out_at;

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          driver_checked_in_at: new Date().toISOString(),
          driver_checkin_odometer: odometer ? parseFloat(odometer) : null,
          driver_checkin_notes: notes || null,
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Driver checked in successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const checkoutOdo = odometer ? parseFloat(odometer) : null;
      const checkinOdo = request.driver_checkin_odometer;
      const distanceKm = checkoutOdo && checkinOdo ? checkoutOdo - checkinOdo : null;

      const updates: any = {
        driver_checked_out_at: new Date().toISOString(),
        driver_checkout_odometer: checkoutOdo,
        status: "completed",
        completed_at: new Date().toISOString(),
      };

      if (distanceKm && distanceKm > 0) {
        updates.distance_log_km = distanceKm;
      }

      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(updates)
        .eq("id", request.id);
      if (error) throw error;

      // Reset vehicle status to available
      if (request.assigned_vehicle_id) {
        await (supabase as any)
          .from("vehicles")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_vehicle_id);
      }

      // Reset driver status to active
      if (request.assigned_driver_id) {
        await (supabase as any)
          .from("drivers")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_driver_id);
      }

      // Send completion SMS to requester with feedback link
      try {
        const { data: reqProfile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", request.requester_id)
          .single();
        if (reqProfile?.phone) {
          const msg = [
            `FleetTrack: Trip Completed`,
            `Request: ${request.request_number}`,
            `Your trip has been completed.`,
            `Please rate your experience: ${getAppUrl()}/vehicle-requests`,
          ].join("\n");
          await supabase.functions.invoke("send-sms", {
            body: { to: reqProfile.phone, message: msg, type: "trip_completed" },
          });
        }
      } catch (e) {
        console.error("Completion SMS error:", e);
      }
    },
    onSuccess: () => {
      toast.success("Driver checked out — request completed, vehicle now idle");
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
            {isCheckedIn && !isCheckedOut ? (
              <><LogOut className="w-5 h-5 text-amber-500" /> Driver Check-Out</>
            ) : (
              <><LogIn className="w-5 h-5 text-green-500" /> Driver Check-In</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request:</span>
              <span className="font-medium">{request.request_number}</span>
            </div>
            {request.assigned_vehicle && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {request.assigned_vehicle.plate_number}</span>
              </div>
            )}
            {request.departure_place && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route:</span>
                <span>{request.departure_place} → {request.destination}</span>
              </div>
            )}
          </div>

          {/* Check-in status */}
          {isCheckedIn && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default" className="bg-green-600">Checked In</Badge>
              <span className="text-muted-foreground text-xs">
                {format(new Date(request.driver_checked_in_at), "MMM dd, h:mm a")}
              </span>
              {request.driver_checkin_odometer && (
                <span className="text-xs text-muted-foreground">
                  | {request.driver_checkin_odometer} km
                </span>
              )}
            </div>
          )}

          {/* Odometer */}
          <div>
            <Label className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              Odometer Reading (km)
            </Label>
            <Input
              type="number"
              value={odometer}
              onChange={e => setOdometer(e.target.value)}
              placeholder="Enter current odometer"
            />
          </div>

          {/* Notes - only for check-in */}
          {!isCheckedIn && (
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any observations about the vehicle condition..."
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
              className="bg-amber-600 hover:bg-amber-700"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
            </Button>
          ) : !isCheckedIn ? (
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <LogIn className="w-3.5 h-3.5 mr-1" />
              {checkInMutation.isPending ? "Checking in..." : "Check In"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
