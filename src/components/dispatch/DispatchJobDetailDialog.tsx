import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { MapPin, User, Phone, Package, Truck, Clock, FileText, Navigation } from "lucide-react";
import SLAIndicator from "./SLAIndicator";
import { DispatchJobAuditTrail } from "./DispatchJobAuditTrail";

interface DispatchJobDetailDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job: any | null;
  vehiclePlate?: string;
  driverName?: string;
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  dispatched: "bg-primary/10 text-primary border-primary/30",
  en_route: "bg-warning/10 text-warning border-warning/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  arrived: "bg-info/10 text-info border-info/30",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

/**
 * Read-only dispatch job detail view. Opens from card click in
 * DispatchJobsTab so users get full context without leaving the page.
 */
export const DispatchJobDetailDialog = ({
  open, onOpenChange, job, vehiclePlate, driverName,
}: DispatchJobDetailDialogProps) => {
  if (!job) return null;
  const tone = STATUS_TONE[job.status] || STATUS_TONE.pending;

  const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value?: any }) => (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value ?? "—"}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono">{job.job_number}</span>
            <Badge variant="outline" className={`${tone} capitalize`}>
              {String(job.status).replace("_", " ")}
            </Badge>
            {job.priority && (
              <Badge variant="outline" className="capitalize">{job.priority}</Badge>
            )}
            <Badge variant="outline" className="capitalize">{job.job_type}</Badge>
            <SLAIndicator
              slaDeadline={job.sla_deadline_at}
              actualTime={job.completed_at}
              status={job.status}
            />
          </DialogTitle>
          <DialogDescription>
            Created {format(new Date(job.created_at), "MMM dd, yyyy HH:mm")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <Row icon={MapPin} label="Pickup" value={job.pickup_location_name} />
          <Row icon={MapPin} label="Dropoff" value={job.dropoff_location_name} />
          <Row icon={Clock} label="Scheduled Pickup"
            value={job.scheduled_pickup_at ? format(new Date(job.scheduled_pickup_at), "MMM dd, HH:mm") : "—"} />
          <Row icon={Clock} label="Scheduled Dropoff"
            value={job.scheduled_dropoff_at ? format(new Date(job.scheduled_dropoff_at), "MMM dd, HH:mm") : "—"} />
          <Row icon={Truck} label="Vehicle" value={vehiclePlate || "Unassigned"} />
          <Row icon={User} label="Driver" value={driverName || "Unassigned"} />
          <Row icon={User} label="Customer" value={job.customer_name} />
          <Row icon={Phone} label="Phone" value={job.customer_phone} />
          <Row icon={Package} label="Cargo"
            value={job.cargo_description
              ? `${job.cargo_description}${job.cargo_weight_kg ? ` (${job.cargo_weight_kg}kg)` : ""}`
              : "—"} />
          <Row icon={Navigation} label="Distance"
            value={job.distance_traveled_km != null ? `${job.distance_traveled_km} km` : "—"} />
        </div>

        {job.special_instructions && (
          <>
            <Separator />
            <div className="flex items-start gap-2 pt-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Special instructions</p>
                <p className="text-sm whitespace-pre-wrap">{job.special_instructions}</p>
              </div>
            </div>
          </>
        )}

        <Separator />
        <DispatchJobAuditTrail jobId={job.id} open={open} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DispatchJobDetailDialog;
