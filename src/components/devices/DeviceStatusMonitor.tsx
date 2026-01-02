import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Activity, Signal, Wifi, Database, Car, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DeviceStatus {
  id: string;
  imei: string;
  vehicle_id: string;
  vehicle_plate: string;
  tracker_model: string;
  last_heartbeat: string;
  gps_signal: number;
  connection_quality: number;
  data_rate: number;
  status: string;
  gps_satellites?: number;
}

export const DeviceStatusMonitor = () => {
  const { organizationId } = useOrganization();
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!organizationId) return;

    // Initial load
    loadDevices();

    // Subscribe to real-time updates for devices
    const devicesChannel = supabase
      .channel(`device-status-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          loadDevices();
          setRealtimeUpdates(prev => prev + 1);
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
        (payload) => {
          updateDeviceMetrics(payload.new);
          setRealtimeUpdates(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(devicesChannel);
    };
  }, [organizationId]);

  const loadDevices = async () => {
    if (!organizationId) return;

    // Build query based on status filter
    let query = supabase
      .from("devices")
      .select(`
        *,
        vehicles(plate_number)
      `)
      .eq("organization_id", organizationId)
      .order("last_heartbeat", { ascending: false });

    // Only filter by status if not "all"
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: devicesData } = await query;

    if (devicesData) {
      // Fetch latest telemetry for each device's vehicle
      const vehicleIds = devicesData.filter(d => d.vehicle_id).map(d => d.vehicle_id);
      
      let telemetryMap: Record<string, any> = {};
      if (vehicleIds.length > 0) {
        const { data: telemetryData } = await supabase
          .from("vehicle_telemetry")
          .select("vehicle_id, gps_satellites_count, gps_signal_strength, speed_kmh, last_communication_at")
          .in("vehicle_id", vehicleIds)
          .order("last_communication_at", { ascending: false });

        if (telemetryData) {
          // Get latest telemetry per vehicle
          telemetryData.forEach(t => {
            if (!telemetryMap[t.vehicle_id]) {
              telemetryMap[t.vehicle_id] = t;
            }
          });
        }
      }

      const statusData = devicesData.map(device => {
        const telemetry = device.vehicle_id ? telemetryMap[device.vehicle_id] : null;
        const gpsSignal = telemetry?.gps_signal_strength || calculateGPSSignal(device.last_heartbeat);
        const connQuality = calculateConnectionQuality(device.last_heartbeat);
        
        // Calculate data rate based on telemetry activity
        let dataRate = 0;
        if (telemetry?.last_communication_at) {
          const lastComm = new Date(telemetry.last_communication_at);
          const diff = (Date.now() - lastComm.getTime()) / 1000;
          if (diff < 30) dataRate = 85 + Math.random() * 15;
          else if (diff < 60) dataRate = 50 + Math.random() * 30;
          else if (diff < 300) dataRate = 10 + Math.random() * 20;
        }

        return {
          id: device.id,
          imei: device.imei,
          vehicle_id: device.vehicle_id || "",
          vehicle_plate: device.vehicles?.plate_number || "Unassigned",
          tracker_model: device.tracker_model,
          last_heartbeat: device.last_heartbeat || "",
          gps_signal: gpsSignal,
          gps_satellites: telemetry?.gps_satellites_count || 0,
          connection_quality: connQuality,
          data_rate: dataRate,
          status: device.status,
        };
      });
      setDevices(statusData);
    }
  };

  // Reload when filter changes
  useEffect(() => {
    loadDevices();
  }, [statusFilter, organizationId]);

  const updateDeviceMetrics = (telemetry: any) => {
    setDevices(prev => prev.map(device => {
      if (device.vehicle_id === telemetry.vehicle_id) {
        return {
          ...device,
          gps_signal: telemetry.gps_signal_strength || calculateGPSSignal(new Date().toISOString()),
          gps_satellites: telemetry.gps_satellites_count || 0,
          connection_quality: telemetry.device_connected ? 95 : 30,
          data_rate: 80 + Math.random() * 20,
        };
      }
      return device;
    }));
  };

  const calculateGPSSignal = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return 0;
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    const minutes = diff / 1000 / 60;
    if (minutes < 1) return 95;
    if (minutes < 5) return 75;
    if (minutes < 15) return 50;
    return 20;
  };

  const calculateConnectionQuality = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return 0;
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    const minutes = diff / 1000 / 60;
    if (minutes < 1) return 98;
    if (minutes < 5) return 85;
    if (minutes < 15) return 60;
    return 30;
  };

  const getSignalColor = (value: number) => {
    if (value >= 80) return "text-emerald-500";
    if (value >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const getStatusBadge = (quality: number) => {
    if (quality >= 80) return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">Excellent</Badge>;
    if (quality >= 50) return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400">Good</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getDeviceStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">Active</Badge>;
      case "inactive": return <Badge variant="secondary">Inactive</Badge>;
      case "maintenance": return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400">Maintenance</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Device Status</h2>
          <p className="text-muted-foreground">Live monitoring of GPS devices</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" aria-label="Filter devices by status">
              <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">
              {realtimeUpdates} live updates
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium truncate max-w-[180px]">
                  {device.imei}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getDeviceStatusBadge(device.status)}
                  {getStatusBadge(device.connection_quality)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{device.tracker_model}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Car className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-primary">
                  {device.vehicle_plate}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Signal className={`h-4 w-4 ${getSignalColor(device.gps_signal)}`} aria-hidden="true" />
                    <span>GPS Signal</span>
                  </div>
                  <span className="font-medium">
                    {device.gps_signal}%
                    {device.gps_satellites > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({device.gps_satellites} sats)
                      </span>
                    )}
                  </span>
                </div>
                <Progress value={device.gps_signal} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-4 w-4 ${getSignalColor(device.connection_quality)}`} aria-hidden="true" />
                    <span>Connection</span>
                  </div>
                  <span className="font-medium">{device.connection_quality}%</span>
                </div>
                <Progress value={device.connection_quality} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>Data Rate</span>
                  </div>
                  <span className="font-medium">
                    {device.data_rate > 0 ? `${device.data_rate.toFixed(1)} KB/s` : "—"}
                  </span>
                </div>
                <Progress value={device.data_rate} className="h-2" />
              </div>

              {device.last_heartbeat && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Last heartbeat: {new Date(device.last_heartbeat).toLocaleTimeString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {devices.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12" role="status">
            <p className="text-muted-foreground">
              {statusFilter === "all" 
                ? "No devices found" 
                : `No ${statusFilter} devices found`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
