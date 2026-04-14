import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Server, Database, Wifi, HardDrive, Cpu, MemoryStick, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Globe, Zap, BarChart3, Signal, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import SiteEnvironmentSelector, { type SiteEnvironment } from "@/components/monitoring/SiteEnvironmentSelector";
import SiteHealthDashboard from "@/components/monitoring/SiteHealthDashboard";
import FleetCapacityDashboard from "@/components/monitoring/FleetCapacityDashboard";

type ServiceStatus = "healthy" | "degraded" | "down";

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  uptime: string;
  latency: string;
  lastCheck: string;
  icon: React.ReactNode;
  details: string;
}

interface MetricSnapshot {
  label: string;
  value: number;
  max: number;
  unit: string;
  trend: "up" | "down" | "stable";
}

const statusConfig: Record<ServiceStatus, { color: string; icon: React.ReactNode; label: string }> = {
  healthy: { color: "text-green-400", icon: <CheckCircle2 className="h-4 w-4 text-green-400" />, label: "Healthy" },
  degraded: { color: "text-amber-400", icon: <AlertTriangle className="h-4 w-4 text-amber-400" />, label: "Degraded" },
  down: { color: "text-red-400", icon: <XCircle className="h-4 w-4 text-red-400" />, label: "Down" },
};

const InfrastructureMonitoring = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedSite, setSelectedSite] = useState<SiteEnvironment>("production");

  const services: ServiceHealth[] = [
    { name: "Database (PostgreSQL)", status: "healthy", uptime: "99.99%", latency: "12ms", lastCheck: "10s ago", icon: <Database className="h-5 w-5" />, details: "Primary DB, 142 active connections" },
    { name: "Edge Functions Runtime", status: "healthy", uptime: "99.97%", latency: "45ms", lastCheck: "10s ago", icon: <Zap className="h-5 w-5" />, details: "28 functions deployed, avg 45ms response" },
    { name: "TCP Gateway (GPS)", status: "healthy", uptime: "99.99%", latency: "8ms", lastCheck: "5s ago", icon: <Signal className="h-5 w-5" />, details: "7 protocol listeners active, 312 connected devices" },
    { name: "File Storage", status: "healthy", uptime: "99.99%", latency: "22ms", lastCheck: "10s ago", icon: <HardDrive className="h-5 w-5" />, details: "2.4 GB used, documents & firmware" },
    { name: "Authentication Service", status: "healthy", uptime: "99.99%", latency: "18ms", lastCheck: "10s ago", icon: <Globe className="h-5 w-5" />, details: "JWT + OAuth active, 0 failed auths (1h)" },
    { name: "Realtime WebSocket", status: "healthy", uptime: "99.95%", latency: "15ms", lastCheck: "10s ago", icon: <Wifi className="h-5 w-5" />, details: "48 active subscriptions" },
    { name: "Load Balancer", status: "healthy", uptime: "99.99%", latency: "3ms", lastCheck: "10s ago", icon: <Server className="h-5 w-5" />, details: "Active/Standby, auto-failover enabled" },
    { name: "MQTT Broker", status: "healthy", uptime: "99.98%", latency: "6ms", lastCheck: "10s ago", icon: <Activity className="h-5 w-5" />, details: "18 connected clients, 3 topics" },
  ];

  const metrics: MetricSnapshot[] = [
    { label: "CPU Usage", value: 23, max: 100, unit: "%", trend: "stable" },
    { label: "Memory Usage", value: 1.8, max: 4, unit: "GB", trend: "up" },
    { label: "DB Connections", value: 142, max: 500, unit: "", trend: "stable" },
    { label: "Storage Used", value: 2.4, max: 10, unit: "GB", trend: "up" },
    { label: "Network I/O", value: 12.5, max: 100, unit: "Mbps", trend: "down" },
    { label: "Active Sessions", value: 48, max: 1000, unit: "", trend: "stable" },
  ];

  const snmpStats = [
    { oid: "sysUpTime", value: "42 days 7h 23m", description: "System uptime" },
    { oid: "ifInOctets", value: "1.2 TB", description: "Total bytes received" },
    { oid: "ifOutOctets", value: "890 GB", description: "Total bytes sent" },
    { oid: "hrProcessorLoad", value: "23%", description: "Processor utilization" },
    { oid: "hrStorageUsed", value: "2.4 GB", description: "Storage utilization" },
    { oid: "tcpCurrEstab", value: "312", description: "Current TCP connections" },
    { oid: "ipInReceives", value: "4.2M", description: "IP datagrams received" },
    { oid: "snmpInPkts", value: "125K", description: "SNMP packets received" },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastRefresh(new Date());
    }, 1500);
  };

  const overallHealth = services.every(s => s.status === "healthy") ? "healthy" : services.some(s => s.status === "down") ? "down" : "degraded";
  const healthyCount = services.filter(s => s.status === "healthy").length;

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl glass-strong glow">
              <Activity className="h-8 w-8 text-primary animate-float" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold gradient-text">Infrastructure Monitoring</h1>
              <p className="text-muted-foreground mt-1 text-lg">System health, service metrics & SNMP statistics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={overallHealth === "healthy" ? "default" : "destructive"} className="text-sm px-3 py-1">
              {statusConfig[overallHealth].icon}
              <span className="ml-1">{healthyCount}/{services.length} Services Healthy</span>
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* HA Status Banner */}
        <Card className="glass-strong border-green-500/30 bg-green-500/5">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-semibold text-green-400">High Availability: Active</p>
                <p className="text-sm text-muted-foreground">Active/Standby (N+1) architecture • 99.99% SLA • Auto-failover enabled</p>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span><Clock className="h-4 w-4 inline mr-1" />Uptime: 42d 7h 23m</span>
              <span>Last failover: Never</span>
              <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="fleet" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto glass p-1 h-12">
            <TabsTrigger value="fleet"><Truck className="h-4 w-4 mr-1.5" />Fleet Capacity</TabsTrigger>
            <TabsTrigger value="sites"><Building2 className="h-4 w-4 mr-1.5" />Sites</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="snmp">SNMP Stats</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Fleet Capacity Tab */}
          <TabsContent value="fleet">
            <FleetCapacityDashboard />
          </TabsContent>

          {/* Sites / Multi-Environment Tab */}
          <TabsContent value="sites" className="space-y-4">
            <SiteEnvironmentSelector selected={selectedSite} onSelect={setSelectedSite} />
            <SiteHealthDashboard site={selectedSite} />
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => (
                <Card key={service.name} className="glass-strong hover:border-primary/30 transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg glass ${statusConfig[service.status].color}`}>
                          {service.icon}
                        </div>
                        <div>
                          <p className="font-semibold">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.details}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {statusConfig[service.status].icon}
                          <span className={`text-sm font-medium ${statusConfig[service.status].color}`}>
                            {statusConfig[service.status].label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Checked {service.lastCheck}</p>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-3 text-sm text-muted-foreground">
                      <span>Uptime: <strong className="text-foreground">{service.uptime}</strong></span>
                      <span>Latency: <strong className="text-foreground">{service.latency}</strong></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <Card key={metric.label} className="glass-strong">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium">{metric.label}</p>
                      <Badge variant="outline" className="text-xs">
                        {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"} {metric.trend}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">{metric.value} <span className="text-sm text-muted-foreground font-normal">{metric.unit}</span></p>
                    <Progress value={(metric.value / metric.max) * 100} className="mt-2 h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{metric.value} / {metric.max} {metric.unit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* SNMP Stats Tab */}
          <TabsContent value="snmp" className="space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  SNMP Statistics & Syslog Metrics
                </CardTitle>
                <CardDescription>Real-time SNMP OID values and system telemetry</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">OID</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snmpStats.map((stat) => (
                        <tr key={stat.oid} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono text-xs text-primary">{stat.oid}</td>
                          <td className="py-3 px-4">{stat.description}</td>
                          <td className="py-3 px-4 text-right font-semibold">{stat.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle>Service Performance (SLA)</CardTitle>
                  <CardDescription>Monthly service level compliance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "API Availability", sla: 99.99, actual: 99.99 },
                    { name: "Database Availability", sla: 99.99, actual: 99.99 },
                    { name: "GPS Data Processing", sla: 99.95, actual: 99.97 },
                    { name: "Alert Delivery", sla: 99.90, actual: 99.95 },
                    { name: "Report Generation", sla: 99.50, actual: 99.85 },
                  ].map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span className={item.actual >= item.sla ? "text-green-400" : "text-red-400"}>
                          {item.actual}% / {item.sla}% SLA
                        </span>
                      </div>
                      <Progress value={item.actual} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle>Centralized Status Forwarding</CardTitle>
                  <CardDescription>System status broadcast to external monitoring</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { target: "SNMP Trap Receiver", status: "active", lastSent: "2m ago" },
                    { target: "Syslog Collector (SIEM)", status: "active", lastSent: "30s ago" },
                    { target: "Email Alert Gateway", status: "active", lastSent: "15m ago" },
                    { target: "SMS Alert Channel", status: "active", lastSent: "1h ago" },
                    { target: "Webhook (External NOC)", status: "standby", lastSent: "N/A" },
                  ].map((fwd) => (
                    <div key={fwd.target} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${fwd.status === "active" ? "bg-green-400" : "bg-amber-400"}`} />
                        <span className="text-sm">{fwd.target}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Last: {fwd.lastSent}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default InfrastructureMonitoring;
