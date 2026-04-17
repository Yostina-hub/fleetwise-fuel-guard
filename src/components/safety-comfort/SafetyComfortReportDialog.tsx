// Simple driver-facing Safety & Comfort report dialog used by the
// safety_comfort SOP intake. Mirrors the shape of other quick-intake forms
// (vehicle id, category, severity, location-on-vehicle, photos, description)
// and writes results into a workflow_instances row via the parent's onSubmitted.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Shield } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill?: Record<string, any>;
  onSubmitted?: (result?: Record<string, any>) => void;
}

const CATEGORY_OPTIONS = [
  { value: "safety_critical", label: "Safety — critical (brakes, seatbelt, lights, steering)" },
  { value: "safety_general",  label: "Safety — general (mirrors, wipers, horn)" },
  { value: "comfort_ac",      label: "Comfort — AC / heater" },
  { value: "comfort_seat",    label: "Comfort — seat / interior" },
  { value: "comfort_noise",   label: "Comfort — noise / vibration" },
  { value: "accessory",       label: "Accessory request (dashcam, sun film, etc.)" },
  { value: "other",           label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "low",      label: "Low — comfort only" },
  { value: "medium",   label: "Medium — minor safety" },
  { value: "high",     label: "High — affects safe operation" },
  { value: "critical", label: "Critical — vehicle must be grounded" },
];

export default function SafetyComfortReportDialog({ open, onOpenChange, prefill, onSubmitted }: Props) {
  const { organizationId } = useOrganization();
  const { user, profile } = useAuth() as any;
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState<string>(prefill?.vehicle_id || "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
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
    if (open && prefill?.vehicle_id) setVehicleId(prefill.vehicle_id);
  }, [open, prefill]);

  const handleSubmit = async () => {
    if (!organizationId || !vehicleId || !title || !category || !description) {
      toast.error("Vehicle, title, category and description are required");
      return;
    }
    setSaving(true);
    try {
      const { data: refRes, error: refErr } = await supabase.rpc("generate_workflow_reference", {
        _org_id: organizationId,
        _workflow_type: "safety_comfort",
      });
      if (refErr) throw refErr;

      const data = {
        title,
        category,
        severity,
        location_on_vehicle: location,
        description,
        reported_by_name: profile?.full_name || user?.email || "Unknown",
        intake_source: "driver_quick_form",
      };

      const { data: inst, error } = await supabase
        .from("workflow_instances")
        .insert({
          organization_id: organizationId,
          workflow_type: "safety_comfort",
          reference_number: refRes as string,
          title,
          description,
          current_stage: "report",
          current_lane: "driver",
          status: "in_progress",
          priority: severity === "critical" ? "high" : severity === "high" ? "high" : "normal",
          vehicle_id: vehicleId,
          created_by: user?.id || null,
          data,
          documents: [],
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("workflow_transitions").insert({
        organization_id: organizationId,
        instance_id: inst.id,
        workflow_type: "safety_comfort",
        from_stage: null,
        to_stage: "report",
        from_lane: null,
        to_lane: "driver",
        decision: "create",
        notes: "Filed via driver quick form",
        performed_by: user?.id || null,
        performed_by_name: profile?.full_name || user?.email || "Unknown",
        payload: data,
      });

      toast.success("Safety & Comfort report filed");
      onSubmitted?.({ workflow_instance_id: inst.id });
      onOpenChange(false);
      // reset
      setTitle(""); setCategory(""); setLocation(""); setDescription(""); setSeverity("medium");
    } catch (e: any) {
      toast.error(e?.message || "Failed to file report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Safety & Comfort Report
          </DialogTitle>
          <DialogDescription>
            Quickly report a safety or comfort issue with your vehicle. Critical issues are auto-escalated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Vehicle *</Label>
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
            <Label>Issue title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Driver seatbelt broken" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severity *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Location on vehicle</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Driver-side door, rear bumper" />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe the issue..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Filing…" : "File report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
