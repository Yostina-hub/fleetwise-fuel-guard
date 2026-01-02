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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Gauge,
  AlertTriangle,
  CheckCircle,
  Settings,
  Send,
  Download,
  FileText,
  Bell,
  Activity,
  Shield,
  Clock,
  TrendingUp,
  AlertCircle,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { LiveTelemetryCard } from "@/components/speedgovernor/LiveTelemetryCard";
import { GovernorMapView } from "@/components/speedgovernor/GovernorMapView";
import { RoutePlaybackMap } from "@/components/speedgovernor/RoutePlaybackMap";
import { RouteComparisonMap } from "@/components/speedgovernor/RouteComparisonMap";
import { GpsSignalHistoryChart } from "@/components/speedgovernor/GpsSignalHistoryChart";
import { TrafficFlowAnalysis } from "@/components/speedgovernor/TrafficFlowAnalysis";

const SpeedGovernor = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [speedLimit, setSpeedLimit] = useState<number>(80);
  const [isGovernorActive, setIsGovernorActive] = useState(true);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-with-governors", organizationId],
    queryFn: async () => {
      // Fetch vehicles with speed governor devices
      const { data: vehiclesWithDevices, error } = await supabase
        .from("vehicles")
        .select(`
          id,
          plate_number,
          devices!inner(
            id,
            tracker_model,
            status,
            last_heartbeat
          )
        `)
        .eq("organization_id", organizationId!)
        .ilike("devices.tracker_model", "%Governor%");

      if (error) throw error;

      // Transform data to match UI format
      return vehiclesWithDevices?.map((v: any) => ({
        id: v.id,
        plate: v.plate_number,
        governorActive: v.devices?.[0]?.status === "active",
        currentSpeed: 0, // Would come from real-time telemetry
        maxSpeed: 80, // Would be stored in device config
        violations: 0, // Would come from driver_events
        lastUpdate: v.devices?.[0]?.last_heartbeat 
          ? new Date(v.devices[0].last_heartbeat).toLocaleString()
          : "No signal",
        deviceId: v.devices?.[0]?.id,
        deviceModel: v.devices?.[0]?.tracker_model
      })) || [];
    },
    enabled: !!organizationId,
  });

  // Fetch real speed violation events
  const { data: violations = [] } = useQuery({
    queryKey: ["speed-violations", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_events")
        .select(`
          id,
          event_time,
          speed_kmh,
          speed_limit_kmh,
          address,
          vehicle_id,
          vehicles(plate_number)
        `)
        .eq("organization_id", organizationId!)
        .eq("event_type", "speeding")
        .order("event_time", { ascending: false })
        .limit(50);

      if (error) throw error;

      return data?.map((event: any) => ({
        id: event.id,
        vehicle: event.vehicles?.plate_number || "Unknown",
        time: new Date(event.event_time).toLocaleString(),
        speed: event.speed_kmh,
        limit: event.speed_limit_kmh || 80,
        duration: "N/A", // Calculate from event data if available
        location: event.address || "Location unknown",
        severity: event.speed_kmh > (event.speed_limit_kmh || 80) + 15 ? "high" : "medium"
      })) || [];
    },
    enabled: !!organizationId,
  });

  const handleSendCommand = () => {
    toast({
      title: "Command Sent",
      description: `Speed limit of ${speedLimit} km/h has been sent to the vehicle.`,
    });
    setIsConfigDialogOpen(false);
  };

  const handleGenerateReport = () => {
    toast({
      title: "Generating Report",
      description: "Compliance report is being generated...",
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
          <Button onClick={handleGenerateReport} className="gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            Compliance Report
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Governors</p>
                  <p className="text-3xl font-bold">2/3</p>
                  <p className="text-xs text-success mt-1">67% Compliance</p>
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
                  <p className="text-3xl font-bold">15</p>
                  <p className="text-xs text-warning mt-1">-23% from yesterday</p>
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
                  <p className="text-3xl font-bold">75 km/h</p>
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
                  <p className="text-3xl font-bold">28</p>
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
          <TabsList>
            <TabsTrigger value="control">Remote Control</TabsTrigger>
            <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="analytics">Traffic Analytics</TabsTrigger>
            <TabsTrigger value="playback">Route Playback</TabsTrigger>
            <TabsTrigger value="comparison">Route Comparison</TabsTrigger>
            <TabsTrigger value="violations">Violations Log</TabsTrigger>
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
                        {vehicles?.map((v) => (
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
                      <Button onClick={handleSendCommand} disabled={!selectedVehicle}>
                        <Send className="h-4 w-4 mr-2" aria-hidden="true" />
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

          {/* Route Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                  Multi-Vehicle Route Comparison
                </CardTitle>
                <CardDescription>
                  Compare routes and driving patterns across multiple vehicles with synchronized playback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RouteComparisonMap
                  availableVehicles={(vehicles || []).map(v => ({
                    id: v.id,
                    plate: v.plate,
                    maxSpeed: v.maxSpeed
                  }))}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Log Tab */}
          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                  Speed Violations Log
                </CardTitle>
                <CardDescription>Track and review all over-speed events</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Limit</TableHead>
                      <TableHead>Excess</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell className="font-mono text-xs">{violation.time}</TableCell>
                        <TableCell className="font-medium">{violation.vehicle}</TableCell>
                        <TableCell className="text-destructive font-semibold">
                          {violation.speed} km/h
                        </TableCell>
                        <TableCell>{violation.limit} km/h</TableCell>
                        <TableCell className="text-destructive">
                          +{violation.speed - violation.limit}
                        </TableCell>
                        <TableCell>{violation.duration}</TableCell>
                        <TableCell className="text-sm">{violation.location}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              violation.severity === 'high' ? 'destructive' : 
                              violation.severity === 'medium' ? 'default' : 'outline'
                            }
                          >
                            {violation.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Reports Tab */}
          <TabsContent value="compliance">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                    Generate Compliance Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Report Period</Label>
                    <Select defaultValue="week">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Vehicle Selection</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vehicles</SelectItem>
                        <SelectItem value="governors">Governor-Equipped Only</SelectItem>
                        {vehicles?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Report Format</Label>
                    <Select defaultValue="pdf">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" onClick={handleGenerateReport}>
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Report Contents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>Governor activation status per vehicle</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>Speed limit configuration history</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>Total over-speed violations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>Violation severity breakdown</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>Compliance rate calculations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>Ethiopian regulation adherence</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>Driver alert statistics</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span>GPS tracking verification</span>
                  </div>

                  <Card className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        📋 Regulatory Compliance
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-200">
                        Reports include all data required by Ethiopian Transport Authority for speed governor compliance verification
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SpeedGovernor;
