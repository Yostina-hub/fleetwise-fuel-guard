import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDevices } from "@/hooks/useDevices";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Signal, WifiOff, Wifi, AlertCircle, CheckCircle, Download, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";

export const HeartbeatMonitoringTab = () => {
  const { devices, isLoading, testHeartbeat } = useDevices();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('heartbeat-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          setLastRefresh(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_telemetry',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          setLastRefresh(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled]);

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
    if (minutesSince <= 1440) return 25;
    return 0;
  };

  const onlineDevices = devices?.filter(d => isDeviceOnline(d.last_heartbeat)) || [];
  const offlineDevices = devices?.filter(d => !isDeviceOnline(d.last_heartbeat)) || [];
  const averageHealth = devices && devices.length > 0
    ? devices.reduce((acc, d) => acc + getHealthScore(d), 0) / devices.length
    : 0;

  const exportHealthReport = () => {
    if (!devices || devices.length === 0) {
      toast({
        title: "No Data",
        description: "No devices to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Vehicle", "IMEI", "Tracker Model", "SIM Card", "Last Heartbeat", "Health Score", "Status"];
    const rows = devices.map(device => [
      device.vehicles?.plate_number || "Unassigned",
      device.imei,
      device.tracker_model,
      device.sim_msisdn || "No SIM",
      device.last_heartbeat ? new Date(device.last_heartbeat).toISOString() : "Never",
      `${getHealthScore(device)}%`,
      isDeviceOnline(device.last_heartbeat) ? "Online" : "Offline"
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heartbeat-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported health report for ${devices.length} devices`,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">Loading heartbeat data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Heartbeat Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time device connectivity and health status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className={`h-4 w-4 ${isAutoRefreshEnabled ? 'text-emerald-500 animate-pulse' : ''}`} aria-hidden="true" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
            aria-label={isAutoRefreshEnabled ? "Pause auto-refresh" : "Enable auto-refresh"}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isAutoRefreshEnabled ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isAutoRefreshEnabled ? 'Auto' : 'Paused'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportHealthReport} aria-label="Export health report">
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Signal className="h-4 w-4" aria-hidden="true" />
              Online Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
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
              <WifiOff className="h-4 w-4" aria-hidden="true" />
              Offline Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
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
              <Activity className="h-4 w-4" aria-hidden="true" />
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
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              Alert Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {offlineDevices.length > 0 ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                    <span className="text-xl font-bold text-destructive">
                      {offlineDevices.length} Issues
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
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
            <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Online Devices
          </CardTitle>
          <CardDescription>
            Devices actively sending heartbeat signals
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[900px]">
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
                      {device.vehicles?.plate_number || <span className="text-muted-foreground italic">Unassigned</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                    <TableCell>{device.tracker_model}</TableCell>
                    <TableCell className="font-mono text-sm">{device.sim_msisdn || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Signal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
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
                        aria-label={`Test heartbeat for device ${device.imei}`}
                      >
                        <Activity className="h-4 w-4 mr-1" aria-hidden="true" />
                        Test
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {onlineDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8" role="status">
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
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <WifiOff className="h-5 w-5" aria-hidden="true" />
              Offline Devices
            </CardTitle>
            <CardDescription>
              Devices not sending heartbeat signals - requires attention
            </CardDescription>
          </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[900px]">
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
                  <TableRow key={device.id} className="bg-destructive/5">
                    <TableCell className="font-medium">
                      {device.vehicles?.plate_number || <span className="text-muted-foreground italic">Unassigned</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                    <TableCell>{device.tracker_model}</TableCell>
                    <TableCell className="font-mono text-sm">{device.sim_msisdn || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <WifiOff className="h-4 w-4 text-destructive" aria-hidden="true" />
                        <span className="text-sm text-destructive">
                          {device.last_heartbeat 
                            ? formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })
                            : "Never"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                        No Signal
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testHeartbeat.mutate(device.id)}
                        aria-label={`Test heartbeat for device ${device.imei}`}
                      >
                        <Activity className="h-4 w-4 mr-1" aria-hidden="true" />
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
