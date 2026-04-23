import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MapPin, Clock, Users, Send, CheckCircle, XCircle, Truck, Package,
  MessageSquare, History, Shield, Ban, RefreshCw, Gauge, LogIn, LogOut, User, Route as RouteIcon
} from "lucide-react";
import { format } from "date-fns";
import { ApprovalFlowViewer } from "@/components/scheduling/ApprovalFlowViewer";
import { VehicleRecommendations } from "@/components/scheduling/VehicleRecommendations";
import { RouteMapPreview } from "@/components/vehicle-requests/RouteMapPreview";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft:       { bg: "bg-muted",            text: "text-muted-foreground", label: "Draft" },
  pending:     { bg: "bg-warning/15",       text: "text-warning",          label: "Pending Approval" },
  submitted:   { bg: "bg-warning/15",       text: "text-warning",          label: "Pending Approval" },
  approved:    { bg: "bg-success/15",       text: "text-success",          label: "Approved" },
  scheduled:   { bg: "bg-secondary/15",     text: "text-secondary",        label: "Scheduled" },
  assigned:    { bg: "bg-secondary/15",     text: "text-secondary",        label: "Assigned" },
  dispatched:  { bg: "bg-purple-500/15",    text: "text-purple-600",       label: "Dispatched" },
  in_service:  { bg: "bg-primary/15",       text: "text-primary",          label: "On Trip" },
  in_progress: { bg: "bg-primary/15",       text: "text-primary",          label: "On Trip" },
  completed:   { bg: "bg-success/15",       text: "text-success",          label: "Completed" },
  closed:      { bg: "bg-success/15",       text: "text-success",          label: "Completed" },
  rejected:    { bg: "bg-destructive/15",   text: "text-destructive",      label: "Rejected" },
  cancelled:   { bg: "bg-muted",            text: "text-muted-foreground", label: "Cancelled" },
};

interface TripDetailPanelProps {
  trip: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (id: string) => void;
  onApprove?: (approvalId: string, requestId: string, comment?: string) => void;
  onReject?: (approvalId: string, requestId: string, comment: string) => void;
  onAssign?: (trip: any) => void;
  onCancel?: (id: string) => void;
  /** Manager-only: open a dialog to override the request status (re-approve, reject, send back). */
  onChangeStatus?: (trip: any) => void;
}

export const TripDetailPanel = ({
  trip, open, onOpenChange, onSubmit, onApprove, onReject, onAssign, onCancel, onChangeStatus
}: TripDetailPanelProps) => {
  if (!trip) return null;

  const canCancel = ["draft", "submitted", "pending", "approved"].includes(trip.status);
  const startAt = trip.needed_from ?? trip.pickup_at;
  const endAt   = trip.needed_until ?? trip.return_at;
  const pickupName = trip.departure_place ?? trip.pool_name ?? trip.pool_location ?? trip.pickup_geofence?.name;
  const dropName   = trip.destination ?? trip.drop_geofence?.name;
  const status = STATUS_STYLES[trip.status] || STATUS_STYLES.draft;

  // Build route-map points from whatever lat/lng the request has stored. The
  // map is shown as soon as we have at least one resolvable point so the
  // operations team gets visual context for assignment decisions.
  const hasMapPoint =
    (trip.departure_lat != null && trip.departure_lng != null) ||
    (trip.destination_lat != null && trip.destination_lng != null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Hero Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5">
          <DialogHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-lg font-bold text-primary">{trip.request_number}</span>
              <Badge className={`${status.bg} ${status.text} border-0`}>{status.label}</Badge>
              {trip.driver_checked_in_at && !trip.driver_checked_out_at && (
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] gap-1">
                  <LogIn className="w-3 h-3" /> Driver checked in
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl mt-2">{trip.purpose || "(no purpose)"}</DialogTitle>
            <DialogDescription className="sr-only">Trip request details and actions</DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {startAt && (
              <InfoBlock icon={<Clock className="w-4 h-4 text-primary" />} label="Pickup">
                {format(new Date(startAt), "MMM dd, yyyy HH:mm")}
              </InfoBlock>
            )}
            {endAt && (
              <InfoBlock icon={<Clock className="w-4 h-4 text-secondary" />} label="Return">
                {format(new Date(endAt), "MMM dd, yyyy HH:mm")}
              </InfoBlock>
            )}
            <InfoBlock icon={<MapPin className="w-4 h-4 text-primary" />} label="Pickup Location">
              {pickupName || "Not specified"}
            </InfoBlock>
            <InfoBlock icon={<MapPin className="w-4 h-4 text-destructive" />} label="Drop Location">
              {dropName || "Not specified"}
            </InfoBlock>
            <InfoBlock icon={<Users className="w-4 h-4 text-secondary" />} label="Passengers">
              {trip.passenger_count || trip.passengers || 1}
            </InfoBlock>
            <InfoBlock icon={<Truck className="w-4 h-4 text-primary" />} label="Vehicle Class">
              {trip.required_class || trip.vehicle_class || "Any"}
            </InfoBlock>
            {trip.cargo_weight_kg && (
              <InfoBlock icon={<Package className="w-4 h-4 text-warning" />} label="Cargo">
                {trip.cargo_weight_kg} kg
              </InfoBlock>
            )}
            {trip.cost_center && (
              <InfoBlock icon={<Shield className="w-4 h-4 text-muted-foreground" />} label="Cost Center">
                {trip.cost_center.code} - {trip.cost_center.name}
              </InfoBlock>
            )}
          </div>

          {/* Route map preview — gives operations a quick spatial read on the
              trip. Renders only when at least one endpoint has coordinates. */}
          {hasMapPoint && (
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <RouteIcon className="w-3 h-3" /> Route Preview
              </Label>
              <RouteMapPreview
                departure={{
                  lat: trip.departure_lat ?? null,
                  lng: trip.departure_lng ?? null,
                  label: pickupName ?? "Pickup",
                }}
                destination={{
                  lat: trip.destination_lat ?? null,
                  lng: trip.destination_lng ?? null,
                  label: dropName ?? "Destination",
                }}
                heightPx={220}
              />
            </div>
          )}

          {/* Assigned vehicle / driver pill */}
          {(trip.assigned_vehicle || trip.assigned_driver) && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                <Truck className="w-3 h-3" /> Assigned Resources
              </Label>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                {trip.assigned_vehicle && (
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    <span className="font-mono font-medium">{trip.assigned_vehicle.plate_number}</span>
                    {trip.assigned_vehicle.make && (
                      <span className="text-xs text-muted-foreground">
                        {trip.assigned_vehicle.make} {trip.assigned_vehicle.model}
                      </span>
                    )}
                  </span>
                )}
                {trip.assigned_driver && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    {trip.assigned_driver.first_name} {trip.assigned_driver.last_name}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Driver check-in / check-out timeline (post-assignment) */}
          {(trip.driver_checked_in_at || trip.driver_checked_out_at) && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Clock className="w-3 h-3" /> Trip Timeline
              </Label>
              <div className="space-y-2 text-sm">
                {trip.driver_checked_in_at && (
                  <div className="flex items-start gap-2">
                    <LogIn className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">Checked in</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(trip.driver_checked_in_at), "MMM dd, yyyy HH:mm")}
                        {trip.driver_checkin_odometer != null && (
                          <> · <Gauge className="inline w-3 h-3" /> {trip.driver_checkin_odometer} km</>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {trip.driver_checked_out_at && (
                  <div className="flex items-start gap-2">
                    <LogOut className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">Checked out</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(trip.driver_checked_out_at), "MMM dd, yyyy HH:mm")}
                        {trip.driver_checkout_odometer != null && (
                          <> · <Gauge className="inline w-3 h-3" /> {trip.driver_checkout_odometer} km</>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {trip.distance_log_km != null && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40 mt-1">
                    <Gauge className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">Distance traveled:</span>
                    <span>{Number(trip.distance_log_km).toFixed(1)} km</span>
                    {trip.distance_estimate_km != null && (
                      <span className="text-xs text-muted-foreground">
                        (est. {Number(trip.distance_estimate_km).toFixed(1)} km)
                      </span>
                    )}
                  </div>
                )}
                {trip.driver_checkin_notes && (
                  <div className="text-xs text-muted-foreground pt-1 italic">
                    "{trip.driver_checkin_notes}"
                  </div>
                )}
              </div>
            </div>
          )}

          {trip.notes && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MessageSquare className="w-3 h-3" /> Notes
              </Label>
              <p className="text-sm text-foreground">{trip.notes}</p>
            </div>
          )}

          {trip.rejection_reason && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <Label className="text-xs text-destructive flex items-center gap-1 mb-1">
                <XCircle className="w-3 h-3" /> Rejection Reason
              </Label>
              <p className="text-sm text-foreground">{trip.rejection_reason}</p>
            </div>
          )}

          <Separator />

          {/* Approval Flow */}
          {trip.status !== "draft" && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-primary" /> Approval Flow
              </h3>
              <ApprovalFlowViewer requestId={trip.id} />
            </div>
          )}

          {/* Vehicle Recommendations */}
          {trip.status === "approved" && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-primary" /> Vehicle Recommendations
              </h3>
              <VehicleRecommendations
                requestId={trip.id}
                pickupAt={trip.pickup_at}
                returnAt={trip.return_at}
                requiredClass={trip.required_class}
                passengers={trip.passenger_count || trip.passengers}
                pickupGeofenceId={trip.pickup_geofence_id}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 flex-wrap">
            {trip.status === "draft" && onSubmit && (
              <Button onClick={() => { onSubmit(trip.id); onOpenChange(false); }} className="gap-1.5">
                <Send className="w-4 h-4" /> Submit for Approval
              </Button>
            )}
            {trip.status === "approved" && onAssign && (
              <Button onClick={() => onAssign(trip)} className="gap-1.5">
                <Truck className="w-4 h-4" /> Assign Vehicle & Driver
              </Button>
            )}
            {canCancel && onCancel && (
              <Button variant="destructive" onClick={() => onCancel(trip.id)} className="gap-1.5">
                <Ban className="w-4 h-4" /> Cancel Request
              </Button>
            )}
            {onChangeStatus && (
              <Button variant="outline" onClick={() => onChangeStatus(trip)} className="gap-1.5">
                <RefreshCw className="w-4 h-4" /> Change Status
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoBlock = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-0.5">{icon}</div>
    <div>
      <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  </div>
);
