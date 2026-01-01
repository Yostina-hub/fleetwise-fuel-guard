import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Truck,
  MapPin,
  Clock,
  Phone,
  Navigation,
  CheckCircle2,
  Camera,
  Package,
  AlertTriangle,
  User,
  FileSignature,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface DispatchJob {
  id: string;
  job_number: string;
  status: string;
  priority: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;
  scheduled_pickup_at: string | null;
  scheduled_dropoff_at: string | null;
  cargo_description: string | null;
  special_instructions: string | null;
}

interface DriverMobileViewProps {
  jobs: DispatchJob[];
  onAcceptJob: (jobId: string) => void;
  onUpdateStatus: (jobId: string, status: string) => void;
  onCapturePOD: (jobId: string, data: PODData) => void;
}

interface PODData {
  recipient_name: string;
  notes: string;
  photos: string[];
}

export const DriverMobileView = ({
  jobs,
  onAcceptJob,
  onUpdateStatus,
  onCapturePOD,
}: DriverMobileViewProps) => {
  const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null);
  const [showPODDialog, setShowPODDialog] = useState(false);
  const [podData, setPodData] = useState<PODData>({
    recipient_name: "",
    notes: "",
    photos: [],
  });

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      case "normal":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-500/20 text-blue-500";
      case "en_route_pickup":
      case "en_route_dropoff":
        return "bg-amber-500/20 text-amber-500";
      case "arrived_pickup":
      case "arrived_dropoff":
        return "bg-purple-500/20 text-purple-500";
      case "completed":
        return "bg-success/20 text-success";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case "assigned":
        return { label: "Start Pickup", nextStatus: "en_route_pickup" };
      case "en_route_pickup":
        return { label: "Arrived at Pickup", nextStatus: "arrived_pickup" };
      case "arrived_pickup":
        return { label: "Start Delivery", nextStatus: "en_route_dropoff" };
      case "en_route_dropoff":
        return { label: "Arrived at Dropoff", nextStatus: "arrived_dropoff" };
      case "arrived_dropoff":
        return { label: "Complete & Capture POD", nextStatus: "pod" };
      default:
        return null;
    }
  };

  const handleStatusUpdate = (job: DispatchJob) => {
    const action = getNextAction(job.status);
    if (!action) return;

    if (action.nextStatus === "pod") {
      setSelectedJob(job);
      setShowPODDialog(true);
    } else {
      onUpdateStatus(job.id, action.nextStatus);
      toast.success(`Status updated to ${action.nextStatus.replace(/_/g, " ")}`);
    }
  };

  const handlePODSubmit = () => {
    if (!selectedJob) return;
    if (!podData.recipient_name.trim()) {
      toast.error("Please enter recipient name");
      return;
    }

    onCapturePOD(selectedJob.id, podData);
    onUpdateStatus(selectedJob.id, "completed");
    setShowPODDialog(false);
    setPodData({ recipient_name: "", notes: "", photos: [] });
    toast.success("Delivery completed with POD captured!");
  };

  const activeJobs = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === "completed");

  return (
    <div className="space-y-4 p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground text-sm">
            {activeJobs.length} active • {completedJobs.length} completed today
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Online
        </Badge>
      </div>

      {/* Active Jobs */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Active Jobs
        </h2>

        {activeJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active jobs</p>
              <p className="text-sm text-muted-foreground">
                New jobs will appear here when assigned
              </p>
            </CardContent>
          </Card>
        ) : (
          activeJobs.map((job) => {
            const action = getNextAction(job.status);

            return (
              <Card key={job.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.job_number}</CardTitle>
                      {job.customer_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          {job.customer_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {job.priority && (
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority}
                        </Badge>
                      )}
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Locations */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-success" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pickup</p>
                        <p className="text-sm font-medium">
                          {job.pickup_location_name || "Not specified"}
                        </p>
                        {job.scheduled_pickup_at && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(job.scheduled_pickup_at), "h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dropoff</p>
                        <p className="text-sm font-medium">
                          {job.dropoff_location_name || "Not specified"}
                        </p>
                        {job.scheduled_dropoff_at && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(job.scheduled_dropoff_at), "h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cargo & Instructions */}
                  {(job.cargo_description || job.special_instructions) && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      {job.cargo_description && (
                        <p className="text-sm">
                          <span className="font-medium">Cargo:</span> {job.cargo_description}
                        </p>
                      )}
                      {job.special_instructions && (
                        <p className="text-sm flex items-start gap-1">
                          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                          {job.special_instructions}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {job.customer_phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`tel:${job.customer_phone}`)}
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const address =
                          job.status.includes("pickup")
                            ? job.pickup_location_name
                            : job.dropoff_location_name;
                        if (address) {
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                          );
                        }
                      }}
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      Navigate
                    </Button>
                  </div>

                  {action && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleStatusUpdate(job)}
                    >
                      {action.nextStatus === "pod" ? (
                        <FileSignature className="w-4 h-4 mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      {action.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Completed Today
          </h2>
          {completedJobs.slice(0, 3).map((job) => (
            <Card key={job.id} className="opacity-75">
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{job.job_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.dropoff_location_name}
                  </p>
                </div>
                <Badge className="bg-success/20 text-success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Done
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* POD Dialog */}
      <Dialog open={showPODDialog} onOpenChange={setShowPODDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Capture Proof of Delivery</DialogTitle>
            <DialogDescription>
              Record delivery confirmation for {selectedJob?.job_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recipient Name *</label>
              <Input
                placeholder="Enter recipient name"
                value={podData.recipient_name}
                onChange={(e) =>
                  setPodData((prev) => ({ ...prev, recipient_name: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Delivery Notes</label>
              <Textarea
                placeholder="Any additional notes..."
                value={podData.notes}
                onChange={(e) =>
                  setPodData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>

            <Button variant="outline" className="w-full" disabled>
              <Camera className="w-4 h-4 mr-2" />
              Capture Photo (Coming Soon)
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPODDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePODSubmit}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
