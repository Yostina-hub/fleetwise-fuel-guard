import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultType?: string;
  defaultVehicleId?: string;
}

const TYPE_OPTIONS = [
  { value: "annual", label: "Annual Inspection" },
  { value: "pre_trip", label: "Pre-Trip Inspection" },
  { value: "post_trip", label: "Post-Trip Inspection" },
  { value: "internal", label: "Internal Inspection" },
  { value: "roadworthiness", label: "Roadworthiness" },
  { value: "routine", label: "Routine" },
];

export const ScheduleInspectionDialog = ({ open, onOpenChange, defaultType = "annual", defaultVehicleId }: Props) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || "");
  const [type, setType] = useState(defaultType);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [inspector, setInspector] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organizationId || !open) return;
    supabase
      .from("vehicles")
      .select("id, plate_number, make, model")
      .eq("organization_id", organizationId)
      .order("plate_number")
      .then(({ data }) => setVehicles(data || []));
  }, [organizationId, open]);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setVehicleId(defaultVehicleId || "");
    }
  }, [open, defaultType, defaultVehicleId]);

  const handleSave = async () => {
    if (!organizationId || !vehicleId) {
      toast({ title: "Vehicle required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicle_inspections").insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      inspection_type: type,
      inspection_date: date,
      mechanic_notes: [inspector ? `Inspector: ${inspector}` : "", notes].filter(Boolean).join("\n") || null,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to schedule", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Inspection scheduled" });
    qc.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    onOpenChange(false);
    setInspector("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Schedule Inspection</DialogTitle>
          <DialogDescription>Create a scheduled inspection record for a vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Inspection Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate_number} — {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Inspection Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Inspector Name (optional)</Label>
            <Input placeholder="Inspector name..." value={inspector} onChange={e => setInspector(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleInspectionDialog;
