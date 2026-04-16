import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  organizationId: string;
}

const SensorCalibrationTab = ({ organizationId }: Props) => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", sensor_type: "tpms", sensor_id: "", calibrated_by: "", notes: "" });

  const { data: calibrations = [], isLoading } = useQuery({
    queryKey: ["sensor-calibrations", organizationId],
    queryFn: async () => {
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
    queryKey: ["vehicles-calib", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sensor_calibrations").insert({
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        sensor_type: form.sensor_type,
        sensor_id: form.sensor_id || null,
        calibrated_by: form.calibrated_by || null,
        notes: form.notes || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensor-calibrations"] });
      setShowDialog(false);
      setForm({ vehicle_id: "", sensor_type: "tpms", sensor_id: "", calibrated_by: "", notes: "" });
      toast.success("Calibration recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Calibration</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Sensor Type</TableHead>
              <TableHead>Sensor ID</TableHead>
              <TableHead>Calibration Date</TableHead>
              <TableHead>Calibrated By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : calibrations.length === 0 ? (
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
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Add Sensor Calibration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sensor Type</Label>
              <Select value={form.sensor_type} onValueChange={v => setForm(p => ({ ...p, sensor_type: v }))}>
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
            <div><Label>Sensor ID</Label><Input value={form.sensor_id} onChange={e => setForm(p => ({ ...p, sensor_id: e.target.value }))} placeholder="e.g. TPMS-FL-001" /></div>
            <div><Label>Calibrated By</Label><Input value={form.calibrated_by} onChange={e => setForm(p => ({ ...p, calibrated_by: e.target.value }))} placeholder="Technician name" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Calibration notes..." /></div>
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

export default SensorCalibrationTab;
