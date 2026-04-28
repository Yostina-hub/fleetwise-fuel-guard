import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Truck,
  User,
  ClipboardList,
  Gauge,
  FileText,
  StickyNote,
} from "lucide-react";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import PhotoUploader from "@/components/driver-portal/PhotoUploader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ValidatedField } from "@/components/forms/ValidatedField";
import { useInspectionValidation } from "./useInspectionValidation";
import { sanitizeNumeric } from "./inspectionValidation";
import { cn } from "@/lib/utils";

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
  lockVehicle?: boolean;
  lockDriver?: boolean;
  enablePhotos?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: InspectionPrefill;
  invalidateKeys?: string[][];
  onSubmitted?: (payload: { inspection_id?: string; safe: boolean; status: string }) => void;
  embedded?: boolean;
}

const buildState = (prefill?: InspectionPrefill) => ({
  vehicle_id: prefill?.vehicle_id || '',
  driver_id: prefill?.driver_id || '',
  inspection_type: (prefill?.inspection_type as any) || 'pre_trip',
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
  embedded,
}: Props) => {
  const { createInspection } = useMaintenanceSchedules();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState(() => buildState(prefill));
  const [photos, setPhotos] = useState<string[]>([]);

  const failedItems = useMemo(() => {
    const out: string[] = [];
    Object.entries(state.checklist_data).forEach(([_cat, items]) => {
      Object.entries(items).forEach(([item, passed]) => { if (!passed) out.push(item); });
    });
    return out;
  }, [state.checklist_data]);
  const hasFailures = failedItems.length > 0 || !!state.defects_text.trim();
  const safe = !hasFailures && state.certified_safe;

  const validation = useInspectionValidation({
    vehicle_id: state.vehicle_id,
    driver_id: state.driver_id || undefined,
    inspection_type: state.inspection_type,
    odometer_km: state.odometer_km || undefined,
    defects_text: state.defects_text,
    mechanic_notes: state.mechanic_notes,
    certified_safe: state.certified_safe,
    has_failures: failedItems.length > 0,
  });

  useEffect(() => {
    if (open || embedded) {
      setState(buildState(prefill));
      setPhotos([]);
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, embedded, prefill?.vehicle_id, prefill?.driver_id, prefill?.inspection_type]);

  const handleChecklistChange = (category: string, item: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      checklist_data: {
        ...prev.checklist_data,
        [category]: { ...(prev.checklist_data[category] || {}), [item]: checked },
      },
    }));
  };

  const lockVehicle = !!prefill?.lockVehicle;
  const lockDriver = !!prefill?.lockDriver;

  const handleSubmit = async () => {
    validation.markAllTouched();
    if (!validation.validateAll()) {
      toast.error(`Please fix ${validation.invalidCount} field${validation.invalidCount === 1 ? "" : "s"} before submitting`);
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

  const { errors, markTouched, invalidCount, submitAttempted } = validation;
  const showSummary = submitAttempted && invalidCount > 0;

  const body = (
    <>
      {!embedded && (
        <DialogHeader>
          <DialogTitle>New Vehicle Inspection</DialogTitle>
          <DialogDescription>
            Complete a pre-trip or post-trip vehicle inspection checklist.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-6">
        {showSummary && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive animate-fade-in"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {invalidCount} field{invalidCount === 1 ? "" : "s"} need{invalidCount === 1 ? "s" : ""} attention
              </p>
              <p className="text-xs opacity-90">Resolve the highlighted fields below to submit the inspection.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <ValidatedField
            id="insp-vehicle"
            label="Vehicle"
            icon={Truck}
            required
            error={errors.vehicle_id}
            filled={!!state.vehicle_id}
          >
            <Select
              value={state.vehicle_id}
              onValueChange={v => { setState(s => ({ ...s, vehicle_id: v })); markTouched("vehicle_id"); }}
              disabled={lockVehicle}
            >
              <SelectTrigger id="insp-vehicle" onBlur={() => markTouched("vehicle_id")}>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate_number} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField
            id="insp-inspector"
            label="Inspector"
            icon={User}
            error={errors.driver_id}
            filled={!!state.driver_id}
            hint="Optional"
          >
            <Select
              value={state.driver_id}
              onValueChange={v => { setState(s => ({ ...s, driver_id: v })); markTouched("driver_id"); }}
              disabled={lockDriver}
            >
              <SelectTrigger id="insp-inspector" onBlur={() => markTouched("driver_id")}>
                <SelectValue placeholder="Select inspector" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ValidatedField
            id="insp-type"
            label="Inspection Type"
            icon={ClipboardList}
            required
            error={errors.inspection_type}
            filled={!!state.inspection_type}
          >
            <Select
              value={state.inspection_type}
              onValueChange={v => { setState(s => ({ ...s, inspection_type: v as any })); markTouched("inspection_type"); }}
            >
              <SelectTrigger id="insp-type" onBlur={() => markTouched("inspection_type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_trip">Pre-Trip</SelectItem>
                <SelectItem value="post_trip">Post-Trip</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField
            id="insp-odometer"
            label="Odometer (km)"
            icon={Gauge}
            error={errors.odometer_km}
            filled={state.odometer_km > 0}
            hint="Optional"
          >
            <Input
              id="insp-odometer"
              type="number"
              inputMode="numeric"
              min={0}
              value={state.odometer_km || ''}
              onChange={e => {
                const clean = sanitizeNumeric(e.target.value);
                setState(s => ({ ...s, odometer_km: clean ? Number(clean) : 0 }));
              }}
              onBlur={() => markTouched("odometer_km")}
            />
          </ValidatedField>
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
                  {category.items.map(item => {
                    const checked = state.checklist_data[category.key]?.[item] ?? true;
                    return (
                      <div
                        key={item}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1 transition-colors",
                          !checked && "bg-warning/10",
                        )}
                      >
                        <Checkbox
                          id={`${category.key}-${item}`}
                          checked={checked}
                          onCheckedChange={(v) => handleChecklistChange(category.key, item, !!v)}
                        />
                        <Label htmlFor={`${category.key}-${item}`} className={cn(
                          "text-sm font-normal cursor-pointer",
                          !checked && "text-warning"
                        )}>
                          {item}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <ValidatedField
          id="insp-defects"
          label="Other Defects (if any)"
          icon={FileText}
          error={errors.defects_text}
          filled={!!state.defects_text.trim()}
          hint={failedItems.length > 0 ? "Describe failed items above for the maintenance team" : undefined}
        >
          <Textarea
            id="insp-defects"
            value={state.defects_text}
            onChange={e => setState(s => ({ ...s, defects_text: e.target.value }))}
            onBlur={() => markTouched("defects_text")}
            placeholder="Describe any other issues found..."
            rows={2}
            maxLength={1000}
          />
        </ValidatedField>

        <ValidatedField
          id="insp-notes"
          label="Notes"
          icon={StickyNote}
          error={errors.mechanic_notes}
          filled={!!state.mechanic_notes.trim()}
        >
          <Textarea
            id="insp-notes"
            value={state.mechanic_notes}
            onChange={e => setState(s => ({ ...s, mechanic_notes: e.target.value }))}
            onBlur={() => markTouched("mechanic_notes")}
            placeholder="Optional notes"
            rows={2}
            maxLength={1000}
          />
        </ValidatedField>

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
            onCheckedChange={(checked) => { setState(s => ({ ...s, certified_safe: !!checked })); markTouched("certified_safe"); }}
          />
          <Label htmlFor="certified_safe" className="cursor-pointer">
            I certify this vehicle is safe to operate
          </Label>
        </div>
      </div>

      <div className={embedded ? "flex justify-end gap-2 pt-4 border-t mt-4" : "hidden"}>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Inspection
        </Button>
      </div>

      {!embedded && (
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Inspection
          </Button>
        </DialogFooter>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleInspectionFormDialog;
