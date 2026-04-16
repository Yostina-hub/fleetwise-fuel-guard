import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Gauge, Loader2, Car, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverId?: string;
  vehicleId?: string;
  vehiclePlate?: string;
}

const CHECKLIST_ITEMS = [
  { key: "tires", label: "Tires (pressure & tread)" },
  { key: "lights", label: "Headlights, indicators, brake lights" },
  { key: "brakes", label: "Brakes feel responsive" },
  { key: "fluids", label: "Oil / coolant / washer fluid OK" },
  { key: "mirrors", label: "Mirrors clean & adjusted" },
  { key: "seatbelts", label: "Seatbelts working" },
  { key: "fuel", label: "Sufficient fuel for the trip" },
  { key: "documents", label: "Vehicle documents on board" },
];

const DriverInspectionDialog = ({ open, onOpenChange, driverId, vehicleId, vehiclePlate }: Props) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [odometer, setOdometer] = useState("");
  const [condition, setCondition] = useState("good");
  const [defects, setDefects] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.key, true]))
  );

  const failedItems = CHECKLIST_ITEMS.filter(i => !checks[i.key]);
  const safe = failedItems.length === 0 && !defects.trim();

  const handleSubmit = async () => {
    if (!organizationId || !vehicleId || !driverId) {
      toast.error("Missing driver or vehicle info");
      return;
    }
    setSubmitting(true);
    try {
      const checklist = CHECKLIST_ITEMS.reduce<Record<string, any>>((acc, item) => {
        acc[item.key] = { label: item.label, passed: !!checks[item.key] };
        return acc;
      }, {});

      const defectItems = [
        ...failedItems.map(i => i.label),
        ...(defects.trim() ? [defects.trim()] : []),
      ];

      const { error } = await (supabase as any).from("vehicle_inspections").insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        inspection_type: "pre_trip",
        inspection_date: new Date().toISOString(),
        odometer_km: odometer ? Number(odometer) : null,
        status: safe ? "passed" : "pending_repair",
        certified_safe: safe,
        overall_condition: condition,
        checklist_data: checklist,
        defects_found: defectItems.length ? { items: defectItems } : null,
        mechanic_notes: notes || null,
      });
      if (error) throw error;

      toast.success(safe ? "Pre-trip inspection passed" : "Inspection submitted with defects");
      queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
      onOpenChange(false);
      setOdometer(""); setDefects(""); setNotes(""); setCondition("good");
      setChecks(Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.key, true])));
    } catch (e: any) {
      toast.error(e.message || "Failed to submit inspection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-success" /> Pre-Trip Inspection
          </DialogTitle>
          <DialogDescription>
            {vehiclePlate ? `Inspecting ${vehiclePlate}` : "No vehicle assigned"}
          </DialogDescription>
        </DialogHeader>

        {vehicleId ? (
          <div className="space-y-4">
            <div>
              <Label>Current Odometer (km)</Label>
              <Input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="e.g. 125,000" />
            </div>

            <div className="space-y-2">
              <Label>Checklist</Label>
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                {CHECKLIST_ITEMS.map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`chk-${item.key}`}
                      checked={!!checks[item.key]}
                      onCheckedChange={(v) => setChecks(prev => ({ ...prev, [item.key]: !!v }))}
                    />
                    <label htmlFor={`chk-${item.key}`} className="text-sm cursor-pointer flex-1">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Other Defects (if any)</Label>
              <Textarea value={defects} rows={2} onChange={e => setDefects(e.target.value)}
                placeholder="Describe any other issues found" />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes" />
            </div>

            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
              safe ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            }`}>
              {safe ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {safe ? "Vehicle is safe for trip" : `${failedItems.length} item(s) need attention — will create repair work order`}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
                Submit Inspection
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No vehicle assigned to you.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DriverInspectionDialog;
