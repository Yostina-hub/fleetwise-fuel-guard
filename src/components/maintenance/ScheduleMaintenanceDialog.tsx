import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  AlertCircle,
  Bell,
  Car,
  Flag,
  Gauge,
  Loader2,
  Repeat,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { ValidatedField } from "@/components/forms/ValidatedField";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";
import { useScheduleMaintenanceValidation } from "./useScheduleMaintenanceValidation";
import { sanitizeNumeric } from "./scheduleMaintenanceValidation";

interface ScheduleMaintenanceDialogProps {
  trigger?: React.ReactNode;
  vehicleId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const initialFormState = (vehicleId?: string) => ({
  vehicle_id: vehicleId || "",
  service_type: "",
  interval_type: "mileage" as "mileage" | "hours" | "calendar",
  interval_value: 10000,
  priority: "medium" as "low" | "medium" | "high",
  reminder_days_before: 7,
  reminder_km_before: 500,
});

export function ScheduleMaintenanceDialog({
  trigger,
  vehicleId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ScheduleMaintenanceDialogProps) {
  const { createSchedule } = useMaintenanceSchedules();
  const { vehicles } = useVehicles();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [formData, setFormData] = useState(() => initialFormState(vehicleId));

  const validation = useScheduleMaintenanceValidation(formData);
  const { errors, markTouched, markAllTouched, validateAll, invalidCount, reset, submitAttempted } =
    validation;

  // Update vehicle_id when prop changes
  useEffect(() => {
    if (vehicleId) {
      setFormData((prev) => ({ ...prev, vehicle_id: vehicleId }));
    }
  }, [vehicleId]);

  // Reset validation state when dialog closes
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleSubmit = async () => {
    markAllTouched();
    if (!validateAll()) {
      toast.error(
        invalidCount === 1
          ? "Please fix 1 invalid field before saving"
          : `Please fix ${invalidCount} invalid fields before saving`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await createSchedule(formData);
      setOpen(false);
      setFormData(initialFormState(vehicleId));
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);

  const intervalLabel =
    formData.interval_type === "mileage"
      ? "Every (km)"
      : formData.interval_type === "hours"
        ? "Every (hours)"
        : "Every (days)";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Maintenance</DialogTitle>
          <DialogDescription>
            {vehicleId && selectedVehicle
              ? `Create a maintenance schedule for ${selectedVehicle.plate_number}`
              : "Create a recurring maintenance schedule for a vehicle."}
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

        <div className="space-y-4">
          {/* Vehicle Selection - only show if no vehicleId provided */}
          {!vehicleId && (
            <ValidatedField
              id="schedule-vehicle"
              label="Vehicle"
              icon={Car}
              required
              error={errors.vehicle_id}
              filled={!!formData.vehicle_id}
            >
              <Select
                value={formData.vehicle_id}
                onValueChange={(v) => {
                  setFormData({ ...formData, vehicle_id: v });
                  markTouched("vehicle_id");
                }}
              >
                <SelectTrigger id="schedule-vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ValidatedField>
          )}

          {/* Service Type */}
          <ValidatedField
            id="schedule-service-type"
            label="Service Type"
            icon={Wrench}
            required
            error={errors.service_type}
            filled={!!formData.service_type.trim()}
          >
            <Input
              id="schedule-service-type"
              value={formData.service_type}
              onChange={(e) =>
                setFormData({ ...formData, service_type: e.target.value })
              }
              onBlur={() => markTouched("service_type")}
              placeholder="e.g., Oil Change, Tire Rotation, Brake Inspection"
              maxLength={120}
            />
          </ValidatedField>

          {/* Interval Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <ValidatedField
              id="schedule-interval-type"
              label="Interval Type"
              icon={Repeat}
              required
              error={errors.interval_type}
              filled={!!formData.interval_type}
            >
              <Select
                value={formData.interval_type}
                onValueChange={(v) => {
                  setFormData({
                    ...formData,
                    interval_type: v as "mileage" | "hours" | "calendar",
                  });
                  markTouched("interval_type");
                }}
              >
                <SelectTrigger id="schedule-interval-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mileage">Mileage (km)</SelectItem>
                  <SelectItem value="hours">Engine Hours</SelectItem>
                  <SelectItem value="calendar">Calendar (days)</SelectItem>
                </SelectContent>
              </Select>
            </ValidatedField>

            <ValidatedField
              id="schedule-interval-value"
              label={intervalLabel}
              icon={Gauge}
              required
              error={errors.interval_value}
              filled={formData.interval_value > 0}
            >
              <Input
                id="schedule-interval-value"
                type="number"
                inputMode="numeric"
                value={formData.interval_value}
                onChange={(e) => {
                  const cleaned = sanitizeNumeric(e.target.value);
                  setFormData({
                    ...formData,
                    interval_value: cleaned === "" ? 0 : Number(cleaned),
                  });
                }}
                onBlur={() => markTouched("interval_value")}
                min={1}
              />
            </ValidatedField>
          </div>

          {/* Priority */}
          <ValidatedField
            id="schedule-priority"
            label="Priority"
            icon={Flag}
            required
            error={errors.priority}
            filled={!!formData.priority}
          >
            <Select
              value={formData.priority}
              onValueChange={(v) => {
                setFormData({
                  ...formData,
                  priority: v as "low" | "medium" | "high",
                });
                markTouched("priority");
              }}
            >
              <SelectTrigger id="schedule-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </ValidatedField>

          {/* Reminder thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <ValidatedField
              id="schedule-reminder-days"
              label="Remind (days before)"
              icon={Bell}
              error={errors.reminder_days_before}
              filled={formData.reminder_days_before > 0}
              hint={
                formData.interval_type === "calendar"
                  ? "Must be smaller than the calendar interval"
                  : undefined
              }
            >
              <Input
                id="schedule-reminder-days"
                type="number"
                inputMode="numeric"
                value={formData.reminder_days_before}
                onChange={(e) => {
                  const cleaned = sanitizeNumeric(e.target.value);
                  setFormData({
                    ...formData,
                    reminder_days_before: cleaned === "" ? 0 : Number(cleaned),
                  });
                }}
                onBlur={() => markTouched("reminder_days_before")}
                min={0}
                max={365}
              />
            </ValidatedField>

            <ValidatedField
              id="schedule-reminder-km"
              label="Remind (km before)"
              icon={Bell}
              error={errors.reminder_km_before}
              filled={formData.reminder_km_before > 0}
              hint={
                formData.interval_type === "mileage"
                  ? "Must be smaller than the mileage interval"
                  : undefined
              }
            >
              <Input
                id="schedule-reminder-km"
                type="number"
                inputMode="numeric"
                value={formData.reminder_km_before}
                onChange={(e) => {
                  const cleaned = sanitizeNumeric(e.target.value);
                  setFormData({
                    ...formData,
                    reminder_km_before: cleaned === "" ? 0 : Number(cleaned),
                  });
                }}
                onBlur={() => markTouched("reminder_km_before")}
                min={0}
                max={100000}
              />
            </ValidatedField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Schedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleMaintenanceDialog;
