/**
 * QuickAssignDialog
 * -----------------
 * Inline modal for assigning a vehicle + driver to an approved Vehicle Request
 * directly from the All Requests table — no need to switch to the Assignments
 * workspace. Mirrors the assignment behavior of PoolReviewPanel.
 *
 * Shows the request summary at the top (route, pool, time, passengers) and
 * embeds the smart PoolAssignmentPicker so the supervisor sees ranked
 * suggestions with distance/geofence hints.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Clock, Layers, UserCheck, GitMerge } from "lucide-react";
import { PoolAssignmentPicker } from "./PoolAssignmentPicker";
import { MergedTripStopsPanel } from "./MergedTripStopsPanel";

interface Props {
  request: any;
  organizationId: string;
  open: boolean;
  onClose: () => void;
}

const sendAssignmentSMS = async (request: any, vehicleId: string, driverId?: string) => {
  try {
    const { data: vehicle } = await (supabase as any)
      .from("vehicles")
      .select("plate_number, make, model")
      .eq("id", vehicleId)
      .single();

    const driverInfo = driverId
      ? await (supabase as any)
          .from("drivers")
          .select("first_name, last_name, phone")
          .eq("id", driverId)
          .single()
      : null;

    if (driverInfo?.data?.phone) {
      const msg = `Trip Assignment ${request.request_number}: Vehicle ${vehicle?.plate_number || ""}. From ${request.departure_place || "—"} to ${request.destination || "—"} at ${format(new Date(request.needed_from), "MMM dd h:mm a")}. Purpose: ${(request.purpose || "").substring(0, 60)}`;
      await supabase.functions.invoke("send-sms", {
        body: { to: driverInfo.data.phone, message: msg, type: "trip_assignment" },
      });
    }

    const { data: requesterProfile } = await (supabase as any)
      .from("profiles")
      .select("phone")
      .eq("id", request.requester_id)
      .single();
    if (requesterProfile?.phone) {
      const link = `${window.location.origin}/vehicle-requests?feedback=${request.id}`;
      const driverName = driverInfo?.data
        ? `${driverInfo.data.first_name} ${driverInfo.data.last_name}`
        : "TBA";
      const msg = `Your request ${request.request_number} is assigned. Vehicle: ${vehicle?.plate_number}, Driver: ${driverName}. Feedback after trip: ${link}`;
      await supabase.functions.invoke("send-sms", {
        body: { to: requesterProfile.phone, message: msg, type: "trip_assignment" },
      });
    }
  } catch (e) {
    console.warn("SMS notification failed (non-blocking):", e);
  }
};

export const QuickAssignDialog = ({ request, organizationId, open, onClose }: Props) => {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: async ({ vehicleId, driverId }: { vehicleId: string; driverId?: string }) => {
      const mins = Math.round((Date.now() - new Date(request.created_at).getTime()) / 60000);
      const user = (await supabase.auth.getUser()).data.user;

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

      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(updates)
        .eq("id", request.id);
      if (error) throw error;

      await (supabase as any)
        .from("vehicles")
        .update({ status: "in_use", updated_at: new Date().toISOString() })
        .eq("id", vehicleId);

      if (driverId) {
        await (supabase as any)
          .from("drivers")
          .update({ status: "on_trip", updated_at: new Date().toISOString() })
          .eq("id", driverId);
      }

      if (request.requester_id) {
        const { data: vehicle } = await (supabase as any)
          .from("vehicles")
          .select("plate_number")
          .eq("id", vehicleId)
          .single();
        try {
          await supabase.rpc("send_notification", {
            _user_id: request.requester_id,
            _type: "vehicle_assigned",
            _title: "Vehicle Assigned",
            _message: `Vehicle ${vehicle?.plate_number || "N/A"} assigned to request ${request.request_number}`,
            _link: "/vehicle-requests",
          });
        } catch (e) {
          console.error("In-app notification error:", e);
        }
      }

      await sendAssignmentSMS(request, vehicleId, driverId);
    },
    onSuccess: () => {
      toast.success("Vehicle assigned");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-request-approvals"] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to assign vehicle"),
  });

  const unavailableMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          pool_review_status: "unavailable",
          pool_reviewer_id: user!.id,
          pool_reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.info("Marked as no vehicles available");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update"),
  });

  const isMerged = !!request?.is_consolidated_parent;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={isMerged ? "max-w-4xl max-h-[92vh] overflow-y-auto" : "max-w-2xl max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Assign Vehicle & Driver
          </DialogTitle>
          <DialogDescription>
            Pick from ranked suggestions for{" "}
            <span className="font-mono font-semibold text-foreground">
              {request.request_number}
            </span>
            . The requester and driver are notified by SMS automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Compact request summary card */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono">
              {request.request_number}
            </Badge>
            {isMerged && (
              <Badge variant="default" className="text-[10px] gap-1">
                <GitMerge className="w-2.5 h-2.5" />
                Consolidated · {request.consolidated_request_count ?? "?"} requests
              </Badge>
            )}
            {request.pool_name && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Layers className="w-2.5 h-2.5" />
                {request.pool_name}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] gap-1">
              <Users className="w-2.5 h-2.5" />
              {request.passengers || 1} pax
            </Badge>
            {request.trip_type && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {String(request.trip_type).replace("_", " ")}
              </Badge>
            )}
          </div>

          {/* For non-merged requests, show simple route line. For merged trips,
              the full stops list + map is rendered separately below. */}
          {!isMerged && (
            <div className="flex items-start gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-foreground">
                <span className="text-muted-foreground">From</span> {request.departure_place || "—"}{" "}
                <span className="text-muted-foreground">→</span>{" "}
                {request.destination || "—"}
              </span>
            </div>
          )}

          {request.needed_from && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(request.needed_from), "EEE, MMM dd, yyyy · HH:mm")}
              {request.needed_until && (
                <>
                  <span>→</span>
                  {format(new Date(request.needed_until), "MMM dd · HH:mm")}
                </>
              )}
            </div>
          )}

          {request.requester_name && (
            <div className="text-xs text-muted-foreground">
              {isMerged ? "Created by" : "Requested by"}{" "}
              <span className="text-foreground font-medium">{request.requester_name}</span>
            </div>
          )}
        </div>

        {/* Full merged-trip visualisation: ordered stops + mini map */}
        {isMerged && (
          <MergedTripStopsPanel
            parentRequestId={request.id}
            organizationId={organizationId}
            poolName={request.pool_name}
            totalPassengers={request.passengers}
            childCount={request.consolidated_request_count}
            mergeStrategy={request.merge_strategy}
            neededFrom={request.needed_from}
            neededUntil={request.needed_until}
          />
        )}

        <PoolAssignmentPicker
          request={request}
          organizationId={organizationId}
          isAssigning={assignMutation.isPending}
          onAssign={(vehicleId, driverId) => assignMutation.mutate({ vehicleId, driverId })}
          onUnavailable={() => unavailableMutation.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
};
