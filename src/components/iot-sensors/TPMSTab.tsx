import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gauge, AlertTriangle, Battery, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface TPMSTabProps {
  organizationId: string;
}

const POSITION_LABELS: Record<string, string> = {
  front_left: "FL", front_right: "FR", rear_left: "RL", rear_right: "RR",
  spare: "SP", axle2_left: "A2L", axle2_right: "A2R", axle3_left: "A3L", axle3_right: "A3R",
};

const ALARM_COLORS: Record<string, string> = {
  low_pressure: "bg-warning/10 text-warning border-warning/20",
  high_pressure: "bg-destructive/10 text-destructive border-destructive/20",
  high_temperature: "bg-destructive/10 text-destructive border-destructive/20",
  rapid_leak: "bg-destructive text-destructive-foreground",
  sensor_fault: "bg-muted text-muted-foreground",
};

const emptyForm = { vehicle_id: "", tire_position: "front_left", pressure_psi: "", temperature_celsius: "", battery_percent: "" };

const TPMSTab = ({ organizationId }: TPMSTabProps) => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: readings = [], isLoading } = useQuery({
    queryKey: ["tpms-readings", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tpms_readings")
        .select("*, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-tpms", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const psi = parseFloat(form.pressure_psi);
      const { error } = await (supabase as any).from("tpms_readings").insert({
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        tire_position: form.tire_position,
        pressure_psi: isNaN(psi) ? null : psi,
        pressure_bar: isNaN(psi) ? null : +(psi * 0.0689476).toFixed(3),
        temperature_celsius: form.temperature_celsius ? parseFloat(form.temperature_celsius) : null,
        battery_percent: form.battery_percent ? parseInt(form.battery_percent) : null,
        is_alarm: !isNaN(psi) && (psi < 25 || psi > 50),
        alarm_type: !isNaN(psi) && psi < 25 ? "low_pressure" : !isNaN(psi) && psi > 50 ? "high_pressure" : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tpms-readings"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast.success("TPMS reading recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tpms_readings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tpms-readings"] });
      toast.success("Reading deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const latestPerTire: Record<string, any> = {};
  readings.forEach((r: any) => {
    const key = `${r.vehicle_id}:${r.tire_position}`;
    if (!latestPerTire[key]) latestPerTire[key] = r;
  });
  const latestReadings = Object.values(latestPerTire);

  const stats = {
    total: latestReadings.length,
    normal: latestReadings.filter((r: any) => !r.is_alarm).length,
    alarms: latestReadings.filter((r: any) => r.is_alarm).length,
    lowBattery: latestReadings.filter((r: any) => r.battery_percent != null && r.battery_percent < 20).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Gauge className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Active Tires</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Gauge className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{stats.normal}</p><p className="text-xs text-muted-foreground">Normal</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.alarms}</p><p className="text-xs text-muted-foreground">Alarms</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Battery className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{stats.lowBattery}</p><p className="text-xs text-muted-foreground">Low Battery</p></div></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Reading</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Pressure (PSI)</TableHead>
              <TableHead>Pressure (Bar)</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : readings.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No TPMS readings. Wireless BLE tire sensors will report pressure and temperature data here.</TableCell></TableRow>
            ) : readings.slice(0, 200).map((r: any) => (
              <TableRow key={r.id} className={r.is_alarm ? "bg-destructive/5" : ""}>
                <TableCell className="text-sm">{format(new Date(r.recorded_at), "MMM dd, HH:mm")}</TableCell>
                <TableCell className="font-medium">{r.vehicles?.plate_number || "—"}</TableCell>
                <TableCell><Badge variant="outline">{POSITION_LABELS[r.tire_position] || r.tire_position}</Badge></TableCell>
                <TableCell className="font-mono">{r.pressure_psi != null ? Number(r.pressure_psi).toFixed(1) : "—"}</TableCell>
                <TableCell className="font-mono">{r.pressure_bar != null ? Number(r.pressure_bar).toFixed(2) : "—"}</TableCell>
                <TableCell className="font-mono">{r.temperature_celsius != null ? `${Number(r.temperature_celsius).toFixed(1)}°C` : "—"}</TableCell>
                <TableCell>{r.battery_percent != null ? (
                  <span className={r.battery_percent < 20 ? "text-destructive font-bold" : ""}>{r.battery_percent}%</span>
                ) : "—"}</TableCell>
                <TableCell>
                  {r.is_alarm ? (
                    <Badge className={ALARM_COLORS[r.alarm_type] || "bg-destructive/10 text-destructive"}>{r.alarm_type?.replace("_", " ") || "Alarm"}</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-success/10 text-success">Normal</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Add TPMS Reading</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tire Position *</Label>
              <Select value={form.tire_position} onValueChange={v => setForm(p => ({ ...p, tire_position: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v} — {k.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Pressure (PSI)</Label><Input type="number" value={form.pressure_psi} onChange={e => setForm(p => ({ ...p, pressure_psi: e.target.value }))} placeholder="32.0" /></div>
              <div><Label>Temp (°C)</Label><Input type="number" value={form.temperature_celsius} onChange={e => setForm(p => ({ ...p, temperature_celsius: e.target.value }))} placeholder="35" /></div>
              <div><Label>Battery %</Label><Input type="number" value={form.battery_percent} onChange={e => setForm(p => ({ ...p, battery_percent: e.target.value }))} placeholder="85" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.vehicle_id || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TPMSTab;
