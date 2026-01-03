import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Car, Clock, Link2, Settings, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Device {
  id: string;
  imei: string;
  tracker_model: string;
  vehicle_id: string | null;
  last_heartbeat: string | null;
  status: string;
  vehicles?: { plate_number: string } | null;
}

interface DeviceHealthSummaryProps {
  devices: Device[] | undefined;
  onAssignVehicle?: (device: Device) => void;
  onConfigureAlerts?: () => void;
  hasOfflineAlerts?: boolean;
}

export const DeviceHealthSummary = ({
  devices,
  onAssignVehicle,
  onConfigureAlerts,
  hasOfflineAlerts = false,
}: DeviceHealthSummaryProps) => {
  const stats = useMemo(() => {
    if (!devices || devices.length === 0) {
      return {
        total: 0,
        unassigned: [],
        staleHeartbeat: [],
        offline: [],
        healthy: 0,
      };
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const unassigned = devices.filter(d => !d.vehicle_id);
    const staleHeartbeat = devices.filter(d => {
      if (!d.last_heartbeat) return true;
      const lastHb = new Date(d.last_heartbeat);
      return lastHb < oneHourAgo;
    });
    const offline = devices.filter(d => {
      if (!d.last_heartbeat) return true;
      const lastHb = new Date(d.last_heartbeat);
      return lastHb < fiveMinutesAgo;
    });
    const healthy = devices.filter(d => {
      if (!d.vehicle_id) return false;
      if (!d.last_heartbeat) return false;
      const lastHb = new Date(d.last_heartbeat);
      return lastHb >= fiveMinutesAgo;
    });

    return {
      total: devices.length,
      unassigned,
      staleHeartbeat,
      offline,
      healthy: healthy.length,
    };
  }, [devices]);

  if (!devices || devices.length === 0) {
    return null;
  }

  const hasIssues = stats.unassigned.length > 0 || stats.staleHeartbeat.length > 0 || !hasOfflineAlerts;

  if (!hasIssues) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          Device Health Issues
        </CardTitle>
        <CardDescription>
          {stats.total} devices registered • {stats.healthy} fully operational
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unassigned Devices */}
        {stats.unassigned.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span className="font-medium text-sm">
                  {stats.unassigned.length} device{stats.unassigned.length > 1 ? 's' : ''} not assigned to vehicles
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.unassigned.slice(0, 5).map(device => (
                <Badge
                  key={device.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900"
                  onClick={() => onAssignVehicle?.(device)}
                >
                  <Car className="h-3 w-3 mr-1" aria-hidden="true" />
                  {device.imei.slice(-6)}
                </Badge>
              ))}
              {stats.unassigned.length > 5 && (
                <Badge variant="outline">+{stats.unassigned.length - 5} more</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Assign devices to vehicles to enable fleet tracking
            </p>
          </div>
        )}

        {/* Stale Heartbeat */}
        {stats.staleHeartbeat.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="font-medium text-sm">
                {stats.staleHeartbeat.length} device{stats.staleHeartbeat.length > 1 ? 's' : ''} with stale data (no heartbeat in 1+ hour)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.staleHeartbeat.slice(0, 5).map(device => (
                <Badge
                  key={device.id}
                  variant="outline"
                  className="text-amber-700 border-amber-300"
                >
                  <WifiOff className="h-3 w-3 mr-1" aria-hidden="true" />
                  {device.vehicles?.plate_number || device.imei.slice(-6)}
                  {device.last_heartbeat && (
                    <span className="ml-1 text-xs opacity-70">
                      ({formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })})
                    </span>
                  )}
                </Badge>
              ))}
              {stats.staleHeartbeat.length > 5 && (
                <Badge variant="outline">+{stats.staleHeartbeat.length - 5} more</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Check device power, SIM card connectivity, or use "Test Heartbeat" to verify
            </p>
          </div>
        )}

        {/* Offline Alerts Not Configured */}
        {!hasOfflineAlerts && (
          <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span className="font-medium text-sm">
                  Offline alerts not configured
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onConfigureAlerts}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                Configure Alerts
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set up email/SMS notifications when devices go offline
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
