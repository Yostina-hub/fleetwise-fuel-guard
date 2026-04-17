import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import PhotoUploader from "@/components/driver-portal/PhotoUploader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_INSPECTION_CHECKLIST = [
  { key: 'tires', label: 'Tires & Wheels', items: ['Tire pressure', 'Tread depth', 'Wheel nuts'] },
  { key: 'brakes', label: 'Brakes', items: ['Brake fluid level', 'Brake pads', 'Parking brake'] },
  { key: 'lights', label: 'Lights & Signals', items: ['Headlights', 'Tail lights', 'Turn signals', 'Hazard lights'] },
  { key: 'fluids', label: 'Fluids', items: ['Engine oil', 'Coolant', 'Windshield washer'] },
  { key: 'exterior', label: 'Exterior', items: ['Body damage', 'Mirrors', 'Wipers', 'Windows'] },
  { key: 'interior', label: 'Interior', items: ['Seatbelts', 'Horn', 'Dashboard warnings', 'Fire extinguisher'] },
];

export interface InspectionPrefill {
  vehicle_id?: string;
  driver_id?: string;
  inspection_type?: string;
  /** lock fields when caller already has the entity context (e.g. driver portal) */
  lockVehicle?: boolean;
  lockDriver?: boolean;
  /** show photo uploader (driver-portal pattern) */
  enablePhotos?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: InspectionPrefill;
  invalidateKeys?: string[][];
  /** Optional callback fired after a successful inspection submission. */
  onSubmitted?: (payload: { inspection_id?: string; safe: boolean; status: string }) => void;
}

const buildState = (prefill?: InspectionPrefill) => ({
  vehicle_id: prefill?.vehicle_id || '',
  driver_id: prefill?.driver_id || '',
  inspection_type: prefill?.inspection_type || 'pre_trip',
  odometer_km: 0,
  checklist_data: DEFAULT_INSPECTION_CHECKLIST.reduce<Record<string, Record<string, boolean>>>((acc, cat) => {
    acc[cat.key] = cat.items.reduce<Record<string, boolean>>((m, item) => { m[item] = true; return m; }, {});
    return acc;
  }, {}),
  defects_text: '',
  mechanic_notes: '',
  certified_safe: true,
});

export const VehicleInspectionFormDialog = ({
  open,
  onOpenChange,
  prefill,
  invalidateKeys = [["vehicle-inspections"]],
  onSubmitted,
}: Props) => {
  const { createInspection } = useMaintenanceSchedules();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState(() => buildState(prefill));
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setState(buildState(prefill));
      setPhotos([]);
    }
  }, [open, prefill?.vehicle_id, prefill?.driver_id, prefill?.inspection_type]);

  const handleChecklistChange = (category: string, item: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      checklist_data: {
        ...prev.checklist_data,
        [category]: { ...(prev.checklist_data[category] || {}), [item]: checked },
      },
    }));
  };

  const failedItems: string[] = [];
  Object.entries(state.checklist_data).forEach(([_cat, items]) => {
    Object.entries(items).forEach(([item, passed]) => { if (!passed) failedItems.push(item); });
  });
  const hasFailures = failedItems.length > 0 || !!state.defects_text.trim();
  const safe = !hasFailures && state.certified_safe;

  const lockVehicle = !!prefill?.lockVehicle;
  const lockDriver = !!prefill?.lockDriver;

  const handleSubmit = async () => {
    if (!state.vehicle_id) {
      toast.error("Vehicle is required");
      return;
    }
    setSubmitting(true);
    try {
      const defectItems = [
        ...failedItems,
        ...(state.defects_text.trim() ? [state.defects_text.trim()] : []),
      ];

      const inspection: any = {
        vehicle_id: state.vehicle_id,
        driver_id: state.driver_id || undefined,
        inspection_type: state.inspection_type,
        inspection_date: new Date().toISOString(),
        odometer_km: state.odometer_km || undefined,
        checklist_data: state.checklist_data,
        defects_found: defectItems.length ? { items: defectItems } : undefined,
        mechanic_notes: state.mechanic_notes || undefined,
        certified_safe: safe,
        status: hasFailures ? 'pending_repair' : 'passed',
      };
      if (prefill?.enablePhotos && photos.length) {
        inspection.photo_urls = photos;
      }

      const created = await createInspection(inspection);
      if (!created) throw new Error("Failed to create inspection");

      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      toast.success(safe ? "Inspection passed" : "Inspection submitted with defects");
      onSubmitted?.({ inspection_id: (created as any)?.id, safe, status: hasFailures ? 'pending_repair' : 'passed' });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit inspection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Vehicle Inspection</DialogTitle>
          <DialogDescription>
            Complete a pre-trip or post-trip vehicle inspection checklist.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insp-vehicle">Vehicle</Label>
              <Select
                value={state.vehicle_id}
                onValueChange={v => setState(s => ({ ...s, vehicle_id: v }))}
                disabled={lockVehicle}
              >
                <SelectTrigger id="insp-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="insp-inspector">Inspector</Label>
              <Select
                value={state.driver_id}
                onValueChange={v => setState(s => ({ ...s, driver_id: v }))}
                disabled={lockDriver}
              >
                <SelectTrigger id="insp-inspector"><SelectValue placeholder="Select inspector" /></SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insp-type">Inspection Type</Label>
              <Select
                value={state.inspection_type}
                onValueChange={v => setState(s => ({ ...s, inspection_type: v }))}
              >
                <SelectTrigger id="insp-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_trip">Pre-Trip</SelectItem>
                  <SelectItem value="post_trip">Post-Trip</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="insp-odometer">Odometer (km)</Label>
              <Input
                id="insp-odometer"
                type="number"
                value={state.odometer_km || ''}
                onChange={e => setState(s => ({ ...s, odometer_km: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Inspection Checklist</Label>
            {DEFAULT_INSPECTION_CHECKLIST.map(category => (
              <Card key={category.key}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{category.label}</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <Checkbox
                          id={`${category.key}-${item}`}
                          checked={state.checklist_data[category.key]?.[item] ?? true}
                          onCheckedChange={(checked) => handleChecklistChange(category.key, item, !!checked)}
                        />
                        <Label htmlFor={`${category.key}-${item}`} className="text-sm font-normal cursor-pointer">
                          {item}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Label htmlFor="insp-defects">Other Defects (if any)</Label>
            <Textarea
              id="insp-defects"
              value={state.defects_text}
              onChange={e => setState(s => ({ ...s, defects_text: e.target.value }))}
              placeholder="Describe any other issues found..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="insp-notes">Notes</Label>
            <Textarea
              id="insp-notes"
              value={state.mechanic_notes}
              onChange={e => setState(s => ({ ...s, mechanic_notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          {prefill?.enablePhotos && state.vehicle_id && (
            <div>
              <Label>Photos (optional)</Label>
              <PhotoUploader
                pathPrefix={`inspections/${state.vehicle_id}`}
                value={photos}
                onChange={setPhotos}
                max={5}
                label="Attach inspection photos"
              />
            </div>
          )}

          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            !hasFailures ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}>
            {!hasFailures ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {!hasFailures ? "Vehicle is safe for trip" : `${failedItems.length} item(s) need attention — will be flagged for repair`}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="certified_safe"
              checked={state.certified_safe}
              onCheckedChange={(checked) => setState(s => ({ ...s, certified_safe: !!checked }))}
            />
            <Label htmlFor="certified_safe" className="cursor-pointer">
              I certify this vehicle is safe to operate
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !state.vehicle_id}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleInspectionFormDialog;
