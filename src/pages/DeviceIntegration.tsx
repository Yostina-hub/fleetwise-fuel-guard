import { useState } from "react";
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
import { Smartphone, Fuel, MapPin, Zap, CheckCircle, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

// Popular device templates - pre-configured for plug-and-play
const deviceTemplates = [
  {
    id: "teltonika_fmb920",
    name: "Teltonika FMB920",
    type: "gps",
    vendor: "Teltonika",
    description: "Professional GPS tracker with fuel monitoring",
    icon: "📍",
    features: ["GPS Tracking", "Fuel Monitoring", "Driver ID", "Temperature"],
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
    features: ["GPS Tracking", "CAN Bus", "Fuel", "Driving Behavior"],
    protocol: "queclink",
    defaultPort: 5028,
    popular: true,
  },
  {
    id: "ruptela_pro5",
    name: "Ruptela Pro5",
    type: "gps_fuel",
    vendor: "Ruptela",
    description: "Heavy-duty tracker for commercial fleets",
    icon: "🚛",
    features: ["GPS", "Fuel Sensors", "Temperature", "Digital Inputs"],
    protocol: "ruptela",
    defaultPort: 5029,
    popular: true,
  },
  {
    id: "concox_gt06n",
    name: "Concox GT06N",
    type: "gps",
    vendor: "Concox",
    description: "Budget-friendly GPS tracker",
    icon: "📱",
    features: ["GPS Tracking", "Geo-fencing", "SOS"],
    protocol: "gt06",
    defaultPort: 5023,
    popular: false,
  },
  {
    id: "calamp_lmu3030",
    name: "CalAmp LMU-3030",
    type: "gps",
    vendor: "CalAmp",
    description: "Enterprise-grade tracking device",
    icon: "⭐",
    features: ["GPS", "Driver Behavior", "Maintenance", "Messaging"],
    protocol: "calamp",
    defaultPort: 5030,
    popular: true,
  },
  {
    id: "omnicomm_lls",
    name: "Omnicomm LLS Fuel Sensor",
    type: "fuel",
    vendor: "Omnicomm",
    description: "High-precision fuel level sensor",
    icon: "⛽",
    features: ["Fuel Level", "Temperature", "Theft Detection"],
    protocol: "omnicomm",
    defaultPort: 5031,
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

  const addDeviceMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create device protocol if not exists
      const { data: protocolData, error: protocolError } = await (supabase as any)
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

      // Create device
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Device Added Successfully!",
        description: "Your device is now active and ready to track.",
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
    setStep(1);
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setStep(2);
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
                          <div className="flex flex-wrap gap-2">
                            {template.features.map((feature) => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
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
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Find this on your device label or box
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="vehicle">Assign to Vehicle (Optional)</Label>
                      <Select
                        value={formData.vehicle_id}
                        onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None - Assign later</SelectItem>
                          {vehicles?.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
        <Tabs defaultValue="connected" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connected">Connected Devices</TabsTrigger>
            <TabsTrigger value="templates">Device Templates</TabsTrigger>
            <TabsTrigger value="guide">Setup Guide</TabsTrigger>
          </TabsList>

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
                                <p className="text-sm text-muted-foreground">IMEI: {device.imei}</p>
                                {device.vehicles && (
                                  <p className="text-sm text-muted-foreground">
                                    Vehicle: {device.vehicles.plate_number}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={device.status === "active" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {device.status}
                              </Badge>
                              <Button variant="ghost" size="icon">
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
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Protocol: {template.protocol}</span>
                      <span>Port: {template.defaultPort}</span>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DeviceIntegration;
