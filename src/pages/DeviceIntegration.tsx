import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Smartphone, Fuel, MapPin, Zap, CheckCircle, Plus, Settings, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { DeviceManagementTab } from "@/components/devices/DeviceManagementTab";
import { HeartbeatMonitoringTab } from "@/components/devices/HeartbeatMonitoringTab";
import { DeviceStatusMonitor } from "@/components/devices/DeviceStatusMonitor";
import { OfflineAlertsConfig } from "@/components/devices/OfflineAlertsConfig";

// Popular device templates - pre-configured for plug-and-play with comprehensive GPS parameters
const deviceTemplates = [
  {
    id: "teltonika_fmb920",
    name: "Teltonika FMB920",
    type: "gps",
    vendor: "Teltonika",
    description: "Professional GPS tracker with fuel monitoring - Popular in Ethiopia",
    icon: "📍",
    features: ["GPS", "Fuel Level", "Driver ID (RFID/iButton)", "Temperature", "4x Digital In", "2x Analog In", "CAN Bus", "Harsh Driving", "Towing Detection"],
    parameters: ["Speed", "Heading", "Altitude", "Satellites", "HDOP", "Fuel %", "Fuel Liters", "Temp Sensor 1-3", "Ignition", "Battery V", "External V", "GSM Signal", "Odometer", "Engine Hours", "RPM", "Acceleration", "Braking", "Cornering", "Idling", "Door Sensors"],
    protocol: "teltonika",
    defaultPort: 5027,
    popular: true,
  },
  {
    id: "teltonika_fmb640",
    name: "Teltonika FMB640",
    type: "gps",
    vendor: "Teltonika",
    description: "Advanced tracker with extended I/O - Ideal for Ethiopian trucks",
    icon: "🚛",
    features: ["GPS", "6x Digital In", "2x Digital Out", "2x Analog In", "1-Wire", "RFID", "BLE", "CAN", "Tachograph"],
    parameters: ["GPS Position", "Speed", "Heading", "Altitude", "Fuel Level", "Fuel Consumption", "Temperature 1-4", "Driver ID", "Cargo Door", "Panic Button", "Trailer Status", "PTO Status", "Battery Voltage", "Ignition", "Odometer", "Trip Distance", "Engine Hours", "Coolant Temp", "RPM"],
    protocol: "teltonika",
    defaultPort: 5027,
    popular: true,
  },
  {
    id: "queclink_gv300",
    name: "Queclink GV300",
    type: "gps",
    vendor: "Queclink",
    description: "Advanced vehicle tracker with CAN bus - Ethiopian market leader",
    icon: "🚗",
    features: ["GPS", "CAN Bus", "Fuel", "4x Digital In", "4x Analog In", "Driver Behavior", "RFID", "Temperature"],
    parameters: ["Latitude", "Longitude", "Speed", "Heading", "Altitude", "Fuel Level %", "Fuel Liters", "Fuel Rate", "Temp 1-2", "Driver RFID", "Harsh Acceleration", "Harsh Braking", "Harsh Cornering", "Ignition On/Off", "Main Power V", "Backup Battery V", "GSM/GPS Signal", "Odometer", "Engine RPM", "Throttle Position"],
    protocol: "queclink",
    defaultPort: 5028,
    popular: true,
  },
  {
    id: "queclink_gv500",
    name: "Queclink GV500",
    type: "gps",
    vendor: "Queclink",
    description: "Heavy-duty tracker for large Ethiopian fleets",
    icon: "🚌",
    features: ["GPS", "OBD-II", "CAN", "J1939", "Fuel", "Driver ID", "6x Digital I/O", "3x Analog In"],
    parameters: ["GPS Data", "Speed", "Odometer", "Engine Hours", "Fuel Level", "Fuel Consumption", "Coolant Temp", "Engine Load", "RPM", "VIN", "Driver ID", "Door Status", "AC Status", "Seatbelt", "Airbag", "MIL Status", "Battery Voltage", "Panic Button", "Cargo Temp"],
    protocol: "queclink",
    defaultPort: 5028,
    popular: true,
  },
  {
    id: "ruptela_pro5",
    name: "Ruptela Pro5",
    type: "gps_fuel",
    vendor: "Ruptela",
    description: "Heavy-duty tracker for Ethiopian commercial fleets",
    icon: "🚚",
    features: ["GPS", "Fuel Sensors (Up to 5)", "Temperature (Up to 8)", "8x Digital In", "4x Analog In", "CAN/J1939", "Tachograph", "Eco Driving"],
    parameters: ["Position", "Speed", "Course", "Altitude", "Fuel Tank 1-5", "Total Fuel", "Fuel Consumption", "Temp Probe 1-8", "Refrigeration Temp", "Driver 1 & 2 ID", "Tachograph Data", "Digital Inputs", "Analog Inputs", "Ignition", "Power Supply", "Battery", "GSM Strength", "Trip Odometer", "Total Odometer", "Engine Hours", "Eco Score"],
    protocol: "ruptela",
    defaultPort: 5029,
    popular: true,
  },
  {
    id: "concox_gt06n",
    name: "Concox GT06N",
    type: "gps",
    vendor: "Concox",
    description: "Budget-friendly GPS tracker - Popular entry-level in Ethiopia",
    icon: "📱",
    features: ["GPS", "Geo-fencing", "SOS", "Digital Input", "ACC Detection", "Vibration Alert"],
    parameters: ["GPS Location", "Speed", "Direction", "Satellites", "GSM Signal", "Battery Level", "External Power", "Ignition Status", "Movement Alert", "Overspeed Alert"],
    protocol: "gt06",
    defaultPort: 5023,
    popular: true,
  },
  {
    id: "concox_at4",
    name: "Concox AT4",
    type: "gps",
    vendor: "Concox",
    description: "4G tracker with extended battery - Great for Ethiopian conditions",
    icon: "📡",
    features: ["4G LTE", "GPS", "ACC", "SOS", "Fuel Cut", "Relay Control", "Voice Monitoring"],
    parameters: ["GPS Position", "Speed", "Heading", "LBS Location", "WiFi Positioning", "Ignition", "Battery %", "External Power V", "Movement", "Towing Alert", "Vibration", "Geo-fence Status"],
    protocol: "gt06",
    defaultPort: 5023,
    popular: true,
  },
  {
    id: "calamp_lmu3030",
    name: "CalAmp LMU-3030",
    type: "gps",
    vendor: "CalAmp",
    description: "Enterprise-grade tracking device - Premium Ethiopian solution",
    icon: "⭐",
    features: ["GPS", "Driver Behavior", "Maintenance", "Messaging", "4x Digital I/O", "CAN/J1939", "PTO Detection"],
    parameters: ["GPS Quality", "Speed", "Heading", "Odometer", "Driver Behavior Score", "Harsh Events", "Idling Time", "Fuel Economy", "Engine Diagnostics", "Maintenance Alerts", "Digital Inputs", "Ignition", "Power", "Messages"],
    protocol: "calamp",
    defaultPort: 5030,
    popular: false,
  },
  {
    id: "omnicomm_lls",
    name: "Omnicomm LLS Fuel Sensor",
    type: "fuel",
    vendor: "Omnicomm",
    description: "High-precision capacitive fuel sensor - Ethiopian fuel theft solution",
    icon: "⛽",
    features: ["Fuel Level (±1mm accuracy)", "Temperature Compensation", "Theft Detection", "Refueling Detection", "Calibration Table"],
    parameters: ["Fuel Level (mm)", "Fuel Volume (L)", "Fuel Temperature (°C)", "Sensor Status", "Calibration Status", "Fuel Change Rate", "Theft Alert", "Refuel Alert"],
    protocol: "omnicomm",
    defaultPort: 5031,
    popular: true,
  },
  {
    id: "coban_tk103",
    name: "Coban TK103",
    type: "gps",
    vendor: "Coban",
    description: "Affordable GPS tracker - Widely used in Ethiopian taxis",
    icon: "🚕",
    features: ["GPS", "SMS Control", "SOS", "Geo-fence", "Movement Alert", "Overspeed Alert"],
    parameters: ["GPS Location", "Speed (km/h)", "Battery Status", "GSM Signal", "ACC Status", "Door Alarm", "SOS Status"],
    protocol: "tk103",
    defaultPort: 5002,
    popular: true,
  },
  {
    id: "topflytech_t8806",
    name: "TopFlyTech T8806",
    type: "gps",
    vendor: "TopFlyTech",
    description: "Multi-sensor tracker - Ethiopian cold chain specialist",
    icon: "❄️",
    features: ["GPS", "BLE 5.0", "Temperature (4x)", "Humidity", "Door Sensor", "Fuel", "Driver ID", "Camera Support"],
    parameters: ["Location", "Speed", "Heading", "Temperature 1-4", "Humidity %", "BLE Temp Sensors", "Fuel Level", "Driver Card", "Door Open/Close", "Refrigeration Status", "Ignition", "Battery", "Camera Trigger"],
    protocol: "topflytech",
    defaultPort: 5032,
    popular: true,
  },
  {
    id: "jt701",
    name: "JT701 CAN Bus Tracker",
    type: "gps",
    vendor: "JT701",
    description: "CAN bus reader - Ethiopian OBD solution",
    icon: "🔧",
    features: ["GPS", "CAN Bus", "J1708", "Fuel from ECU", "DTC Codes", "Driver Behavior", "4x I/O"],
    parameters: ["GPS Data", "VIN Number", "Fuel Level (ECU)", "Fuel Used", "Engine RPM", "Coolant Temp", "Engine Load %", "Throttle %", "DTC Codes", "MIL Status", "Harsh Driving", "Idling", "PTO", "Odometer (ECU)", "Engine Hours"],
    protocol: "jt701",
    defaultPort: 5033,
    popular: false,
  },
  {
    id: "meitrack_t366",
    name: "Meitrack T366",
    type: "gps",
    vendor: "Meitrack",
    description: "4G OBD tracker - Modern Ethiopian fleet solution",
    icon: "🔌",
    features: ["4G", "GPS", "OBD-II", "Fuel", "Driver Behavior", "BLE", "RFID", "Accident Detection"],
    parameters: ["GPS Position", "Speed", "Odometer", "Fuel %", "Engine RPM", "Coolant Temp", "Battery V", "Throttle Position", "Engine Load", "Acceleration Events", "Braking Events", "Cornering Events", "Collision Detection", "Driver RFID", "BLE Devices"],
    protocol: "meitrack",
    defaultPort: 5034,
    popular: true,
  },
  {
    id: "ytwl_ca100f",
    name: "YTWL CA100F Speed Governor",
    type: "gps_governor",
    vendor: "YTWL (Thingsasys)",
    description: "GPS Speed Limiter/Governor - Ethiopian compliance solution",
    icon: "🚦",
    features: ["GPS Tracking", "Speed Limiting", "Remote Speed Control", "Over-speed Prevention", "Compliance Reports", "Driver Alerts", "Digital I/O", "Voice Warnings"],
    parameters: ["GPS Position", "Current Speed", "Max Speed Setting", "Speed Limit Status", "Over-speed Events", "Speed Violations Count", "Governor Active/Inactive", "Ignition Status", "Digital Inputs", "Relay Output", "Odometer", "Trip Distance", "Engine Hours", "Battery Voltage", "GSM Signal", "GPS Satellites", "Driver Warnings Triggered", "Compliance Score", "Tamper Alerts"],
    protocol: "ytwl",
    defaultPort: 5035,
    popular: true,
  },
];

const DeviceIntegration = () => {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [formData, setFormData] = useState({
    imei: "",
    sim_iccid: "",
    sim_msisdn: "",
    vehicle_id: "",
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: devices } = useQuery({
    queryKey: ["devices", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*, vehicles(plate_number)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
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

  const addDeviceMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check if device with this IMEI already exists (for new devices only)
      if (!editingDevice) {
        const { data: existingDevice } = await supabase
          .from("devices")
          .select("id, imei")
          .eq("imei", data.imei)
          .eq("organization_id", organizationId!)
          .maybeSingle();

        if (existingDevice) {
          throw new Error(`A device with IMEI ${data.imei} already exists`);
        }
      }

      // If vehicle is selected, unassign it from any other device first
      if (data.vehicle_id) {
        const { data: deviceWithVehicle } = await supabase
          .from("devices")
          .select("id")
          .eq("vehicle_id", data.vehicle_id)
          .eq("organization_id", organizationId!)
          .neq("id", editingDevice?.id || "00000000-0000-0000-0000-000000000000")
          .maybeSingle();

        if (deviceWithVehicle) {
          await supabase
            .from("devices")
            .update({ vehicle_id: null })
            .eq("id", deviceWithVehicle.id);
        }
      }

      // Create device protocol if not exists
      const { data: protocolData } = await (supabase as any)
        .from("device_protocols")
        .select("id")
        .eq("protocol_name", selectedTemplate.protocol)
        .eq("organization_id", organizationId)
        .maybeSingle();

      let protocolId = protocolData?.id;

      if (!protocolId) {
        const { data: newProtocol, error: newProtocolError } = await (supabase as any)
          .from("device_protocols")
          .insert({
            protocol_name: selectedTemplate.protocol,
            vendor: selectedTemplate.vendor,
            version: "1.0",
            organization_id: organizationId,
            decoder_config: {
              port: selectedTemplate.defaultPort,
              features: selectedTemplate.features,
            },
          })
          .select()
          .single();

        if (newProtocolError) throw newProtocolError;
        protocolId = newProtocol.id;
      }

      if (editingDevice) {
        // Update existing device
        const { error: updateError } = await supabase
          .from("devices")
          .update({
            tracker_model: selectedTemplate.name,
            sim_iccid: data.sim_iccid || null,
            sim_msisdn: data.sim_msisdn || null,
            vehicle_id: data.vehicle_id || null,
            protocol_id: protocolId,
            status: "active",
          })
          .eq("id", editingDevice.id);

        if (updateError) throw updateError;
      } else {
        // Create new device
        const { error: deviceError } = await supabase
          .from("devices")
          .insert({
            organization_id: organizationId,
            imei: data.imei,
            tracker_model: selectedTemplate.name,
            sim_iccid: data.sim_iccid || null,
            sim_msisdn: data.sim_msisdn || null,
            vehicle_id: data.vehicle_id || null,
            protocol_id: protocolId,
            status: "active",
          });

        if (deviceError) throw deviceError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Device Saved Successfully!",
        description: editingDevice 
          ? "Your device information has been updated."
          : "Your device has been added and is ready to receive data.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      imei: "",
      sim_iccid: "",
      sim_msisdn: "",
      vehicle_id: "",
    });
    setSelectedTemplate(null);
    setEditingDevice(null);
    setStep(1);
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setStep(2);
  };

  const handleEditDevice = (device: any) => {
    // Find the template for this device
    const template = deviceTemplates.find(t => t.name === device.tracker_model);
    
    setEditingDevice(device);
    setSelectedTemplate(template || deviceTemplates[0]);
    setFormData({
      imei: device.imei,
      sim_iccid: device.sim_iccid || "",
      sim_msisdn: device.sim_msisdn || "",
      vehicle_id: device.vehicle_id || "",
    });
    setStep(2);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.imei || !selectedTemplate) {
      toast({
        title: "Missing Information",
        description: "Please enter device IMEI",
        variant: "destructive",
      });
      return;
    }
    addDeviceMutation.mutate(formData);
  };

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Device Integration
            </h1>
            <p className="text-muted-foreground mt-1">
              Add GPS trackers and fuel sensors in 3 simple steps - no coding required
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDevice 
                    ? "Edit Device" 
                    : step === 1 
                    ? "Step 1: Choose Your Device" 
                    : "Step 2: Enter Device Details"}
                </DialogTitle>
                <DialogDescription>
                  {editingDevice
                    ? "Update device information"
                    : step === 1
                    ? "Select your device model from our pre-configured templates"
                    : "Enter your device information - we'll handle the rest automatically"}
                </DialogDescription>
              </DialogHeader>

              {step === 1 && !editingDevice ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deviceTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                          selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-4xl">{template.icon}</div>
                              <div>
                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{template.vendor}</p>
                              </div>
                            </div>
                            {template.popular && (
                              <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80">
                                Popular
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold mb-2">Features:</p>
                              <div className="flex flex-wrap gap-2">
                                {template.features.map((feature) => (
                                  <Badge key={feature} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {template.parameters && (
                              <div>
                                <p className="text-xs font-semibold mb-2 text-primary">GPS Parameters Tracked:</p>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                  {template.parameters.map((param) => (
                                    <Badge key={param} variant="secondary" className="text-xs">
                                      {param}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
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
                        <div className="text-5xl">{selectedTemplate?.icon}</div>
                        <div>
                          <h3 className="font-semibold text-lg">{selectedTemplate?.name}</h3>
                          <p className="text-sm text-muted-foreground">{selectedTemplate?.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">Auto-configured</Badge>
                            <Badge variant="outline">Ready to use</Badge>
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
                        disabled={!!editingDevice}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {editingDevice ? "IMEI cannot be changed" : "Find this on your device label or box"}
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
                          <SelectValue placeholder="Select vehicle (optional)">
                            {formData.vehicle_id && vehicles?.find(v => v.id === formData.vehicle_id) && (
                              <span className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {vehicles.find(v => v.id === formData.vehicle_id)?.plate_number}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {vehicles.find(v => v.id === formData.vehicle_id)?.make} {vehicles.find(v => v.id === formData.vehicle_id)?.model}
                                </span>
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">No vehicle assigned</span>
                          </SelectItem>
                          
                          {vehiclesWithAssignmentStatus.unassigned.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950">
                                ✓ Available Vehicles ({vehiclesWithAssignmentStatus.unassigned.length})
                              </div>
                              {vehiclesWithAssignmentStatus.unassigned.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-green-600 border-green-300">
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
                                    {vehicle.assignedDeviceImei && (
                                      <span className="text-xs text-muted-foreground">
                                        (IMEI: ...{vehicle.assignedDeviceImei.slice(-6)})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {formData.vehicle_id && vehiclesWithAssignmentStatus.assigned.find((v: any) => v.id === formData.vehicle_id) && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠ This vehicle will be unassigned from its current device and reassigned to this one.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sim_iccid">
                          SIM Card ICCID (Optional)
                          <span className="text-xs text-muted-foreground ml-2">(19-20 digits)</span>
                        </Label>
                        <Input
                          id="sim_iccid"
                          placeholder="e.g., 8925101234567890123"
                          value={formData.sim_iccid}
                          onChange={(e) => setFormData({ ...formData, sim_iccid: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sim_msisdn">
                          SIM Phone Number (Optional)
                          <span className="text-xs text-muted-foreground ml-2">(e.g., +251...)</span>
                        </Label>
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
                  <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-green-900 dark:text-green-100">
                            Automatic Configuration Enabled
                          </p>
                          <ul className="text-sm text-green-700 dark:text-green-200 space-y-1">
                            <li>✓ Protocol automatically configured</li>
                            <li>✓ Server port assigned: {selectedTemplate?.defaultPort}</li>
                            <li>✓ Data parsing rules pre-loaded</li>
                            <li>✓ Ready to receive data immediately</li>
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
                  disabled={step === 1 ? !selectedTemplate : addDeviceMutation.isPending}
                >
                  {step === 1 ? "Continue" : addDeviceMutation.isPending ? "Adding..." : "Add Device"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">3 Steps</div>
                  <div className="text-sm text-muted-foreground">Quick Setup</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">Auto Config</div>
                  <div className="text-sm text-muted-foreground">No Coding</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{deviceTemplates.length}+</div>
                  <div className="text-sm text-muted-foreground">Device Models</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Fuel className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{devices?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Devices</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="devices">Device Management</TabsTrigger>
            <TabsTrigger value="heartbeat">Heartbeat Monitor</TabsTrigger>
            <TabsTrigger value="realtime">Live Status</TabsTrigger>
            <TabsTrigger value="alerts">Offline Alerts</TabsTrigger>
            <TabsTrigger value="connected">Connected Devices</TabsTrigger>
            <TabsTrigger value="templates">Device Templates</TabsTrigger>
            <TabsTrigger value="guide">Setup Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            <DeviceManagementTab />
          </TabsContent>

          <TabsContent value="heartbeat" className="space-y-4">
            <HeartbeatMonitoringTab />
          </TabsContent>

          <TabsContent value="realtime" className="space-y-4">
            <DeviceStatusMonitor />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <OfflineAlertsConfig />
          </TabsContent>

          <TabsContent value="connected" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Connected Devices</CardTitle>
                <CardDescription>All devices currently tracking your fleet</CardDescription>
              </CardHeader>
              <CardContent>
                {!devices || devices.length === 0 ? (
                  <div className="text-center py-12">
                    <Smartphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Devices Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Click "Add Device" to connect your first GPS tracker or fuel sensor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {devices.map((device: any) => (
                      <Card key={device.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-primary/10 rounded-lg">
                                <Smartphone className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{device.tracker_model}</h4>
                                <div className="space-y-1 mt-1">
                                  <p className="text-sm text-muted-foreground">IMEI: {device.imei}</p>
                                  {device.sim_msisdn && (
                                    <p className="text-sm text-muted-foreground">
                                      SIM: {device.sim_msisdn}
                                    </p>
                                  )}
                                  {device.vehicles ? (
                                    <p className="text-sm font-medium text-primary">
                                      🚗 {device.vehicles.plate_number}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                      No vehicle assigned
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={device.status === "active" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {device.status}
                              </Badge>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditDevice(device)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deviceTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{template.icon}</div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{template.vendor}</p>
                        </div>
                      </div>
                      {template.popular && (
                        <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold mb-2 text-muted-foreground">Key Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.features.slice(0, 4).map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {template.features.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.features.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      {template.parameters && (
                        <div>
                          <p className="text-xs font-semibold mb-2 text-muted-foreground">Tracked Parameters:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.parameters.slice(0, 6).map((param) => (
                              <Badge key={param} variant="secondary" className="text-xs">
                                {param}
                              </Badge>
                            ))}
                            {template.parameters.length > 6 && (
                              <Badge variant="secondary" className="text-xs font-semibold">
                                +{template.parameters.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                        <span>Protocol: {template.protocol}</span>
                        <span>Port: {template.defaultPort}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>3-Step Setup Guide</CardTitle>
                <CardDescription>Add any device in minutes - no technical knowledge required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Choose Your Device Model</h3>
                    <p className="text-muted-foreground">
                      Select from our library of pre-configured device templates. We support all major GPS tracker and
                      fuel sensor brands including Teltonika, Queclink, Ruptela, and more.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Enter Device Information</h3>
                    <p className="text-muted-foreground mb-2">
                      Simply enter your device IMEI (found on the device label) and optionally assign it to a vehicle.
                      That's it!
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>IMEI/Serial Number (required)</li>
                      <li>Vehicle assignment (optional)</li>
                      <li>SIM card details (optional)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center font-bold text-green-600">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Start Tracking Immediately</h3>
                    <p className="text-muted-foreground mb-2">
                      The system automatically configures everything for you:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Communication protocol configured</li>
                      <li>Server connection established</li>
                      <li>Data parsing rules loaded</li>
                      <li>Real-time tracking activated</li>
                    </ul>
                  </div>
                </div>

                <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      💡 Pro Tip: Device Configuration
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      After adding your device, configure it to send data to our server. Use the server address and port
                      shown in your device settings page. Most devices can be configured via SMS commands - check your
                      device manual or contact support for help.
                    </p>
                  </CardContent>
                </Card>

                {/* Comprehensive GPS Parameters Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>📊 Comprehensive GPS Parameters Available</CardTitle>
                    <CardDescription>
                      All devices automatically track these parameters - perfect for Ethiopian fleet management
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Location & Movement
                        </h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• GPS Coordinates (Latitude/Longitude)</li>
                          <li>• Speed (km/h)</li>
                          <li>• Heading/Direction</li>
                          <li>• Altitude</li>
                          <li>• GPS Accuracy (HDOP, Satellites)</li>
                          <li>• Odometer Reading</li>
                          <li>• Trip Distance</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-orange-600" />
                          Fuel Management (Critical for Ethiopia)
                        </h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• Real-time Fuel Level (%)</li>
                          <li>• Fuel Volume (Liters)</li>
                          <li>• Fuel Consumption Rate</li>
                          <li>• Refueling Detection & Volume</li>
                          <li>• Fuel Theft Detection & Volume</li>
                          <li>• Temperature Compensation</li>
                          <li>• Multiple Tank Support (up to 5 tanks)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-600" />
                          Engine & Vehicle Status
                        </h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• Ignition On/Off</li>
                          <li>• Engine RPM</li>
                          <li>• Engine Hours</li>
                          <li>• Coolant Temperature</li>
                          <li>• Engine Load (%)</li>
                          <li>• Throttle Position</li>
                          <li>• Battery Voltage</li>
                          <li>• External Power Voltage</li>
                          <li>• MIL/Check Engine Status</li>
                          <li>• DTC Error Codes</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-green-600" />
                          Driver & Safety
                        </h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• Driver Identification (RFID/iButton/BLE)</li>
                          <li>• Harsh Acceleration Events</li>
                          <li>• Harsh Braking Events</li>
                          <li>• Harsh Cornering</li>
                          <li>• Overspeed Alerts</li>
                          <li>• Idling Time & Detection</li>
                          <li>• Collision/Accident Detection</li>
                          <li>• Panic/SOS Button</li>
                          <li>• Seatbelt Status</li>
                          <li>• Driver Behavior Score</li>
                          <li>• <strong>Speed Governor/Limiter (Compliance)</strong></li>
                          <li>• <strong>Speed Violation Reporting</strong></li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">🌡️ Temperature Monitoring</h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• Up to 8 Temperature Probes</li>
                          <li>• Refrigeration Unit Monitoring</li>
                          <li>• Cold Chain Compliance</li>
                          <li>• Ambient Temperature</li>
                          <li>• Fuel Tank Temperature</li>
                          <li>• Cargo Temperature Zones</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">🚪 Digital & Analog Inputs</h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• Door Open/Close Sensors</li>
                          <li>• Cargo Door Status</li>
                          <li>• Trailer Connection Status</li>
                          <li>• PTO (Power Take-Off) Status</li>
                          <li>• AC Status</li>
                          <li>• Custom Sensor Inputs</li>
                          <li>• Towing/Movement Alerts</li>
                          <li>• Vibration Sensors</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">📡 Communication & Connectivity</h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• GSM/4G Signal Strength</li>
                          <li>• GPS Signal Quality</li>
                          <li>• IMEI Number</li>
                          <li>• SIM Card Status</li>
                          <li>• Data Usage</li>
                          <li>• Last Communication Time</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">🔧 Maintenance & Diagnostics</h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li>• Service Due Indicators</li>
                          <li>• Maintenance Mileage Tracking</li>
                          <li>• VIN Number</li>
                          <li>• Firmware Version</li>
                          <li>• Device Health Status</li>
                          <li>• Sensor Fault Detection</li>
                          <li>• Tachograph Data (EU-compliant)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg border">
                      <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                        ✅ Optimized for Ethiopian Market
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-200">
                        Our system is specifically configured for Ethiopian fleet operations with focus on fuel theft prevention, 
                        temperature monitoring for cold chain logistics, harsh road condition tracking, and driver safety. 
                        All parameters are automatically captured and stored - no additional configuration needed!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DeviceIntegration;
