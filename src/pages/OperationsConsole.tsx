import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Search, Filter, AlertTriangle, Bug, FileText, ArrowRight, RefreshCw, Clock, CheckCircle2, XCircle, AlertOctagon, Crosshair, Layers, Zap, Network } from "lucide-react";
import { useTranslation } from "react-i18next";

type LogLevel = "info" | "warn" | "error" | "debug";
type FaultSeverity = "minor" | "major" | "critical";
type FaultStatus = "detected" | "diagnosing" | "localized" | "resolved";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  traceId?: string;
  metadata?: Record<string, string>;
}

interface FaultRecord {
  id: string;
  timestamp: string;
  severity: FaultSeverity;
  status: FaultStatus;
  alarm: string;
  service: string;
  rootCause: string;
  impactedService: string;
  impactLevel: string;
  isIncident: boolean;
  resolution?: string;
}

interface TraceSpan {
  id: string;
  traceId: string;
  service: string;
  operation: string;
  duration: string;
  status: "ok" | "error";
  children?: TraceSpan[];
}

const levelColors: Record<LogLevel, string> = {
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  debug: "text-muted-foreground",
};

const severityConfig: Record<FaultSeverity, { color: string; bg: string }> = {
  minor: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  major: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
};

const faultStatusConfig: Record<FaultStatus, { color: string; icon: React.ReactNode }> = {
  detected: { color: "text-red-400", icon: <AlertOctagon className="h-4 w-4" /> },
  diagnosing: { color: "text-amber-400", icon: <Bug className="h-4 w-4" /> },
  localized: { color: "text-blue-400", icon: <Crosshair className="h-4 w-4" /> },
  resolved: { color: "text-green-400", icon: <CheckCircle2 className="h-4 w-4" /> },
};

const OperationsConsole = () => {
  const { t } = useTranslation();
  const [logSearch, setLogSearch] = useState("");
  const [logLevel, setLogLevel] = useState<string>("all");
  const [logService, setLogService] = useState<string>("all");

  const mockLogs: LogEntry[] = [
    { id: "1", timestamp: "2026-04-14T14:32:05Z", level: "info", service: "gps-gateway", message: "Device 862123456789012 connected on GT06 protocol", traceId: "tr-001" },
    { id: "2", timestamp: "2026-04-14T14:32:04Z", level: "info", service: "edge-function", message: "gps-data-receiver processed batch of 15 positions", traceId: "tr-002" },
    { id: "3", timestamp: "2026-04-14T14:32:03Z", level: "warn", service: "auth-service", message: "Rate limit approaching for IP 10.0.0.45 (8/10 attempts)", traceId: "tr-003" },
    { id: "4", timestamp: "2026-04-14T14:32:02Z", level: "error", service: "webhook-bridge", message: "ERP webhook delivery failed: timeout after 30s to erp.example.com", traceId: "tr-004" },
    { id: "5", timestamp: "2026-04-14T14:32:01Z", level: "info", service: "realtime", message: "48 active WebSocket subscriptions across 12 channels" },
    { id: "6", timestamp: "2026-04-14T14:32:00Z", level: "debug", service: "fuel-monitor", message: "Fuel level change detected: vehicle V-001 dropped 8.2% in 3 min" },
    { id: "7", timestamp: "2026-04-14T14:31:59Z", level: "info", service: "alert-engine", message: "Alert dispatched: speed_violation for vehicle ETH-1234, 127 km/h in 80 zone" },
    { id: "8", timestamp: "2026-04-14T14:31:58Z", level: "warn", service: "database", message: "Query took 2.3s on vehicle_telemetry_history (sequential scan detected)" },
    { id: "9", timestamp: "2026-04-14T14:31:57Z", level: "info", service: "mqtt-broker", message: "Client fleet-dashboard-01 subscribed to org/4bffdf8a/vehicles/+" },
    { id: "10", timestamp: "2026-04-14T14:31:56Z", level: "error", service: "sms-gateway", message: "SMS delivery failed: invalid phone format +25109xxxxxxx", traceId: "tr-005" },
    { id: "11", timestamp: "2026-04-14T14:31:55Z", level: "info", service: "cron-scheduler", message: "Maintenance reminder job completed: 3 notifications sent" },
    { id: "12", timestamp: "2026-04-14T14:31:54Z", level: "info", service: "gps-gateway", message: "Batch write: 50 telemetry records committed in 42ms" },
  ];

  const mockFaults: FaultRecord[] = [
    {
      id: "F-001", timestamp: "2026-04-14T14:30:00Z", severity: "critical", status: "resolved",
      alarm: "Database connection pool exhausted",
      service: "PostgreSQL", rootCause: "Unclosed connections from edge function gps-data-receiver during traffic spike",
      impactedService: "GPS Data Processing, Real-time Map, Alert Engine",
      impactLevel: "High — 3 services degraded for 4 minutes", isIncident: true,
      resolution: "Connection pooler restarted, edge function patched with connection timeout"
    },
    {
      id: "F-002", timestamp: "2026-04-14T13:15:00Z", severity: "major", status: "resolved",
      alarm: "ERP webhook delivery failure rate > 50%",
      service: "Webhook Bridge", rootCause: "External ERP endpoint returned 503 (maintenance window)",
      impactedService: "ERP Integration, Fuel Cost Sync",
      impactLevel: "Medium — webhook queue backed up, auto-retry after 15m", isIncident: false,
      resolution: "External ERP recovered, queue drained automatically"
    },
    {
      id: "F-003", timestamp: "2026-04-14T12:45:00Z", severity: "minor", status: "resolved",
      alarm: "Slow query detected on telemetry_history",
      service: "Database", rootCause: "Missing index on composite (vehicle_id, recorded_at) for range query",
      impactedService: "Route History, Reports",
      impactLevel: "Low — 2-3s delay on historical queries", isIncident: false,
      resolution: "Index created, query time reduced to 45ms"
    },
    {
      id: "F-004", timestamp: "2026-04-14T10:00:00Z", severity: "major", status: "detected",
      alarm: "Device offline count exceeds threshold (15 devices)",
      service: "TCP Gateway", rootCause: "Investigating — possible SIM provider outage in Addis Ababa region",
      impactedService: "Real-time Tracking, Geofence Alerts",
      impactLevel: "Medium — 15/312 devices unreachable", isIncident: false
    },
  ];

  const mockTraces: TraceSpan[] = [
    {
      id: "sp-1", traceId: "tr-001", service: "TCP Gateway", operation: "gt06.parse_packet", duration: "2ms", status: "ok",
      children: [
        { id: "sp-2", traceId: "tr-001", service: "TCP Gateway", operation: "db.batch_insert", duration: "38ms", status: "ok" },
        { id: "sp-3", traceId: "tr-001", service: "Edge Function", operation: "gps-data-receiver.process", duration: "45ms", status: "ok",
          children: [
            { id: "sp-4", traceId: "tr-001", service: "Database", operation: "INSERT vehicle_telemetry", duration: "12ms", status: "ok" },
            { id: "sp-5", traceId: "tr-001", service: "Alert Engine", operation: "evaluate_rules", duration: "8ms", status: "ok" },
          ]
        },
        { id: "sp-6", traceId: "tr-001", service: "Realtime", operation: "broadcast.vehicle_update", duration: "3ms", status: "ok" },
      ]
    },
  ];

  const filteredLogs = mockLogs.filter(log => {
    if (logLevel !== "all" && log.level !== logLevel) return false;
    if (logService !== "all" && log.service !== logService) return false;
    if (logSearch && !log.message.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const services = [...new Set(mockLogs.map(l => l.service))];

  const renderTraceSpan = (span: TraceSpan, depth = 0) => (
    <div key={span.id}>
      <div className={`flex items-center gap-2 py-2 px-3 hover:bg-muted/30 rounded ${depth > 0 ? "ml-" + (depth * 6) : ""}`} style={{ marginLeft: depth * 24 }}>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline" className="text-xs font-mono">{span.service}</Badge>
        <span className="text-sm">{span.operation}</span>
        <span className="ml-auto text-xs text-muted-foreground">{span.duration}</span>
        {span.status === "ok" ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
      </div>
      {span.children?.map(child => renderTraceSpan(child, depth + 1))}
    </div>
  );

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Terminal className="h-8 w-8 text-primary animate-float" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">Operations Console</h1>
            <p className="text-muted-foreground mt-1 text-lg">Unified log management, service tracing & fault diagnosis</p>
          </div>
        </div>

        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 glass p-1 h-12">
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" /> Log Management
            </TabsTrigger>
            <TabsTrigger value="tracing" className="gap-2">
              <Network className="h-4 w-4" /> Service Tracing
            </TabsTrigger>
            <TabsTrigger value="faults" className="gap-2">
              <AlertTriangle className="h-4 w-4" /> Fault Diagnosis
            </TabsTrigger>
          </TabsList>

          {/* Log Management */}
          <TabsContent value="logs" className="space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Unified Log Platform</CardTitle>
                    <CardDescription>Centralized operation, configuration, and audit log history</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search logs..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-9 w-64" />
                    </div>
                    <Select value={logLevel} onValueChange={setLogLevel}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={logService} onValueChange={setLogService}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        {services.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="font-mono text-sm space-y-1">
                    {filteredLogs.map(log => (
                      <div key={log.id} className="flex gap-3 py-1.5 px-2 hover:bg-muted/30 rounded group">
                        <span className="text-muted-foreground whitespace-nowrap text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <Badge variant="outline" className={`text-xs ${levelColors[log.level]} border-current/30`}>{log.level.toUpperCase()}</Badge>
                        <Badge variant="outline" className="text-xs">{log.service}</Badge>
                        <span className="flex-1">{log.message}</span>
                        {log.traceId && <span className="text-xs text-primary cursor-pointer opacity-0 group-hover:opacity-100">{log.traceId}</span>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Tracing */}
          <TabsContent value="tracing" className="space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5" /> Request Trace: GPS Position Ingestion</CardTitle>
                <CardDescription>End-to-end flow from device packet to database write and real-time broadcast</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {mockTraces.map(trace => renderTraceSpan(trace))}
                </div>
                <div className="mt-4 p-3 rounded-lg glass text-sm">
                  <p className="font-medium mb-2">Trace Summary</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-muted-foreground">
                    <div>Total Duration: <strong className="text-foreground">62ms</strong></div>
                    <div>Services: <strong className="text-foreground">4</strong></div>
                    <div>Spans: <strong className="text-foreground">6</strong></div>
                    <div>Status: <strong className="text-green-400">OK</strong></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong">
              <CardHeader>
                <CardTitle>Troubleshooting Tools</CardTitle>
                <CardDescription>Diagnose integration and data flow issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { title: "Device Connectivity Test", desc: "Verify device-to-gateway connection for a specific IMEI", icon: <Wifi className="h-5 w-5" /> },
                    { title: "Edge Function Debugger", desc: "View execution logs and performance for any function", icon: <Zap className="h-5 w-5" /> },
                    { title: "Database Query Analyzer", desc: "Identify slow queries and missing indexes", icon: <Bug className="h-5 w-5" /> },
                  ].map(tool => (
                    <Card key={tool.title} className="glass hover:border-primary/30 transition-all cursor-pointer">
                      <CardContent className="py-4 flex items-start gap-3">
                        <div className="p-2 rounded-lg glass text-primary">{tool.icon}</div>
                        <div>
                          <p className="font-medium text-sm">{tool.title}</p>
                          <p className="text-xs text-muted-foreground">{tool.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fault Diagnosis */}
          <TabsContent value="faults" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: "Active Faults", value: "1", color: "text-amber-400" },
                { label: "Incidents (24h)", value: "1", color: "text-red-400" },
                { label: "MTTR", value: "4.2 min", color: "text-blue-400" },
                { label: "Resolved (24h)", value: "3", color: "text-green-400" },
              ].map(stat => (
                <Card key={stat.label} className="glass-strong">
                  <CardContent className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              {mockFaults.map(fault => (
                <Card key={fault.id} className={`glass-strong border ${severityConfig[fault.severity].bg}`}>
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={fault.severity === "critical" ? "destructive" : "outline"} className="uppercase text-xs">
                            {fault.severity}
                          </Badge>
                          <span className={`flex items-center gap-1 text-sm ${faultStatusConfig[fault.status].color}`}>
                            {faultStatusConfig[fault.status].icon} {fault.status}
                          </span>
                          {fault.isIncident && <Badge variant="destructive" className="text-xs">INCIDENT</Badge>}
                          <span className="text-xs text-muted-foreground">{fault.id} • {new Date(fault.timestamp).toLocaleString()}</span>
                        </div>

                        <div>
                          <p className="font-semibold">{fault.alarm}</p>
                          <p className="text-sm text-muted-foreground mt-1">Service: {fault.service}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div className="p-2 rounded glass">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Crosshair className="h-3 w-3" /> Root Cause</p>
                            <p>{fault.rootCause}</p>
                          </div>
                          <div className="p-2 rounded glass">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Layers className="h-3 w-3" /> Impact</p>
                            <p>{fault.impactedService}</p>
                            <p className="text-xs text-muted-foreground mt-1">{fault.impactLevel}</p>
                          </div>
                        </div>

                        {fault.resolution && (
                          <div className="p-2 rounded glass border-green-500/20">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Resolution</p>
                            <p className="text-sm">{fault.resolution}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default OperationsConsole;
