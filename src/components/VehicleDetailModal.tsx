import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  MapPin,
  Fuel,
  Gauge,
  Calendar,
  User,
  Clock,
  Route,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CreateIncidentDialog from "@/components/incidents/CreateIncidentDialog";

interface VehicleDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    id: string;
    plate: string;
    make?: string;
    model?: string;
    year?: number;
    status: "moving" | "idle" | "stopped" | "offline";
    fuel: number;
    location?: string;
    speed?: number;
    odometer?: number;
    driver?: string;
    vehicleId?: string;
  };
}

const VehicleDetailModal = ({ open, onOpenChange, vehicle }: VehicleDetailModalProps) => {
  const navigate = useNavigate();

  // Early return if vehicle is null
  if (!vehicle) {
    return null;
  }

  const handleTrackOnMap = () => {
    onOpenChange(false);
    navigate('/map', { state: { selectedVehicleId: vehicle.vehicleId || vehicle.id } });
  };

  const handleViewDriverProfile = () => {
    if (!vehicle.driver || vehicle.driver === "Not assigned") {
      toast.info("No driver assigned to this vehicle");
    } else {
      toast.info("Driver profile feature coming soon");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{vehicle.plate}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}
              </p>
            </div>
            <StatusBadge status={vehicle.status} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Fuel className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{vehicle.fuel}%</div>
                    <div className="text-xs text-muted-foreground">Fuel Level</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-success/10">
                    <Gauge className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{vehicle.speed || 0}</div>
                    <div className="text-xs text-muted-foreground">km/h</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-accent/10">
                    <Route className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{vehicle.odometer?.toLocaleString() || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">Total KM</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-warning/10">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">2.4h</div>
                    <div className="text-xs text-muted-foreground">Idle Today</div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Location & Driver Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Current Location
                </h3>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="font-medium">{vehicle.location || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last updated: 2 minutes ago
                  </p>
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={handleTrackOnMap}>
                  <MapPin className="w-4 h-4" />
                  Track on Map
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Driver Information
                </h3>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="font-medium">{vehicle.driver || "Not assigned"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">Licensed</Badge>
                    <Badge variant="outline" className="text-xs">4.8★ Rating</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={handleViewDriverProfile}>
                  <User className="w-4 h-4" />
                  View Driver Profile
                </Button>
              </div>
            </div>

            <Separator />

            {/* Recent Activity */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {[
                  { time: "10:45 AM", event: "Started engine", location: "Depot A" },
                  { time: "11:20 AM", event: "Refueled 45L", location: "Shell Station" },
                  { time: "2:30 PM", event: "Delivery completed", location: "Customer Site 3" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.event}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.time} • {activity.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button className="flex-1 gap-2">
                <Route className="w-4 h-4" />
                Assign Route
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <Calendar className="w-4 h-4" />
                Schedule Maintenance
              </Button>
              <CreateIncidentDialog
                trigger={
                  <Button variant="outline" className="flex-1 gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Report Issue
                  </Button>
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-6">
            <div className="p-6 rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Performance Metrics (Last 30 Days)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">Avg. Fuel Efficiency</div>
                  <div className="text-2xl font-bold mt-1">7.2 L/100km</div>
                  <div className="text-xs text-success mt-1">↓ 5% improved</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Distance</div>
                  <div className="text-2xl font-bold mt-1">3,450 km</div>
                  <div className="text-xs text-muted-foreground mt-1">142 trips</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Idle Time</div>
                  <div className="text-2xl font-bold mt-1">18.5 hrs</div>
                  <div className="text-xs text-warning mt-1">↑ 12% increased</div>
                </div>
              </div>
            </div>

            <div className="h-64 rounded-lg border bg-muted/20 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Performance charts visualization</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-warning/50 bg-warning/5">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <h4 className="font-semibold">Due Soon</h4>
                </div>
                <p className="text-sm">Oil change due in 250 km (Jan 25, 2025)</p>
              </div>

              {[
                { date: "Dec 15, 2024", service: "Tire Rotation", cost: "$120", status: "Completed" },
                { date: "Nov 8, 2024", service: "Brake Inspection", cost: "$85", status: "Completed" },
                { date: "Oct 22, 2024", service: "Engine Diagnostics", cost: "$200", status: "Completed" },
              ].map((record, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{record.service}</p>
                      <p className="text-sm text-muted-foreground mt-1">{record.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{record.cost}</p>
                      <Badge variant="outline" className="mt-1">{record.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <div className="space-y-3">
              {[
                { date: "Today, 3:45 PM", event: "Completed delivery", details: "Route #1245" },
                { date: "Today, 11:20 AM", event: "Refueled 45.5L", details: "Shell Station, Main St" },
                { date: "Today, 8:30 AM", event: "Started route", details: "Departed from Depot A" },
                { date: "Yesterday, 5:15 PM", event: "Returned to depot", details: "Total: 285 km" },
              ].map((entry, i) => (
                <div key={i} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">{entry.event}</p>
                      <p className="text-sm text-muted-foreground mt-1">{entry.details}</p>
                      <p className="text-xs text-muted-foreground mt-2">{entry.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailModal;
