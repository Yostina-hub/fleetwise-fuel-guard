import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Gauge,
  AlertTriangle,
  CheckCircle,
  Settings,
  Send,
  Bell,
  Activity,
  Shield,
  Clock,
  MapPin,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useSpeedGovernor } from "@/hooks/useSpeedGovernor";
import { LiveTelemetryCard } from "@/components/speedgovernor/LiveTelemetryCard";
import { GovernorMapView } from "@/components/speedgovernor/GovernorMapView";
import { RoutePlaybackMap } from "@/components/speedgovernor/RoutePlaybackMap";
import { GpsSignalHistoryChart } from "@/components/speedgovernor/GpsSignalHistoryChart";
import { TrafficFlowAnalysis } from "@/components/speedgovernor/TrafficFlowAnalysis";
import { ViolationsTable } from "@/components/speedgovernor/ViolationsTable";
import { ComplianceReportGenerator } from "@/components/speedgovernor/ComplianceReportGenerator";
import { SpeedLimitZonesTab } from "@/components/speedgovernor/SpeedLimitZonesTab";
import { AlertRulesTab } from "@/components/speedgovernor/AlertRulesTab";
import { CommandHistoryCard } from "@/components/speedgovernor/CommandHistoryCard";

const SpeedGovernor = () => {
  const { organizationId } = useOrganization();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  const { kpis, kpisLoading, updateConfig } = useSpeedGovernor();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [speedLimit, setSpeedLimit] = useState<number>(80);
  const [isGovernorActive, setIsGovernorActive] = useState(true);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-with-governors", organizationId],
    queryFn: async () => {
      // Fetch vehicles that have speed governor configs
      const { data: governorConfigs, error } = await supabase
        .from("speed_governor_config")
        .select(`
          id,
          vehicle_id,
          max_speed_limit,
          governor_active,
          updated_at,
          vehicles:vehicle_id(
            id,
            plate_number,
            devices(
              id,
              status,
              last_heartbeat
            )
          )
        `)
        .eq("organization_id", organizationId!);

      if (error) throw error;

      // Transform data to match UI format
      return governorConfigs?.map((config: any) => ({
        id: config.vehicle_id,
        plate: config.vehicles?.plate_number || "Unknown",
        governorActive: config.governor_active,
        currentSpeed: 0, // Would come from real-time telemetry
        maxSpeed: config.max_speed_limit,
        violations: 0,
        lastUpdate: config.vehicles?.devices?.[0]?.last_heartbeat 
          ? new Date(config.vehicles.devices[0].last_heartbeat).toLocaleString()
          : "No signal",
        deviceId: config.vehicles?.devices?.[0]?.id,
        configId: config.id
      })) || [];
    },
    enabled: !!organizationId,
  });

  const handleSendCommand = () => {
    if (!selectedVehicle) return;
    updateConfig.mutate({ 
      vehicleId: selectedVehicle, 
      maxSpeedLimit: speedLimit,
      governorActive: isGovernorActive 
    });
  };

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10">
                <Gauge className="w-8 h-8 text-red-600" aria-hidden="true" />
              </div>
              Speed Governor Control
            </h1>
            <p className="text-muted-foreground mt-2">
              Ethiopian Compliance • Remote Speed Management • Real-time Monitoring
            </p>
          </div>
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <Gauge className="h-4 w-4" />
            Ethiopian Transport Authority Compliant
          </Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Governors</p>
                  {kpisLoading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold">{kpis?.activeGovernors || 0}/{kpis?.totalGovernors || 0}</p>
                  )}
                  <p className="text-xs text-green-600 mt-1">{kpis?.complianceRate || 0}% Compliance</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Violations</p>
                  {kpisLoading ? (
                    <div className="h-9 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold">{kpis?.todayViolations || 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis && kpis.yesterdayViolations > 0 
                      ? `${Math.round(((kpis.todayViolations - kpis.yesterdayViolations) / kpis.yesterdayViolations) * 100)}% from yesterday`
                      : "vs yesterday"}
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-orange-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Speed Limit</p>
                  {kpisLoading ? (
                    <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold">{kpis?.avgSpeedLimit || 80} km/h</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Fleet average</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Gauge className="h-8 w-8 text-blue-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alerts Sent</p>
                  {kpisLoading ? (
                    <div className="h-9 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold">{kpis?.alertsSent24h || 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Bell className="h-8 w-8 text-purple-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="control" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="control">Remote Control</TabsTrigger>
            <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="zones">Speed Zones</TabsTrigger>
            <TabsTrigger value="analytics">Traffic Analytics</TabsTrigger>
            <TabsTrigger value="playback">Route Playback</TabsTrigger>
            <TabsTrigger value="violations">Violations Log</TabsTrigger>
            <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
          </TabsList>

          {/* Remote Control Tab */}
          <TabsContent value="control" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
                    Remote Speed Configuration
                  </CardTitle>
                  <CardDescription>
                    Send speed limit commands to individual vehicles or groups
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="vehicle-select">Select Vehicle</Label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles?.filter((v) => v.id).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plate} - Current: {v.maxSpeed} km/h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="speed-limit">New Speed Limit (km/h)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="speed-limit"
                        type="number"
                        value={speedLimit}
                        onChange={(e) => setSpeedLimit(parseInt(e.target.value))}
                        min={30}
                        max={120}
                      />
                      <Button 
                        onClick={handleSendCommand} 
                        disabled={!selectedVehicle || updateConfig.isPending}
                      >
                        {updateConfig.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                        )}
                        Send
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => setSpeedLimit(60)}>60</Button>
                      <Button variant="outline" size="sm" onClick={() => setSpeedLimit(80)}>80</Button>
                      <Button variant="outline" size="sm" onClick={() => setSpeedLimit(100)}>100</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <Label htmlFor="governor-toggle">Governor Status</Label>
                      <p className="text-xs text-muted-foreground">Enable/Disable speed limiting</p>
                    </div>
                    <Switch
                      id="governor-toggle"
                      checked={isGovernorActive}
                      onCheckedChange={setIsGovernorActive}
                    />
                  </div>

                  <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Ethiopian Traffic Regulations
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                            Standard limits: Urban 30-50 km/h, Highways 80-100 km/h, Heavy vehicles max 80 km/h
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
                    Governor Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium">GPS Tracking</p>
                      <p className="text-xs text-muted-foreground">Real-time position & speed</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Speed Limiting</p>
                      <p className="text-xs text-muted-foreground">Automatic throttle control</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Remote Speed Control</p>
                      <p className="text-xs text-muted-foreground">Change limits over-the-air</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Over-speed Prevention</p>
                      <p className="text-xs text-muted-foreground">Physical engine limitation</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Compliance Reports</p>
                      <p className="text-xs text-muted-foreground">Audit trail for authorities</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Driver Alerts</p>
                      <p className="text-xs text-muted-foreground">Visual & audio warnings</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Voice Warnings</p>
                      <p className="text-xs text-muted-foreground">In-cab speed announcements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Command History */}
            <CommandHistoryCard />
          </TabsContent>

          {/* Live Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
                  Live Vehicle Telemetry
                </CardTitle>
                <CardDescription>
                  Real-time speed, GPS position, and governor status monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!vehicles || vehicles.length === 0 ? (
                  <div className="text-center py-12" role="status" aria-label="No speed governors found">
                    <Gauge className="h-16 w-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <h3 className="text-lg font-semibold mb-2">No Speed Governors Found</h3>
                    <p className="text-muted-foreground">
                      Add vehicles with speed governor devices to see live telemetry
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map((vehicle) => (
                      <LiveTelemetryCard
                        key={vehicle.id}
                        plate={vehicle.plate}
                        telemetry={telemetry[vehicle.id] || null}
                        maxSpeed={vehicle.maxSpeed}
                        governorActive={vehicle.governorActive}
                        isOnline={isVehicleOnline(vehicle.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Activity className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Real-time Updates</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Telemetry data updates automatically every few seconds. Green badges indicate active connections, 
                      while gray badges show offline devices.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <Activity className="h-3 w-3" aria-hidden="true" />
                        Live Speed Tracking
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        GPS Position
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" aria-hidden="true" />
                        Governor Status
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPS Signal History Charts */}
            {vehicles && vehicles.length > 0 && (
              <div className="space-y-4">
                {vehicles.map((vehicle) => (
                  <GpsSignalHistoryChart
                    key={vehicle.id}
                    vehicleId={vehicle.id}
                    hours={24}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Map View Tab */}
          <TabsContent value="map" className="space-y-4">
            <GovernorMapView
              vehicles={vehicles || []}
              telemetry={telemetry}
              isVehicleOnline={isVehicleOnline}
            />
          </TabsContent>

          {/* Speed Zones Tab */}
          <TabsContent value="zones" className="space-y-4">
            <SpeedLimitZonesTab />
          </TabsContent>

          {/* Traffic Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {organizationId && (
              <TrafficFlowAnalysis organizationId={organizationId} />
            )}
          </TabsContent>

          {/* Route Playback Tab */}
          <TabsContent value="playback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
                  Historical Route Playback
                </CardTitle>
                <CardDescription>
                  View vehicle routes over time with speed violations highlighted
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!vehicles || vehicles.length === 0 ? (
                  <div className="text-center py-12" role="status" aria-label="No vehicles found">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <h3 className="text-lg font-semibold mb-2">No Vehicles Found</h3>
                    <p className="text-muted-foreground">
                      Add vehicles with speed governor devices to view route history
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Vehicle Selection */}
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <Label htmlFor="playback-vehicle">Select Vehicle</Label>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                          <SelectTrigger id="playback-vehicle">
                            <SelectValue placeholder="Choose a vehicle to view route history" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.plate} - Max Speed: {vehicle.maxSpeed} km/h
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Route Playback Component */}
                    {selectedVehicle && (
                      <RoutePlaybackMap
                        vehicleId={selectedVehicle}
                        vehiclePlate={vehicles.find(v => v.id === selectedVehicle)?.plate || ""}
                        maxSpeed={vehicles.find(v => v.id === selectedVehicle)?.maxSpeed || 80}
                      />
                    )}

                    {!selectedVehicle && (
                      <Card className="border-dashed">
                        <CardContent className="pt-12 pb-12 text-center" role="status" aria-label="Select a vehicle">
                          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                          <p className="text-muted-foreground">
                            Select a vehicle above to view its route history and playback
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Log Tab */}
          <TabsContent value="violations">
            <ViolationsTable vehicles={(vehicles || []).map(v => ({ id: v.id, plate: v.plate }))} />
          </TabsContent>

          {/* Alert Rules Tab */}
          <TabsContent value="alerts">
            <AlertRulesTab />
          </TabsContent>

          {/* Compliance Reports Tab */}
          <TabsContent value="compliance">
            <ComplianceReportGenerator vehicles={(vehicles || []).map(v => ({ id: v.id, plate: v.plate, maxSpeed: v.maxSpeed }))} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SpeedGovernor;
