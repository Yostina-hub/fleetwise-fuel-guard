import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDeviceCommands, COMMAND_TYPES, DeviceCommand } from "@/hooks/useDeviceCommands";
import { useDevices } from "@/hooks/useDevices";
import { formatDistanceToNow } from "date-fns";
import { 
  Send, 
  RefreshCw, 
  XCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Terminal,
  Zap,
  Gauge,
  Power,
  MapPin
} from "lucide-react";

export const DeviceCommandsTab = () => {
  const { commands, isLoading, sendCommand, cancelCommand, retryCommand } = useDeviceCommands();
  const { devices } = useDevices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [commandType, setCommandType] = useState("");
  const [commandPayload, setCommandPayload] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "critical">("normal");

  const handleSendCommand = async () => {
    if (!selectedDevice || !commandType) return;

    let payload = {};
    try {
      payload = commandPayload ? JSON.parse(commandPayload) : {};
    } catch {
      payload = { raw: commandPayload };
    }

    const device = devices?.find(d => d.id === selectedDevice);

    await sendCommand.mutateAsync({
      device_id: selectedDevice,
      vehicle_id: device?.vehicle_id,
      command_type: commandType,
      command_payload: payload,
      priority,
    });

    setIsDialogOpen(false);
    setSelectedDevice("");
    setCommandType("");
    setCommandPayload("");
    setPriority("normal");
  };

  const getStatusBadge = (status: DeviceCommand['status']) => {
    const config = {
      pending: { color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
      sent: { color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Send },
      acknowledged: { color: "bg-purple-500/10 text-purple-700 border-purple-500/20", icon: CheckCircle },
      executed: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle },
      failed: { color: "bg-red-500/10 text-red-700 border-red-500/20", icon: XCircle },
      expired: { color: "bg-muted text-muted-foreground", icon: Clock },
    };

    const { color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={color}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-muted text-muted-foreground",
      normal: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      high: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      critical: "bg-red-500/10 text-red-700 border-red-500/20",
    };
    return <Badge variant="outline" className={colors[priority] || colors.normal}>{priority}</Badge>;
  };

  const getCommandIcon = (type: string) => {
    const icons: Record<string, any> = {
      set_speed_limit: Gauge,
      engine_cut: Power,
      engine_restore: Zap,
      get_location: MapPin,
      custom: Terminal,
    };
    const Icon = icons[type] || Terminal;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  const getPayloadPreview = (type: string, payload: Record<string, any>) => {
    if (type === 'set_speed_limit') return `${payload.speed_limit || payload.value} km/h`;
    if (type === 'set_interval') return `${payload.interval || payload.value} seconds`;
    if (Object.keys(payload).length === 0) return '-';
    return JSON.stringify(payload).substring(0, 50) + (JSON.stringify(payload).length > 50 ? '...' : '');
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading commands...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Device Commands</h2>
          <p className="text-muted-foreground">
            Send commands to GPS devices and monitor their execution
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              Send Command
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Device Command</DialogTitle>
              <DialogDescription>
                Queue a command to be sent to the GPS device
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Target Device</Label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices?.filter(d => d.status === 'active').map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.imei} - {device.tracker_model}
                        {device.vehicles && ` (${device.vehicles.plate_number})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Command Type</Label>
                <Select value={commandType} onValueChange={setCommandType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select command" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMAND_TYPES.map(cmd => (
                      <SelectItem key={cmd.value} value={cmd.value}>
                        <div className="flex flex-col">
                          <span>{cmd.label}</span>
                          <span className="text-xs text-muted-foreground">{cmd.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payload (JSON or value)</Label>
                <Textarea 
                  value={commandPayload}
                  onChange={(e) => setCommandPayload(e.target.value)}
                  placeholder={commandType === 'set_speed_limit' ? '{"speed_limit": 80}' : 'Enter command payload...'}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSendCommand} 
                disabled={!selectedDevice || !commandType || sendCommand.isPending}
              >
                {sendCommand.isPending ? "Sending..." : "Send Command"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{commands?.filter(c => c.status === 'pending').length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Executed</p>
                <p className="text-2xl font-bold">{commands?.filter(c => c.status === 'executed').length || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{commands?.filter(c => c.status === 'failed').length || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total (24h)</p>
                <p className="text-2xl font-bold">{commands?.length || 0}</p>
              </div>
              <Terminal className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Command History</CardTitle>
          <CardDescription>Recent commands sent to devices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Command</TableHead>
                <TableHead>Payload</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commands?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No commands have been sent yet
                  </TableCell>
                </TableRow>
              ) : (
                commands?.map(cmd => (
                  <TableRow key={cmd.id}>
                    <TableCell>
                      <div className="font-medium">{cmd.devices?.imei || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">
                        {cmd.vehicles?.plate_number || 'Unassigned'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCommandIcon(cmd.command_type)}
                        <span className="capitalize">{cmd.command_type.replace(/_/g, ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {getPayloadPreview(cmd.command_type, cmd.command_payload)}
                    </TableCell>
                    <TableCell>{getPriorityBadge(cmd.priority)}</TableCell>
                    <TableCell>{getStatusBadge(cmd.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(cmd.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {cmd.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => cancelCommand.mutate(cmd.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {(cmd.status === 'failed' || cmd.status === 'expired') && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => retryCommand.mutate(cmd.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
