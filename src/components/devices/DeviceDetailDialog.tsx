import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDistanceToNow, format } from "date-fns";
import {
  Smartphone, Signal, Wifi, WifiOff, MapPin, Gauge, Fuel, Clock,
  Activity, Car, Radio, Shield, ShieldOff, Info, Terminal, CheckCircle, XCircle, Send
} from "lucide-react";

interface DeviceDetailDialogProps {
  device: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeviceDetailDialog = ({ device, open, onOpenChange }: DeviceDetailDialogProps) => {
  const { organizationId } = useOrganization();
  const [tab, setTab] = useState("info");

  const isOnline = device?.last_heartbeat
    ? (Date.now() - new Date(device.last_heartbeat).getTime()) / 1000 / 60 <= 5
    : false;

  // Recent telemetry for this device's vehicle
  const { data: telemetry = [] } = useQuery({
    queryKey: ["device-detail-telemetry", device?.vehicle_id],
    queryFn: async () => {
      if (!device?.vehicle_id) return [];
      const { data } = await supabase
        .from("vehicle_telemetry")
        .select("*")
        .eq("vehicle_id", device.vehicle_id)
        .order("last_communication_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: open && !!device?.vehicle_id,
  });

  // Recent commands
  const { data: commands = [] } = useQuery({
    queryKey: ["device-detail-commands", device?.id],
    queryFn: async () => {
      if (!device?.id) return [];
      const { data } = await (supabase as any)
        .from("device_commands")
        .select("*")
        .eq("device_id", device.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: open && !!device?.id,
  });

  if (!device) return null;

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 w-40 shrink-0 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-sm font-medium flex-1 min-w-0">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );

  const cmdStatusColor = (s: string) => {
    const m: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-700", sent: "bg-blue-500/10 text-blue-700",
      executed: "bg-emerald-500/10 text-emerald-700", failed: "bg-red-500/10 text-red-700",
      expired: "bg-muted text-muted-foreground",
    };
    return m[s] || m.pending;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <span className="font-mono">{device.imei}</span>
            {isOnline ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 gap-1">
                <Wifi className="h-3 w-3" /> Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><WifiOff className="h-3 w-3" /> Offline</Badge>
            )}
            <Badge variant="outline" className="capitalize">{device.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="info" className="gap-1 text-xs"><Info className="h-3 w-3" />Details</TabsTrigger>
            <TabsTrigger value="telemetry" className="gap-1 text-xs"><Activity className="h-3 w-3" />Telemetry</TabsTrigger>
            <TabsTrigger value="commands" className="gap-1 text-xs"><Terminal className="h-3 w-3" />Commands</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-3">
            <TabsContent value="info" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Device Information</h3>
                  <InfoRow label="IMEI" value={<span className="font-mono">{device.imei}</span>} icon={Smartphone} />
                  <InfoRow label="Tracker Model" value={device.tracker_model} icon={Radio} />
                  <InfoRow label="Serial Number" value={device.serial_number} />
                  <InfoRow label="Protocol" value={device.device_protocols?.protocol_name ? (
                    <Badge variant="outline" className="text-xs">{device.device_protocols.vendor} — {device.device_protocols.protocol_name}</Badge>
                  ) : "Auto-detect"} icon={Radio} />
                  <InfoRow label="Firmware" value={device.firmware_version} />
                  <InfoRow label="Install Date" value={device.install_date} icon={Clock} />
                  <InfoRow label="Auth Token" value={
                    device.auth_token_created_at ? (
                      <span className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        Generated {formatDistanceToNow(new Date(device.auth_token_created_at), { addSuffix: true })}
                      </span>
                    ) : <span className="flex items-center gap-1.5"><ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />None</span>
                  } icon={Shield} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vehicle & SIM</h3>
                  <InfoRow label="Vehicle" value={device.vehicles?.plate_number ? (
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono font-semibold">{device.vehicles.plate_number}</Badge>
                      <span className="text-muted-foreground text-xs">{device.vehicles.make} {device.vehicles.model}</span>
                    </span>
                  ) : "Unassigned"} icon={Car} />
                  <InfoRow label="SIM MSISDN" value={device.sim_msisdn ? <span className="font-mono">{device.sim_msisdn}</span> : null} icon={Smartphone} />
                  <InfoRow label="SIM ICCID" value={device.sim_iccid ? <span className="font-mono text-xs">{device.sim_iccid}</span> : null} />
                  <InfoRow label="APN" value={device.apn} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Connectivity</h3>
                  <InfoRow label="Last Heartbeat" value={device.last_heartbeat ? (
                    <span className="flex items-center gap-2">
                      {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
                      {formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })}
                    </span>
                  ) : "Never"} icon={Signal} />
                  <InfoRow label="Created" value={format(new Date(device.created_at), "PPp")} icon={Clock} />
                  <InfoRow label="Updated" value={format(new Date(device.updated_at), "PPp")} icon={Clock} />
                </CardContent>
              </Card>

              {device.notes && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</h3>
                    <p className="text-sm">{device.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="telemetry" className="mt-0">
              {!device.vehicle_id ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Assign a vehicle to view telemetry data</CardContent></Card>
              ) : telemetry.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No telemetry data received yet</CardContent></Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead>Fuel</TableHead>
                        <TableHead>Satellites</TableHead>
                        <TableHead>Connected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {telemetry.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">
                            {t.last_communication_at ? formatDistanceToNow(new Date(t.last_communication_at), { addSuffix: true }) : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {t.latitude && t.longitude ? (
                              <a href={`https://maps.google.com/?q=${t.latitude},${t.longitude}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{Number(t.latitude).toFixed(4)}, {Number(t.longitude).toFixed(4)}
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs">{t.speed_kmh != null ? `${t.speed_kmh} km/h` : "—"}</TableCell>
                          <TableCell className="text-xs">{t.fuel_level_percent != null ? (
                            <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{Number(t.fuel_level_percent).toFixed(1)}%</span>
                          ) : "—"}</TableCell>
                          <TableCell className="text-xs">{t.gps_satellites_count || "—"}</TableCell>
                          <TableCell>
                            {t.device_connected ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">Yes</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">No</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="commands" className="mt-0">
              {commands.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No commands sent to this device</CardContent></Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Command</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Executed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commands.map((cmd: any) => (
                        <TableRow key={cmd.id}>
                          <TableCell className="text-sm capitalize">{cmd.command_type?.replace(/_/g, " ")}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{cmd.priority}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={`text-xs capitalize ${cmdStatusColor(cmd.status)}`}>{cmd.status}</Badge></TableCell>
                          <TableCell className="text-xs">{formatDistanceToNow(new Date(cmd.created_at), { addSuffix: true })}</TableCell>
                          <TableCell className="text-xs">{cmd.executed_at ? formatDistanceToNow(new Date(cmd.executed_at), { addSuffix: true }) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
