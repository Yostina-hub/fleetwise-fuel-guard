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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const SpeedGovernor = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [speedLimit, setSpeedLimit] = useState<number>(80);
  const [isGovernorActive, setIsGovernorActive] = useState(true);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-with-governors", organizationId],
    queryFn: async () => {
      // Mock data - in production would filter devices with speed governor type
      return [
        { 
          id: "v1", 
          plate: "AA 1234 ET", 
          governorActive: true, 
          currentSpeed: 65, 
          maxSpeed: 80,
          violations: 3,
          lastUpdate: "2 min ago"
        },
        { 
          id: "v2", 
          plate: "AB 5678 ET", 
          governorActive: true, 
          currentSpeed: 45, 
          maxSpeed: 60,
          violations: 0,
          lastUpdate: "1 min ago"
        },
        { 
          id: "v3", 
          plate: "AC 9012 ET", 
          governorActive: false, 
          currentSpeed: 0, 
          maxSpeed: 80,
          violations: 12,
          lastUpdate: "5 min ago"
        },
      ];
    },
    enabled: !!organizationId,
  });

  // Mock violation events
  const violations = [
    {
      id: 1,
      vehicle: "AA 1234 ET",
      time: "2025-01-23 14:32:15",
      speed: 95,
      limit: 80,
      duration: "45s",
      location: "Addis-Adama Highway",
      severity: "high"
    },
    {
      id: 2,
      vehicle: "AC 9012 ET",
      time: "2025-01-23 14:15:08",
      speed: 88,
      limit: 80,
      duration: "2m 12s",
      location: "Debre Zeit Road",
      severity: "medium"
    },
    {
      id: 3,
      vehicle: "AA 1234 ET",
      time: "2025-01-23 13:45:22",
      speed: 92,
      limit: 80,
      duration: "1m 05s",
      location: "Ring Road",
      severity: "medium"
    },
  ];

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
                <Gauge className="w-8 h-8 text-red-600" />
              </div>
              Speed Governor Control
            </h1>
            <p className="text-muted-foreground mt-2">
              Ethiopian Compliance • Remote Speed Management • Real-time Monitoring
            </p>
          </div>
          <Button onClick={handleGenerateReport} className="gap-2">
            <Download className="h-4 w-4" />
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
                  <CheckCircle className="h-8 w-8 text-green-600" />
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
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
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
                  <Gauge className="h-8 w-8 text-blue-600" />
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
                  <Bell className="h-8 w-8 text-purple-600" />
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
            <TabsTrigger value="violations">Violations Log</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
          </TabsList>

          {/* Remote Control Tab */}
          <TabsContent value="control" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
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
                        <Send className="h-4 w-4 mr-2" />
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
                        <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
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
                    <Activity className="h-5 w-5 text-primary" />
                    Governor Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">GPS Tracking</p>
                      <p className="text-xs text-muted-foreground">Real-time position & speed</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Speed Limiting</p>
                      <p className="text-xs text-muted-foreground">Automatic throttle control</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Remote Speed Control</p>
                      <p className="text-xs text-muted-foreground">Change limits over-the-air</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Over-speed Prevention</p>
                      <p className="text-xs text-muted-foreground">Physical engine limitation</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Compliance Reports</p>
                      <p className="text-xs text-muted-foreground">Audit trail for authorities</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Driver Alerts</p>
                      <p className="text-xs text-muted-foreground">Visual & audio warnings</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
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
          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <CardTitle>Live Vehicle Status</CardTitle>
                <CardDescription>Real-time governor status and speed monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Current Speed</TableHead>
                      <TableHead>Speed Limit</TableHead>
                      <TableHead>Governor</TableHead>
                      <TableHead>Violations Today</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles?.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.plate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <span className={vehicle.currentSpeed > vehicle.maxSpeed ? "text-destructive font-semibold" : ""}>
                              {vehicle.currentSpeed} km/h
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{vehicle.maxSpeed} km/h</TableCell>
                        <TableCell>
                          <Badge variant={vehicle.governorActive ? "default" : "destructive"}>
                            {vehicle.governorActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.violations === 0 ? "outline" : "destructive"}>
                            {vehicle.violations}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {vehicle.lastUpdate}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Configure {vehicle.plate}</DialogTitle>
                                <DialogDescription>
                                  Adjust speed governor settings for this vehicle
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Speed Limit</Label>
                                  <Input type="number" defaultValue={vehicle.maxSpeed} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label>Enable Governor</Label>
                                  <Switch defaultChecked={vehicle.governorActive} />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={() => toast({ title: "Settings Updated" })}>
                                  Apply Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Log Tab */}
          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
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
                    <FileText className="h-5 w-5 text-primary" />
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
                    <Download className="h-4 w-4 mr-2" />
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
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Governor activation status per vehicle</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Speed limit configuration history</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Total over-speed violations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Violation severity breakdown</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Compliance rate calculations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Ethiopian regulation adherence</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Driver alert statistics</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
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
