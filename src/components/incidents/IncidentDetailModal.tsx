import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Car, 
  User, 
  MapPin, 
  Clock, 
  AlertTriangle,
  DollarSign,
  FileText,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

interface Incident {
  id: string;
  incident_number: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string;
  location?: string;
  incident_time: string;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  resolution_notes?: string | null;
  vehicle_id?: string | null;
  driver_id?: string | null;
}

interface IncidentDetailModalProps {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehiclePlate?: string;
  driverName?: string;
  onInvestigate?: () => void;
  onResolve?: () => void;
}

const IncidentDetailModal = ({
  incident,
  open,
  onOpenChange,
  vehiclePlate = "N/A",
  driverName = "N/A",
  onInvestigate,
  onResolve
}: IncidentDetailModalProps) => {
  if (!incident) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-destructive/20 text-destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline">Open</Badge>;
      case 'investigating':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Investigating</Badge>;
      case 'resolved':
        return <Badge className="bg-success/10 text-success border-success/20">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" aria-hidden="true" />
            Incident Details
          </DialogTitle>
          <DialogDescription>
            View complete information about incident {incident.incident_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-lg">{incident.incident_number}</span>
              {getSeverityBadge(incident.severity)}
              {getStatusBadge(incident.status)}
            </div>
            <Badge variant="outline" className="capitalize">
              {incident.incident_type.replace('_', ' ')}
            </Badge>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
            <p className="text-sm">{incident.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <span className="text-muted-foreground">Date & Time:</span>
                  <p className="font-medium">{format(new Date(incident.incident_time), "PPP 'at' p")}</p>
                </div>
              </div>
              
              {incident.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{incident.location}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <span className="text-muted-foreground">Vehicle:</span>
                  <p className="font-medium">{vehiclePlate}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <span className="text-muted-foreground">Driver:</span>
                  <p className="font-medium">{driverName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Information */}
          {(incident.estimated_cost || incident.actual_cost) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {incident.estimated_cost && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <p className="font-medium text-lg">${incident.estimated_cost.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {incident.actual_cost && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-success" aria-hidden="true" />
                    <div>
                      <span className="text-muted-foreground">Actual Cost:</span>
                      <p className="font-medium text-lg text-success">${incident.actual_cost.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Resolution Notes */}
          {incident.resolution_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  Resolution Notes
                </h4>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{incident.resolution_notes}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {incident.status === 'open' && onInvestigate && (
              <Button onClick={onInvestigate}>
                Start Investigation
              </Button>
            )}
            {incident.status === 'investigating' && onResolve && (
              <Button className="bg-success hover:bg-success/90" onClick={onResolve}>
                <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncidentDetailModal;
