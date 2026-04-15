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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const NewPolicyDialog = ({ open, onOpenChange }: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    vehicle_id: "", policy_number: "", provider: "", insurance_type: "comprehensive",
    start_date: "", expiry_date: "", premium_amount: "", coverage_amount: "",
    auto_renewal: false, notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vehicle_insurance").insert({
        organization_id: organizationId!,
        vehicle_id: form.vehicle_id,
        policy_number: form.policy_number,
        provider: form.provider,
        insurance_type: form.insurance_type || null,
        start_date: form.start_date,
        expiry_date: form.expiry_date,
        premium_amount: form.premium_amount ? parseFloat(form.premium_amount) : null,
        coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
        auto_renewal: form.auto_renewal,
        notes: form.notes || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insurance policy added");
      queryClient.invalidateQueries({ queryKey: ["insurance-policies"] });
      onOpenChange(false);
      setForm({ vehicle_id: "", policy_number: "", provider: "", insurance_type: "comprehensive", start_date: "", expiry_date: "", premium_amount: "", coverage_amount: "", auto_renewal: false, notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Insurance Policy</DialogTitle>
          <DialogDescription>Register a new insurance policy for a vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Policy Number *</Label><Input value={form.policy_number} onChange={e => set("policy_number", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Provider *</Label><Input value={form.provider} onChange={e => set("provider", e.target.value)} placeholder="Insurance company" /></div>
            <div><Label>Coverage Type</Label>
              <Select value={form.insurance_type} onValueChange={v => set("insurance_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                  <SelectItem value="collision">Collision</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
            <div><Label>Expiry Date *</Label><Input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Premium (ETB)</Label><Input type="number" value={form.premium_amount} onChange={e => set("premium_amount", e.target.value)} /></div>
            <div><Label>Coverage Amount (ETB)</Label><Input type="number" value={form.coverage_amount} onChange={e => set("coverage_amount", e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.auto_renewal} onChange={e => set("auto_renewal", e.target.checked)} className="rounded" />
            <Label className="cursor-pointer">Auto-renewal</Label>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.vehicle_id || !form.policy_number || !form.provider || !form.start_date || !form.expiry_date || mutation.isPending}>
            {mutation.isPending ? "Adding..." : "Add Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
