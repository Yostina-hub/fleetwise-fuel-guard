import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, Navigation, Fuel, Bell, MapPin, Terminal, Info, Settings,
  Route, AlertTriangle, Calendar, User, Camera, Gauge, Clock, Truck,
  Wifi, WifiOff, Wrench, Activity, Cpu, MapPinned, TrendingUp, BarChart3,
  Send, Satellite, Hash, Radio, Battery, Zap, Signal, Thermometer, Shield,
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
import SpeedometerGauge from "@/components/vehicle/SpeedometerGauge";
import VehicleHealthRing from "@/components/vehicle/VehicleHealthRing";
import FuelGaugeArc from "@/components/vehicle/FuelGaugeArc";
import TelemetryGrid from "@/components/vehicle/TelemetryGrid";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface VehicleDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    id: string; plate: string; make?: string; model?: string; year?: number;
    status: "moving" | "idle" | "stopped" | "offline"; fuel: number;
    location?: string; speed?: number; odometer?: number; driver?: string;
    driverId?: string; vehicleId?: string; engineHours?: number; imageUrl?: string;
  };
}

// -- Glassmorphic Stat Card --
const GlassStat = ({ icon: Icon, label, value, sub, color = "text-primary", delay = 0 }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-muted/30 backdrop-blur-md p-3.5 group hover:border-primary/30 transition-all duration-300"
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className={`p-1.5 rounded-lg bg-background/60 inline-flex ${color}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
    <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider font-medium">{label}</p>
    <p className="font-bold text-base mt-0.5 leading-tight">{value}</p>
    {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
  </motion.div>
);

// -- Info Row --
const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0 group">
    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="h-3 w-3 opacity-60" />}{label}
    </span>
    <span className="text-xs font-medium text-right max-w-[55%] truncate group-hover:text-primary transition-colors">{value || "—"}</span>
  </div>
);

// -- Pulse Dot --
const PulseDot = ({ active }: { active: boolean }) => (
  <motion.div
    className={`h-2 w-2 rounded-full ${active ? "bg-success" : "bg-muted-foreground/30"}`}
    animate={active ? { scale: [1, 1.4, 1], opacity: [1, 0.7, 1] } : {}}
    transition={active ? { repeat: Infinity, duration: 2 } : {}}
  />
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
  const fuelLevel = telemetry?.fuel_level_percent ?? vehicle.fuel;
  const speed = telemetry?.speed_kmh != null ? Number(telemetry.speed_kmh) : (vehicle.speed ?? 0);
  const isOnline = telemetry?.device_connected && telemetry?.last_communication_at &&
    (Date.now() - new Date(telemetry.last_communication_at).getTime()) < 5 * 60 * 1000;
  const unresolvedAlerts = vehicleAlerts.filter(a => a.status !== 'resolved').length;

  // Calculate health score from performance data
  const healthScore = (() => {
    let score = 100;
    if (unresolvedAlerts > 0) score -= Math.min(unresolvedAlerts * 5, 25);
    if (!isOnline) score -= 15;
    if (typeof fuelLevel === 'number' && fuelLevel < 15) score -= 10;
    const battV = telemetry?.battery_voltage ? Number(telemetry.battery_voltage) : null;
    if (battV != null && battV < 3.5) score -= 10;
    if (telemetry?.gps_jamming_detected) score -= 20;
    if (telemetry?.gps_spoofing_detected) score -= 20;
    return Math.max(0, Math.min(100, score));
  })();

  const handleTrackOnMap = () => { onOpenChange(false); navigate('/map', { state: { selectedVehicleId: actualVehicleId } }); };

  const handleUpdate = async (field: string, table_col: string, rawValue: string) => {
    const val = field === "name" ? rawValue.trim() : parseFloat(rawValue);
    if (field === "name" && !rawValue.trim()) return;
    if (field !== "name" && isNaN(val as number)) return;
    setIsUpdating(field);
    try {
      const { error } = await supabase.from("vehicles").update({ [table_col]: val }).eq("id", actualVehicleId);
      if (error) throw error;
      toast.success("Updated successfully");
    } catch { toast.error("Failed to update"); }
    finally { setIsUpdating(null); }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "trips", label: "Trips", icon: Navigation },
    { id: "fuel", label: "Fuel", icon: Fuel },
    { id: "alerts", label: "Alerts", icon: Bell, badge: unresolvedAlerts },
    { id: "zones", label: "Zones", icon: MapPin },
    { id: "commands", label: "Commands", icon: Terminal },
    { id: "info", label: "Full Info", icon: Info },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1100px] h-[94vh] overflow-hidden p-0 flex flex-col border-border/30 bg-background/95 backdrop-blur-2xl shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Vehicle Command Center — {vehicle.plate}</DialogTitle>
            <DialogDescription>Full vehicle management</DialogDescription>
          </DialogHeader>

          {/* ═══ HEADER ═══ */}
          <div className="relative overflow-hidden border-b border-border/30">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-secondary/5 to-primary/3" />
            <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,hsl(var(--primary)/0.08),transparent_50%)]"
              animate={{ x: [0, 30, 0] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} />

            <div className="relative flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onOpenChange(false)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg ${
                      isOnline ? "bg-gradient-to-br from-success/20 to-success/5 border border-success/30" : "bg-muted border border-border/50"
                    }`}
                  >
                    <Truck className={`h-5 w-5 ${isOnline ? "text-success" : "text-muted-foreground"}`} />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-black text-lg tracking-tight">{vehicle.plate}</h2>
                      <StatusBadge status={vehicle.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}
                      {vehicleRecord?.color && ` • ${vehicleRecord.color}`}
                      {vehicleRecord?.vin && ` • VIN: ${vehicleRecord.vin}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Connection status */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="flex items-center gap-2">
                  {isOnline ? (
                    <Badge className="bg-success/10 text-success border-success/30 gap-1 font-semibold">
                      <PulseDot active /> Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><WifiOff className="h-3 w-3" /> Offline</Badge>
                  )}
                  {telemetry?.last_communication_at && (
                    <span className="text-[10px] text-muted-foreground hidden md:inline">
                      {formatDistanceToNow(new Date(telemetry.last_communication_at), { addSuffix: true })}
                    </span>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Live status bar */}
            <div className="relative flex items-center gap-3 px-4 py-1.5 bg-background/40 backdrop-blur-sm text-[11px] overflow-x-auto">
              <div className="flex items-center gap-1.5"><PulseDot active={!!telemetry?.engine_on} /><span className="text-muted-foreground">Engine</span></div>
              <div className="flex items-center gap-1.5"><PulseDot active={!!telemetry?.ignition_on} /><span className="text-muted-foreground">Ignition</span></div>
              <div className="flex items-center gap-1.5"><PulseDot active={!!telemetry?.device_connected} /><span className="text-muted-foreground">Device</span></div>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" />{speed} km/h</span>
              {telemetry?.gps_satellites_count != null && (
                <span className="text-muted-foreground flex items-center gap-1"><Satellite className="h-3 w-3" />{telemetry.gps_satellites_count} sats</span>
              )}
              {telemetry?.battery_voltage != null && (
                <span className="text-muted-foreground flex items-center gap-1"><Battery className="h-3 w-3" />{Number(telemetry.battery_voltage).toFixed(1)}V</span>
              )}
              {(telemetry?.gps_jamming_detected || telemetry?.gps_spoofing_detected) && (
                <Badge variant="destructive" className="text-[9px] h-4 animate-pulse">
                  <Shield className="h-2.5 w-2.5 mr-0.5" /> {telemetry.gps_jamming_detected ? "JAMMING" : "SPOOFING"}
                </Badge>
              )}
            </div>
          </div>

          {/* ═══ TABS ═══ */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border/30 px-2 bg-muted/10">
              <ScrollArea className="w-full">
                <TabsList className="bg-transparent h-10 p-0 gap-0 w-max">
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}
                      className="h-10 px-3 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[11px] font-semibold uppercase tracking-wider">
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.badge ? (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="ml-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-black">
                          {tab.badge}
                        </motion.span>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            <div className="flex-1 min-h-0">
              {/* ═══ OVERVIEW TAB ═══ */}
              <TabsContent value="overview" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-5">
                    {/* Hero: Gauges Row */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="flex flex-col items-center">
                        <FuelGaugeArc
                          level={typeof fuelLevel === 'number' ? fuelLevel : 0}
                          tankCapacity={vehicleRecord?.tank_capacity_liters ? Number(vehicleRecord.tank_capacity_liters) : undefined}
                        />
                      </div>
                      <SpeedometerGauge speed={speed} maxSpeed={200} />
                      <VehicleHealthRing score={healthScore} label="Vehicle Health" />
                    </div>

                    {/* Telemetry Grid */}
                    <TelemetryGrid telemetry={telemetry} isOnline={!!isOnline} />

                    {/* KPI Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      <GlassStat icon={Navigation} label="Trips (30d)" value={performanceMetrics.totalTrips} delay={0} />
                      <GlassStat icon={Route} label="Distance (30d)" value={`${performanceMetrics.totalDistance.toLocaleString()} km`} delay={0.05} />
                      <GlassStat icon={Fuel} label="Fuel Eff." value={performanceMetrics.avgFuelEfficiency ? `${performanceMetrics.avgFuelEfficiency.toFixed(1)} L/100km` : "N/A"} delay={0.1} />
                      <GlassStat icon={Clock} label="Drive Time" value={performanceMetrics.totalDriveTime > 60 ? `${(performanceMetrics.totalDriveTime / 60).toFixed(1)} hrs` : `${performanceMetrics.totalDriveTime} min`} delay={0.15} />
                      <GlassStat icon={Gauge} label="Avg Speed" value={performanceMetrics.avgSpeed ? `${performanceMetrics.avgSpeed.toFixed(0)} km/h` : "N/A"} delay={0.2} />
                      <GlassStat icon={TrendingUp} label="Max Speed" value={performanceMetrics.maxSpeed ? `${performanceMetrics.maxSpeed} km/h` : "N/A"} color="text-destructive" delay={0.25} />
                      <GlassStat icon={AlertTriangle} label="Active Alerts" value={unresolvedAlerts} color={unresolvedAlerts > 0 ? "text-destructive" : "text-muted-foreground"} delay={0.3} />
                      <GlassStat icon={Clock} label="Idle Time" value={performanceMetrics.totalIdleMinutes > 60 ? `${(performanceMetrics.totalIdleMinutes / 60).toFixed(1)} hrs` : `${performanceMetrics.totalIdleMinutes} min`} delay={0.35} />
                    </div>

                    {/* Driver + Device Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                        className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-md p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Driver</p>
                        {driver ? (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border-2 border-primary/20 shadow-md">
                              <AvatarImage src={driver.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 font-bold text-xs">{driver.first_name?.[0]}{driver.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{driver.first_name} {driver.last_name}</p>
                              <p className="text-[11px] text-muted-foreground">{driver.phone || driver.email || 'No contact'}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setDriverDialogOpen(true)}>Profile →</Button>
                          </div>
                        ) : <p className="text-sm text-muted-foreground">No driver assigned</p>}
                      </motion.div>

                      <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 }}
                        className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-md p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">GPS Device</p>
                        {device ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">{device.tracker_model}</span>
                              <Badge variant={device.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-4">{device.status}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">IMEI: {device.imei}</p>
                            {device.firmware_version && <p className="text-[10px] text-muted-foreground">FW: {device.firmware_version}</p>}
                          </div>
                        ) : <p className="text-sm text-muted-foreground">No device installed</p>}
                      </motion.div>
                    </div>

                    {/* Quick Actions */}
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                      className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-1.5 text-xs rounded-xl shadow-md" onClick={handleTrackOnMap}>
                        <MapPin className="h-3.5 w-3.5" /> Track Live
                      </Button>
                      <AssignRouteDialog vehicleId={actualVehicleId} vehiclePlate={vehicle.plate}
                        trigger={<Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl"><Route className="h-3.5 w-3.5" /> Assign Route</Button>} />
                      <ScheduleMaintenanceDialog vehicleId={actualVehicleId}
                        trigger={<Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl"><Wrench className="h-3.5 w-3.5" /> Maintenance</Button>} />
                      <CreateIncidentDialog vehicleId={actualVehicleId} driverId={vehicle.driverId}
                        trigger={<Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl"><AlertTriangle className="h-3.5 w-3.5" /> Report Issue</Button>} />
                    </motion.div>
                  </motion.div>
                </ScrollArea>
              </TabsContent>

              {/* ═══ TRIPS ═══ */}
              <TabsContent value="trips" className="mt-0 h-full">
                <ScrollArea className="h-full"><div className="p-4"><TripTimeline trips={recentTrips} isLoading={isLoading} vehicleId={actualVehicleId} /></div></ScrollArea>
              </TabsContent>

              {/* ═══ FUEL ═══ */}
              <TabsContent value="fuel" className="mt-0 h-full">
                <ScrollArea className="h-full"><div className="p-4"><FuelMetricsPanel fuelTransactions={fuelTransactions} isLoading={isLoading} vehicleId={actualVehicleId} /></div></ScrollArea>
              </TabsContent>

              {/* ═══ ALERTS ═══ */}
              <TabsContent value="alerts" className="mt-0 h-full">
                <ScrollArea className="h-full"><div className="p-4"><AlertsPanel alerts={driverEvents} isLoading={isLoading} vehicleId={actualVehicleId} /></div></ScrollArea>
              </TabsContent>

              {/* ═══ ZONES ═══ */}
              <TabsContent value="zones" className="mt-0 h-full">
                <ScrollArea className="h-full"><div className="p-4"><ZonesPanel vehicleId={actualVehicleId} /></div></ScrollArea>
              </TabsContent>

              {/* ═══ COMMANDS ═══ */}
              <TabsContent value="commands" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">Device Commands</h3>
                      {device && <Badge variant="outline" className="text-[10px]">{device.tracker_model} • {device.imei}</Badge>}
                    </div>
                    {commandsLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                    ) : commands.length === 0 ? (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-16">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 mx-auto flex items-center justify-center mb-4">
                          <Terminal className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No commands sent yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">{device ? "Send remote commands to this device" : "No device installed"}</p>
                      </motion.div>
                    ) : (
                      commands.map((cmd: any, i: number) => (
                        <motion.div key={cmd.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-3.5 hover:border-primary/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${
                                cmd.status === 'executed' ? 'bg-success/10' : cmd.status === 'failed' ? 'bg-destructive/10' : 'bg-muted'
                              }`}>
                                <Send className={`h-3 w-3 ${
                                  cmd.status === 'executed' ? 'text-success' : cmd.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                                }`} />
                              </div>
                              <span className="font-semibold text-sm">{cmd.command_type}</span>
                            </div>
                            <Badge variant={
                              cmd.status === 'executed' ? 'default' : cmd.status === 'failed' ? 'destructive' : 'secondary'
                            } className="text-[9px] h-4 font-bold">{cmd.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span>{format(new Date(cmd.created_at), "dd MMM yyyy HH:mm:ss")}</span>
                            {cmd.priority && <span className="text-muted-foreground/60">Priority: {cmd.priority}</span>}
                          </div>
                          {cmd.error_message && <p className="text-[10px] text-destructive mt-1">Error: {cmd.error_message}</p>}
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ═══ FULL INFO TAB ═══ */}
              <TabsContent value="info" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle Details */}
                    <Card className="border-border/30 rounded-2xl overflow-hidden">
                      <CardHeader className="pb-1 pt-3 px-4 bg-gradient-to-r from-primary/5 to-transparent">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5" /> Vehicle Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <InfoRow icon={Hash} label="Plate Number" value={vehicle.plate} />
                        <InfoRow label="Make" value={vehicleRecord?.make || vehicle.make} />
                        <InfoRow label="Model" value={vehicleRecord?.model || vehicle.model} />
                        <InfoRow label="Year" value={vehicleRecord?.year || vehicle.year} />
                        <InfoRow label="VIN" value={vehicleRecord?.vin} />
                        <InfoRow label="Color" value={vehicleRecord?.color} />
                        <InfoRow label="Vehicle Type" value={vehicleRecord?.vehicle_type} />
                        <InfoRow label="Fuel Type" value={vehicleRecord?.fuel_type} />
                        <InfoRow label="Tank Capacity" value={vehicleRecord?.tank_capacity_liters ? `${vehicleRecord.tank_capacity_liters}L` : null} />
                        <InfoRow label="Odometer" value={vehicleRecord?.odometer_km ? `${Number(vehicleRecord.odometer_km).toLocaleString()} km` : null} />
                        <InfoRow label="Engine Hours" value={vehicleRecord?.engine_hours ? `${Number(vehicleRecord.engine_hours).toLocaleString()} hrs` : null} />
                        <InfoRow label="Ownership" value={vehicleRecord?.ownership_type} />
                        <InfoRow label="Lifecycle" value={vehicleRecord?.lifecycle_stage} />
                        <InfoRow label="Status" value={vehicleRecord?.status} />
                        {vehicleRecord?.notes && <InfoRow label="Notes" value={vehicleRecord.notes} />}
                      </CardContent>
                    </Card>

                    {/* Financial */}
                    <Card className="border-border/30 rounded-2xl overflow-hidden">
                      <CardHeader className="pb-1 pt-3 px-4 bg-gradient-to-r from-secondary/5 to-transparent">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" /> Financial & Cost
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <InfoRow label="Acquisition Date" value={vehicleRecord?.acquisition_date ? format(new Date(vehicleRecord.acquisition_date), "dd MMM yyyy") : null} />
                        <InfoRow label="Acquisition Cost" value={vehicleRecord?.acquisition_cost ? `ETB ${Number(vehicleRecord.acquisition_cost).toLocaleString()}` : null} />
                        <InfoRow label="Current Value" value={vehicleRecord?.current_value ? `ETB ${Number(vehicleRecord.current_value).toLocaleString()}` : null} />
                        <InfoRow label="Depreciation" value={vehicleRecord?.depreciation_rate ? `${vehicleRecord.depreciation_rate}%/yr` : null} />
                        <InfoRow label="Total Maintenance" value={vehicleRecord?.total_maintenance_cost ? `ETB ${Number(vehicleRecord.total_maintenance_cost).toLocaleString()}` : null} />
                        <InfoRow label="Total Fuel Cost" value={vehicleRecord?.total_fuel_cost ? `ETB ${Number(vehicleRecord.total_fuel_cost).toLocaleString()}` : null} />
                        <InfoRow label="Total Downtime" value={vehicleRecord?.total_downtime_hours ? `${Number(vehicleRecord.total_downtime_hours).toLocaleString()} hrs` : null} />
                      </CardContent>
                    </Card>

                    {/* Driver */}
                    <Card className="border-border/30 rounded-2xl overflow-hidden">
                      <CardHeader className="pb-1 pt-3 px-4 bg-gradient-to-r from-success/5 to-transparent">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" /> Assigned Driver
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        {driver ? (
                          <>
                            <div className="flex items-center gap-3 mb-3 py-2">
                              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg">
                                <AvatarImage src={driver.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 font-bold">{driver.first_name?.[0]}{driver.last_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold">{driver.first_name} {driver.last_name}</p>
                                <Badge variant={driver.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-4">{driver.status}</Badge>
                              </div>
                            </div>
                            <InfoRow label="Phone" value={driver.phone} />
                            <InfoRow label="Email" value={driver.email} />
                            <InfoRow label="License #" value={driver.license_number} />
                            <InfoRow label="License Expiry" value={driver.license_expiry ? format(new Date(driver.license_expiry), "dd MMM yyyy") : null} />
                            <InfoRow label="Total Trips" value={driver.total_trips?.toLocaleString()} />
                            <InfoRow label="Total Distance" value={driver.total_distance_km ? `${Number(driver.total_distance_km).toLocaleString()} km` : null} />
                          </>
                        ) : <p className="text-sm text-muted-foreground py-4 text-center">No driver assigned</p>}
                      </CardContent>
                    </Card>

                    {/* Device */}
                    <Card className="border-border/30 rounded-2xl overflow-hidden">
                      <CardHeader className="pb-1 pt-3 px-4 bg-gradient-to-r from-warning/5 to-transparent">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
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
                            <InfoRow label="Status" value={<Badge variant={device.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-4">{device.status}</Badge>} />
                            <InfoRow label="Last Heartbeat" value={device.last_heartbeat ? formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true }) : null} />
                            {device.notes && <InfoRow label="Notes" value={device.notes} />}
                          </>
                        ) : <p className="text-sm text-muted-foreground py-4 text-center">No device installed</p>}
                      </CardContent>
                    </Card>

                    {/* Full Telemetry */}
                    {telemetry && (
                      <Card className="md:col-span-2 border-border/30 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-1 pt-3 px-4 bg-gradient-to-r from-primary/5 to-secondary/5">
                          <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" /> Live Telemetry Data
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
                            <InfoRow icon={MapPinned} label="Latitude" value={telemetry.latitude ? Number(telemetry.latitude).toFixed(6) : null} />
                            <InfoRow icon={MapPinned} label="Longitude" value={telemetry.longitude ? Number(telemetry.longitude).toFixed(6) : null} />
                            <InfoRow icon={Gauge} label="Speed" value={telemetry.speed_kmh != null ? `${Number(telemetry.speed_kmh).toFixed(0)} km/h` : null} />
                            <InfoRow icon={Navigation} label="Heading" value={telemetry.heading != null ? `${Number(telemetry.heading).toFixed(0)}°` : null} />
                            <InfoRow icon={Battery} label="Battery" value={telemetry.battery_voltage != null ? `${Number(telemetry.battery_voltage).toFixed(2)}V` : null} />
                            <InfoRow icon={Zap} label="Ext. Power" value={telemetry.external_voltage != null ? `${Number(telemetry.external_voltage).toFixed(2)}V` : null} />
                            <InfoRow icon={Satellite} label="GPS Sats" value={telemetry.gps_satellites_count} />
                            <InfoRow icon={Signal} label="GSM Signal" value={telemetry.gsm_signal_strength != null ? `${telemetry.gsm_signal_strength}%` : null} />
                            <InfoRow icon={Thermometer} label="Temp 1" value={telemetry.temperature_1 != null ? `${Number(telemetry.temperature_1).toFixed(1)}°C` : null} />
                            <InfoRow icon={Thermometer} label="Temp 2" value={telemetry.temperature_2 != null ? `${Number(telemetry.temperature_2).toFixed(1)}°C` : null} />
                            <InfoRow label="GPS Fix" value={telemetry.gps_fix_type} />
                            <InfoRow label="HDOP" value={telemetry.gps_hdop != null ? Number(telemetry.gps_hdop).toFixed(1) : null} />
                            <InfoRow label="Altitude" value={telemetry.altitude_meters != null ? `${Number(telemetry.altitude_meters).toFixed(0)}m` : null} />
                            <InfoRow label="GPS Odometer" value={telemetry.odometer_km != null ? `${Number(telemetry.odometer_km).toLocaleString()} km` : null} />
                            <InfoRow label="Engine Hours (GPS)" value={telemetry.engine_hours != null ? `${Number(telemetry.engine_hours).toLocaleString()} hrs` : null} />
                            <InfoRow label="Driver RFID" value={telemetry.driver_rfid} />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Service History */}
                    {serviceHistory.length > 0 && (
                      <Card className="md:col-span-2 border-border/30 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-1 pt-3 px-4 bg-gradient-to-r from-warning/5 to-transparent">
                          <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5" /> Service History
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          {serviceHistory.slice(0, 8).map((s: any, i: number) => (
                            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                              className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                              <div>
                                <p className="text-sm font-medium">{s.service_type}</p>
                                <p className="text-[10px] text-muted-foreground">{s.service_date ? format(new Date(s.service_date), "dd MMM yyyy") : "—"}</p>
                              </div>
                              {s.total_cost != null && (
                                <span className="text-sm font-bold">ETB {Number(s.total_cost).toLocaleString()}</span>
                              )}
                            </motion.div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ═══ SETTINGS TAB ═══ */}
              <TabsContent value="settings" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-border/30 rounded-2xl">
                      <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Rename Device</CardTitle></CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <Input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="Device name" className="bg-muted/30 rounded-xl" />
                        <div className="flex justify-end">
                          <Button size="sm" className="rounded-xl" onClick={() => handleUpdate("name", "plate_number", vehicleName)} disabled={isUpdating === "name"}>
                            {isUpdating === "name" ? "Saving..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/30 rounded-2xl">
                      <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Update Odometer</CardTitle></CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <div className="relative">
                          <Input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" className="bg-muted/30 rounded-xl pr-12" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">km</span>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" className="rounded-xl" onClick={() => handleUpdate("odometer", "odometer_km", odometer)} disabled={isUpdating === "odometer"}>
                            {isUpdating === "odometer" ? "Saving..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/30 rounded-2xl">
                      <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Engine Hours</CardTitle></CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <Input type="number" value={engineHours} onChange={(e) => setEngineHours(e.target.value)} placeholder="0" className="bg-muted/30 rounded-xl" />
                        <div className="flex justify-end">
                          <Button size="sm" className="rounded-xl" onClick={() => handleUpdate("hours", "engine_hours", engineHours)} disabled={isUpdating === "hours"}>
                            {isUpdating === "hours" ? "Saving..." : "Update"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/30 rounded-2xl">
                      <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Asset Photo</CardTitle></CardHeader>
                      <CardContent className="flex flex-col items-center py-6">
                        <Avatar className="h-20 w-20 mb-3 shadow-lg">
                          {vehicle.imageUrl ? <AvatarImage src={vehicle.imageUrl} /> : (
                            <AvatarFallback className="bg-primary/10"><Truck className="h-8 w-8 text-primary" /></AvatarFallback>
                          )}
                        </Avatar>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl"><Camera className="h-3.5 w-3.5" /> Upload</Button>
                      </CardContent>
                    </Card>

                    <SpeedCutoffSettings vehicleId={actualVehicleId} vehiclePlate={vehicle.plate} deviceId={device?.id || null}
                      currentSettings={{
                        speed_cutoff_enabled: vehicleRecord?.speed_cutoff_enabled ?? false,
                        speed_cutoff_limit_kmh: vehicleRecord?.speed_cutoff_limit_kmh ?? 120,
                        speed_cutoff_grace_seconds: vehicleRecord?.speed_cutoff_grace_seconds ?? 5,
                      }} />

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
