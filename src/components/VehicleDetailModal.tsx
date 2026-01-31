import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Navigation,
  Fuel,
  Bell,
  MapPin,
  Terminal,
  Info,
  Settings,
  Route,
  AlertTriangle,
  Calendar,
  User,
  Camera,
  Gauge,
  Clock,
  Truck,
  ShieldAlert,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CreateIncidentDialog from "@/components/incidents/CreateIncidentDialog";
import ScheduleMaintenanceDialog from "@/components/maintenance/ScheduleMaintenanceDialog";
import DriverDetailDialog from "@/components/fleet/DriverDetailDialog";
import { useQuery } from "@tanstack/react-query";
import TripTimeline from "@/components/vehicle/TripTimeline";
import FuelMetricsPanel from "@/components/vehicle/FuelMetricsPanel";
import AlertsPanel from "@/components/vehicle/AlertsPanel";
import ZonesPanel from "@/components/vehicle/ZonesPanel";
import RestrictedHoursPanel from "@/components/vehicle/RestrictedHoursPanel";
import { SpeedCutoffSettings } from "@/components/fleet/SpeedCutoffSettings";
import { SpeedBypassAlertPanel } from "@/components/alerts/SpeedBypassAlertPanel";
import { useVehicleData } from "@/hooks/useVehicleData";
import { useDrivers } from "@/hooks/useDrivers";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

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
    engineHours?: number;
    imageUrl?: string;
  };
}

const VehicleDetailModal = ({ open, onOpenChange, vehicle }: VehicleDetailModalProps) => {
  const navigate = useNavigate();
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("trips");
  
  // Settings state
  const [vehicleName, setVehicleName] = useState(vehicle?.plate || "");
  const [odometer, setOdometer] = useState(vehicle?.odometer?.toString() || "");
  const [engineHours, setEngineHours] = useState(vehicle?.engineHours?.toString() || "");
  const [odometerDate, setOdometerDate] = useState(format(new Date(), "dd MMM yyyy HH:mm"));
  const [engineHoursDate, setEngineHoursDate] = useState(format(new Date(), "dd MMM yyyy HH:mm"));
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const { drivers } = useDrivers();
  
  // IMPORTANT: vehicleId is the actual UUID from the database
  // vehicle.id might be plate_number (display ID), so always prefer vehicleId
  const actualVehicleId = vehicle?.vehicleId || '';
  
  // Fetch real vehicle data - hooks must be called unconditionally
  const { 
    recentTrips, 
    maintenanceRecords, 
    fuelTransactions, 
    driverEvents,
    performanceMetrics,
    isLoading 
  } = useVehicleData(actualVehicleId);

  // Fetch vehicle details including speed cutoff settings and device info
  const { data: vehicleDetails } = useQuery({
    queryKey: ["vehicle-details-modal", actualVehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          speed_cutoff_enabled,
          speed_cutoff_limit_kmh,
          speed_cutoff_grace_seconds,
          devices!devices_vehicle_id_fkey(id)
        `)
        .eq("id", actualVehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!actualVehicleId,
  });

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

  const handleUpdateName = async () => {
    if (!vehicleName.trim()) return;
    setIsUpdating("name");
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ plate_number: vehicleName.trim() })
        .eq("id", actualVehicleId);
      
      if (error) throw error;
      toast.success("Vehicle name updated successfully");
    } catch (error) {
      toast.error("Failed to update vehicle name");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateOdometer = async () => {
    const odometerValue = parseFloat(odometer);
    if (isNaN(odometerValue)) return;
    setIsUpdating("odometer");
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ odometer_km: odometerValue })
        .eq("id", actualVehicleId);
      
      if (error) throw error;
      toast.success("Odometer reading updated successfully");
    } catch (error) {
      toast.error("Failed to update odometer reading");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateEngineHours = async () => {
    const hoursValue = parseFloat(engineHours);
    if (isNaN(hoursValue)) return;
    setIsUpdating("hours");
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ engine_hours: hoursValue })
        .eq("id", actualVehicleId);
      
      if (error) throw error;
      toast.success("Working hours updated successfully");
    } catch (error) {
      toast.error("Failed to update working hours");
    } finally {
      setIsUpdating(null);
    }
  };

  const tabs = [
    { id: "trips", label: "Trips", icon: Navigation },
    { id: "fuel", label: "Fuel", icon: Fuel },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "zones", label: "Zones", icon: MapPin },
    { id: "commands", label: "Commands", icon: Terminal },
    { id: "info", label: "Info", icon: Info },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[90vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Manage {vehicle.plate}</DialogTitle>
            <DialogDescription>
              View and manage vehicle details, trips, fuel, alerts, and settings.
            </DialogDescription>
          </DialogHeader>

          {/* Header with back button and vehicle info */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="font-semibold text-lg">{vehicle.plate}</h2>
                <p className="text-xs text-muted-foreground">
                  {vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}
                </p>
              </div>
            </div>
            <StatusBadge status={vehicle.status} />
          </div>

          {/* Horizontal Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b px-2">
              <ScrollArea className="w-full">
                <TabsList className="bg-transparent h-12 p-0 gap-0 w-max">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-12 px-4 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Tab Content - Calculate height based on header (~60px) + tabs (~48px) */}
            <div className="flex-1 min-h-0">
              {/* Trips Tab - Teltonika Style Timeline */}
              <TabsContent value="trips" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <TripTimeline 
                      trips={recentTrips} 
                      isLoading={isLoading} 
                      vehicleId={actualVehicleId}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Fuel Tab - Teltonika Style */}
              <TabsContent value="fuel" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <FuelMetricsPanel
                      fuelTransactions={fuelTransactions}
                      isLoading={isLoading}
                      vehicleId={actualVehicleId}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <AlertsPanel
                      alerts={driverEvents}
                      isLoading={isLoading}
                      vehicleId={actualVehicleId}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Zones Tab */}
              <TabsContent value="zones" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <ZonesPanel vehicleId={actualVehicleId} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Commands Tab */}
              <TabsContent value="commands" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 text-center py-12">
                    <Terminal className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Device commands coming soon</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Send commands to the GPS device remotely
                    </p>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Info Tab */}
              <TabsContent value="info" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle Details Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Truck className="h-4 w-4" />
                          Vehicle Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plate</span>
                          <span className="font-medium">{vehicle.plate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Make</span>
                          <span className="font-medium">{vehicle.make || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model</span>
                          <span className="font-medium">{vehicle.model || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Year</span>
                          <span className="font-medium">{vehicle.year || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Odometer</span>
                          <span className="font-medium">{vehicle.odometer?.toLocaleString() || 0} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fuel Level</span>
                          <span className="font-medium">{vehicle.fuel}%</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Driver Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <User className="h-4 w-4" />
                          Assigned Driver
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {assignedDriver ? (
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={assignedDriver.avatar_url || undefined} />
                              <AvatarFallback>
                                {assignedDriver.first_name?.[0]}{assignedDriver.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">
                                {assignedDriver.first_name} {assignedDriver.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {assignedDriver.phone || 'No phone'}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleViewDriverProfile}>
                              View
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No driver assigned</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Performance Card */}
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Gauge className="h-4 w-4" />
                          Performance (Last 30 Days)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="grid grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="text-2xl font-bold">{performanceMetrics.totalTrips}</p>
                              <p className="text-sm text-muted-foreground">Total Trips</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{performanceMetrics.totalDistance.toLocaleString()} km</p>
                              <p className="text-sm text-muted-foreground">Distance</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">
                                {performanceMetrics.avgFuelEfficiency 
                                  ? `${performanceMetrics.avgFuelEfficiency.toFixed(1)} L/100km`
                                  : 'N/A'}
                              </p>
                              <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Settings Tab - Teltonika Style */}
              <TabsContent value="settings" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Change Device Name */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-medium">Change Device Name</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="vehicleName" className="text-sm text-muted-foreground">
                            New Device Name
                          </Label>
                          <Input
                            id="vehicleName"
                            value={vehicleName}
                            onChange={(e) => setVehicleName(e.target.value)}
                            placeholder="Enter device name"
                            className="bg-muted/50"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleUpdateName}
                            disabled={isUpdating === "name" || !vehicleName.trim()}
                          >
                            {isUpdating === "name" ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Update Odometer Reading */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-medium">Update Odometer Reading</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="odometer" className="text-sm text-muted-foreground">
                            Odometer Reading
                          </Label>
                          <div className="relative">
                            <Input
                              id="odometer"
                              type="number"
                              value={odometer}
                              onChange={(e) => setOdometer(e.target.value)}
                              placeholder="0.00"
                              className="bg-muted/50 pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              km
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Date</Label>
                          <div className="relative">
                            <Input
                              value={odometerDate}
                              readOnly
                              className="bg-muted/50"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleUpdateOdometer}
                            disabled={isUpdating === "odometer" || !odometer}
                          >
                            {isUpdating === "odometer" ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Update Working Hours Reading */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-medium">Update Working Hours Reading</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="engineHours" className="text-sm text-muted-foreground">
                            Hours Reading
                          </Label>
                          <Input
                            id="engineHours"
                            type="number"
                            value={engineHours}
                            onChange={(e) => setEngineHours(e.target.value)}
                            placeholder="0.00"
                            className="bg-muted/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Date</Label>
                          <div className="relative">
                            <Input
                              value={engineHoursDate}
                              readOnly
                              className="bg-muted/50"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleUpdateEngineHours}
                            disabled={isUpdating === "hours" || !engineHours}
                          >
                            {isUpdating === "hours" ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Change Asset Photo */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-medium">Change Asset Photo</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center py-6">
                        <Avatar className="h-24 w-24 mb-4">
                          {vehicle.imageUrl ? (
                            <AvatarImage src={vehicle.imageUrl} alt={vehicle.plate} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              <Truck className="h-10 w-10 text-primary" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <Button variant="outline" className="gap-2">
                          <Camera className="h-4 w-4" />
                          Upload Photo
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          JPG, PNG up to 5MB
                        </p>
                      </CardContent>
                    </Card>


                    {/* Speed Cutoff Settings */}
                    <SpeedCutoffSettings
                      vehicleId={actualVehicleId}
                      vehiclePlate={vehicle.plate}
                      deviceId={vehicleDetails?.devices?.[0]?.id || null}
                      currentSettings={{
                        speed_cutoff_enabled: vehicleDetails?.speed_cutoff_enabled ?? false,
                        speed_cutoff_limit_kmh: vehicleDetails?.speed_cutoff_limit_kmh ?? 120,
                        speed_cutoff_grace_seconds: vehicleDetails?.speed_cutoff_grace_seconds ?? 5,
                      }}
                    />

                    {/* Speed Bypass Alert Panel */}
                    <SpeedBypassAlertPanel
                      vehicleId={actualVehicleId}
                      vehiclePlate={vehicle.plate}
                    />

                    {/* Restricted Hours Configuration */}
                    <div className="md:col-span-2">
                      <RestrictedHoursPanel 
                        vehicleId={actualVehicleId} 
                        vehiclePlate={vehicle.plate} 
                      />
                    </div>

                    {/* Quick Actions Card */}
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" className="gap-2" onClick={handleTrackOnMap}>
                            <MapPin className="h-4 w-4" />
                            Track on Map
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <Route className="h-4 w-4" />
                            Assign Route
                          </Button>
                          <ScheduleMaintenanceDialog
                            vehicleId={actualVehicleId}
                            trigger={
                              <Button variant="outline" className="gap-2">
                                <Calendar className="h-4 w-4" />
                                Schedule Maintenance
                              </Button>
                            }
                          />
                          <CreateIncidentDialog
                            trigger={
                              <Button variant="outline" className="gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Report Issue
                              </Button>
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
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
