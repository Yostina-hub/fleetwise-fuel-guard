import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Fuel, MapPin, Zap, CheckCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { DeviceManagementTab } from "@/components/devices/DeviceManagementTab";
import { HeartbeatMonitoringTab } from "@/components/devices/HeartbeatMonitoringTab";
import { DeviceStatusMonitor } from "@/components/devices/DeviceStatusMonitor";
import { OfflineAlertsConfig } from "@/components/devices/OfflineAlertsConfig";
import { DeviceHealthSummary } from "@/components/devices/DeviceHealthSummary";
import { AddDeviceDialog } from "@/components/devices/AddDeviceDialog";
import DeviceQuickStats from "@/components/devices/DeviceQuickStats";
import DeviceQuickActions from "@/components/devices/DeviceQuickActions";
import { deviceTemplates, DeviceTemplate } from "@/data/deviceTemplates";

const DeviceIntegration = () => {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");

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

  const { data: offlineAlertsConfig } = useQuery({
    queryKey: ["offline-alerts-config", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from("device_offline_alerts")
        .select("id, is_active")
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as { id: string; is_active: boolean } | null;
    },
    enabled: !!organizationId,
  });

  const hasOfflineAlerts = !!offlineAlertsConfig?.id;

  const addDeviceMutation = useMutation({
    mutationFn: async ({ formData, template }: { formData: any; template: DeviceTemplate }) => {
      // Check if device with this IMEI already exists
      const { data: existingDevice } = await supabase
        .from("devices")
        .select("id, imei")
        .eq("imei", formData.imei)
        .eq("organization_id", organizationId!)
        .maybeSingle();

      if (existingDevice) {
        throw new Error(`A device with IMEI ${formData.imei} already exists`);
      }

      // If vehicle is selected, unassign it from any other device first
      if (formData.vehicle_id) {
        const { data: deviceWithVehicle } = await supabase
          .from("devices")
          .select("id")
          .eq("vehicle_id", formData.vehicle_id)
          .eq("organization_id", organizationId!)
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
        .eq("protocol_name", template.protocol)
        .eq("organization_id", organizationId)
        .maybeSingle();

      let protocolId = protocolData?.id;

      if (!protocolId) {
        const { data: newProtocol, error: newProtocolError } = await (supabase as any)
          .from("device_protocols")
          .insert({
            protocol_name: template.protocol,
            vendor: template.vendor,
            version: "1.0",
            organization_id: organizationId,
            decoder_config: {
              port: template.defaultPort,
              features: template.features,
            },
          })
          .select()
          .single();

        if (newProtocolError) throw newProtocolError;
        protocolId = newProtocol.id;
      }

      // Create new device
      const { error: deviceError } = await supabase
        .from("devices")
        .insert({
          organization_id: organizationId,
          imei: formData.imei,
          tracker_model: template.name,
          sim_iccid: formData.sim_iccid || null,
          sim_msisdn: formData.sim_msisdn || null,
          vehicle_id: formData.vehicle_id || null,
          protocol_id: protocolId,
          status: "active",
        });

      if (deviceError) throw deviceError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Device Added Successfully!",
        description: "Your device has been added and is ready to receive data.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddDevice = (formData: any, template: DeviceTemplate) => {
    addDeviceMutation.mutate({ formData, template });
  };

  const handleQuickAssign = (device: any) => {
    setActiveTab("devices");
  };

  const handleConfigureAlerts = () => {
    setActiveTab("alerts");
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
          <Button size="lg" className="gap-2" onClick={() => setIsDialogOpen(true)} aria-label="Add new device">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add Device
          </Button>
        </div>

        {/* Quick Stats */}
        <DeviceQuickStats
          totalDevices={devices?.length || 0}
          onlineDevices={devices?.filter(d => d.status === 'active')?.length || 0}
          offlineDevices={devices?.filter(d => d.status !== 'active')?.length || 0}
          unassignedDevices={devices?.filter(d => !d.vehicle_id)?.length || 0}
          healthyDevices={devices?.filter(d => d.status === 'active' && d.vehicle_id)?.length || 0}
        />

        {/* Quick Actions */}
        <DeviceQuickActions
          onAddDevice={() => setIsDialogOpen(true)}
          onConfigureAlerts={handleConfigureAlerts}
          onRefreshStatus={() => queryClient.invalidateQueries({ queryKey: ["devices"] })}
          onViewTemplates={() => setActiveTab("templates")}
        />

        {/* Health Summary - Shows issues that need attention */}
        <DeviceHealthSummary
          devices={devices}
          onAssignVehicle={handleQuickAssign}
          onConfigureAlerts={handleConfigureAlerts}
          hasOfflineAlerts={hasOfflineAlerts}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="w-max">
              <TabsTrigger value="devices">Device Management</TabsTrigger>
              <TabsTrigger value="heartbeat">Heartbeat Monitor</TabsTrigger>
              <TabsTrigger value="realtime">Live Status</TabsTrigger>
              <TabsTrigger value="alerts">Offline Alerts</TabsTrigger>
              <TabsTrigger value="templates">Device Templates</TabsTrigger>
              <TabsTrigger value="guide">Setup Guide</TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deviceTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-all">
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600">
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
                          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
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
                          <Fuel className="h-4 w-4 text-orange-600" aria-hidden="true" />
                          Fuel Management
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
                          <Zap className="h-4 w-4 text-yellow-600" aria-hidden="true" />
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
                          <li>• MIL/Check Engine Status</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-emerald-600" aria-hidden="true" />
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
                          <li>• Speed Governor/Limiter (Compliance)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950 dark:to-blue-950 rounded-lg border">
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                        ✅ Optimized for Ethiopian Market
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-200">
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

        {/* Add Device Dialog */}
        <AddDeviceDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleAddDevice}
          isSubmitting={addDeviceMutation.isPending}
          vehicles={vehicles}
          devices={devices}
        />
      </div>
    </Layout>
  );
};

export default DeviceIntegration;
