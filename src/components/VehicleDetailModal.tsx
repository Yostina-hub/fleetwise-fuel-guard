import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import DriverDetailDialog from "@/components/fleet/DriverDetailDialog";
import { useVehicleData } from "@/hooks/useVehicleData";
import { useDrivers } from "@/hooks/useDrivers";
import { format, formatDistanceToNow } from "date-fns";

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
    driverId?: string;
    vehicleId?: string;
  };
}

const VehicleDetailModal = ({ open, onOpenChange, vehicle }: VehicleDetailModalProps) => {
  const navigate = useNavigate();
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const { drivers } = useDrivers();
  
  const actualVehicleId = vehicle?.vehicleId || vehicle?.id || '';
  
  // Fetch real vehicle data - hooks must be called unconditionally
  const { 
    recentTrips, 
    maintenanceRecords, 
    fuelTransactions, 
    driverEvents,
    performanceMetrics,
    isLoading 
  } = useVehicleData(actualVehicleId);

  // Early return if vehicle is null - AFTER all hooks
  if (!vehicle) {
    return null;
  }

  // Find driver info
  const assignedDriver = vehicle.driverId 
    ? drivers.find(d => d.id === vehicle.driverId) 
    : null;

  const handleTrackOnMap = () => {
    onOpenChange(false);
    navigate('/map', { state: { selectedVehicleId: actualVehicleId } });
  };

  const handleViewDriverProfile = () => {
    if (!assignedDriver) {
      toast.info("No driver assigned to this vehicle");
    } else {
      setDriverDialogOpen(true);
    }
  };

  // Combine recent activity from trips, fuel transactions, and events
  const recentActivity = [
    ...recentTrips.slice(0, 3).map(t => ({
      time: t.start_time,
      event: t.status === 'completed' ? 'Completed trip' : 'Started trip',
      location: `${t.distance_km?.toFixed(1) || 0} km`,
      type: 'trip'
    })),
    ...fuelTransactions.slice(0, 2).map(f => ({
      time: f.transaction_date,
      event: `Refueled ${f.fuel_amount_liters}L`,
      location: f.location_name || 'Unknown station',
      type: 'fuel'
    })),
    ...driverEvents.slice(0, 2).map(e => ({
      time: e.event_time,
      event: e.event_type.replace('_', ' '),
      location: e.address || 'Unknown location',
      type: 'event'
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  return (
    <>
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
                      <div className="text-2xl font-bold">
                        {vehicle.fuel !== null ? `${vehicle.fuel}%` : 'N/A'}
                      </div>
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
                      <Route className="w-5 h-5 text-accent-foreground" />
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
                      {isLoading ? (
                        <Skeleton className="h-7 w-12" />
                      ) : (
                        <div className="text-2xl font-bold">
                          {(performanceMetrics.totalIdleMinutes / 60).toFixed(1)}h
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">Idle (30d)</div>
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
                      Live tracking available
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
                    {assignedDriver && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {assignedDriver.license_class ? `Class ${assignedDriver.license_class}` : 'Licensed'}
                        </Badge>
                        {assignedDriver.safety_score && (
                          <Badge variant="outline" className="text-xs">
                            {assignedDriver.safety_score}★ Score
                          </Badge>
                        )}
                      </div>
                    )}
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
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        <div className="flex-1">
                          <p className="font-medium text-sm capitalize">{activity.event}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(activity.time), { addSuffix: true })} • {activity.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
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
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i}>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Avg. Fuel Efficiency</div>
                      <div className="text-2xl font-bold mt-1">
                        {performanceMetrics.avgFuelEfficiency 
                          ? `${performanceMetrics.avgFuelEfficiency.toFixed(1)} L/100km`
                          : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Distance</div>
                      <div className="text-2xl font-bold mt-1">
                        {performanceMetrics.totalDistance.toLocaleString()} km
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {performanceMetrics.totalTrips} trips
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Idle Time</div>
                      <div className="text-2xl font-bold mt-1">
                        {(performanceMetrics.totalIdleMinutes / 60).toFixed(1)} hrs
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-64 rounded-lg border bg-muted/20 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Performance charts visualization</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4 mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upcoming maintenance */}
                  {maintenanceRecords.filter(m => m.next_due_date && new Date(m.next_due_date) > new Date()).length > 0 ? (
                    maintenanceRecords
                      .filter(m => m.next_due_date && new Date(m.next_due_date) > new Date())
                      .slice(0, 1)
                      .map((record, i) => (
                        <div key={i} className="p-4 rounded-lg border border-warning/50 bg-warning/5">
                          <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-warning" />
                            <h4 className="font-semibold">Due Soon</h4>
                          </div>
                          <p className="text-sm">
                            {record.service_type} due on {format(new Date(record.next_due_date!), 'MMM d, yyyy')}
                          </p>
                        </div>
                      ))
                  ) : (
                    <div className="p-4 rounded-lg border border-success/50 bg-success/5">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-success" />
                        <p className="text-sm">No upcoming maintenance scheduled</p>
                      </div>
                    </div>
                  )}

                  {/* Past maintenance */}
                  {maintenanceRecords.filter(m => m.last_service_date).length > 0 ? (
                    maintenanceRecords
                      .filter(m => m.last_service_date)
                      .map((record, i) => (
                        <div key={i} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{record.service_type}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(record.last_service_date!), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{record.priority || 'Normal'}</Badge>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No maintenance history found</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTrips.length > 0 ? (
                    recentTrips.map((trip, i) => (
                      <div key={i} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {trip.status === 'completed' ? 'Completed trip' : 'Trip in progress'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {trip.distance_km?.toFixed(1) || 0} km • {trip.duration_minutes || 0} min
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(trip.start_time), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No trip history found for this vehicle
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Driver Detail Dialog */}
      <DriverDetailDialog 
        open={driverDialogOpen}
        onOpenChange={setDriverDialogOpen}
        driver={assignedDriver || null}
      />
    </>
  );
};

export default VehicleDetailModal;
