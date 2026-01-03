import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRawTelemetry, RawTelemetryRecord } from "@/hooks/useRawTelemetry";
import { useDevices } from "@/hooks/useDevices";
import { formatDistanceToNow, format } from "date-fns";
import { 
  RefreshCw, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Radio,
  Code,
  FileJson,
  Filter
} from "lucide-react";

const PROTOCOLS = [
  { value: "all", label: "All Protocols" },
  { value: "JSON", label: "JSON" },
  { value: "TK103", label: "TK103" },
  { value: "H02", label: "H02/Sinotrack" },
  { value: "GT06", label: "GT06/Concox" },
  { value: "QUECLINK", label: "Queclink" },
  { value: "TELTONIKA", label: "Teltonika" },
  { value: "RUPTELA", label: "Ruptela" },
  { value: "MEITRACK", label: "Meitrack" },
  { value: "YTWL", label: "YTWL" },
  { value: "OSMAND", label: "OsmAnd" },
];

export const RawTelemetryTab = () => {
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<RawTelemetryRecord | null>(null);
  
  const { telemetry, isLoading, refetch } = useRawTelemetry({
    protocol: protocolFilter !== "all" ? protocolFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    deviceId: deviceFilter !== "all" ? deviceFilter : undefined,
    limit: 100,
  });

  const { devices } = useDevices();

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      processed: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle },
      pending: { color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
      failed: { color: "bg-red-500/10 text-red-700 border-red-500/20", icon: XCircle },
    };

    const { color, icon: Icon } = config[status || 'pending'] || config.pending;
    return (
      <Badge variant="outline" className={color}>
        <Icon className="mr-1 h-3 w-3" />
        {status || 'pending'}
      </Badge>
    );
  };

  const getProtocolBadge = (protocol?: string) => {
    const colors: Record<string, string> = {
      JSON: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      TK103: "bg-purple-500/10 text-purple-700 border-purple-500/20",
      H02: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      GT06: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      QUECLINK: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
      TELTONIKA: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
      RUPTELA: "bg-pink-500/10 text-pink-700 border-pink-500/20",
      MEITRACK: "bg-orange-500/10 text-orange-700 border-orange-500/20",
      YTWL: "bg-teal-500/10 text-teal-700 border-teal-500/20",
    };
    return (
      <Badge variant="outline" className={colors[protocol || ''] || "bg-muted text-muted-foreground"}>
        {protocol || 'Unknown'}
      </Badge>
    );
  };

  const formatPayloadPreview = (payload?: Record<string, any>) => {
    if (!payload) return '-';
    const keys = Object.keys(payload);
    if (keys.length === 0) return '-';
    
    // Show key info fields
    const preview: string[] = [];
    if (payload.imei) preview.push(`IMEI: ${payload.imei}`);
    if (payload.lat && payload.lng) preview.push(`Loc: ${payload.lat?.toString().slice(0, 8)}, ${payload.lng?.toString().slice(0, 8)}`);
    if (payload.speed) preview.push(`Speed: ${payload.speed}`);
    
    return preview.length > 0 ? preview.join(' | ') : `${keys.length} fields`;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading telemetry data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Raw Telemetry Viewer</h2>
          <p className="text-muted-foreground">
            View and debug incoming GPS data packets
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={protocolFilter} onValueChange={setProtocolFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Protocol" />
              </SelectTrigger>
              <SelectContent>
                {PROTOCOLS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices?.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.imei} - {d.tracker_model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{telemetry?.length || 0}</p>
              </div>
              <Radio className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-2xl font-bold">{telemetry?.filter(t => t.processing_status === 'processed').length || 0}</p>
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
                <p className="text-2xl font-bold">{telemetry?.filter(t => t.processing_status === 'failed').length || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Protocols</p>
                <p className="text-2xl font-bold">
                  {new Set(telemetry?.map(t => t.protocol).filter(Boolean)).size}
                </p>
              </div>
              <Code className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Table */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Telemetry Records</CardTitle>
          <CardDescription>Recent GPS data packets received from devices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Parsed Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {telemetry?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No telemetry records found
                  </TableCell>
                </TableRow>
              ) : (
                telemetry?.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm">
                      <div>{formatDistanceToNow(new Date(record.received_at), { addSuffix: true })}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(record.received_at), 'HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{record.devices?.imei || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{record.devices?.tracker_model}</div>
                    </TableCell>
                    <TableCell>{getProtocolBadge(record.protocol)}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="text-xs font-mono truncate">
                        {formatPayloadPreview(record.parsed_payload)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.processing_status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Telemetry Record Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Received At</label>
                  <p>{selectedRecord?.received_at && format(new Date(selectedRecord.received_at), 'PPpp')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Protocol</label>
                  <p>{getProtocolBadge(selectedRecord?.protocol)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Device IMEI</label>
                  <p className="font-mono">{selectedRecord?.devices?.imei || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p>{getStatusBadge(selectedRecord?.processing_status)}</p>
                </div>
              </div>

              {selectedRecord?.raw_hex && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Raw Data</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {selectedRecord.raw_hex}
                  </pre>
                </div>
              )}

              {selectedRecord?.parsed_payload && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Parsed Payload</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedRecord.parsed_payload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedRecord?.processing_error && (
                <div>
                  <label className="text-sm font-medium text-red-500">Processing Error</label>
                  <pre className="mt-1 p-3 bg-red-50 dark:bg-red-950 rounded-md text-xs font-mono text-red-700 dark:text-red-300">
                    {selectedRecord.processing_error}
                  </pre>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
