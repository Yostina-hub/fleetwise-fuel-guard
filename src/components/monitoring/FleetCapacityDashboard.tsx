import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Truck, Cpu, Database, Signal, Wifi, BarChart3, TrendingUp, Shield, Zap, Activity, Server, HardDrive, Users, ArrowUpCircle, Layers } from "lucide-react";

const CURRENT_FLEET = 3119;
const MAX_CAPACITY = 10000;
const UTILIZATION = (CURRENT_FLEET / MAX_CAPACITY) * 100;

const FleetCapacityDashboard = () => {
  const capacityMetrics = [
    { label: "Active Vehicles", value: CURRENT_FLEET.toLocaleString(), sub: "Currently managed", icon: <Truck className="h-5 w-5" />, color: "text-primary" },
    { label: "Max Capacity", value: MAX_CAPACITY.toLocaleString(), sub: "Current infrastructure", icon: <Server className="h-5 w-5" />, color: "text-green-400" },
    { label: "Utilization", value: `${UTILIZATION.toFixed(1)}%`, sub: "Infrastructure load", icon: <BarChart3 className="h-5 w-5" />, color: "text-amber-400" },
    { label: "Headroom", value: (MAX_CAPACITY - CURRENT_FLEET).toLocaleString(), sub: "Vehicles before scaling", icon: <TrendingUp className="h-5 w-5" />, color: "text-cyan-400" },
  ];

  const scalingTiers = [
    { tier: "Current", vehicles: "1–3,500", infra: "2 vCPU / 4 GB / 500 conn", status: "active", gps: "104 msg/s", telemetry: "~93K events/hr" },
    { tier: "Tier 2", vehicles: "3,501–7,000", infra: "4 vCPU / 8 GB / 1,000 conn", status: "ready", gps: "210 msg/s", telemetry: "~210K events/hr" },
    { tier: "Tier 3", vehicles: "7,001–15,000", infra: "8 vCPU / 16 GB / 2,000 conn", status: "planned", gps: "450 msg/s", telemetry: "~500K events/hr" },
    { tier: "Tier 4", vehicles: "15,001–50,000", infra: "Multi-node cluster / sharded DB", status: "blueprint", gps: "1,500+ msg/s", telemetry: "~2M events/hr" },
  ];

  const realTimeCapabilities = [
    { name: "GPS Position Tracking", desc: "Real-time lat/lng via GT06, TK103, H02, Teltonika, Queclink, Ruptela, YTWL protocols", throughput: `${CURRENT_FLEET} devices @ 30s intervals`, icon: <Signal className="h-4 w-4" /> },
    { name: "Telemetry Processing", desc: "Speed, fuel, ignition, door, temperature, OBD-II data ingestion & enrichment", throughput: "~93K events/hour sustained", icon: <Activity className="h-4 w-4" /> },
    { name: "WebSocket Push", desc: "Real-time position & alert broadcast to dashboard users via Socket.io + MQTT", throughput: "48 active subscriptions / unlimited fan-out", icon: <Wifi className="h-4 w-4" /> },
    { name: "Alert Engine", desc: "Rule-based evaluation: geofence, speed, fuel anomaly, maintenance, driver behavior", throughput: "<500ms detection-to-notification", icon: <Zap className="h-4 w-4" /> },
    { name: "Decision Automation", desc: "Predictive maintenance, fuel theft detection, driver scoring, route optimization", throughput: "ML inference per telemetry batch", icon: <Cpu className="h-4 w-4" /> },
    { name: "Remote Commands", desc: "Engine cutoff, speed limit, interval change, alarm config via device terminal", throughput: "Queue-based, priority-aware delivery", icon: <Shield className="h-4 w-4" /> },
  ];

  const systemComponents = [
    { name: "TCP/UDP Gateway", detail: "7-protocol listener, auto-provision, batch DB writes", load: 31, max: 100 },
    { name: "PostgreSQL Database", detail: "Partitioned telemetry, materialized aggregates, RLS-secured", load: 28, max: 100 },
    { name: "Edge Functions", detail: "28 serverless functions, stateless, auto-scale", load: 15, max: 100 },
    { name: "Realtime Engine", detail: "WebSocket + MQTT broker, per-org channels", load: 12, max: 100 },
    { name: "Storage Layer", detail: "Documents, firmware OTA, dashcam events", load: 24, max: 100 },
    { name: "Auth & RBAC", detail: "8-tier roles, JWT, 2FA, impersonation, lockout", load: 5, max: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Fleet Capacity Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {capacityMetrics.map((m) => (
          <Card key={m.label} className="glass-strong">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className={m.color}>{m.icon}</span>
                <Badge variant="outline" className="text-xs">{m.sub}</Badge>
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-sm text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Capacity Progress */}
      <Card className="glass-strong">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Fleet Capacity Utilization</span>
            <span className="text-sm font-medium">{CURRENT_FLEET.toLocaleString()} / {MAX_CAPACITY.toLocaleString()} vehicles</span>
          </div>
          <Progress value={UTILIZATION} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            Horizontal scaling triggers automatically at 80% utilization. Current architecture supports up to {MAX_CAPACITY.toLocaleString()} vehicles without manual intervention.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Scaling Tiers */}
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Horizontal Scaling Tiers</CardTitle>
            <CardDescription>Auto-scaling roadmap for fleet growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scalingTiers.map((t) => (
                <div key={t.tier} className={`p-3 rounded-lg border ${t.status === "active" ? "border-primary/40 bg-primary/5" : "border-border/30"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{t.tier}</span>
                    <Badge variant={t.status === "active" ? "default" : t.status === "ready" ? "secondary" : "outline"} className="text-xs capitalize">{t.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span><Users className="h-3 w-3 inline mr-1" />{t.vehicles} vehicles</span>
                    <span><Server className="h-3 w-3 inline mr-1" />{t.infra}</span>
                    <span><Signal className="h-3 w-3 inline mr-1" />{t.gps}</span>
                    <span><Database className="h-3 w-3 inline mr-1" />{t.telemetry}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Component Load */}
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Component Load @ {CURRENT_FLEET.toLocaleString()} Vehicles</CardTitle>
            <CardDescription>Per-subsystem resource utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemComponents.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {c.detail}</span>
                  </div>
                  <span className={`font-medium ${c.load > 70 ? "text-red-400" : c.load > 50 ? "text-amber-400" : "text-green-400"}`}>{c.load}%</span>
                </div>
                <Progress value={c.load} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Capabilities */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Real-Time Monitoring & Decision Capabilities</CardTitle>
          <CardDescription>Active intelligence for {CURRENT_FLEET.toLocaleString()} vehicles — remote management, real-time tracking & automated decisions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {realTimeCapabilities.map((cap) => (
              <div key={cap.name} className="p-3 rounded-lg border border-border/30 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-primary">{cap.icon}</span>
                  <span className="font-semibold text-sm">{cap.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{cap.desc}</p>
                <Badge variant="outline" className="text-xs">{cap.throughput}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetCapacityDashboard;
