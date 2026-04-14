import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Layers, Server, Database, Globe, Shield, Cpu, Wifi, Zap, BarChart3,
  Truck, Users, Fuel, Wrench, MapPin, Bell, FileText, Settings, Activity,
  ArrowRight, ArrowDown, Lock, Cloud, HardDrive, Signal, Radio
} from "lucide-react";

const modules = [
  { name: "Live Tracking & Map", icon: <MapPin className="h-5 w-5" />, purpose: "Real-time GPS vehicle positioning with geofence monitoring, route replay, and multi-protocol device support (GT06, Teltonika, Queclink, H02, Ruptela, YTWL).", layer: "Presentation", connections: ["TCP Gateway", "Telemetry DB", "Map Services"] },
  { name: "Fleet Management", icon: <Truck className="h-5 w-5" />, purpose: "Vehicle lifecycle management including registration, assignment, maintenance scheduling, inspections, and compliance tracking.", layer: "Business Logic", connections: ["Database", "Document Storage", "Notification Engine"] },
  { name: "Driver Management", icon: <Users className="h-5 w-5" />, purpose: "Driver profiles, scoring, behavior analytics, license compliance, HR records, alcohol/fatigue testing, and penalty management.", layer: "Business Logic", connections: ["Database", "Scoring Engine", "Notification Engine"] },
  { name: "Fuel Monitoring", icon: <Fuel className="h-5 w-5" />, purpose: "Real-time fuel level tracking via hardware sensors (Omnicomm LLS), consumption analytics, theft detection, and approved station management.", layer: "Business Logic", connections: ["TCP Gateway", "Telemetry DB", "Alert Engine"] },
  { name: "Maintenance & Work Orders", icon: <Wrench className="h-5 w-5" />, purpose: "Preventive/predictive maintenance scheduling, work order lifecycle, parts inventory, vendor management, and inspection-to-repair automation.", layer: "Business Logic", connections: ["Database", "AI Engine", "Notification Engine"] },
  { name: "Alerts & Notifications", icon: <Bell className="h-5 w-5" />, purpose: "Multi-channel alerting (SMS, Email, Push, WhatsApp) with configurable rules, severity levels (minor/major/critical), and delegation-based routing.", layer: "Business Logic", connections: ["SMS Gateway", "Email Service", "Push Service"] },
  { name: "Dispatch & Logistics", icon: <ArrowRight className="h-5 w-5" />, purpose: "Job creation, driver assignment, route optimization, proof-of-delivery capture, SLA tracking, and ERP work order integration.", layer: "Business Logic", connections: ["Database", "Map Services", "ERP Webhook Bridge"] },
  { name: "Reports & Analytics", icon: <BarChart3 className="h-5 w-5" />, purpose: "KPI dashboards, custom report templates, scheduled exports (Excel/CSV/PDF), carbon emissions tracking, and AI-powered fleet insights.", layer: "Presentation", connections: ["Database", "AI Engine", "Export Service"] },
  { name: "Security & Access Control", icon: <Shield className="h-5 w-5" />, purpose: "8-tier RBAC, LDAP/AD sync, API key management, audit logging, session management, brute-force protection, and data masking.", layer: "Infrastructure", connections: ["Auth Service", "Database", "SIEM Forwarder"] },
  { name: "ERP Integration Framework", icon: <Globe className="h-5 w-5" />, purpose: "Webhook bridge for SAP, Oracle, and custom ERP systems. Supports fuel cost sync, asset management, workforce dispatch, and billing integration.", layer: "Integration", connections: ["Webhook Engine", "Database", "External ERP"] },
  { name: "Cold Chain Monitoring", icon: <Activity className="h-5 w-5" />, purpose: "Temperature/humidity sensor tracking for refrigerated vehicles with threshold alarms, compressor status, and compliance reporting.", layer: "Business Logic", connections: ["TCP Gateway", "Telemetry DB", "Alert Engine"] },
  { name: "Infrastructure Monitoring", icon: <Server className="h-5 w-5" />, purpose: "System health dashboard for all services, SNMP statistics, syslog collection, SLA compliance, and centralized status forwarding.", layer: "Operations", connections: ["All Services", "SNMP Receiver", "SIEM"] },
];

const apiEndpoints = [
  { category: "Telemetry", endpoints: [
    { method: "POST", path: "/functions/v1/gps-data-receiver", desc: "Ingest GPS data from TCP gateway (batch)" },
    { method: "POST", path: "/functions/v1/gps-external-api", desc: "External API for third-party GPS integrations" },
    { method: "GET", path: "/rest/v1/vehicle_telemetry", desc: "Query real-time vehicle positions" },
    { method: "GET", path: "/rest/v1/telemetry_events", desc: "Historical telemetry event data" },
  ]},
  { category: "Fleet & Vehicles", endpoints: [
    { method: "GET", path: "/rest/v1/vehicles", desc: "List/filter vehicles with RLS" },
    { method: "POST", path: "/rest/v1/vehicles", desc: "Create vehicle record" },
    { method: "GET", path: "/rest/v1/devices", desc: "Device inventory and status" },
    { method: "POST", path: "/functions/v1/send-governor-command", desc: "Send speed limiter commands to devices" },
    { method: "POST", path: "/functions/v1/process-device-commands", desc: "Queue and process device commands" },
  ]},
  { category: "Drivers & Safety", endpoints: [
    { method: "GET", path: "/rest/v1/drivers", desc: "Driver profiles and compliance data" },
    { method: "GET", path: "/rest/v1/driver_behavior_scores", desc: "Safety scoring and analytics" },
    { method: "POST", path: "/functions/v1/process-driver-penalties", desc: "Automated penalty calculation" },
  ]},
  { category: "Fuel & Energy", endpoints: [
    { method: "GET", path: "/rest/v1/fuel_transactions", desc: "Fuel transaction history" },
    { method: "GET", path: "/rest/v1/fuel_sensor_readings", desc: "Hardware sensor data" },
    { method: "GET", path: "/rest/v1/ev_charging_sessions", desc: "EV charging session logs" },
  ]},
  { category: "Alerts & Geofences", endpoints: [
    { method: "GET", path: "/rest/v1/alerts", desc: "Alert history with severity levels" },
    { method: "POST", path: "/functions/v1/process-geofence-events", desc: "Geofence entry/exit processing" },
    { method: "GET", path: "/rest/v1/geofences", desc: "Geofence definitions" },
  ]},
  { category: "Integrations", endpoints: [
    { method: "POST", path: "/rest/v1/webhook_subscriptions", desc: "Register ERP/BI webhook endpoints" },
    { method: "GET", path: "/rest/v1/webhook_deliveries", desc: "Webhook delivery logs" },
    { method: "POST", path: "/functions/v1/send-whatsapp", desc: "WhatsApp notification delivery" },
    { method: "GET", path: "/functions/v1/get-mapbox-token", desc: "Map service token provider" },
  ]},
  { category: "AI & Analytics", endpoints: [
    { method: "POST", path: "/functions/v1/ai-chat", desc: "AI fleet assistant (Gemini/GPT)" },
    { method: "POST", path: "/functions/v1/ai-fleet-insights", desc: "AI-powered fleet analytics" },
    { method: "POST", path: "/functions/v1/ai-anomaly-detector", desc: "Anomaly detection engine" },
  ]},
];

const architectureLayers = [
  { name: "Presentation Layer", icon: <Layers className="h-5 w-5 text-blue-400" />, color: "border-blue-500/30 bg-blue-500/5", components: [
    "React 18 SPA (TypeScript)", "Vite 5 build system", "Tailwind CSS + shadcn/ui", "MapLibre GL / Lemat Maps",
    "TanStack Query (L1 cache)", "React Router v6", "i18n (EN/AM/OR)", "PWA Service Worker"
  ]},
  { name: "API Gateway & Edge Functions", icon: <Zap className="h-5 w-5 text-amber-400" />, color: "border-amber-500/30 bg-amber-500/5", components: [
    "Supabase Edge Functions (Deno)", "RESTful PostgREST API", "JWT + API Key authentication",
    "Rate limiting (per-user & per-device)", "CORS policy enforcement", "Webhook delivery engine"
  ]},
  { name: "TCP/UDP Gateway", icon: <Signal className="h-5 w-5 text-green-400" />, color: "border-green-500/30 bg-green-500/5", components: [
    "Node.js multi-protocol listener", "GT06, TK103, H02, Teltonika, Queclink, Ruptela, YTWL parsers",
    "Batch insert pipeline (configurable interval)", "MQTT broker (Aedes)", "Socket.IO WebSocket gateway",
    "Redis pub/sub (optional)", "Auto-provisioning with shared key auth"
  ]},
  { name: "Data Layer", icon: <Database className="h-5 w-5 text-purple-400" />, color: "border-purple-500/30 bg-purple-500/5", components: [
    "PostgreSQL 15 (primary RDBMS)", "Monthly partitioned telemetry_events", "Materialized views (hourly/daily aggregates)",
    "352 RLS policies", "115 triggers", "Real-time subscriptions (WebSocket)", "File storage (documents & firmware)"
  ]},
  { name: "Security Layer", icon: <Lock className="h-5 w-5 text-red-400" />, color: "border-red-500/30 bg-red-500/5", components: [
    "8-tier RBAC (super_admin → viewer)", "Column-level data masking", "Account lockout & brute-force protection",
    "CSP headers & anti-clickjacking", "Session storage policy (no localStorage)", "Audit logging", "SIEM log forwarding"
  ]},
  { name: "Infrastructure & HA", icon: <Cloud className="h-5 w-5 text-cyan-400" />, color: "border-cyan-500/30 bg-cyan-500/5", components: [
    "Active/Standby (N+1) deployment", "Load balancer with auto-failover", "Docker containerized gateway",
    "CI/CD pipeline (GitHub Actions)", "Horizontal scaling support", "99.99% SLA target", "Automated partition management"
  ]},
];

const networkDiagram = [
  { from: "GPS Devices", to: "TCP Gateway", protocol: "GT06/Teltonika/H02/TCP", direction: "→" },
  { from: "TCP Gateway", to: "Edge Functions", protocol: "HTTPS + Shared Key", direction: "→" },
  { from: "Edge Functions", to: "PostgreSQL", protocol: "PostgREST / SQL", direction: "→" },
  { from: "Web Browser", to: "CDN / Vite", protocol: "HTTPS", direction: "→" },
  { from: "Web Browser", to: "Supabase API", protocol: "HTTPS + JWT", direction: "→" },
  { from: "Supabase API", to: "PostgreSQL", protocol: "PostgREST", direction: "→" },
  { from: "PostgreSQL", to: "Web Browser", protocol: "WebSocket (Realtime)", direction: "→" },
  { from: "Alert Engine", to: "SMS/Email/Push", protocol: "HTTPS", direction: "→" },
  { from: "ERP Systems", to: "Webhook Bridge", protocol: "HTTPS + HMAC", direction: "↔" },
  { from: "MQTT Clients", to: "TCP Gateway", protocol: "MQTT / WS", direction: "↔" },
];

const SystemArchitecture = () => {
  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Layers className="h-8 w-8 text-primary animate-float" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">System Architecture</h1>
            <p className="text-muted-foreground mt-1 text-lg">Module distribution, API architecture, and technical design</p>
          </div>
        </div>

        <Tabs defaultValue="modules" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 glass p-1 h-12">
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="api">Open API</TabsTrigger>
            <TabsTrigger value="layers">Architecture Layers</TabsTrigger>
            <TabsTrigger value="network">Network & Data Flow</TabsTrigger>
          </TabsList>

          {/* Modules Tab - RFP #1, #3 */}
          <TabsContent value="modules" className="space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle>Logical Module Architecture</CardTitle>
                <CardDescription>Software distribution across functional modules with interconnections</CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod) => (
                <Card key={mod.name} className="glass-strong hover:border-primary/30 transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg glass text-primary">{mod.icon}</div>
                      <div>
                        <p className="font-semibold text-sm">{mod.name}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">{mod.layer}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{mod.purpose}</p>
                    <div className="flex flex-wrap gap-1">
                      {mod.connections.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* API Tab - RFP #2 */}
          <TabsContent value="api" className="space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Open API Architecture
                </CardTitle>
                <CardDescription>RESTful endpoints organized by domain. All endpoints support JSON, JWT authentication, and RLS-based access control.</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-2">
                  {apiEndpoints.map((cat) => (
                    <AccordionItem key={cat.category} value={cat.category} className="border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-semibold">
                        {cat.category} ({cat.endpoints.length} endpoints)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {cat.endpoints.map((ep) => (
                            <div key={ep.path} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                              <Badge variant={ep.method === "GET" ? "default" : "secondary"} className="text-xs font-mono min-w-[50px] justify-center">
                                {ep.method}
                              </Badge>
                              <div>
                                <code className="text-xs text-primary font-mono">{ep.path}</code>
                                <p className="text-xs text-muted-foreground mt-0.5">{ep.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture Layers Tab - RFP #4 */}
          <TabsContent value="layers" className="space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle>Technical Architecture Stack</CardTitle>
                <CardDescription>Layered architecture with component breakdown</CardDescription>
              </CardHeader>
            </Card>
            <div className="space-y-4">
              {architectureLayers.map((layer, i) => (
                <div key={layer.name}>
                  <Card className={`glass-strong ${layer.color}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3 mb-3">
                        {layer.icon}
                        <h3 className="font-semibold">{layer.name}</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {layer.components.map((c) => (
                          <div key={c} className="text-xs p-2 rounded-md bg-background/50 border border-border/50">{c}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {i < architectureLayers.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Network Tab - RFP #4 */}
          <TabsContent value="network" className="space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Network & Data Flow Architecture
                </CardTitle>
                <CardDescription>Communication paths between system components</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Direction</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Destination</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Protocol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkDiagram.map((flow, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4 font-medium">{flow.from}</td>
                          <td className="py-3 px-4 text-center text-primary font-bold text-lg">{flow.direction}</td>
                          <td className="py-3 px-4 font-medium">{flow.to}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs font-mono">{flow.protocol}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="glass-strong border-blue-500/30 bg-blue-500/5">
                <CardContent className="py-4 text-center">
                  <HardDrive className="h-8 w-8 mx-auto text-blue-400 mb-2" />
                  <p className="font-semibold text-sm">Data Architecture</p>
                  <p className="text-xs text-muted-foreground mt-1">PostgreSQL with monthly partitions, materialized aggregates, hot/cold strategy</p>
                </CardContent>
              </Card>
              <Card className="glass-strong border-green-500/30 bg-green-500/5">
                <CardContent className="py-4 text-center">
                  <Wifi className="h-8 w-8 mx-auto text-green-400 mb-2" />
                  <p className="font-semibold text-sm">Network Architecture</p>
                  <p className="text-xs text-muted-foreground mt-1">HTTPS/WSS for web, TCP/UDP for devices, MQTT for IoT, Redis for pub/sub</p>
                </CardContent>
              </Card>
              <Card className="glass-strong border-purple-500/30 bg-purple-500/5">
                <CardContent className="py-4 text-center">
                  <Cpu className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                  <p className="font-semibold text-sm">Information Architecture</p>
                  <p className="text-xs text-muted-foreground mt-1">Multi-tenant with org isolation, RLS-enforced data boundaries, 8-tier RBAC</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SystemArchitecture;
