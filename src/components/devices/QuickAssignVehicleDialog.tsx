import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
}

interface QuickAssignVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: any | null;
  devices: any[] | undefined;
  vehicles: Vehicle[] | undefined;
  onConfirm: (deviceId: string, vehicleId: string | null) => void;
}

export const QuickAssignVehicleDialog = ({
  open,
  onOpenChange,
  device,
  devices,
  vehicles,
  onConfirm,
}: QuickAssignVehicleDialogProps) => {
  const [assignVehicleId, setAssignVehicleId] = useState("none");

  // Reset when dialog opens
  useEffect(() => {
    if (open && device) {
      setAssignVehicleId(device.vehicle_id || "none");
    }
  }, [open, device]);

  // Get available vehicles (not already assigned to another device)
  const availableVehicles = useMemo(() => {
    const assignedVehicleIds = devices
      ?.filter(d => d.vehicle_id && d.id !== device?.id)
      .map(d => d.vehicle_id) || [];
    return vehicles?.filter(v => !assignedVehicleIds.includes(v.id)) || [];
  }, [vehicles, devices, device]);

  const handleConfirm = () => {
    if (device) {
      onConfirm(device.id, assignVehicleId === "none" ? null : assignVehicleId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Vehicle to Device</DialogTitle>
          <DialogDescription>
            Assign a vehicle to device IMEI: <span className="font-mono">{device?.imei}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="assign-vehicle">Vehicle</Label>
          <Select
            value={assignVehicleId}
            onValueChange={setAssignVehicleId}
          >
            <SelectTrigger id="assign-vehicle">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No vehicle assigned</SelectItem>
              {availableVehicles?.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Assign Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};