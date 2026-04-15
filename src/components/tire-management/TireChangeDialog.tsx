import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { toast } from "sonner";

const POSITIONS = ["Front Left", "Front Right", "Rear Left Outer", "Rear Left Inner", "Rear Right Outer", "Rear Right Inner", "Spare"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tires: any[];
}

export const TireChangeDialog = ({ open, onOpenChange, tires }: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    tire_id: "", vehicle_id: "", position: "", change_type: "replacement",
    reason: "", cost: "", odometer_km: "", performed_by: "", tread_depth_mm: "", notes: "",
  });

  const activeTires = tires.filter((t: any) => t.status === "active");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tire_changes").insert({
        organization_id: organizationId!,
        tire_id: form.tire_id,
        vehicle_id: form.vehicle_id,
        position: form.position,
        change_type: form.change_type,
        reason: form.reason || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        odometer_km: form.odometer_km ? parseInt(form.odometer_km) : null,
        performed_by: form.performed_by || null,
        tread_depth_mm: form.tread_depth_mm ? parseFloat(form.tread_depth_mm) : null,
        notes: form.notes || null,
        change_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tire change recorded");
      queryClient.invalidateQueries({ queryKey: ["tire-changes"] });
      queryClient.invalidateQueries({ queryKey: ["tire-inventory"] });
      onOpenChange(false);
      setForm({ tire_id: "", vehicle_id: "", position: "", change_type: "replacement", reason: "", cost: "", odometer_km: "", performed_by: "", tread_depth_mm: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Tire Change</DialogTitle>
          <DialogDescription>Log a tire rotation, replacement, or swap.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Tire *</Label>
              <Select value={form.tire_id} onValueChange={v => set("tire_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select tire" /></SelectTrigger>
                <SelectContent>{activeTires.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.brand} {t.model} — {t.size}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Position *</Label>
              <Select value={form.position} onValueChange={v => set("position", v)}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Change Type</Label>
              <Select value={form.change_type} onValueChange={v => set("change_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="rotation">Rotation</SelectItem>
                  <SelectItem value="swap">Swap</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Cost (ETB)</Label><Input type="number" value={form.cost} onChange={e => set("cost", e.target.value)} /></div>
            <div><Label>Odometer (km)</Label><Input type="number" value={form.odometer_km} onChange={e => set("odometer_km", e.target.value)} /></div>
            <div><Label>Tread Depth (mm)</Label><Input type="number" step="0.1" value={form.tread_depth_mm} onChange={e => set("tread_depth_mm", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Performed By</Label><Input value={form.performed_by} onChange={e => set("performed_by", e.target.value)} /></div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Worn, punctured, etc." /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.tire_id || !form.vehicle_id || !form.position || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Record Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
