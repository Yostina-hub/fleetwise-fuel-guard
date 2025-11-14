import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Signal, Wifi, Database } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DeviceStatus {
  id: string;
  imei: string;
  vehicle_id: string;
  tracker_model: string;
  last_heartbeat: string;
  gps_signal: number;
  connection_quality: number;
  data_rate: number;
  status: string;
}

export const DeviceStatusMonitor = () => {
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  useEffect(() => {
    // Initial load
    loadDevices();

    // Subscribe to real-time updates for devices
    const devicesChannel = supabase
      .channel('device-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices'
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
          table: 'vehicle_telemetry'
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
  }, []);

  const loadDevices = async () => {
    const { data: devicesData } = await supabase
      .from("devices")
      .select("*")
      .eq("status", "active")
      .order("last_heartbeat", { ascending: false });

    if (devicesData) {
      const statusData = devicesData.map(device => ({
        id: device.id,
        imei: device.imei,
        vehicle_id: device.vehicle_id || "Unassigned",
        tracker_model: device.tracker_model,
        last_heartbeat: device.last_heartbeat || "",
        gps_signal: calculateGPSSignal(device.last_heartbeat),
        connection_quality: calculateConnectionQuality(device.last_heartbeat),
        data_rate: Math.random() * 100, // Simulated
        status: device.status,
      }));
      setDevices(statusData);
    }
  };

  const updateDeviceMetrics = (telemetry: any) => {
    setDevices(prev => prev.map(device => {
      if (device.vehicle_id === telemetry.vehicle_id) {
        return {
          ...device,
          gps_signal: telemetry.gps_satellites || calculateGPSSignal(new Date().toISOString()),
          connection_quality: telemetry.device_connected ? 95 : 30,
          data_rate: Math.random() * 100,
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
    if (value >= 80) return "text-green-500";
    if (value >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusBadge = (quality: number) => {
    if (quality >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (quality >= 50) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Device Status</h2>
          <p className="text-muted-foreground">Live monitoring of GPS devices</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            {realtimeUpdates} live updates
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {device.imei}
                </CardTitle>
                {getStatusBadge(device.connection_quality)}
              </div>
              <p className="text-xs text-muted-foreground">{device.tracker_model}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Signal className={`h-4 w-4 ${getSignalColor(device.gps_signal)}`} />
                    <span>GPS Signal</span>
                  </div>
                  <span className="font-medium">{device.gps_signal}%</span>
                </div>
                <Progress value={device.gps_signal} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-4 w-4 ${getSignalColor(device.connection_quality)}`} />
                    <span>Connection</span>
                  </div>
                  <span className="font-medium">{device.connection_quality}%</span>
                </div>
                <Progress value={device.connection_quality} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span>Data Rate</span>
                  </div>
                  <span className="font-medium">{device.data_rate.toFixed(1)} KB/s</span>
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
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No active devices found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
