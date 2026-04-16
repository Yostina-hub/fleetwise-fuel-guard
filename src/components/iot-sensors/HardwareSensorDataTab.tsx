import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  organizationId: string;
  sensorTypeFilter?: string;
}

const SENSOR_TYPES = [
  { value: "tpms", label: "TPMS" },
  { value: "obd2", label: "OBD-II" },
  { value: "load", label: "Load/Weight" },
];

const renderReadings = (readings: any, type: string) => {
  if (!readings || typeof readings !== "object") return "—";
  switch (type) {
    case "tpms": return `FL:${readings.fl_psi || "—"} FR:${readings.fr_psi || "—"} RL:${readings.rl_psi || "—"} RR:${readings.rr_psi || "—"} PSI`;
    case "obd2": return readings.dtc_codes ? `DTCs: ${Array.isArray(readings.dtc_codes) ? readings.dtc_codes.join(", ") : readings.dtc_codes}` : `RPM:${readings.rpm || "—"} Temp:${readings.coolant_temp || "—"}°C`;
    case "load": return `${readings.weight_kg || "—"} kg / ${readings.max_kg || "—"} kg (${readings.weight_kg && readings.max_kg ? Math.round((readings.weight_kg / readings.max_kg) * 100) : "—"}%)`;
    default: return JSON.stringify(readings).slice(0, 60);
  }
};

const emptyForm = {
  vehicle_id: "",
  sensor_type: "tpms",
  sensor_id: "",
  readings_json: "{}",
  is_alert: false,
  alert_type: "",
};

const HardwareSensorDataTab = ({ organizationId, sensorTypeFilter }: Props) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(sensorTypeFilter || "all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: sensorData = [], isLoading } = useQuery({
    queryKey: ["hardware-sensor-data", organizationId, filter],
    queryFn: async () => {
      let query = supabase
        .from("hardware_sensor_data")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (filter !== "all") query = query.eq("sensor_type", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-sensor-data", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let readings: any;
      try { readings = JSON.parse(form.readings_json); } catch { throw new Error("Invalid JSON in readings"); }
      const { error } = await supabase.from("hardware_sensor_data").insert([{
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        sensor_type: form.sensor_type,
        sensor_id: form.sensor_id || null,
        readings,
        is_alert: form.is_alert,
        alert_type: form.is_alert ? (form.alert_type || null) : null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hardware-sensor-data"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast.success("Sensor reading logged");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hardware_sensor_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hardware-sensor-data"] });
      toast.success("Reading deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!sensorTypeFilter && (
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SENSOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button onClick={() => { setForm(emptyForm); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" /> Log Reading</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sensor ID</TableHead>
              <TableHead>Readings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : sensorData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sensor data recorded. Connect sensors or log manually.</TableCell></TableRow>
            ) : sensorData.map((s: any) => (
              <TableRow key={s.id} className={s.is_alert ? "bg-destructive/5" : ""}>
                <TableCell className="text-sm">{format(new Date(s.recorded_at), "MMM dd, HH:mm")}</TableCell>
                <TableCell className="font-medium">{s.vehicles?.plate_number || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="uppercase">{s.sensor_type}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{s.sensor_id || "—"}</TableCell>
                <TableCell className="font-mono text-xs max-w-[300px] truncate">{renderReadings(s.readings, s.sensor_type)}</TableCell>
                <TableCell>{s.is_alert ? <Badge variant="destructive">{s.alert_type || "Alert"}</Badge> : <Badge variant="secondary">Normal</Badge>}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this reading?")) deleteMutation.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Log Sensor Reading</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id || undefined} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.filter((v: any) => v.id).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sensor Type *</Label>
                <Select value={form.sensor_type} onValueChange={v => setForm(p => ({ ...p, sensor_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENSOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sensor ID</Label>
                <Input value={form.sensor_id} onChange={e => setForm(p => ({ ...p, sensor_id: e.target.value }))} placeholder="e.g. TPMS-001" />
              </div>
            </div>
            <div>
              <Label>Readings (JSON) *</Label>
              <Textarea value={form.readings_json} onChange={e => setForm(p => ({ ...p, readings_json: e.target.value }))} rows={4} placeholder='{"rpm": 2400, "coolant_temp": 92}' className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_alert} onChange={e => setForm(p => ({ ...p, is_alert: e.target.checked }))} />
                <Label>Is Alert?</Label>
              </div>
              {form.is_alert && (
                <div>
                  <Label>Alert Type</Label>
                  <Input value={form.alert_type} onChange={e => setForm(p => ({ ...p, alert_type: e.target.value }))} placeholder="e.g. high_temp" />
                </div>
              )}
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

export default HardwareSensorDataTab;
