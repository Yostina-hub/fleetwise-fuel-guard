import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";
import { CircuitBoard, Thermometer, Gauge, Fuel, Activity, Zap, Clock, Plus, Trash2, Loader2 } from "lucide-react";

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

const emptyForm = {
  vehicle_id: "",
  rpm: "",
  coolant_temp: "",
  engine_load: "",
  speed_kmh: "",
  throttle_position: "",
  battery_voltage: "",
  intake_temp: "",
  fuel_pressure: "",
  dtc_codes: "",
};

const OBDRemoteDiagnosticsPanel = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);

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
      if (selectedVehicle && selectedVehicle !== "all") query = query.eq("vehicle_id", selectedVehicle);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const readings: any = {};
      if (form.rpm) readings.rpm = parseFloat(form.rpm);
      if (form.coolant_temp) readings.coolant_temp = parseFloat(form.coolant_temp);
      if (form.engine_load) readings.engine_load = parseFloat(form.engine_load);
      if (form.speed_kmh) readings.speed_kmh = parseFloat(form.speed_kmh);
      if (form.throttle_position) readings.throttle_position = parseFloat(form.throttle_position);
      if (form.battery_voltage) readings.battery_voltage = parseFloat(form.battery_voltage);
      if (form.intake_temp) readings.intake_temp = parseFloat(form.intake_temp);
      if (form.fuel_pressure) readings.fuel_pressure = parseFloat(form.fuel_pressure);
      if (form.dtc_codes.trim()) readings.dtc_codes = form.dtc_codes.split(",").map(c => c.trim()).filter(Boolean);
      
      const isAlert = (readings.coolant_temp && readings.coolant_temp > 105) || (readings.dtc_codes && readings.dtc_codes.length > 0);
      
      const { error } = await supabase.from("hardware_sensor_data").insert([{
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        sensor_type: "obd2",
        readings,
        is_alert: isAlert,
        alert_type: isAlert ? (readings.dtc_codes?.length > 0 ? "dtc_fault" : "high_temp") : null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obd-data"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast.success("OBD-II reading logged");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hardware_sensor_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obd-data"] });
      toast.success("Reading deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const latestReadingsRaw = obdData[0]?.readings;
  const latestReading: OBDReading = typeof latestReadingsRaw === "object" && latestReadingsRaw !== null ? latestReadingsRaw : {};
  const dtcCodes: string[] = Array.isArray(latestReading.dtc_codes) ? latestReading.dtc_codes : [];

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
        <div className="flex gap-2">
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="w-[250px]"><SelectValue placeholder="All vehicles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setForm(emptyForm); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" /> Log Reading</Button>
        </div>
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
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : obdData.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No OBD-II data. Connect OBD-II scanners or log manually.</TableCell></TableRow>
            ) : obdData.map((row: any) => {
              const r: OBDReading = typeof row.readings === "object" && row.readings !== null ? row.readings : {};
              const codes = Array.isArray(r.dtc_codes) ? r.dtc_codes : [];
              return (
                <TableRow key={row.id} className={row.is_alert ? "bg-destructive/5" : ""}>
                  <TableCell className="text-sm">{format(new Date(row.recorded_at), "MMM dd, HH:mm")}</TableCell>
                  <TableCell className="font-medium">{row.vehicles?.plate_number || "—"}</TableCell>
                  <TableCell>{r.rpm ?? "—"}</TableCell>
                  <TableCell className={r.coolant_temp && r.coolant_temp > 105 ? "text-destructive font-bold" : ""}>{r.coolant_temp ? `${r.coolant_temp}°C` : "—"}</TableCell>
                  <TableCell>{r.engine_load ? `${r.engine_load}%` : "—"}</TableCell>
                  <TableCell>{r.speed_kmh ?? "—"}</TableCell>
                  <TableCell>{r.battery_voltage ? `${r.battery_voltage}V` : "—"}</TableCell>
                  <TableCell>{codes.length > 0 ? <Badge variant="destructive">{codes.length} DTCs</Badge> : "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this reading?")) deleteMutation.mutate(row.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Log OBD-II Reading Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CircuitBoard className="h-5 w-5" /> Log OBD-II Reading</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id || undefined} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.filter((v: any) => v.id).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>RPM</Label><Input value={form.rpm} onChange={e => setForm(p => ({ ...p, rpm: e.target.value }))} placeholder="2400" /></div>
              <div><Label>Coolant Temp (°C)</Label><Input value={form.coolant_temp} onChange={e => setForm(p => ({ ...p, coolant_temp: e.target.value }))} placeholder="92" /></div>
              <div><Label>Engine Load (%)</Label><Input value={form.engine_load} onChange={e => setForm(p => ({ ...p, engine_load: e.target.value }))} placeholder="45" /></div>
              <div><Label>Speed (km/h)</Label><Input value={form.speed_kmh} onChange={e => setForm(p => ({ ...p, speed_kmh: e.target.value }))} placeholder="60" /></div>
              <div><Label>Throttle (%)</Label><Input value={form.throttle_position} onChange={e => setForm(p => ({ ...p, throttle_position: e.target.value }))} placeholder="30" /></div>
              <div><Label>Battery (V)</Label><Input value={form.battery_voltage} onChange={e => setForm(p => ({ ...p, battery_voltage: e.target.value }))} placeholder="12.6" /></div>
              <div><Label>Intake Temp (°C)</Label><Input value={form.intake_temp} onChange={e => setForm(p => ({ ...p, intake_temp: e.target.value }))} placeholder="35" /></div>
              <div><Label>Fuel Pressure (kPa)</Label><Input value={form.fuel_pressure} onChange={e => setForm(p => ({ ...p, fuel_pressure: e.target.value }))} placeholder="250" /></div>
            </div>
            <div>
              <Label>DTC Codes (comma-separated)</Label>
              <Input value={form.dtc_codes} onChange={e => setForm(p => ({ ...p, dtc_codes: e.target.value }))} placeholder="P0301, P0420, P0171" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.vehicle_id || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Log Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OBDRemoteDiagnosticsPanel;
