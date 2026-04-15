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
import { useDrivers } from "@/hooks/useDrivers";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const NewClaimDialog = ({ open, onOpenChange }: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", accident_date: new Date().toISOString().split("T")[0],
    accident_location: "", description: "", damage_description: "",
    fault_determination: "", fault_party: "",
    estimated_repair_cost: "", claim_amount: "",
    police_report_number: "",
    third_party_name: "", third_party_vehicle: "", third_party_insurance: "", third_party_contact: "",
    repair_vendor: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("accident_claims").insert({
        organization_id: organizationId!,
        claim_number: claimNumber,
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id || null,
        accident_date: form.accident_date,
        accident_location: form.accident_location || null,
        description: form.description || null,
        damage_description: form.damage_description || null,
        fault_determination: form.fault_determination || null,
        fault_party: form.fault_party || null,
        estimated_repair_cost: form.estimated_repair_cost ? parseFloat(form.estimated_repair_cost) : null,
        claim_amount: form.claim_amount ? parseFloat(form.claim_amount) : null,
        police_report_number: form.police_report_number || null,
        third_party_name: form.third_party_name || null,
        third_party_vehicle: form.third_party_vehicle || null,
        third_party_insurance: form.third_party_insurance || null,
        third_party_contact: form.third_party_contact || null,
        repair_vendor: form.repair_vendor || null,
        status: "filed",
        filed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Claim filed successfully");
      queryClient.invalidateQueries({ queryKey: ["accident-claims"] });
      onOpenChange(false);
      setForm({ vehicle_id: "", driver_id: "", accident_date: new Date().toISOString().split("T")[0], accident_location: "", description: "", damage_description: "", fault_determination: "", fault_party: "", estimated_repair_cost: "", claim_amount: "", police_report_number: "", third_party_name: "", third_party_vehicle: "", third_party_insurance: "", third_party_contact: "", repair_vendor: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>File New Accident Claim</DialogTitle>
          <DialogDescription>Record accident details, damage, and third-party information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Basic Info */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-primary">Accident Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Vehicle *</Label>
                <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Driver</Label>
                <Select value={form.driver_id} onValueChange={v => set("driver_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Accident Date *</Label><Input type="date" value={form.accident_date} onChange={e => set("accident_date", e.target.value)} /></div>
              <div><Label>Location</Label><Input value={form.accident_location} onChange={e => set("accident_location", e.target.value)} placeholder="Accident location" /></div>
            </div>
            <div className="mt-3"><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="What happened..." rows={2} /></div>
            <div className="mt-3"><Label>Damage Description</Label><Textarea value={form.damage_description} onChange={e => set("damage_description", e.target.value)} placeholder="Describe the damage..." rows={2} /></div>
          </div>

          {/* Section 2: Fault & Costs */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-primary">Fault & Costs</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fault Determination</Label>
                <Select value={form.fault_determination} onValueChange={v => set("fault_determination", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own_fault">Own Fault</SelectItem>
                    <SelectItem value="third_party">Third Party</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Police Report #</Label><Input value={form.police_report_number} onChange={e => set("police_report_number", e.target.value)} /></div>
              <div><Label>Estimated Repair Cost (ETB)</Label><Input type="number" value={form.estimated_repair_cost} onChange={e => set("estimated_repair_cost", e.target.value)} /></div>
              <div><Label>Claim Amount (ETB)</Label><Input type="number" value={form.claim_amount} onChange={e => set("claim_amount", e.target.value)} /></div>
              <div><Label>Repair Vendor</Label><Input value={form.repair_vendor} onChange={e => set("repair_vendor", e.target.value)} placeholder="Vendor name" /></div>
            </div>
          </div>

          {/* Section 3: Third Party */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-primary">Third Party Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={form.third_party_name} onChange={e => set("third_party_name", e.target.value)} /></div>
              <div><Label>Contact</Label><Input value={form.third_party_contact} onChange={e => set("third_party_contact", e.target.value)} /></div>
              <div><Label>Vehicle</Label><Input value={form.third_party_vehicle} onChange={e => set("third_party_vehicle", e.target.value)} placeholder="Plate/description" /></div>
              <div><Label>Insurance</Label><Input value={form.third_party_insurance} onChange={e => set("third_party_insurance", e.target.value)} placeholder="Insurance company" /></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.vehicle_id || !form.accident_date || mutation.isPending}>
            {mutation.isPending ? "Filing..." : "File Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
