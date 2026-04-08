import { useState, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
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
  Wifi,
  WifiOff,
  Battery,
  Thermometer,
  Signal,
  Shield,
  Wrench,
  Activity,
  Zap,
  Radio,
  Hash,
  Cpu,
  MapPinned,
  TrendingUp,
  BarChart3,
  CircleDot,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Satellite,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CreateIncidentDialog from "@/components/incidents/CreateIncidentDialog";
import ScheduleMaintenanceDialog from "@/components/maintenance/ScheduleMaintenanceDialog";
import AssignRouteDialog from "@/components/fleet/AssignRouteDialog";
import DriverDetailDialog from "@/components/fleet/DriverDetailDialog";
import TripTimeline from "@/components/vehicle/TripTimeline";
import FuelMetricsPanel from "@/components/vehicle/FuelMetricsPanel";
import AlertsPanel from "@/components/vehicle/AlertsPanel";
import ZonesPanel from "@/components/vehicle/ZonesPanel";
import RestrictedHoursPanel from "@/components/vehicle/RestrictedHoursPanel";
import { SpeedCutoffSettings } from "@/components/fleet/SpeedCutoffSettings";
import { SpeedBypassAlertPanel } from "@/components/alerts/SpeedBypassAlertPanel";
import { useVehicleData } from "@/hooks/useVehicleData";
import { useVehicleFullData } from "@/hooks/useVehicleFullData";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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

// -- Metric Card Component --
const MetricCard = ({ icon: Icon, label, value, subValue, color = "text-primary" }: {
  icon: any; label: string; value: string | number; subValue?: string; color?: string;
}) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
    <div className={`p-2 rounded-lg bg-background ${color}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
      {subValue && <p className="text-[10px] text-muted-foreground">{subValue}</p>}
    </div>
  </div>
);

// -- Info Row Component --
const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
    <span className="text-sm font-medium text-right max-w-[55%] truncate">{value || "—"}</span>
  </div>
);

// -- Status Dot Component --
const StatusDot = ({ active, label }: { active: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`} />
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

const VehicleDetailModal = ({ open, onOpenChange, vehicle }: VehicleDetailModalProps) => {
  const navigate = useNavigate();
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [vehicleName, setVehicleName] = useState(vehicle?.plate || "");
  const [odometer, setOdometer] = useState(vehicle?.odometer?.toString() || "");
  const [engineHours, setEngineHours] = useState(vehicle?.engineHours?.toString() || "");

  const actualVehicleId = vehicle?.vehicleId || '';

  const { recentTrips, fuelTransactions, driverEvents, performanceMetrics, isLoading } = useVehicleData(actualVehicleId);
  const { vehicleRecord, telemetry, commands, serviceHistory, vehicleAlerts, commandsLoading, alertsLoading } = useVehicleFullData(actualVehicleId);

  if (!vehicle) return null;

  const device = vehicleRecord?.devices?.[0] as any;
  const driver = vehicleRecord?.drivers as any;

  const handleTrackOnMap = () => { onOpenChange(false); navigate('/map', { state: { selectedVehicleId: actualVehicleId } }); };
  
  const handleUpdateName = async () => {
    if (!vehicleName.trim()) return;
    setIsUpdating("name");
    try {
      const { error } = await supabase.from("vehicles").update({ plate_number: vehicleName.trim() }).eq("id", actualVehicleId);
      if (error) throw error;
      toast.success("Vehicle name updated");
    } catch { toast.error("Failed to update"); }
    finally { setIsUpdating(null); }
  };

  const handleUpdateOdometer = async () => {
    const val = parseFloat(odometer);
    if (isNaN(val)) return;
    setIsUpdating("odometer");
    try {
      const { error } = await supabase.from("vehicles").update({ odometer_km: val }).eq("id", actualVehicleId);
      if (error) throw error;
      toast.success("Odometer updated");
    } catch { toast.error("Failed to update"); }
    finally { setIsUpdating(null); }
  };

  const handleUpdateEngineHours = async () => {
    const val = parseFloat(engineHours);
    if (isNaN(val)) return;
    setIsUpdating("hours");
    try {
      const { error } = await supabase.from("vehicles").update({ engine_hours: val }).eq("id", actualVehicleId);
      if (error) throw error;
      toast.success("Engine hours updated");
    } catch { toast.error("Failed to update"); }
    finally { setIsUpdating(null); }
  };

  const unresolvedAlerts = vehicleAlerts.filter(a => a.status !== 'resolved').length;
  const fuelLevel = telemetry?.fuel_level_percent ?? vehicle.fuel;
  const fuelColor = fuelLevel > 50 ? "text-emerald-500" : fuelLevel > 20 ? "text-amber-500" : "text-destructive";
  const isOnline = telemetry?.device_connected && telemetry?.last_communication_at && 
    (Date.now() - new Date(telemetry.last_communication_at).getTime()) < 5 * 60 * 1000;

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "trips", label: "Trips", icon: Navigation },
    { id: "fuel", label: "Fuel", icon: Fuel },
    { id: "alerts", label: "Alerts", icon: Bell, badge: unresolvedAlerts },
    { id: "zones", label: "Zones", icon: MapPin },
    { id: "commands", label: "Commands", icon: Terminal },
    { id: "info", label: "Info", icon: Info },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[92vh] overflow-hidden p-0 flex flex-col bg-background/95 backdrop-blur-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Manage {vehicle.plate}</DialogTitle>
            <DialogDescription>Vehicle command center</DialogDescription>
          </DialogHeader>

          {/* ─── Header ─── */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isOnline ? "bg-emerald-500/10" : "bg-muted"}`}>
                  <Truck className={`h-5 w-5 ${isOnline ? "text-emerald-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg tracking-tight">{vehicle.plate}</h2>
                    <StatusBadge status={vehicle.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}
                    {vehicleRecord?.vin && ` • VIN: ${vehicleRecord.vin}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                  <WifiOff className="h-3 w-3" /> Offline
                </Badge>
              )}
              {telemetry?.last_communication_at && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(telemetry.last_communication_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* ─── Live Telemetry Strip ─── */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border/30 bg-muted/20 overflow-x-auto text-xs">
            <StatusDot active={!!telemetry?.engine_on} label="Engine" />
            <StatusDot active={!!telemetry?.ignition_on} label="Ignition" />
            <StatusDot active={!!telemetry?.device_connected} label="Connected" />
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1 text-muted-foreground">
              <Gauge className="h-3 w-3" /> {telemetry?.speed_kmh?.toFixed(0) ?? vehicle.speed ?? 0} km/h
            </span>
            <span className={`flex items-center gap-1 ${fuelColor}`}>
              <Fuel className="h-3 w-3" /> {typeof fuelLevel === 'number' ? `${Math.round(fuelLevel)}%` : 'N/A'}
            </span>
            {telemetry?.battery_voltage != null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Battery className="h-3 w-3" /> {Number(telemetry.battery_voltage).toFixed(1)}V
              </span>
            )}
            {telemetry?.gps_satellites_count != null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Satellite className="h-3 w-3" /> {telemetry.gps_satellites_count} sat
              </span>
            )}
            {telemetry?.gsm_signal_strength != null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Signal className="h-3 w-3" /> {telemetry.gsm_signal_strength}%
              </span>
            )}
            {telemetry?.external_voltage != null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-3 w-3" /> {Number(telemetry.external_voltage).toFixed(1)}V ext
              </span>
            )}
          </div>

          {/* ─── Tabs ─── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border/40 px-2">
              <ScrollArea className="w-full">
                <TabsList className="bg-transparent h-11 p-0 gap-0 w-max">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-11 px-3.5 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-medium"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.badge ? (
                        <span className="ml-1 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                          {tab.badge}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            <div className="flex-1 min-h-0">
              {/* ─── OVERVIEW TAB ─── */}
              <TabsContent value="overview" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard icon={Navigation} label="Total Trips (30d)" value={performanceMetrics.totalTrips} />
                      <MetricCard icon={Route} label="Distance (30d)" value={`${performanceMetrics.totalDistance.toLocaleString()} km`} />
                      <MetricCard icon={Fuel} label="Fuel Efficiency" value={performanceMetrics.avgFuelEfficiency ? `${performanceMetrics.avgFuelEfficiency.toFixed(1)} L/100km` : "N/A"} />
                      <MetricCard icon={Clock} label="Drive Time" value={performanceMetrics.totalDriveTime > 60 ? `${(performanceMetrics.totalDriveTime / 60).toFixed(1)} hrs` : `${performanceMetrics.totalDriveTime} min`} />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard icon={Gauge} label="Avg Speed" value={performanceMetrics.avgSpeed ? `${performanceMetrics.avgSpeed.toFixed(0)} km/h` : "N/A"} />
                      <MetricCard icon={TrendingUp} label="Max Speed" value={performanceMetrics.maxSpeed ? `${performanceMetrics.maxSpeed} km/h` : "N/A"} color="text-destructive" />
                      <MetricCard icon={AlertTriangle} label="Active Alerts" value={unresolvedAlerts} color={unresolvedAlerts > 0 ? "text-destructive" : "text-muted-foreground"} />
                      <MetricCard icon={Clock} label="Idle Time" value={performanceMetrics.totalIdleMinutes > 60 ? `${(performanceMetrics.totalIdleMinutes / 60).toFixed(1)} hrs` : `${performanceMetrics.totalIdleMinutes} min`} />
                    </div>

                    {/* Fuel Gauge */}
                    <Card className="border-border/50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            <Fuel className={`h-4 w-4 ${fuelColor}`} /> Fuel Level
                          </span>
                          <span className={`text-lg font-bold ${fuelColor}`}>
                            {typeof fuelLevel === 'number' ? `${Math.round(fuelLevel)}%` : 'N/A'}
                          </span>
                        </div>
                        <Progress value={typeof fuelLevel === 'number' ? fuelLevel : 0} className="h-3" />
                        {vehicleRecord?.tank_capacity_liters && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Tank: {Number(vehicleRecord.tank_capacity_liters).toLocaleString()}L capacity
                            {typeof fuelLevel === 'number' && ` • ~${Math.round((fuelLevel / 100) * Number(vehicleRecord.tank_capacity_liters))}L remaining`}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Driver & Device Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card className="border-border/50">
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Driver</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          {driver ? (
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-primary/20">
                                <AvatarImage src={driver.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10">{driver.first_name?.[0]}{driver.last_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{driver.first_name} {driver.last_name}</p>
                                <p className="text-[11px] text-muted-foreground">{driver.phone || driver.email || 'No contact'}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDriverDialogOpen(true)}>View</Button>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-2">No driver assigned</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GPS Device</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          {device ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{device.tracker_model}</span>
                                <Badge variant={device.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5">{device.status}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">IMEI: {device.imei}</p>
                              {device.last_heartbeat && (
                                <p className="text-[10px] text-muted-foreground">
                                  Heartbeat: {formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-2">No device installed</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-1.5 text-xs" onClick={handleTrackOnMap}>
                        <MapPin className="h-3.5 w-3.5" /> Track on Map
                      </Button>
                      <AssignRouteDialog vehicleId={actualVehicleId} vehiclePlate={vehicle.plate}
                        trigger={<Button variant="outline" size="sm" className="gap-1.5 text-xs"><Route className="h-3.5 w-3.5" /> Assign Route</Button>} />
                      <ScheduleMaintenanceDialog vehicleId={actualVehicleId}
                        trigger={<Button variant="outline" size="sm" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" /> Maintenance</Button>} />
                      <CreateIncidentDialog vehicleId={actualVehicleId} driverId={vehicle.driverId}
                        trigger={<Button variant="outline" size="sm" className="gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Report Issue</Button>} />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── TRIPS TAB ─── */}
              <TabsContent value="trips" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <TripTimeline trips={recentTrips} isLoading={isLoading} vehicleId={actualVehicleId} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── FUEL TAB ─── */}
              <TabsContent value="fuel" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <FuelMetricsPanel fuelTransactions={fuelTransactions} isLoading={isLoading} vehicleId={actualVehicleId} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── ALERTS TAB ─── */}
              <TabsContent value="alerts" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <AlertsPanel alerts={driverEvents} isLoading={isLoading} vehicleId={actualVehicleId} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── ZONES TAB ─── */}
              <TabsContent value="zones" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <ZonesPanel vehicleId={actualVehicleId} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── COMMANDS TAB ─── */}
              <TabsContent value="commands" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Device Commands</h3>
                      {device && <Badge variant="outline" className="text-[10px]">{device.tracker_model}</Badge>}
                    </div>
                    {commandsLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
                    ) : commands.length === 0 ? (
                      <div className="text-center py-12">
                        <Terminal className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No commands sent yet</p>
                        <p className="text-xs text-muted-foreground mt-1">{device ? "Send commands to the GPS device remotely" : "No device installed on this vehicle"}</p>
                      </div>
                    ) : (
                      commands.map((cmd: any) => (
                        <Card key={cmd.id} className="border-border/50">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Send className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-sm">{cmd.command_type}</span>
                              </div>
                              <Badge variant={
                                cmd.status === 'executed' ? 'default' : 
                                cmd.status === 'failed' ? 'destructive' : 
                                cmd.status === 'pending' ? 'secondary' : 'outline'
                              } className="text-[10px] h-5">
                                {cmd.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                              <span>{format(new Date(cmd.created_at), "dd MMM yyyy HH:mm")}</span>
                              {cmd.priority && <span>• Priority: {cmd.priority}</span>}
                              {cmd.error_message && <span className="text-destructive">• {cmd.error_message}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── INFO TAB ─── */}
              <TabsContent value="info" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle Details */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5" /> Vehicle Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <InfoRow icon={Hash} label="Plate" value={vehicle.plate} />
                        <InfoRow label="Make" value={vehicleRecord?.make || vehicle.make} />
                        <InfoRow label="Model" value={vehicleRecord?.model || vehicle.model} />
                        <InfoRow label="Year" value={vehicleRecord?.year || vehicle.year} />
                        <InfoRow label="VIN" value={vehicleRecord?.vin} />
                        <InfoRow label="Color" value={vehicleRecord?.color} />
                        <InfoRow label="Type" value={vehicleRecord?.vehicle_type} />
                        <InfoRow label="Fuel Type" value={vehicleRecord?.fuel_type} />
                        <InfoRow label="Tank Capacity" value={vehicleRecord?.tank_capacity_liters ? `${vehicleRecord.tank_capacity_liters}L` : null} />
                        <InfoRow label="Odometer" value={vehicleRecord?.odometer_km ? `${Number(vehicleRecord.odometer_km).toLocaleString()} km` : null} />
                        <InfoRow label="Engine Hours" value={vehicleRecord?.engine_hours ? `${Number(vehicleRecord.engine_hours).toLocaleString()} hrs` : null} />
                        <InfoRow label="Ownership" value={vehicleRecord?.ownership_type} />
                        <InfoRow label="Lifecycle Stage" value={vehicleRecord?.lifecycle_stage} />
                      </CardContent>
                    </Card>

                    {/* Financial Info */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" /> Financial & Cost
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <InfoRow label="Acquisition Date" value={vehicleRecord?.acquisition_date ? format(new Date(vehicleRecord.acquisition_date), "dd MMM yyyy") : null} />
                        <InfoRow label="Acquisition Cost" value={vehicleRecord?.acquisition_cost ? `ETB ${Number(vehicleRecord.acquisition_cost).toLocaleString()}` : null} />
                        <InfoRow label="Current Value" value={vehicleRecord?.current_value ? `ETB ${Number(vehicleRecord.current_value).toLocaleString()}` : null} />
                        <InfoRow label="Depreciation Rate" value={vehicleRecord?.depreciation_rate ? `${vehicleRecord.depreciation_rate}%` : null} />
                        <InfoRow label="Total Maintenance Cost" value={vehicleRecord?.total_maintenance_cost ? `ETB ${Number(vehicleRecord.total_maintenance_cost).toLocaleString()}` : null} />
                        <InfoRow label="Total Fuel Cost" value={vehicleRecord?.total_fuel_cost ? `ETB ${Number(vehicleRecord.total_fuel_cost).toLocaleString()}` : null} />
                        <InfoRow label="Total Downtime" value={vehicleRecord?.total_downtime_hours ? `${Number(vehicleRecord.total_downtime_hours).toLocaleString()} hrs` : null} />
                      </CardContent>
                    </Card>

                    {/* Driver Details */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" /> Assigned Driver
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        {driver ? (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage src={driver.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10">{driver.first_name?.[0]}{driver.last_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{driver.first_name} {driver.last_name}</p>
                                <Badge variant={driver.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-4">{driver.status}</Badge>
                              </div>
                            </div>
                            <InfoRow label="Phone" value={driver.phone} />
                            <InfoRow label="Email" value={driver.email} />
                            <InfoRow label="License #" value={driver.license_number} />
                            <InfoRow label="License Expiry" value={driver.license_expiry ? format(new Date(driver.license_expiry), "dd MMM yyyy") : null} />
                            <InfoRow label="Total Trips" value={driver.total_trips?.toLocaleString()} />
                            <InfoRow label="Total Distance" value={driver.total_distance_km ? `${Number(driver.total_distance_km).toLocaleString()} km` : null} />
                            <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => setDriverDialogOpen(true)}>
                              View Full Profile
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4 text-center">No driver assigned</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Device / GPS Info */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5" /> GPS Device
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        {device ? (
                          <>
                            <InfoRow icon={Radio} label="Model" value={device.tracker_model} />
                            <InfoRow label="IMEI" value={device.imei} />
                            <InfoRow label="Serial #" value={device.serial_number} />
                            <InfoRow label="SIM ICCID" value={device.sim_iccid} />
                            <InfoRow label="SIM MSISDN" value={device.sim_msisdn} />
                            <InfoRow label="APN" value={device.apn} />
                            <InfoRow label="Firmware" value={device.firmware_version} />
                            <InfoRow label="Last FW Update" value={device.last_firmware_update ? format(new Date(device.last_firmware_update), "dd MMM yyyy") : null} />
                            <InfoRow label="Install Date" value={device.install_date ? format(new Date(device.install_date), "dd MMM yyyy") : null} />
                            <InfoRow label="Installed By" value={device.installed_by} />
                            <InfoRow label="Status" value={<Badge variant={device.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-4">{device.status}</Badge>} />
                            <InfoRow label="Last Heartbeat" value={device.last_heartbeat ? formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true }) : null} />
                            {device.notes && <InfoRow label="Notes" value={device.notes} />}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4 text-center">No device installed</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Live Telemetry Details */}
                    {telemetry && (
                      <Card className="md:col-span-2 border-border/50">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" /> Live Telemetry
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
                            <InfoRow icon={MapPinned} label="Latitude" value={telemetry.latitude ? Number(telemetry.latitude).toFixed(6) : null} />
                            <InfoRow icon={MapPinned} label="Longitude" value={telemetry.longitude ? Number(telemetry.longitude).toFixed(6) : null} />
                            <InfoRow icon={Gauge} label="Speed" value={telemetry.speed_kmh != null ? `${Number(telemetry.speed_kmh).toFixed(0)} km/h` : null} />
                            <InfoRow icon={Navigation} label="Heading" value={telemetry.heading != null ? `${Number(telemetry.heading).toFixed(0)}°` : null} />
                            <InfoRow icon={Battery} label="Battery" value={telemetry.battery_voltage != null ? `${Number(telemetry.battery_voltage).toFixed(2)}V` : null} />
                            <InfoRow icon={Zap} label="External Power" value={telemetry.external_voltage != null ? `${Number(telemetry.external_voltage).toFixed(2)}V` : null} />
                            <InfoRow icon={Satellite} label="GPS Satellites" value={telemetry.gps_satellites_count} />
                            <InfoRow icon={Signal} label="GSM Signal" value={telemetry.gsm_signal_strength != null ? `${telemetry.gsm_signal_strength}%` : null} />
                            <InfoRow icon={Thermometer} label="Temp 1" value={telemetry.temperature_1 != null ? `${Number(telemetry.temperature_1).toFixed(1)}°C` : null} />
                            <InfoRow icon={Thermometer} label="Temp 2" value={telemetry.temperature_2 != null ? `${Number(telemetry.temperature_2).toFixed(1)}°C` : null} />
                            <InfoRow label="GPS Fix" value={telemetry.gps_fix_type} />
                            <InfoRow label="HDOP" value={telemetry.gps_hdop != null ? Number(telemetry.gps_hdop).toFixed(1) : null} />
                            <InfoRow label="Altitude" value={telemetry.altitude_meters != null ? `${Number(telemetry.altitude_meters).toFixed(0)}m` : null} />
                            <InfoRow label="Odometer (GPS)" value={telemetry.odometer_km != null ? `${Number(telemetry.odometer_km).toLocaleString()} km` : null} />
                            {telemetry.gps_jamming_detected && (
                              <InfoRow icon={Shield} label="GPS Jamming" value={<Badge variant="destructive" className="text-[10px] h-4">Detected!</Badge>} />
                            )}
                            {telemetry.gps_spoofing_detected && (
                              <InfoRow icon={Shield} label="GPS Spoofing" value={<Badge variant="destructive" className="text-[10px] h-4">Detected!</Badge>} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Service History */}
                    {serviceHistory.length > 0 && (
                      <Card className="md:col-span-2 border-border/50">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5" /> Recent Service History
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="space-y-2">
                            {serviceHistory.slice(0, 5).map((s: any) => (
                              <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                                <div>
                                  <p className="text-sm font-medium">{s.service_type}</p>
                                  <p className="text-[11px] text-muted-foreground">{s.service_date ? format(new Date(s.service_date), "dd MMM yyyy") : "—"}</p>
                                </div>
                                {s.total_cost != null && (
                                  <span className="text-sm font-semibold">ETB {Number(s.total_cost).toLocaleString()}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── SETTINGS TAB ─── */}
              <TabsContent value="settings" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-border/50">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Change Device Name</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <Input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="Device name" className="bg-muted/50" />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={handleUpdateName} disabled={isUpdating === "name" || !vehicleName.trim()}>
                            {isUpdating === "name" ? "Saving..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Update Odometer</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <div className="relative">
                          <Input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0.00" className="bg-muted/50 pr-12" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km</span>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={handleUpdateOdometer} disabled={isUpdating === "odometer" || !odometer}>
                            {isUpdating === "odometer" ? "Saving..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Update Engine Hours</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <Input type="number" value={engineHours} onChange={(e) => setEngineHours(e.target.value)} placeholder="0.00" className="bg-muted/50" />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={handleUpdateEngineHours} disabled={isUpdating === "hours" || !engineHours}>
                            {isUpdating === "hours" ? "Saving..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Asset Photo</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center py-4">
                        <Avatar className="h-20 w-20 mb-3">
                          {vehicle.imageUrl ? (
                            <AvatarImage src={vehicle.imageUrl} alt={vehicle.plate} />
                          ) : (
                            <AvatarFallback className="bg-primary/10"><Truck className="h-8 w-8 text-primary" /></AvatarFallback>
                          )}
                        </Avatar>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Camera className="h-3.5 w-3.5" /> Upload Photo</Button>
                      </CardContent>
                    </Card>

                    <SpeedCutoffSettings
                      vehicleId={actualVehicleId}
                      vehiclePlate={vehicle.plate}
                      deviceId={device?.id || null}
                      currentSettings={{
                        speed_cutoff_enabled: vehicleRecord?.speed_cutoff_enabled ?? false,
                        speed_cutoff_limit_kmh: vehicleRecord?.speed_cutoff_limit_kmh ?? 120,
                        speed_cutoff_grace_seconds: vehicleRecord?.speed_cutoff_grace_seconds ?? 5,
                      }}
                    />

                    <SpeedBypassAlertPanel vehicleId={actualVehicleId} vehiclePlate={vehicle.plate} />

                    <div className="md:col-span-2">
                      <RestrictedHoursPanel vehicleId={actualVehicleId} vehiclePlate={vehicle.plate} />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DriverDetailDialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen} driver={driver || null} />
    </>
  );
};

export default VehicleDetailModal;
