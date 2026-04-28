import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  Car,
  ClipboardCheck,
  FileText,
  ListChecks,
  UserRound,
} from "lucide-react";
import { toast as sonner } from "sonner";
import { ValidatedField } from "@/components/forms/ValidatedField";
import { useScheduleInspectionValidation } from "./useScheduleInspectionValidation";
import type { ScheduleInspectionValues } from "./scheduleInspectionValidation";

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

const todayISO = () => new Date().toISOString().slice(0, 10);

export const ScheduleInspectionDialog = ({
  open,
  onOpenChange,
  defaultType = "annual",
  defaultVehicleId,
}: Props) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || "");
  const [type, setType] = useState<ScheduleInspectionValues["inspection_type"]>(
    defaultType as ScheduleInspectionValues["inspection_type"],
  );
  const [date, setDate] = useState(todayISO());
  const [inspector, setInspector] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const validation = useScheduleInspectionValidation({
    vehicle_id: vehicleId,
    inspection_type: type,
    inspection_date: date,
    inspector,
    notes,
  });
  const {
    errors,
    markTouched,
    markAllTouched,
    validateAll,
    invalidCount,
    reset,
    submitAttempted,
  } = validation;

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
      setType(defaultType as ScheduleInspectionValues["inspection_type"]);
      setVehicleId(defaultVehicleId || "");
    } else {
      reset();
    }
  }, [open, defaultType, defaultVehicleId, reset]);

  const handleSave = async () => {
    if (!organizationId) {
      toast({ title: "No organization context", variant: "destructive" });
      return;
    }
    markAllTouched();
    if (!validateAll()) {
      sonner.error(
        invalidCount === 1
          ? "Please fix 1 invalid field before saving"
          : `Please fix ${invalidCount} invalid fields before saving`,
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("vehicle_inspections").insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      inspection_type: type,
      inspection_date: date,
      mechanic_notes:
        [inspector ? `Inspector: ${inspector}` : "", notes]
          .filter(Boolean)
          .join("\n") || null,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast({
        title: "Failed to schedule",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Inspection scheduled" });
    qc.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    onOpenChange(false);
    setInspector("");
    setNotes("");
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> Schedule Inspection
          </DialogTitle>
          <DialogDescription>
            Create a scheduled inspection record for a vehicle.
          </DialogDescription>
        </DialogHeader>

        {submitAttempted && invalidCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {invalidCount === 1
                ? "1 field needs your attention before saving."
                : `${invalidCount} fields need your attention before saving.`}
            </span>
          </div>
        )}

        <div className="space-y-4 py-2">
          <ValidatedField
            id="schedule-inspection-type"
            label="Inspection Type"
            icon={ListChecks}
            required
            error={errors.inspection_type}
            filled={!!type}
          >
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ScheduleInspectionValues["inspection_type"]);
                markTouched("inspection_type");
              }}
            >
              <SelectTrigger id="schedule-inspection-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField
            id="schedule-inspection-vehicle"
            label="Vehicle"
            icon={Car}
            required
            error={errors.vehicle_id}
            filled={!!vehicleId}
          >
            <Select
              value={vehicleId}
              onValueChange={(v) => {
                setVehicleId(v);
                markTouched("vehicle_id");
              }}
            >
              <SelectTrigger id="schedule-inspection-vehicle">
                <SelectValue placeholder="Select vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate_number} — {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField
            id="schedule-inspection-date"
            label="Inspection Date"
            icon={Calendar}
            required
            error={errors.inspection_date}
            filled={!!date}
            hint="Date must be today or in the future"
          >
            <Input
              id="schedule-inspection-date"
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => markTouched("inspection_date")}
            />
          </ValidatedField>

          <ValidatedField
            id="schedule-inspection-inspector"
            label="Inspector Name (optional)"
            icon={UserRound}
            error={errors.inspector}
            filled={!!inspector.trim()}
          >
            <Input
              id="schedule-inspection-inspector"
              placeholder="Inspector name..."
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              onBlur={() => markTouched("inspector")}
              maxLength={120}
            />
          </ValidatedField>

          <ValidatedField
            id="schedule-inspection-notes"
            label="Notes (optional)"
            icon={FileText}
            error={errors.notes}
            filled={!!notes.trim()}
          >
            <Textarea
              id="schedule-inspection-notes"
              placeholder="Notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => markTouched("notes")}
              rows={3}
              maxLength={1000}
            />
          </ValidatedField>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleInspectionDialog;
