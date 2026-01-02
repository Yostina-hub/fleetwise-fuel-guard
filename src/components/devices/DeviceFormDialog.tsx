import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DeviceFormData {
  vehicle_id: string;
  imei: string;
  tracker_model: string;
  serial_number: string;
  sim_msisdn: string;
  sim_iccid: string;
  apn: string;
  status: "active" | "inactive" | "maintenance";
  firmware_version: string;
  install_date: string;
  notes: string;
}

interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
}

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDevice: any | null;
  devices: any[] | undefined;
  vehicles: Vehicle[] | undefined;
  onSubmit: (data: DeviceFormData) => void;
  isSubmitting?: boolean;
}

const initialFormData: DeviceFormData = {
  vehicle_id: "",
  imei: "",
  tracker_model: "",
  serial_number: "",
  sim_msisdn: "",
  sim_iccid: "",
  apn: "",
  status: "active",
  firmware_version: "",
  install_date: "",
  notes: "",
};

export const DeviceFormDialog = ({
  open,
  onOpenChange,
  editingDevice,
  devices,
  vehicles,
  onSubmit,
  isSubmitting = false,
}: DeviceFormDialogProps) => {
  const [formData, setFormData] = useState<DeviceFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or editing device changes
  useEffect(() => {
    if (open && editingDevice) {
      setFormData({
        vehicle_id: editingDevice.vehicle_id || "",
        imei: editingDevice.imei || "",
        tracker_model: editingDevice.tracker_model || "",
        serial_number: editingDevice.serial_number || "",
        sim_msisdn: editingDevice.sim_msisdn || "",
        sim_iccid: editingDevice.sim_iccid || "",
        apn: editingDevice.apn || "",
        status: editingDevice.status || "active",
        firmware_version: editingDevice.firmware_version || "",
        install_date: editingDevice.install_date || "",
        notes: editingDevice.notes || "",
      });
      setFormErrors({});
    } else if (!open) {
      setFormData(initialFormData);
      setFormErrors({});
    }
  }, [open, editingDevice]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.imei.trim()) {
      errors.imei = "IMEI is required";
    } else if (!/^\d{15}$/.test(formData.imei.trim())) {
      errors.imei = "IMEI must be exactly 15 digits";
    } else {
      const existingDevice = devices?.find(d => 
        d.imei === formData.imei.trim() && d.id !== editingDevice?.id
      );
      if (existingDevice) {
        errors.imei = "A device with this IMEI already exists";
      }
    }
    
    if (!formData.tracker_model.trim()) {
      errors.tracker_model = "Tracker model is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.imei, formData.tracker_model, devices, editingDevice]);

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Get available vehicles (not already assigned to another device)
  const availableVehicles = useMemo(() => {
    const assignedVehicleIds = devices
      ?.filter(d => d.vehicle_id && d.id !== editingDevice?.id)
      .map(d => d.vehicle_id) || [];
    return vehicles?.filter(v => !assignedVehicleIds.includes(v.id)) || [];
  }, [vehicles, devices, editingDevice]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDevice ? "Edit" : "Add"} Device</DialogTitle>
          <DialogDescription>
            Configure GPS tracker device with SIM card and connection details
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle</Label>
            <Select
              value={formData.vehicle_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, vehicle_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vehicle assigned</SelectItem>
                {availableVehicles?.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
                {/* Show currently assigned vehicle when editing */}
                {editingDevice?.vehicle_id && !availableVehicles?.find(v => v.id === editingDevice.vehicle_id) && (
                  <SelectItem key={editingDevice.vehicle_id} value={editingDevice.vehicle_id}>
                    {editingDevice.vehicles?.plate_number} (Current)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "inactive" | "maintenance") => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imei">IMEI Number *</Label>
            <Input
              id="imei"
              value={formData.imei}
              onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
              placeholder="355442200988256"
              className={formErrors.imei ? "border-destructive" : ""}
            />
            {formErrors.imei && (
              <p className="text-xs text-destructive">{formErrors.imei}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracker_model">Tracker Model *</Label>
            <Input
              id="tracker_model"
              value={formData.tracker_model}
              onChange={(e) => setFormData({ ...formData, tracker_model: e.target.value })}
              placeholder="YTWL CA100F Speed Governor"
              className={formErrors.tracker_model ? "border-destructive" : ""}
            />
            {formErrors.tracker_model && (
              <p className="text-xs text-destructive">{formErrors.tracker_model}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="SN123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmware_version">Firmware Version</Label>
            <Input
              id="firmware_version"
              value={formData.firmware_version}
              onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
              placeholder="v2.1.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim_msisdn">SIM Card Number (MSISDN)</Label>
            <Input
              id="sim_msisdn"
              value={formData.sim_msisdn}
              onChange={(e) => setFormData({ ...formData, sim_msisdn: e.target.value })}
              placeholder="+251980888379"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim_iccid">SIM ICCID</Label>
            <Input
              id="sim_iccid"
              value={formData.sim_iccid}
              onChange={(e) => setFormData({ ...formData, sim_iccid: e.target.value })}
              placeholder="89251234567890123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apn">APN</Label>
            <Input
              id="apn"
              value={formData.apn}
              onChange={(e) => setFormData({ ...formData, apn: e.target.value })}
              placeholder="internet.ethionet.et"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="install_date">Install Date</Label>
            <Input
              id="install_date"
              type="date"
              value={formData.install_date}
              onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional device notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {editingDevice ? "Update" : "Create"} Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};