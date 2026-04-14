import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gauge, CircuitBoard, Weight, AlertTriangle, Activity, Plus, Wrench, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";

const HardwareSensors = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [sensorFilter, setSensorFilter] = useState("all");
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [calibForm, setCalibForm] = useState({ vehicle_id: "", sensor_type: "tpms", sensor_id: "", calibrated_by: "", notes: "" });

  const { data: sensorData = [], isLoading } = useQuery({
    queryKey: ["hardware-sensor-data", organizationId, sensorFilter],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from("hardware_sensor_data")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (sensorFilter !== "all") query = query.eq("sensor_type", sensorFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: calibrations = [] } = useQuery({
    queryKey: ["sensor-calibrations", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("sensor_calibrations")
        .select("*, vehicles(plate_number)")
        .eq("organization_id", organizationId)
        .order("calibration_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list-sensor", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addCalibrationMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const { error } = await supabase.from("sensor_calibrations").insert({
        organization_id: organizationId,
        vehicle_id: calibForm.vehicle_id,
        sensor_type: calibForm.sensor_type,
        sensor_id: calibForm.sensor_id || null,
        calibrated_by: calibForm.calibrated_by || null,
        notes: calibForm.notes || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensor-calibrations"] });
      setShowCalibrationDialog(false);
      setCalibForm({ vehicle_id: "", sensor_type: "tpms", sensor_id: "", calibrated_by: "", notes: "" });
      toast.success("Calibration recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = {
    total: sensorData.length,
    tpms: sensorData.filter((s: any) => s.sensor_type === "tpms").length,
    obd: sensorData.filter((s: any) => s.sensor_type === "obd2").length,
    load: sensorData.filter((s: any) => s.sensor_type === "load").length,
    alerts: sensorData.filter((s: any) => s.is_alert).length,
  };

  const renderReadings = (readings: any, type: string) => {
    if (!readings || typeof readings !== "object") return "—";
    switch (type) {
      case "tpms": return `FL:${readings.fl_psi || "—"} FR:${readings.fr_psi || "—"} RL:${readings.rl_psi || "—"} RR:${readings.rr_psi || "—"} PSI`;
      case "obd2": return readings.dtc_codes ? `DTCs: ${Array.isArray(readings.dtc_codes) ? readings.dtc_codes.join(", ") : readings.dtc_codes}` : `RPM:${readings.rpm || "—"} Temp:${readings.coolant_temp || "—"}°C`;
      case "load": return `${readings.weight_kg || "—"} kg / ${readings.max_kg || "—"} kg (${readings.weight_kg && readings.max_kg ? Math.round((readings.weight_kg / readings.max_kg) * 100) : "—"}%)`;
      default: return JSON.stringify(readings).slice(0, 60);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Hardware Sensors</h1><p className="text-muted-foreground">TPMS, OBD-II diagnostics, load sensors & calibration tracking</p></div>
          <Button onClick={() => setShowCalibrationDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Calibration</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Activity className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Readings</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Gauge className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.tpms}</p><p className="text-sm text-muted-foreground">TPMS</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CircuitBoard className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.obd}</p><p className="text-sm text-muted-foreground">OBD-II</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Weight className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.load}</p><p className="text-sm text-muted-foreground">Load/Weight</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.alerts}</p><p className="text-sm text-muted-foreground">Alerts</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Sensors</TabsTrigger>
            <TabsTrigger value="tpms">TPMS</TabsTrigger>
            <TabsTrigger value="obd2">OBD-II</TabsTrigger>
            <TabsTrigger value="load">Load/Weight</TabsTrigger>
            <TabsTrigger value="calibrations">Calibrations ({calibrations.length})</TabsTrigger>
          </TabsList>

          {["all", "tpms", "obd2", "load"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card><Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Vehicle</TableHead><TableHead>Type</TableHead><TableHead>Sensor ID</TableHead><TableHead>Readings</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
                  (tab === "all" ? sensorData : sensorData.filter((s: any) => s.sensor_type === tab)).length === 0 ?
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sensor data recorded. Connect sensors to begin.</TableCell></TableRow> :
                  (tab === "all" ? sensorData : sensorData.filter((s: any) => s.sensor_type === tab)).map((s: any) => (
                    <TableRow key={s.id} className={s.is_alert ? "bg-destructive/5" : ""}>
                      <TableCell className="text-sm">{format(new Date(s.recorded_at), "MMM dd, HH:mm")}</TableCell>
                      <TableCell className="font-medium">{s.vehicles?.plate_number || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="uppercase">{s.sensor_type}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{s.sensor_id || "—"}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">{renderReadings(s.readings, s.sensor_type)}</TableCell>
                      <TableCell>{s.is_alert ? <Badge variant="destructive">{s.alert_type || "Alert"}</Badge> : <Badge variant="secondary">Normal</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></Card>
            </TabsContent>
          ))}

          <TabsContent value="calibrations">
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>Vehicle</TableHead><TableHead>Sensor Type</TableHead><TableHead>Sensor ID</TableHead><TableHead>Calibration Date</TableHead><TableHead>Calibrated By</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {calibrations.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No calibration records. Add one to start tracking.</TableCell></TableRow>
                ) : calibrations.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{c.sensor_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{c.sensor_id || "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(c.calibration_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{c.calibrated_by || "—"}</TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">{c.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCalibrationDialog} onOpenChange={setShowCalibrationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Sensor Calibration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Vehicle</Label>
              <Select value={calibForm.vehicle_id} onValueChange={v => setCalibForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sensor Type</Label>
              <Select value={calibForm.sensor_type} onValueChange={v => setCalibForm(p => ({ ...p, sensor_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tpms">TPMS</SelectItem>
                  <SelectItem value="obd2">OBD-II</SelectItem>
                  <SelectItem value="load">Load/Weight</SelectItem>
                  <SelectItem value="fuel">Fuel Sensor</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Sensor ID</Label><Input value={calibForm.sensor_id} onChange={e => setCalibForm(p => ({ ...p, sensor_id: e.target.value }))} placeholder="e.g. TPMS-FL-001" /></div>
            <div><Label>Calibrated By</Label><Input value={calibForm.calibrated_by} onChange={e => setCalibForm(p => ({ ...p, calibrated_by: e.target.value }))} placeholder="Technician name" /></div>
            <div><Label>Notes</Label><Input value={calibForm.notes} onChange={e => setCalibForm(p => ({ ...p, notes: e.target.value }))} placeholder="Calibration notes..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalibrationDialog(false)}>Cancel</Button>
            <Button onClick={() => addCalibrationMutation.mutate()} disabled={!calibForm.vehicle_id || addCalibrationMutation.isPending}>
              {addCalibrationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default HardwareSensors;
