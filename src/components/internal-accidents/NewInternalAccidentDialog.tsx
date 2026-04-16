import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInternalAccidentWorkflow } from "@/hooks/useInternalAccidentWorkflow";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function NewInternalAccidentDialog({ open, onOpenChange }: Props) {
  const { organizationId } = useOrganization();
  const { createClaim } = useInternalAccidentWorkflow();
  const [form, setForm] = useState({
    vehicle_id: "",
    driver_id: "",
    supervisor_name: "",
    accident_date: new Date().toISOString().slice(0, 16),
    accident_location: "",
    description: "",
    damage_description: "",
    report_document_url: "",
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId!).limit(500);
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-list", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, first_name, last_name").eq("organization_id", organizationId!).limit(500);
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const submit = async () => {
    if (!form.vehicle_id || !form.accident_date) return;
    await createClaim.mutateAsync({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || undefined,
      supervisor_name: form.supervisor_name || undefined,
      accident_date: new Date(form.accident_date).toISOString(),
      accident_location: form.accident_location || undefined,
      description: form.description || undefined,
      damage_description: form.damage_description || undefined,
      report_document_url: form.report_document_url || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Report Vehicle Accident (Internal)</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">FMG-FMG 18 — Driver reports accident to immediate supervisor with letter/form/template.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Vehicle *</Label>
            <Select value={form.vehicle_id} onValueChange={(v) => setForm(f => ({ ...f, vehicle_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Driver</Label>
            <Select value={form.driver_id} onValueChange={(v) => setForm(f => ({ ...f, driver_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>{drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Immediate supervisor</Label>
            <Input value={form.supervisor_name} onChange={e => setForm(f => ({ ...f, supervisor_name: e.target.value }))} />
          </div>
          <div>
            <Label>Accident date/time *</Label>
            <Input type="datetime-local" value={form.accident_date} onChange={e => setForm(f => ({ ...f, accident_date: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Accident location</Label>
            <Input value={form.accident_location} onChange={e => setForm(f => ({ ...f, accident_location: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>What happened</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Damage description</Label>
            <Textarea value={form.damage_description} onChange={e => setForm(f => ({ ...f, damage_description: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Report document URL (letter/form/template)</Label>
            <Input value={form.report_document_url} onChange={e => setForm(f => ({ ...f, report_document_url: e.target.value }))} placeholder="Link to uploaded report" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createClaim.isPending || !form.vehicle_id}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
