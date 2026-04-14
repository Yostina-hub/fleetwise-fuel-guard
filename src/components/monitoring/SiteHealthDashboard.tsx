import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft, Play, Pause, RotateCcw, Server, Database, Wifi, HardDrive, Zap, Globe, Activity, Signal } from "lucide-react";
import type { SiteEnvironment } from "./SiteEnvironmentSelector";
import { toast } from "sonner";

type ServiceStatus = "healthy" | "degraded" | "down";

interface SiteData {
  label: string;
  role: string;
  services: { name: string; status: ServiceStatus; latency: string; uptime: string; icon: React.ReactNode }[];
  resources: { label: string; value: number; max: number; unit: string }[];
  replication: { lag: string; mode: string; lastFailover: string; rpo: string; rto: string };
}

const siteDataMap: Record<SiteEnvironment, SiteData> = {
  production: {
    label: "Production (PR)",
    role: "Primary Active",
    services: [
      { name: "Database (PostgreSQL)", status: "healthy", latency: "12ms", uptime: "99.99%", icon: <Database className="h-4 w-4" /> },
      { name: "Edge Functions Runtime", status: "healthy", latency: "45ms", uptime: "99.97%", icon: <Zap className="h-4 w-4" /> },
      { name: "TCP Gateway (GPS)", status: "healthy", latency: "8ms", uptime: "99.99%", icon: <Signal className="h-4 w-4" /> },
      { name: "File Storage", status: "healthy", latency: "22ms", uptime: "99.99%", icon: <HardDrive className="h-4 w-4" /> },
      { name: "Authentication Service", status: "healthy", latency: "18ms", uptime: "99.99%", icon: <Globe className="h-4 w-4" /> },
      { name: "Realtime WebSocket", status: "healthy", latency: "15ms", uptime: "99.95%", icon: <Wifi className="h-4 w-4" /> },
      { name: "Load Balancer", status: "healthy", latency: "3ms", uptime: "99.99%", icon: <Server className="h-4 w-4" /> },
      { name: "MQTT Broker", status: "healthy", latency: "6ms", uptime: "99.98%", icon: <Activity className="h-4 w-4" /> },
    ],
    resources: [
      { label: "CPU Usage", value: 23, max: 100, unit: "%" },
      { label: "Memory", value: 1.8, max: 4, unit: "GB" },
      { label: "DB Connections", value: 142, max: 500, unit: "" },
      { label: "Storage", value: 2.4, max: 10, unit: "GB" },
    ],
    replication: { lag: "0ms", mode: "Synchronous", lastFailover: "Never", rpo: "0s", rto: "<30s" },
  },
  disaster_recovery: {
    label: "Disaster Recovery (DR)",
    role: "Hot Standby",
    services: [
      { name: "Database (PostgreSQL)", status: "healthy", latency: "18ms", uptime: "99.99%", icon: <Database className="h-4 w-4" /> },
      { name: "Edge Functions Runtime", status: "healthy", latency: "52ms", uptime: "99.96%", icon: <Zap className="h-4 w-4" /> },
      { name: "TCP Gateway (GPS)", status: "healthy", latency: "12ms", uptime: "99.99%", icon: <Signal className="h-4 w-4" /> },
      { name: "File Storage", status: "healthy", latency: "28ms", uptime: "99.99%", icon: <HardDrive className="h-4 w-4" /> },
      { name: "Authentication Service", status: "healthy", latency: "22ms", uptime: "99.99%", icon: <Globe className="h-4 w-4" /> },
      { name: "Realtime WebSocket", status: "degraded", latency: "45ms", uptime: "99.90%", icon: <Wifi className="h-4 w-4" /> },
      { name: "Load Balancer", status: "healthy", latency: "5ms", uptime: "99.99%", icon: <Server className="h-4 w-4" /> },
      { name: "MQTT Broker", status: "healthy", latency: "9ms", uptime: "99.97%", icon: <Activity className="h-4 w-4" /> },
    ],
    resources: [
      { label: "CPU Usage", value: 8, max: 100, unit: "%" },
      { label: "Memory", value: 0.9, max: 4, unit: "GB" },
      { label: "DB Connections", value: 12, max: 500, unit: "" },
      { label: "Storage", value: 2.4, max: 10, unit: "GB" },
    ],
    replication: { lag: "2ms", mode: "Async Streaming", lastFailover: "Never", rpo: "<5s", rto: "<60s" },
  },
  testbed: {
    label: "Testbed / Pre-Production",
    role: "Testing",
    services: [
      { name: "Database (PostgreSQL)", status: "healthy", latency: "15ms", uptime: "99.50%", icon: <Database className="h-4 w-4" /> },
      { name: "Edge Functions Runtime", status: "healthy", latency: "55ms", uptime: "99.40%", icon: <Zap className="h-4 w-4" /> },
      { name: "TCP Gateway (GPS)", status: "healthy", latency: "10ms", uptime: "99.80%", icon: <Signal className="h-4 w-4" /> },
      { name: "File Storage", status: "healthy", latency: "25ms", uptime: "99.90%", icon: <HardDrive className="h-4 w-4" /> },
      { name: "Authentication Service", status: "healthy", latency: "20ms", uptime: "99.90%", icon: <Globe className="h-4 w-4" /> },
      { name: "Realtime WebSocket", status: "healthy", latency: "18ms", uptime: "99.85%", icon: <Wifi className="h-4 w-4" /> },
      { name: "Load Balancer", status: "down", latency: "—", uptime: "N/A", icon: <Server className="h-4 w-4" /> },
      { name: "MQTT Broker", status: "healthy", latency: "8ms", uptime: "99.70%", icon: <Activity className="h-4 w-4" /> },
    ],
    resources: [
      { label: "CPU Usage", value: 45, max: 100, unit: "%" },
      { label: "Memory", value: 2.1, max: 4, unit: "GB" },
      { label: "DB Connections", value: 35, max: 200, unit: "" },
      { label: "Storage", value: 1.2, max: 5, unit: "GB" },
    ],
    replication: { lag: "N/A", mode: "Snapshot (Manual)", lastFailover: "N/A", rpo: "1h", rto: "N/A" },
  },
};

const statusConfig: Record<ServiceStatus, { color: string; icon: React.ReactNode }> = {
  healthy: { color: "text-green-400", icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> },
  degraded: { color: "text-amber-400", icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> },
  down: { color: "text-red-400", icon: <XCircle className="h-3.5 w-3.5 text-red-400" /> },
};

interface Props {
  site: SiteEnvironment;
}

const SiteHealthDashboard = ({ site }: Props) => {
  const data = siteDataMap[site];
  const healthyCount = data.services.filter(s => s.status === "healthy").length;

  return (
    <div className="space-y-4">
      {/* Site Header + Actions */}
      <Card className="glass-strong">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">{data.label}</h3>
              <p className="text-sm text-muted-foreground">Role: {data.role} • {healthyCount}/{data.services.length} services healthy</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {site === "disaster_recovery" && (
                <Button size="sm" variant="destructive" onClick={() => toast.info("Manual failover requires confirmation from 2 administrators")}>
                  <ArrowRightLeft className="h-4 w-4 mr-1" /> Initiate Failover
                </Button>
              )}
              {site === "testbed" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Snapshot sync from Production initiated")}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Sync from PR
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Load test simulation started")}>
                    <Play className="h-4 w-4 mr-1" /> Run Load Test
                  </Button>
                </>
              )}
              {site === "production" && (
                <Badge variant="default" className="text-sm px-3 py-1.5 bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Live — Serving Traffic
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {data.services.map((svc) => (
          <Card key={svc.name} className="glass-strong">
            <CardContent className="py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={statusConfig[svc.status].color}>{svc.icon}</span>
                  <span className="text-xs font-medium truncate max-w-[120px]">{svc.name}</span>
                </div>
                {statusConfig[svc.status].icon}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Latency: {svc.latency}</span>
                <span>{svc.uptime}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resources + Replication */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-strong">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resource Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.resources.map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{r.label}</span>
                  <span className="font-medium">{r.value} / {r.max} {r.unit}</span>
                </div>
                <Progress value={(r.value / r.max) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Replication & Recovery</CardTitle>
            <CardDescription>Data sync and disaster recovery metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Replication Mode", value: data.replication.mode },
                { label: "Replication Lag", value: data.replication.lag },
                { label: "RPO (Recovery Point)", value: data.replication.rpo },
                { label: "RTO (Recovery Time)", value: data.replication.rto },
                { label: "Last Failover", value: data.replication.lastFailover },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SiteHealthDashboard;
