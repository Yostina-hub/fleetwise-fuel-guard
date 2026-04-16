import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { CircuitBoard, Thermometer, Gauge, Fuel, Activity, Zap, Clock } from "lucide-react";

interface OBDReading {
  rpm?: number;
  coolant_temp?: number;
  engine_load?: number;
  intake_temp?: number;
  throttle_position?: number;
  fuel_pressure?: number;
  timing_advance?: number;
  maf_rate?: number;
  speed_kmh?: number;
  dtc_codes?: string[];
  battery_voltage?: number;
  fuel_system_status?: string;
  fuel_trim_short?: number;
  fuel_trim_long?: number;
  o2_voltage?: number;
}

const OBD_GAUGES = [
  { key: "rpm", label: "Engine RPM", unit: "RPM", icon: Activity, min: 0, max: 8000, warn: 6000, color: "text-primary" },
  { key: "coolant_temp", label: "Coolant Temp", unit: "°C", icon: Thermometer, min: 0, max: 130, warn: 105, color: "text-destructive" },
  { key: "engine_load", label: "Engine Load", unit: "%", icon: Gauge, min: 0, max: 100, warn: 85, color: "text-primary" },
  { key: "speed_kmh", label: "Speed", unit: "km/h", icon: Zap, min: 0, max: 200, warn: 120, color: "text-primary" },
  { key: "throttle_position", label: "Throttle", unit: "%", icon: Gauge, min: 0, max: 100, warn: 90, color: "text-primary" },
  { key: "battery_voltage", label: "Battery", unit: "V", icon: Zap, min: 10, max: 15, warn: 11.5, color: "text-primary" },
  { key: "intake_temp", label: "Intake Temp", unit: "°C", icon: Thermometer, min: -20, max: 80, warn: 60, color: "text-primary" },
  { key: "fuel_pressure", label: "Fuel Pressure", unit: "kPa", icon: Fuel, min: 0, max: 500, warn: 400, color: "text-primary" },
];

const OBDRemoteDiagnosticsPanel = () => {
  const { organizationId } = useOrganization();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-obd", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("vehicles").select("id, plate_number, make, model").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: obdData = [], isLoading } = useQuery({
    queryKey: ["obd-data", organizationId, selectedVehicle],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from("hardware_sensor_data")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .eq("sensor_type", "obd2")
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (selectedVehicle) query = query.eq("vehicle_id", selectedVehicle);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 15000, // Poll every 15s for live data
  });

  const latestReadingsRaw = obdData[0]?.readings;
  const latestReading: OBDReading = (latestReadingsRaw && typeof latestReadingsRaw === "object" && !Array.isArray(latestReadingsRaw)) ? latestReadingsRaw as unknown as OBDReading : {};
  const dtcCodes = latestReading.dtc_codes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CircuitBoard className="h-5 w-5 text-primary" />
            OBD-II Remote Diagnostics
          </h2>
          <p className="text-sm text-muted-foreground">Live engine data from on-board diagnostics</p>
        </div>
        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="All vehicles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicles</SelectItem>
            {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Live Gauges */}
      {obdData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {OBD_GAUGES.map(gauge => {
            const val = (latestReading as any)[gauge.key];
            const isWarning = val !== undefined && val >= gauge.warn;
            return (
              <Card key={gauge.key} className={isWarning ? "border-destructive" : ""}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <gauge.icon className={`h-4 w-4 ${isWarning ? "text-destructive" : "text-muted-foreground"}`} />
                    {isWarning && <Badge variant="destructive" className="text-xs">WARN</Badge>}
                  </div>
                  <p className={`text-2xl font-bold ${isWarning ? "text-destructive" : ""}`}>
                    {val !== undefined ? val : "—"}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{gauge.unit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{gauge.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* DTC Codes */}
      {dtcCodes.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Activity className="h-4 w-4" /> Active DTC Codes ({dtcCodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dtcCodes.map((code, i) => (
                <Badge key={i} variant="destructive" className="font-mono">{code}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readings History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Recent OBD-II Readings
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>RPM</TableHead>
              <TableHead>Coolant</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>DTCs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {obdData.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                {isLoading ? "Loading..." : "No OBD-II data. Connect an OBD-II sensor to begin."}
              </TableCell></TableRow>
            ) : obdData.map((r: any) => {
              const rd: OBDReading = r.readings || {};
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{format(new Date(r.recorded_at), "MMM dd, HH:mm:ss")}</TableCell>
                  <TableCell className="font-medium">{r.vehicles?.plate_number || "—"}</TableCell>
                  <TableCell className="font-mono">{rd.rpm ?? "—"}</TableCell>
                  <TableCell className={`font-mono ${(rd.coolant_temp ?? 0) > 105 ? "text-destructive font-bold" : ""}`}>{rd.coolant_temp ?? "—"}°C</TableCell>
                  <TableCell className="font-mono">{rd.engine_load ?? "—"}%</TableCell>
                  <TableCell className="font-mono">{rd.speed_kmh ?? "—"}</TableCell>
                  <TableCell className="font-mono">{rd.battery_voltage ?? "—"}V</TableCell>
                  <TableCell>
                    {rd.dtc_codes?.length ? (
                      <Badge variant="destructive" className="text-xs">{rd.dtc_codes.length} codes</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Clear</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default OBDRemoteDiagnosticsPanel;
