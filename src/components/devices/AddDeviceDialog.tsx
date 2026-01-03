import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { deviceTemplates, DeviceTemplate } from "@/data/deviceTemplates";

interface Vehicle {
  id: string;
  plate_number: string;
  make?: string;
  model?: string;
}

interface Device {
  id: string;
  vehicle_id: string | null;
  imei: string;
}

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    imei: string;
    sim_iccid: string;
    sim_msisdn: string;
    vehicle_id: string;
  }, template: DeviceTemplate) => void;
  isSubmitting: boolean;
  vehicles: Vehicle[] | undefined;
  devices: Device[] | undefined;
  editingDevice?: Device | null;
}

export const AddDeviceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  vehicles,
  devices,
  editingDevice,
}: AddDeviceDialogProps) => {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);
  const [formData, setFormData] = useState({
    imei: "",
    sim_iccid: "",
    sim_msisdn: "",
    vehicle_id: "",
  });

  // Categorize vehicles by assignment status
  const vehiclesWithAssignmentStatus = useMemo(() => {
    if (!vehicles || !devices) return { unassigned: [], assigned: [] };
    
    const assignedVehicleIds = new Set(
      devices
        .filter(d => d.vehicle_id && (!editingDevice || d.id !== editingDevice.id))
        .map(d => d.vehicle_id)
    );
    
    const unassigned = vehicles.filter(v => !assignedVehicleIds.has(v.id));
    const assigned = vehicles
      .filter(v => assignedVehicleIds.has(v.id))
      .map(v => {
        const device = devices.find(d => d.vehicle_id === v.id);
        return {
          ...v,
          assignedDeviceId: device?.id,
          assignedDeviceImei: device?.imei,
        };
      });
    
    return { unassigned, assigned };
  }, [vehicles, devices, editingDevice]);

  const handleSelectTemplate = (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!formData.imei || !selectedTemplate) return;
    onSubmit(formData, selectedTemplate);
  };

  const resetForm = () => {
    setFormData({ imei: "", sim_iccid: "", sim_msisdn: "", vehicle_id: "" });
    setSelectedTemplate(null);
    setStep(1);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Step 1: Choose Your Device" : "Step 2: Enter Device Details"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Select your device model from our pre-configured templates"
              : "Enter your device information - we'll handle the rest automatically"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deviceTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                    selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{template.icon}</div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{template.vendor}</p>
                        </div>
                      </div>
                      {template.popular && (
                        <Badge variant="default" className="bg-primary text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.features.slice(0, 4).map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {template.features.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.features.length - 4}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Template Info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{selectedTemplate?.icon}</div>
                  <div>
                    <h3 className="font-semibold">{selectedTemplate?.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedTemplate?.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">Auto-configured</Badge>
                      <Badge variant="outline">Port: {selectedTemplate?.defaultPort}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Details Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="imei">
                  Device IMEI / Serial Number *
                  <span className="text-xs text-muted-foreground ml-2">(15 digits)</span>
                </Label>
                <Input
                  id="imei"
                  placeholder="e.g., 867584032156789"
                  value={formData.imei}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this on your device label or box
                </p>
              </div>

              <div>
                <Label htmlFor="vehicle">
                  Assign to Vehicle (Optional)
                  <span className="text-xs text-muted-foreground ml-2">
                    ({vehiclesWithAssignmentStatus.unassigned.length} available)
                  </span>
                </Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No vehicle assigned</span>
                    </SelectItem>
                    
                    {vehiclesWithAssignmentStatus.unassigned.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                          ✓ Available ({vehiclesWithAssignmentStatus.unassigned.length})
                        </div>
                        {vehiclesWithAssignmentStatus.unassigned.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-emerald-600 border-emerald-300">
                                {vehicle.plate_number}
                              </Badge>
                              <span>{vehicle.make} {vehicle.model}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    
                    {vehiclesWithAssignmentStatus.assigned.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 mt-1">
                          ⚠ Assigned to Other Devices ({vehiclesWithAssignmentStatus.assigned.length})
                        </div>
                        {vehiclesWithAssignmentStatus.assigned.map((vehicle: any) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-amber-600 border-amber-300">
                                {vehicle.plate_number}
                              </Badge>
                              <span>{vehicle.make} {vehicle.model}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sim_iccid">SIM Card ICCID (Optional)</Label>
                  <Input
                    id="sim_iccid"
                    placeholder="e.g., 8925101234567890123"
                    value={formData.sim_iccid}
                    onChange={(e) => setFormData({ ...formData, sim_iccid: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sim_msisdn">SIM Phone Number (Optional)</Label>
                  <Input
                    id="sim_msisdn"
                    placeholder="e.g., +251911234567"
                    value={formData.sim_msisdn}
                    onChange={(e) => setFormData({ ...formData, sim_msisdn: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Auto-configuration Notice */}
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Automatic Configuration Enabled
                    </p>
                    <ul className="text-sm text-emerald-700 dark:text-emerald-200 space-y-1">
                      <li>✓ Protocol automatically configured</li>
                      <li>✓ Server port assigned: {selectedTemplate?.defaultPort}</li>
                      <li>✓ Data parsing rules pre-loaded</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button
            onClick={step === 1 ? () => setStep(2) : handleSubmit}
            disabled={step === 1 ? !selectedTemplate : isSubmitting || !formData.imei}
          >
            {step === 1 ? "Continue" : isSubmitting ? "Adding..." : "Add Device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
