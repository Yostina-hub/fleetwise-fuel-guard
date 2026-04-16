import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThirdPartyClaimWorkflow } from "@/hooks/useThirdPartyClaimWorkflow";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function NewThirdPartyClaimDialog({ open, onOpenChange }: Props) {
  const { organizationId } = useOrganization();
  const { createClaim } = useThirdPartyClaimWorkflow();
  const [form, setForm] = useState({
    vehicle_id: "",
    driver_id: "",
    accident_date: new Date().toISOString().slice(0, 16),
    accident_location: "",
    description: "",
    third_party_name: "",
    third_party_vehicle: "",
    third_party_insurance: "",
    third_party_contact: "",
    police_report_number: "",
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
      ...form,
      driver_id: form.driver_id || undefined,
      accident_date: new Date(form.accident_date).toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Third-Party Fault Claim</DialogTitle></DialogHeader>
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
            <Label>Accident date/time *</Label>
            <Input type="datetime-local" value={form.accident_date} onChange={e => setForm(f => ({ ...f, accident_date: e.target.value }))} />
          </div>
          <div>
            <Label>Police report #</Label>
            <Input value={form.police_report_number} onChange={e => setForm(f => ({ ...f, police_report_number: e.target.value }))} placeholder="If obtained" />
          </div>
          <div className="col-span-2">
            <Label>Accident location</Label>
            <Input value={form.accident_location} onChange={e => setForm(f => ({ ...f, accident_location: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="col-span-2 border-t pt-3 mt-2">
            <p className="text-sm font-semibold mb-2">Third party information</p>
          </div>
          <div>
            <Label>Third party name</Label>
            <Input value={form.third_party_name} onChange={e => setForm(f => ({ ...f, third_party_name: e.target.value }))} />
          </div>
          <div>
            <Label>Third party vehicle</Label>
            <Input value={form.third_party_vehicle} onChange={e => setForm(f => ({ ...f, third_party_vehicle: e.target.value }))} />
          </div>
          <div>
            <Label>Third party insurance</Label>
            <Input value={form.third_party_insurance} onChange={e => setForm(f => ({ ...f, third_party_insurance: e.target.value }))} />
          </div>
          <div>
            <Label>Third party contact</Label>
            <Input value={form.third_party_contact} onChange={e => setForm(f => ({ ...f, third_party_contact: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createClaim.isPending || !form.vehicle_id}>Create claim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
