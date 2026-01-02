import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Info, ArrowLeft, ArrowRight, Smartphone, Fuel, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Popular device templates - pre-configured for plug-and-play
const deviceTemplates = [
  {
    id: "teltonika_fmb920",
    name: "Teltonika FMB920",
    type: "gps",
    vendor: "Teltonika",
    description: "Professional GPS tracker with fuel monitoring",
    icon: "📍",
    features: ["GPS", "Fuel Level", "Driver ID", "Temperature", "CAN Bus"],
    protocol: "teltonika",
    defaultPort: 5027,
    popular: true,
  },
  {
    id: "teltonika_fmb640",
    name: "Teltonika FMB640",
    type: "gps",
    vendor: "Teltonika",
    description: "Advanced tracker with extended I/O",
    icon: "🚛",
    features: ["GPS", "6x Digital In", "2x Digital Out", "CAN", "Tachograph"],
    protocol: "teltonika",
    defaultPort: 5027,
    popular: true,
  },
  {
    id: "queclink_gv300",
    name: "Queclink GV300",
    type: "gps",
    vendor: "Queclink",
    description: "Advanced vehicle tracker with CAN bus",
    icon: "🚗",
    features: ["GPS", "CAN Bus", "Fuel", "Driver Behavior", "RFID"],
    protocol: "queclink",
    defaultPort: 5028,
    popular: true,
  },
  {
    id: "concox_gt06n",
    name: "Concox GT06N",
    type: "gps",
    vendor: "Concox",
    description: "Budget-friendly GPS tracker",
    icon: "📱",
    features: ["GPS", "Geo-fencing", "SOS", "ACC Detection"],
    protocol: "gt06",
    defaultPort: 5023,
    popular: true,
  },
  {
    id: "ruptela_pro5",
    name: "Ruptela Pro5",
    type: "gps_fuel",
    vendor: "Ruptela",
    description: "Heavy-duty tracker for commercial fleets",
    icon: "🚚",
    features: ["GPS", "Fuel Sensors (Up to 5)", "Temperature (Up to 8)", "CAN/J1939"],
    protocol: "ruptela",
    defaultPort: 5029,
    popular: true,
  },
  {
    id: "omnicomm_lls",
    name: "Omnicomm LLS Fuel Sensor",
    type: "fuel",
    vendor: "Omnicomm",
    description: "High-precision capacitive fuel sensor",
    icon: "⛽",
    features: ["Fuel Level (±1mm accuracy)", "Temperature Compensation", "Theft Detection"],
    protocol: "omnicomm",
    defaultPort: 5031,
    popular: false,
  },
  {
    id: "ytwl_ca100f",
    name: "YTWL CA100F",
    type: "gps",
    vendor: "YTWL",
    description: "Speed Governor GPS device",
    icon: "🔧",
    features: ["GPS", "Speed Governor", "Fuel", "Ignition Status"],
    protocol: "ytwl",
    defaultPort: 443,
    popular: true,
  },
  {
    id: "custom",
    name: "Custom/Other Device",
    type: "gps",
    vendor: "Other",
    description: "Manual configuration for unlisted devices",
    icon: "⚙️",
    features: ["GPS", "Custom Configuration"],
    protocol: "custom",
    defaultPort: 5000,
    popular: false,
  },
];

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
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof deviceTemplates[0] | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [formData, setFormData] = useState<DeviceFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return deviceTemplates;
    const search = templateSearch.toLowerCase();
    return deviceTemplates.filter(t => 
      t.name.toLowerCase().includes(search) ||
      t.vendor.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search)
    );
  }, [templateSearch]);

  // Reset form when dialog opens/closes or editing device changes
  useEffect(() => {
    if (open && editingDevice) {
      // When editing, go directly to step 2
      setStep(2);
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
      // Try to find matching template
      const template = deviceTemplates.find(t => t.name === editingDevice.tracker_model);
      setSelectedTemplate(template || null);
      setFormErrors({});
    } else if (open && !editingDevice) {
      // When adding new, start at step 1
      setStep(1);
      setFormData(initialFormData);
      setSelectedTemplate(null);
      setTemplateSearch("");
      setFormErrors({});
    } else if (!open) {
      // Reset everything when dialog closes
      setStep(1);
      setFormData(initialFormData);
      setSelectedTemplate(null);
      setTemplateSearch("");
      setFormErrors({});
    }
  }, [open, editingDevice]);

  const handleSelectTemplate = (template: typeof deviceTemplates[0]) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      tracker_model: template.id === "custom" ? "" : template.name,
    }));
    setStep(2);
  };

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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingDevice ? "Edit Device" : step === 1 ? "Step 1: Select Device Type" : "Step 2: Configure Device"}
          </DialogTitle>
          <DialogDescription>
            {editingDevice 
              ? "Update GPS tracker device configuration" 
              : step === 1 
                ? "Choose a pre-configured template or select 'Custom' for manual setup"
                : `Configure your ${selectedTemplate?.name || "device"} with SIM card and connection details`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator for new devices */}
        {!editingDevice && (
          <div className="flex items-center gap-2 py-2 border-b">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs">1</span>
              Select Template
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs">2</span>
              Configure Device
            </div>
          </div>
        )}

        {/* Step 1: Template Selection */}
        {step === 1 && !editingDevice && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search devices..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="grid grid-cols-2 gap-3 pb-4">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="p-4 border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-all group relative"
                  >
                    {template.popular && (
                      <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                        Popular
                      </Badge>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm group-hover:text-primary">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{template.vendor}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.features.slice(0, 3).map((feature, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                              {feature}
                            </Badge>
                          ))}
                          {template.features.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{template.features.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Step 2: Device Configuration Form */}
        {step === 2 && (
          <ScrollArea className="max-h-[55vh] -mx-6 px-6">
            {/* Selected Template Info */}
            {selectedTemplate && (
              <div className="bg-muted/50 border rounded-lg p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedTemplate.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{selectedTemplate.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.vendor} • {selectedTemplate.protocol.toUpperCase()}</p>
                  </div>
                </div>
                {!editingDevice && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Change
                  </Button>
                )}
              </div>
            )}
            
            {/* Automatic Configuration Info Box */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-medium text-emerald-600 dark:text-emerald-400">Automatic Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure your device to send data to:
                  </p>
                  <div className="mt-2 p-2 bg-background/50 rounded border text-xs font-mono">
                    <div><span className="text-muted-foreground">Server:</span> kkmjwmyqakprqdhrlsoz.supabase.co</div>
                    <div><span className="text-muted-foreground">Port:</span> 443</div>
                    <div><span className="text-muted-foreground">Path:</span> /functions/v1/gps-data-receiver</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4">
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
                    {editingDevice?.vehicle_id && !availableVehicles?.find(v => v.id === editingDevice.vehicle_id) && (
                      <SelectItem key={editingDevice.vehicle_id} value={editingDevice.vehicle_id}>
                        {editingDevice.vehicles?.plate_number} (Current)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Link this device to a vehicle</p>
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
                <p className="text-xs text-muted-foreground">Operational status</p>
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
                  <p className="text-xs text-muted-foreground">Find on device label or box</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracker_model">Tracker Model *</Label>
                <Input
                  id="tracker_model"
                  value={formData.tracker_model}
                  onChange={(e) => setFormData({ ...formData, tracker_model: e.target.value })}
                  placeholder="Enter model name"
                  className={formErrors.tracker_model ? "border-destructive" : ""}
                  disabled={selectedTemplate?.id !== "custom" && !!selectedTemplate}
                />
                {formErrors.tracker_model ? (
                  <p className="text-xs text-destructive">{formErrors.tracker_model}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Device model name</p>
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
                <p className="text-xs text-muted-foreground">For identification</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firmware_version">Firmware Version</Label>
                <Input
                  id="firmware_version"
                  value={formData.firmware_version}
                  onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
                  placeholder="v2.1.5"
                />
                <p className="text-xs text-muted-foreground">Current firmware</p>
              </div>

              <div className="col-span-2 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Info className="h-4 w-4" />
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
                />
                <p className="text-xs text-muted-foreground">SIM phone number</p>
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
                <p className="text-xs text-muted-foreground">Printed on SIM card</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apn">APN (Access Point Name)</Label>
                <Input
                  id="apn"
                  value={formData.apn}
                  onChange={(e) => setFormData({ ...formData, apn: e.target.value })}
                  placeholder="internet.ethionet.et"
                />
                <p className="text-xs text-muted-foreground">Network APN</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="install_date">Install Date</Label>
                <Input
                  id="install_date"
                  type="date"
                  value={formData.install_date}
                  onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Installation date</p>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes, installation details..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="border-t pt-4">
          {step === 1 && !editingDevice ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          ) : (
            <>
              {!editingDevice && (
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {editingDevice ? "Update" : "Create"} Device
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
