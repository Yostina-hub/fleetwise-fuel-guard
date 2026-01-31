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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";

interface ScheduleMaintenanceDialogProps {
  trigger?: React.ReactNode;
  vehicleId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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

  const [formData, setFormData] = useState({
    vehicle_id: vehicleId || "",
    service_type: "",
    interval_type: "mileage" as "mileage" | "hours" | "calendar",
    interval_value: 10000,
    priority: "medium" as "low" | "medium" | "high",
    reminder_days_before: 7,
    reminder_km_before: 500,
  });

  // Update vehicle_id when prop changes
  useEffect(() => {
    if (vehicleId) {
      setFormData((prev) => ({ ...prev, vehicle_id: vehicleId }));
    }
  }, [vehicleId]);

  const handleSubmit = async () => {
    if (!formData.vehicle_id || !formData.service_type) return;

    setIsSubmitting(true);
    try {
      await createSchedule(formData);
      setOpen(false);
      // Reset form
      setFormData({
        vehicle_id: vehicleId || "",
        service_type: "",
        interval_type: "mileage",
        interval_value: 10000,
        priority: "medium",
        reminder_days_before: 7,
        reminder_km_before: 500,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);

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

        <div className="space-y-4">
          {/* Vehicle Selection - only show if no vehicleId provided */}
          {!vehicleId && (
            <div>
              <Label htmlFor="schedule-vehicle">Vehicle</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, vehicle_id: v })
                }
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
            </div>
          )}

          {/* Service Type */}
          <div>
            <Label htmlFor="schedule-service-type">Service Type</Label>
            <Input
              id="schedule-service-type"
              value={formData.service_type}
              onChange={(e) =>
                setFormData({ ...formData, service_type: e.target.value })
              }
              placeholder="e.g., Oil Change, Tire Rotation, Brake Inspection"
            />
          </div>

          {/* Interval Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schedule-interval-type">Interval Type</Label>
              <Select
                value={formData.interval_type}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    interval_type: v as "mileage" | "hours" | "calendar",
                  })
                }
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
            </div>
            <div>
              <Label htmlFor="schedule-interval-value">
                {formData.interval_type === "mileage"
                  ? "Every (km)"
                  : formData.interval_type === "hours"
                  ? "Every (hours)"
                  : "Every (days)"}
              </Label>
              <Input
                id="schedule-interval-value"
                type="number"
                value={formData.interval_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    interval_value: Number(e.target.value),
                  })
                }
                min={1}
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="schedule-priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  priority: v as "low" | "medium" | "high",
                })
              }
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.vehicle_id || !formData.service_type || isSubmitting
            }
          >
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
