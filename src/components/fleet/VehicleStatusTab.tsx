import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceCompatibility } from "@/hooks/useDeviceCompatibility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Battery, BatteryCharging, BatteryWarning, Fuel, Gauge, Thermometer,
  Radio, Wifi, WifiOff, MapPin, Zap, Clock, Camera, CircleDot, Wrench,
  Package, AlertTriangle, CheckCircle, Signal, Satellite, Power, Car,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import LicenseExpiryBadge from "@/components/fleet/LicenseExpiryBadge";
import { DeviceProfileCard } from "@/components/fleet/DeviceProfileCard";

interface Props {
  vehicle: any;
  vehicleId: string;
}

// --- Gauge Widget ---
const GaugeWidget = ({ label, value, unit, max, icon: Icon, color, warning }: {
  label: string; value: number | null; unit: string; max: number;
  icon: any; color: string; warning?: boolean;
}) => {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Card className={cn("p-4 relative overflow-hidden", warning && "border-warning/40")}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold leading-tight">
                {value != null ? value.toLocaleString() : "—"}
                <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
              </p>
            </div>
          </div>
          {warning && <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />}
        </div>
        <Progress value={pct} className={cn("h-1.5", warning ? "[&>div]:bg-warning" : `[&>div]:${color.replace("bg-", "bg-")}`)} />
      </Card>
    </motion.div>
  );
};

// --- Status Indicator ---
const StatusDot = ({ active, label }: { active: boolean | null; label: string }) => (
  <div className="flex items-center gap-2 py-1.5">
    <div className={cn("w-2.5 h-2.5 rounded-full", active ? "bg-success animate-pulse" : "bg-muted-foreground/30")} />
    <span className="text-sm">{label}</span>
    <span className={cn("ml-auto text-xs font-medium", active ? "text-success" : "text-muted-foreground")}>
      {active ? "Active" : "Inactive"}
    </span>
  </div>
);

export default function VehicleStatusTab({ vehicle, vehicleId }: Props) {
  const v = vehicle;

  // Fetch live telemetry
  const { data: telemetry } = useQuery({
    queryKey: ["vehicle-telemetry-status", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("last_communication_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
    refetchInterval: 30000,
  });

  // Fetch tires
  const { data: tires = [] } = useQuery({
    queryKey: ["vehicle-tires", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_tires")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });

  // Fetch linked fleet assets (spare parts, batteries etc)
  const { data: linkedAssets = [] } = useQuery({
    queryKey: ["vehicle-linked-assets", vehicleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_assets")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("category");
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });

  // Fetch assigned device
  const { data: assignedDevice } = useQuery({
    queryKey: ["vehicle-assigned-device", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  const { profiles: compatibilityProfiles } = useDeviceCompatibility();

  // Match device to compatibility profile
  const deviceProfile = assignedDevice?.tracker_model
    ? compatibilityProfiles?.find(
        (p) =>
          assignedDevice.tracker_model.toLowerCase().includes(p.model_name.toLowerCase()) ||
          `${p.vendor} ${p.model_name}`.toLowerCase() === assignedDevice.tracker_model.toLowerCase()
      )
    : null;

  const isOnline = telemetry?.device_connected && telemetry?.last_communication_at &&
    (new Date().getTime() - new Date(telemetry.last_communication_at).getTime()) < 5 * 60 * 1000;
  const batteryLow = telemetry?.battery_voltage != null && telemetry.battery_voltage < 11.5;
  const fuelLow = telemetry?.fuel_level_percent != null && telemetry.fuel_level_percent < 20;

  const tireConditionColor = (cond: string | null) => {
    if (!cond) return "bg-muted text-muted-foreground";
    const m: Record<string, string> = {
      new: "bg-success/10 text-success", good: "bg-success/10 text-success",
      fair: "bg-warning/10 text-warning", poor: "bg-destructive/10 text-destructive",
      condemned: "bg-destructive/10 text-destructive",
    };
    return m[cond] || "bg-muted text-muted-foreground";
  };

  const assetCategoryIcon = (cat: string) => {
    const m: Record<string, any> = {
      tire: CircleDot, battery: Zap, tool: Wrench, equipment: Package,
    };
    return m[cat] || Package;
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Connection Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn("p-4", isOnline ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? <Wifi className="w-5 h-5 text-success" /> : <WifiOff className="w-5 h-5 text-destructive" />}
              <div>
                <p className="font-semibold text-sm">{isOnline ? "Vehicle Online" : "Vehicle Offline"}</p>
                <p className="text-xs text-muted-foreground">
                  {telemetry?.last_communication_at
                    ? `Last seen ${formatDistanceToNow(parseISO(telemetry.last_communication_at), { addSuffix: true })}`
                    : "No telemetry data available"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {telemetry?.gps_satellites_count != null && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Satellite className="w-3 h-3" />{telemetry.gps_satellites_count} sats
                </Badge>
              )}
              {telemetry?.gsm_signal_strength != null && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Signal className="w-3 h-3" />{telemetry.gsm_signal_strength}%
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Vehicle Photo + Live Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vehicle Image */}
        <Card className="lg:row-span-2 overflow-hidden">
          <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 relative">
            {v?.photo_front_url ? (
              <img src={v.photo_front_url} alt="Vehicle" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Car className="w-16 h-16 opacity-20" />
                <p className="text-sm">No photo available</p>
              </div>
            )}
            {/* Status overlay */}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className={cn("shadow-lg",
                v?.status === "active" ? "bg-success text-white" :
                v?.status === "maintenance" ? "bg-warning text-white" : "bg-muted-foreground text-white"
              )}>
                {v?.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="absolute bottom-3 right-3">
              <Badge variant="outline" className="bg-background/80 backdrop-blur text-xs">
                {v?.plate_number}
              </Badge>
            </div>
          </div>
          {/* Mini photo gallery */}
          <div className="grid grid-cols-4 gap-1 p-2">
            {["photo_front_url", "photo_back_url", "photo_left_url", "photo_right_url"].map(key => (
              <div key={key} className="aspect-square bg-muted rounded overflow-hidden">
                {v?.[key] ? (
                  <img src={v[key]} alt={key} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full"><Camera className="w-4 h-4 text-muted-foreground/30" /></div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Live Gauges */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <GaugeWidget
            label="Battery Voltage"
            value={telemetry?.battery_voltage ?? v?.battery_voltage}
            unit="V" max={14.5}
            icon={batteryLow ? BatteryWarning : BatteryCharging}
            color={batteryLow ? "bg-warning" : "bg-success"}
            warning={batteryLow}
          />
          <GaugeWidget
            label="External Power"
            value={telemetry?.external_voltage}
            unit="V" max={30}
            icon={Power}
            color="bg-primary"
          />
          <GaugeWidget
            label="Fuel Level"
            value={telemetry?.fuel_level_percent}
            unit="%" max={100}
            icon={Fuel}
            color={fuelLow ? "bg-warning" : "bg-success"}
            warning={fuelLow}
          />
          <GaugeWidget
            label="Speed"
            value={telemetry?.speed_kmh}
            unit="km/h" max={150}
            icon={Gauge}
            color="bg-primary"
          />
          <GaugeWidget
            label="Odometer"
            value={telemetry?.odometer_km ?? v?.odometer_km}
            unit="km" max={500000}
            icon={Gauge}
            color="bg-blue-500"
          />
          <GaugeWidget
            label="Engine Hours"
            value={telemetry?.engine_hours ?? v?.engine_hours}
            unit="hrs" max={50000}
            icon={Clock}
            color="bg-blue-500"
          />
        </div>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Engine & Power</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <StatusDot active={telemetry?.ignition_on} label="Ignition" />
            <StatusDot active={telemetry?.engine_on} label="Engine Running" />
            <StatusDot active={telemetry?.device_connected} label="Device Connected" />
            <Separator className="my-2" />
            {telemetry?.temperature_1 != null && (
              <div className="flex items-center gap-2 py-1">
                <Thermometer className="w-4 h-4 text-warning" />
                <span className="text-sm">Temp 1</span>
                <span className="ml-auto text-sm font-medium">{telemetry.temperature_1}°C</span>
              </div>
            )}
            {telemetry?.temperature_2 != null && (
              <div className="flex items-center gap-2 py-1">
                <Thermometer className="w-4 h-4 text-warning" />
                <span className="text-sm">Temp 2</span>
                <span className="ml-auto text-sm font-medium">{telemetry.temperature_2}°C</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radio className="w-4 h-4 text-primary" />GPS & Connectivity</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2 py-1">
              <Satellite className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Satellites</span>
              <span className="ml-auto text-sm font-medium">{telemetry?.gps_satellites_count ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Signal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">GSM Signal</span>
              <span className="ml-auto text-sm font-medium">{telemetry?.gsm_signal_strength != null ? `${telemetry.gsm_signal_strength}%` : "—"}</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">GPS Fix</span>
              <span className="ml-auto text-sm font-medium capitalize">{telemetry?.gps_fix_type || "—"}</span>
            </div>
            <Separator className="my-2" />
            {telemetry?.gps_jamming_detected && (
              <Badge variant="destructive" className="gap-1 text-xs"><AlertTriangle className="w-3 h-3" />GPS Jamming Detected</Badge>
            )}
            {telemetry?.gps_spoofing_detected && (
              <Badge variant="destructive" className="gap-1 text-xs"><AlertTriangle className="w-3 h-3" />GPS Spoofing Detected</Badge>
            )}
            {telemetry?.latitude && telemetry?.longitude && (
              <p className="text-xs text-muted-foreground mt-2">
                Coords: {telemetry.latitude.toFixed(5)}, {telemetry.longitude.toFixed(5)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" />Driving Events</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <StatusDot active={telemetry?.harsh_acceleration} label="Harsh Acceleration" />
            <StatusDot active={telemetry?.harsh_braking} label="Harsh Braking" />
            <StatusDot active={telemetry?.harsh_cornering} label="Harsh Cornering" />
            {telemetry?.dtc_codes && (
              <>
                <Separator className="my-2" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">DTC Codes</p>
                  <Badge variant="outline" className="text-xs bg-destructive/5 text-destructive">
                    {Array.isArray(telemetry.dtc_codes) ? telemetry.dtc_codes.length : 0} codes
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Compatibility Profile */}
      {deviceProfile && (
        <DeviceProfileCard profile={deviceProfile} />
      )}

      {/* Tires */}
      {tires.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-primary" />Tire Status ({tires.length} tires)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tires.map((t: any) => (
                <div key={t.id} className="p-3 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-mono">{t.position}</Badge>
                    <Badge variant="outline" className={cn("text-xs capitalize", tireConditionColor(t.condition))}>
                      {t.condition || "unknown"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {t.brand && <p className="text-xs font-medium">{t.brand} {t.model || ""}</p>}
                    {t.size && <p className="text-xs text-muted-foreground">Size: {t.size}</p>}
                    {t.pressure_psi != null && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">Pressure:</span>
                        <span className={cn("font-medium", t.pressure_psi < 30 ? "text-warning" : "text-foreground")}>
                          {t.pressure_psi} PSI
                        </span>
                      </div>
                    )}
                    {t.tread_depth_mm != null && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">Tread:</span>
                        <span className={cn("font-medium", t.tread_depth_mm < 3 ? "text-destructive" : "text-foreground")}>
                          {t.tread_depth_mm} mm
                        </span>
                      </div>
                    )}
                    {t.install_date && (
                      <p className="text-xs text-muted-foreground">Installed: {format(parseISO(t.install_date), "MMM d, yyyy")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Assets / Spare Parts */}
      {linkedAssets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />Linked Assets & Parts ({linkedAssets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedAssets.map((a: any) => {
                const AssetIcon = assetCategoryIcon(a.category);
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <AssetIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.asset_code} · <span className="capitalize">{a.category}</span></p>
                      {a.serial_number && <p className="text-xs text-muted-foreground">S/N: {a.serial_number}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={cn("text-xs capitalize",
                        a.condition === "good" || a.condition === "new" ? "text-success" :
                        a.condition === "fair" ? "text-warning" : "text-destructive"
                      )}>
                        {a.condition || "—"}
                      </Badge>
                      {a.current_value && (
                        <p className="text-xs text-muted-foreground mt-0.5">{a.current_value.toLocaleString()} ETB</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data fallback */}
      {!telemetry && tires.length === 0 && linkedAssets.length === 0 && (
        <Card className="p-8 text-center">
          <Car className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No live status data available for this vehicle</p>
          <p className="text-xs text-muted-foreground mt-1">Connect a tracking device to see real-time telemetry</p>
        </Card>
      )}
    </div>
  );
}
