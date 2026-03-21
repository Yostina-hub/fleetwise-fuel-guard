import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapPin, Clock, Users, Send, CheckCircle, XCircle, Truck, User, Package,
  MessageSquare, History, ArrowRight, Shield, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { ApprovalFlowViewer } from "@/components/scheduling/ApprovalFlowViewer";
import { VehicleRecommendations } from "@/components/scheduling/VehicleRecommendations";
import { motion } from "framer-motion";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-muted", text: "text-muted-foreground", label: "Draft" },
  submitted: { bg: "bg-warning/15", text: "text-warning", label: "Pending Approval" },
  approved: { bg: "bg-success/15", text: "text-success", label: "Approved" },
  scheduled: { bg: "bg-secondary/15", text: "text-secondary", label: "Scheduled" },
  dispatched: { bg: "bg-purple-500/15", text: "text-purple-600", label: "Dispatched" },
  in_service: { bg: "bg-primary/15", text: "text-primary", label: "In Service" },
  completed: { bg: "bg-success/15", text: "text-success", label: "Completed" },
  rejected: { bg: "bg-destructive/15", text: "text-destructive", label: "Rejected" },
};

interface TripDetailPanelProps {
  trip: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (id: string) => void;
  onApprove?: (approvalId: string, requestId: string, comment?: string) => void;
  onReject?: (approvalId: string, requestId: string, comment: string) => void;
  onAssign?: (trip: any) => void;
}

export const TripDetailPanel = ({
  trip, open, onOpenChange, onSubmit, onApprove, onReject, onAssign
}: TripDetailPanelProps) => {
  const [approvalComment, setApprovalComment] = useState("");
  const status = STATUS_STYLES[trip?.status] || STATUS_STYLES.draft;

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Hero Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-primary">{trip.request_number}</span>
              <Badge className={`${status.bg} ${status.text} border-0`}>
                {status.label}
              </Badge>
            </div>
            <DialogTitle className="text-xl mt-2">{trip.purpose}</DialogTitle>
            <DialogDescription className="sr-only">Trip request details and actions</DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock icon={<Clock className="w-4 h-4 text-primary" />} label="Pickup">
              {format(new Date(trip.pickup_at), "MMM dd, yyyy HH:mm")}
            </InfoBlock>
            <InfoBlock icon={<Clock className="w-4 h-4 text-secondary" />} label="Return">
              {format(new Date(trip.return_at), "MMM dd, yyyy HH:mm")}
            </InfoBlock>
            <InfoBlock icon={<MapPin className="w-4 h-4 text-primary" />} label="Pickup Location">
              {trip.pickup_geofence?.name || "Not specified"}
            </InfoBlock>
            <InfoBlock icon={<MapPin className="w-4 h-4 text-destructive" />} label="Drop Location">
              {trip.drop_geofence?.name || "Not specified"}
            </InfoBlock>
            <InfoBlock icon={<Users className="w-4 h-4 text-secondary" />} label="Passengers">
              {trip.passengers || 1}
            </InfoBlock>
            <InfoBlock icon={<Truck className="w-4 h-4 text-primary" />} label="Vehicle Class">
              {trip.required_class || "Any"}
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
                passengers={trip.passengers}
                pickupGeofenceId={trip.pickup_geofence_id}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {trip.status === "draft" && onSubmit && (
              <Button onClick={() => { onSubmit(trip.id); onOpenChange(false); }} className="gap-1.5">
                <Send className="w-4 h-4" /> Submit for Approval
              </Button>
            )}
            {trip.status === "approved" && onAssign && (
              <Button onClick={() => { onAssign(trip); onOpenChange(false); }} className="gap-1.5">
                <Truck className="w-4 h-4" /> Assign Vehicle & Driver
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
