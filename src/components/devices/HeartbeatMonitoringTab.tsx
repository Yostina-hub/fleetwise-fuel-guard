import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDevices } from "@/hooks/useDevices";
import { Activity, Signal, WifiOff, Wifi, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";

export const HeartbeatMonitoringTab = () => {
  const { devices, isLoading, testHeartbeat } = useDevices();

  const isDeviceOnline = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) return false;
    const lastComm = new Date(lastHeartbeat);
    const now = new Date();
    const minutesSince = (now.getTime() - lastComm.getTime()) / 1000 / 60;
    return minutesSince <= 5;
  };

  const getHealthScore = (device: any) => {
    if (!device.last_heartbeat) return 0;
    const lastComm = new Date(device.last_heartbeat);
    const now = new Date();
    const minutesSince = (now.getTime() - lastComm.getTime()) / 1000 / 60;
    
    if (minutesSince <= 5) return 100;
    if (minutesSince <= 15) return 75;
    if (minutesSince <= 60) return 50;
    if (minutesSince <= 1440) return 25; // 24 hours
    return 0;
  };

  const onlineDevices = devices?.filter(d => isDeviceOnline(d.last_heartbeat)) || [];
  const offlineDevices = devices?.filter(d => !isDeviceOnline(d.last_heartbeat)) || [];
  const averageHealth = devices && devices.length > 0
    ? devices.reduce((acc, d) => acc + getHealthScore(d), 0) / devices.length
    : 0;

  if (isLoading) {
    return <div className="text-center py-8">Loading heartbeat data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Heartbeat Monitoring</h2>
        <p className="text-muted-foreground">
          Real-time device connectivity and health status
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Signal className="h-4 w-4" />
              Online Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {onlineDevices.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 5 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              Offline Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {offlineDevices.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No signal &gt;5 min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Fleet Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageHealth.toFixed(0)}%
            </div>
            <Progress value={averageHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Alert Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {offlineDevices.length > 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-xl font-bold text-red-600">
                    {offlineDevices.length} Issues
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-xl font-bold text-green-600">
                    All Good
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-green-600" />
            Online Devices
          </CardTitle>
          <CardDescription>
            Devices actively sending heartbeat signals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Tracker Model</TableHead>
                <TableHead>SIM Card</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {onlineDevices.map((device) => {
                const health = getHealthScore(device);
                return (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">
                      {device.vehicles?.plate_number || "Unassigned"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                    <TableCell>{device.tracker_model}</TableCell>
                    <TableCell className="font-mono text-sm">{device.sim_msisdn || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Signal className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={health} className="w-20" />
                        <span className="text-sm font-medium">{health}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testHeartbeat.mutate(device.id)}
                      >
                        <Activity className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {onlineDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No online devices
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Offline Devices */}
      {offlineDevices.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <WifiOff className="h-5 w-5" />
              Offline Devices
            </CardTitle>
            <CardDescription>
              Devices not sending heartbeat signals - requires attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Tracker Model</TableHead>
                  <TableHead>SIM Card</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offlineDevices.map((device) => (
                  <TableRow key={device.id} className="bg-red-50">
                    <TableCell className="font-medium">
                      {device.vehicles?.plate_number || "Unassigned"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                    <TableCell>{device.tracker_model}</TableCell>
                    <TableCell className="font-mono text-sm">{device.sim_msisdn || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <WifiOff className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">
                          {device.last_heartbeat 
                            ? formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })
                            : "Never"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        No Signal
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testHeartbeat.mutate(device.id)}
                      >
                        <Activity className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
