import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  MapPin,
  Clock,
  User,
  CheckCircle,
  X,
  MessageSquare,
  Bell,
  Car,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface AlertData {
  id: string;
  severity: string;
  alert_type: string;
  vehiclePlate: string;
  driverName?: string | null;
  message: string;
  location_name?: string;
  formattedTime: string;
  status: string;
  lat?: number;
  lng?: number;
  resolution_notes?: string;
}

interface AlertDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: AlertData | null;
  onAcknowledge?: (alertId: string, notes?: string) => Promise<boolean>;
  onResolve?: (alertId: string, notes?: string) => Promise<boolean>;
  onViewOnMap?: (alert: AlertData) => void;
}

const AlertDetailModal = ({ 
  open, 
  onOpenChange, 
  alert,
  onAcknowledge,
  onResolve,
  onViewOnMap
}: AlertDetailModalProps) => {
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const getSeverityIcon = () => {
    switch (alert?.severity) {
      case "critical":
        return <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      default:
        return <Bell className="w-6 h-6 text-primary" />;
    }
  };

  const getSeverityColor = () => {
    switch (alert?.severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "outline";
      default:
        return "outline";
    }
  };

  if (!alert) {
    return null;
  }

  const handleAcknowledge = async () => {
    if (!onAcknowledge) return;
    setIsProcessing(true);
    const success = await onAcknowledge(alert.id, notes || undefined);
    setIsProcessing(false);
    if (success) {
      setNotes("");
      onOpenChange(false);
    }
  };

  const handleResolve = async () => {
    if (!onResolve) return;
    setIsProcessing(true);
    const success = await onResolve(alert.id, notes || undefined);
    setIsProcessing(false);
    if (success) {
      setNotes("");
      onOpenChange(false);
    }
  };

  const handleViewOnMap = () => {
    if (onViewOnMap && alert.lat && alert.lng) {
      onViewOnMap(alert);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              alert.severity === "critical" ? "bg-destructive/10" :
              alert.severity === "warning" ? "bg-warning/10" :
              "bg-primary/10"
            }`}>
              {getSeverityIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{alert.alert_type}</DialogTitle>
              <DialogDescription className="sr-only">
                Details for {alert.alert_type} alert with {alert.severity} severity
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getSeverityColor() as any}>
                  {alert.severity?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <Badge variant="outline">{alert.status || 'pending'}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Alert Details */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alert Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-24 text-muted-foreground">Message:</div>
                <div className="flex-1 font-medium">{alert.message || 'N/A'}</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-24 text-muted-foreground">Vehicle:</div>
                <div className="flex-1 font-medium flex items-center gap-2">
                  <Car className="w-3 h-3" />
                  {alert.vehiclePlate || 'N/A'}
                </div>
              </div>
              {alert.driverName && (
                <div className="flex items-start gap-3">
                  <div className="w-24 text-muted-foreground">Driver:</div>
                  <div className="flex-1 font-medium flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {alert.driverName}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-24 text-muted-foreground">Location:</div>
                <div className="flex-1 font-medium flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {alert.location_name || 'Unknown'}
                  {alert.lat && alert.lng && (
                    <span className="text-xs text-muted-foreground">
                      ({alert.lat.toFixed(4)}, {alert.lng.toFixed(4)})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-24 text-muted-foreground">Time:</div>
                <div className="flex-1 font-medium flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {alert.formattedTime || 'N/A'}
                </div>
              </div>
              {alert.resolution_notes && (
                <div className="flex items-start gap-3">
                  <div className="w-24 text-muted-foreground">Notes:</div>
                  <div className="flex-1 font-medium">{alert.resolution_notes}</div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Recommended Actions */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Recommended Actions
            </h3>
            <div className="space-y-2">
              {alert?.severity === "critical" ? (
                <>
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium">1. Immediately contact the driver</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium">2. Dispatch security team if theft suspected</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium">3. Review vehicle telemetry data</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <p className="text-sm font-medium">1. Monitor the situation closely</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <p className="text-sm font-medium">2. Contact driver if issue persists</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Add Notes */}
          {(alert?.status === "unacknowledged" || alert?.status === "acknowledged") && (
            <div className="space-y-3">
              <Label htmlFor="alert-resolution-notes" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Add Notes (Optional)
              </Label>
              <Textarea
                id="alert-resolution-notes"
                placeholder="Enter any observations or actions taken..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                aria-describedby="alert-notes-description"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {alert?.status === "unacknowledged" ? (
              <>
                <Button 
                  className="flex-1 gap-2" 
                  onClick={handleAcknowledge}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Acknowledge
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={handleResolve}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Resolve
                </Button>
              </>
            ) : alert?.status === "acknowledged" ? (
              <Button 
                className="flex-1 gap-2" 
                onClick={handleResolve}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Mark Resolved
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
                Close
              </Button>
            )}
            {alert.lat && alert.lng && (
              <Button variant="outline" className="gap-2" onClick={handleViewOnMap}>
                <MapPin className="w-4 h-4" />
                View on Map
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlertDetailModal;