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
import { DeviceCommandsTab } from "@/components/devices/DeviceCommandsTab";
import { RawTelemetryTab } from "@/components/devices/RawTelemetryTab";
import { deviceTemplates, DeviceTemplate } from "@/data/deviceTemplates";
import { DeviceSetupGuide } from "@/components/devices/DeviceSetupGuide";
import { useTranslation } from "react-i18next";
import { friendlyToastError } from "@/lib/errorMessages";

const DeviceIntegration = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");
  const [gatewayIp, setGatewayIp] = useState("");

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
      friendlyToastError(error);
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
      <div className="p-4 md:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('devices.title')}
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
              <TabsTrigger value="commands">{t('devices.commands', 'Commands')}</TabsTrigger>
              <TabsTrigger value="telemetry">Raw Telemetry</TabsTrigger>
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

          <TabsContent value="commands" className="space-y-4">
            <DeviceCommandsTab />
          </TabsContent>

          <TabsContent value="telemetry" className="space-y-4">
            <RawTelemetryTab />
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
            <DeviceSetupGuide serverIp={gatewayIp} onServerIpChange={setGatewayIp} />
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
