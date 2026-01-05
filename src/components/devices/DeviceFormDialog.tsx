import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Info, Radio } from "lucide-react";

interface DeviceFormData {
  vehicle_id: string;
  protocol_id: string;
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

interface Protocol {
  id: string;
  vendor: string;
  protocol_name: string;
  version: string | null;
  is_active: boolean | null;
}

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDevice: any | null;
  devices: any[] | undefined;
  vehicles: Vehicle[] | undefined;
  protocols?: Protocol[] | undefined;
  onSubmit: (data: DeviceFormData) => void;
  isSubmitting?: boolean;
}

const initialFormData: DeviceFormData = {
  vehicle_id: "",
  protocol_id: "",
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
  protocols,
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
        protocol_id: editingDevice.protocol_id || "",
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

    // Check for duplicate SIM phone number
    if (formData.sim_msisdn.trim()) {
      const existingPhone = devices?.find(d => 
        d.sim_msisdn === formData.sim_msisdn.trim() && d.id !== editingDevice?.id
      );
      if (existingPhone) {
        errors.sim_msisdn = "A device with this phone number already exists";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.imei, formData.tracker_model, formData.sim_msisdn, devices, editingDevice]);

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

  // Get active protocols
  const activeProtocols = useMemo(() => {
    return protocols?.filter(p => p.is_active !== false) || [];
  }, [protocols]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDevice ? "Edit" : "Add"} Device</DialogTitle>
          <DialogDescription>
            Configure GPS tracker device with SIM card and connection details
          </DialogDescription>
        </DialogHeader>
        
        {/* Automatic Configuration Info Box */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 my-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <h4 className="font-medium text-emerald-600 dark:text-emerald-400">Automatic Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Our server is ready to receive data from your device. Configure your device to send data to:
              </p>
              <div className="mt-2 p-2 bg-background/50 rounded border text-xs font-mono">
                <div><span className="text-muted-foreground">Server:</span> kkmjwmyqakprqdhrlsoz.supabase.co</div>
                <div><span className="text-muted-foreground">Port:</span> 443</div>
                <div><span className="text-muted-foreground">Path:</span> /functions/v1/gps-data-receiver</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle Assignment</Label>
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
            <p className="text-xs text-muted-foreground">Link this device to a vehicle in your fleet</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Device Status</Label>
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
            <p className="text-xs text-muted-foreground">Current operational status of the device</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imei" className="flex items-center gap-2">
              IMEI Number *
              <span className="text-xs font-normal text-muted-foreground">(15 digits)</span>
            </Label>
            <Input
              id="imei"
              value={formData.imei}
              onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
              placeholder="355442200988256"
              maxLength={15}
              className={formErrors.imei ? "border-destructive" : ""}
            />
            {formErrors.imei ? (
              <p className="text-xs text-destructive">{formErrors.imei}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Find this on your device label or box</p>
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
            {formErrors.tracker_model ? (
              <p className="text-xs text-destructive">{formErrors.tracker_model}</p>
            ) : (
              <p className="text-xs text-muted-foreground">e.g., YTWL CA100F, GT06N, TK103</p>
            )}
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="protocol" className="flex items-center gap-2">
              <Radio className="h-4 w-4" aria-hidden="true" />
              Device Protocol
            </Label>
            <Select
              value={formData.protocol_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, protocol_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Auto-detect protocol</SelectItem>
                {activeProtocols?.map((protocol) => (
                  <SelectItem key={protocol.id} value={protocol.id}>
                    <div className="flex items-center gap-2">
                      <span>{protocol.vendor}</span>
                      <Badge variant="outline" className="text-xs">
                        {protocol.protocol_name}
                      </Badge>
                      {protocol.version && (
                        <span className="text-xs text-muted-foreground">v{protocol.version}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a configured protocol decoder or leave as auto-detect
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="SN123456789"
            />
            <p className="text-xs text-muted-foreground">Device serial number for identification</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmware_version">Firmware Version</Label>
            <Input
              id="firmware_version"
              value={formData.firmware_version}
              onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
              placeholder="v2.1.5"
            />
            <p className="text-xs text-muted-foreground">Current device firmware version</p>
          </div>

          <div className="col-span-2 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <Info className="h-4 w-4" aria-hidden="true" />
              SIM Card Information
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim_msisdn">SIM Card Number (MSISDN)</Label>
            <Input
              id="sim_msisdn"
              value={formData.sim_msisdn}
              onChange={(e) => setFormData({ ...formData, sim_msisdn: e.target.value })}
              placeholder="+251980888379"
              className={formErrors.sim_msisdn ? "border-destructive" : ""}
            />
            {formErrors.sim_msisdn ? (
              <p className="text-xs text-destructive">{formErrors.sim_msisdn}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Phone number of the SIM card</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim_iccid" className="flex items-center gap-2">
              SIM ICCID
              <span className="text-xs font-normal text-muted-foreground">(19-20 digits)</span>
            </Label>
            <Input
              id="sim_iccid"
              value={formData.sim_iccid}
              onChange={(e) => setFormData({ ...formData, sim_iccid: e.target.value })}
              placeholder="89251234567890123456"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">Printed on the SIM card itself</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apn">APN (Access Point Name)</Label>
            <Input
              id="apn"
              value={formData.apn}
              onChange={(e) => setFormData({ ...formData, apn: e.target.value })}
              placeholder="internet.ethionet.et"
            />
            <p className="text-xs text-muted-foreground">Network APN for data connection</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="install_date">Install Date</Label>
            <Input
              id="install_date"
              type="date"
              value={formData.install_date}
              onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">When the device was installed</p>
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional device notes, installation details, special configurations..."
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
