import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Droplets, Gauge, Trash2, Loader2 } from "lucide-react";

const TANK_SHAPES = [
  { value: "rectangular", label: "Rectangular" },
  { value: "cylindrical_horizontal", label: "Cylindrical (Horizontal)" },
  { value: "cylindrical_vertical", label: "Cylindrical (Vertical)" },
  { value: "d_shape", label: "D-Shape" },
  { value: "custom", label: "Custom" },
];

interface CalibrationPoint {
  voltage: number;
  liters: number;
}

const FuelProbeCalibrationPanel = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [calibPoints, setCalibPoints] = useState<CalibrationPoint[]>([
    { voltage: 0, liters: 0 },
    { voltage: 5, liters: 100 },
  ]);
  const [form, setForm] = useState({
    vehicle_id: "",
    probe_model: "",
    probe_serial: "",
    tank_shape: "rectangular",
    tank_capacity_liters: 0,
    empty_voltage: 0,
    full_voltage: 5,
    calibrated_by: "",
    notes: "",
  });

  const { data: calibrations = [], isLoading } = useQuery({
    queryKey: ["fuel-probe-calibrations", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("fuel_probe_calibrations")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("calibration_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-fuel-probe", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("vehicles").select("id, plate_number, make, model").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const { error } = await supabase.from("fuel_probe_calibrations").insert([{
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        probe_model: form.probe_model || null,
        probe_serial: form.probe_serial || null,
        tank_shape: form.tank_shape,
        tank_capacity_liters: form.tank_capacity_liters,
        calibration_points: calibPoints as any,
        empty_voltage: form.empty_voltage,
        full_voltage: form.full_voltage,
        calibrated_by: form.calibrated_by || null,
        notes: form.notes || null,
        next_calibration_due: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-probe-calibrations"] });
      setShowDialog(false);
      resetForm();
      toast.success("Fuel probe calibration saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_probe_calibrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-probe-calibrations"] });
      toast.success("Calibration removed");
    },
  });

  const resetForm = () => {
    setForm({ vehicle_id: "", probe_model: "", probe_serial: "", tank_shape: "rectangular", tank_capacity_liters: 0, empty_voltage: 0, full_voltage: 5, calibrated_by: "", notes: "" });
    setCalibPoints([{ voltage: 0, liters: 0 }, { voltage: 5, liters: 100 }]);
  };

  const addPoint = () => setCalibPoints(prev => [...prev, { voltage: 0, liters: 0 }]);
  const removePoint = (i: number) => setCalibPoints(prev => prev.filter((_, idx) => idx !== i));
  const updatePoint = (i: number, field: keyof CalibrationPoint, val: number) => {
    setCalibPoints(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Fuel Probe Calibration
          </h2>
          <p className="text-sm text-muted-foreground">Manage voltage-to-litre calibration curves for fuel level sensors</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Calibration
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{calibrations.length}</p><p className="text-sm text-muted-foreground">Total Calibrations</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{calibrations.filter((c: any) => c.status === "active").length}</p><p className="text-sm text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{calibrations.filter((c: any) => c.next_calibration_due && new Date(c.next_calibration_due) < new Date()).length}</p><p className="text-sm text-muted-foreground text-destructive">Overdue</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{new Set(calibrations.map((c: any) => c.vehicle_id)).size}</p><p className="text-sm text-muted-foreground">Vehicles Covered</p></CardContent></Card>
      </div>

      {/* Calibrations Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Probe Model</TableHead>
              <TableHead>Tank</TableHead>
              <TableHead>Voltage Range</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Calibrated</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calibrations.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No fuel probe calibrations. Add one to begin.</TableCell></TableRow>
            ) : calibrations.map((c: any) => {
              const points = Array.isArray(c.calibration_points) ? c.calibration_points : [];
              const overdue = c.next_calibration_due && new Date(c.next_calibration_due) < new Date();
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.vehicles?.plate_number || "—"}</TableCell>
                  <TableCell>{c.probe_model || "—"}</TableCell>
                  <TableCell>{c.tank_shape} / {c.tank_capacity_liters}L</TableCell>
                  <TableCell className="font-mono text-sm">{c.empty_voltage}V – {c.full_voltage}V</TableCell>
                  <TableCell><Badge variant="secondary">{points.length} pts</Badge></TableCell>
                  <TableCell className="text-sm">{c.calibration_date ? format(new Date(c.calibration_date), "MMM dd, yyyy") : "—"}</TableCell>
                  <TableCell className="text-sm">
                    {c.next_calibration_due ? (
                      <span className={overdue ? "text-destructive font-medium" : ""}>{format(new Date(c.next_calibration_due), "MMM dd, yyyy")}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Calibration Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Fuel Probe Calibration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle</Label>
                <Select value={form.vehicle_id || undefined} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.filter((v: any) => v.id).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tank Shape</Label>
                <Select value={form.tank_shape} onValueChange={v => setForm(p => ({ ...p, tank_shape: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TANK_SHAPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Probe Model</Label><Input value={form.probe_model} onChange={e => setForm(p => ({ ...p, probe_model: e.target.value }))} placeholder="e.g. Technoton DUT-E" /></div>
              <div><Label>Probe Serial</Label><Input value={form.probe_serial} onChange={e => setForm(p => ({ ...p, probe_serial: e.target.value }))} /></div>
              <div><Label>Tank Capacity (L)</Label><Input type="number" value={form.tank_capacity_liters} onChange={e => setForm(p => ({ ...p, tank_capacity_liters: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Empty Voltage (V)</Label><Input type="number" step="0.01" value={form.empty_voltage} onChange={e => setForm(p => ({ ...p, empty_voltage: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Full Voltage (V)</Label><Input type="number" step="0.01" value={form.full_voltage} onChange={e => setForm(p => ({ ...p, full_voltage: parseFloat(e.target.value) || 0 }))} /></div>
            </div>

            <Separator />

            {/* Calibration Points */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2"><Gauge className="h-4 w-4" /> Calibration Points (Voltage → Litres)</Label>
                <Button size="sm" variant="outline" onClick={addPoint}><Plus className="h-3 w-3 mr-1" /> Add Point</Button>
              </div>
              <div className="space-y-2">
                {calibPoints.map((pt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input type="number" step="0.01" value={pt.voltage} onChange={e => updatePoint(i, "voltage", parseFloat(e.target.value) || 0)} placeholder="Voltage" className="w-32" />
                    <span className="text-muted-foreground">→</span>
                    <Input type="number" value={pt.liters} onChange={e => updatePoint(i, "liters", parseFloat(e.target.value) || 0)} placeholder="Litres" className="w-32" />
                    <span className="text-sm text-muted-foreground">L</span>
                    {calibPoints.length > 2 && (
                      <Button size="sm" variant="ghost" onClick={() => removePoint(i)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Calibrated By</Label><Input value={form.calibrated_by} onChange={e => setForm(p => ({ ...p, calibrated_by: e.target.value }))} placeholder="Technician name" /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.vehicle_id || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Calibration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FuelProbeCalibrationPanel;
