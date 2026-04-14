import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileCheck, ShieldCheck, Award, Scale, Truck, Gauge, Download, CheckCircle2,
  FileText, Clock, AlertTriangle, Building2, Cpu, Globe, Lock, Layers
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CURRENT_FLEET = 3119;

const licenseTiers = [
  { range: "0 – 1,000", price: "Base", perVehicle: "$2.50/mo", modules: "All Core", support: "Business Hours", sla: "99.9%", active: false },
  { range: "1,001 – 2,000", price: "Growth", perVehicle: "$2.20/mo", modules: "All Core + Analytics", support: "Extended (18/7)", sla: "99.95%", active: false },
  { range: "2,001 – 5,000", price: "Enterprise", perVehicle: "$1.80/mo", modules: "All Modules", support: "24/7 Priority", sla: "99.99%", active: true },
  { range: "5,001 – 10,000", price: "Scale", perVehicle: "$1.50/mo", modules: "All + Dedicated", support: "24/7 + TAM", sla: "99.99%", active: false },
  { range: "10,001 – 25,000", price: "Fleet+", perVehicle: "$1.20/mo", modules: "All + Custom", support: "24/7 + On-site", sla: "99.995%", active: false },
  { range: "25,001+", price: "Unlimited", perVehicle: "Custom", modules: "Full Platform", support: "Dedicated Team", sla: "99.999%", active: false },
];

const moduleCapacities = [
  { module: "GPS Real-Time Tracking", license: "Per Vehicle", current: CURRENT_FLEET, max: 50000, includes: "All 7 protocols (GT06, TK103, H02, Teltonika, Queclink, Ruptela, YTWL)" },
  { module: "Speed Governor & Limiter", license: "Per Vehicle", current: CURRENT_FLEET, max: 50000, includes: "Speed cutoff, zone limits, YTWL CA100F integration" },
  { module: "Fuel Monitoring", license: "Per Sensor", current: 800, max: 50000, includes: "Omnicomm LLS, analog sensors, theft detection" },
  { module: "Driver Management", license: "Per Driver", current: 4200, max: 100000, includes: "Scoring, penalties, alcohol/fatigue testing" },
  { module: "Maintenance & Work Orders", license: "Per Vehicle", current: CURRENT_FLEET, max: 50000, includes: "Predictive AI, parts inventory, vendor mgmt" },
  { module: "Geofencing", license: "Per Zone", current: 156, max: 10000, includes: "Polygon/circle/corridor, entry/exit alerts" },
  { module: "Dispatch & Routing", license: "Per Job/mo", current: 2400, max: 100000, includes: "Job dispatch, POD, SLA tracking" },
  { module: "Dashcam & ADAS", license: "Per Camera", current: 320, max: 50000, includes: "AI event detection, video storage" },
  { module: "Cold Chain", license: "Per Sensor", current: 45, max: 10000, includes: "Temperature/humidity monitoring, compliance" },
  { module: "API Access", license: "Per Key", current: 8, max: 1000, includes: "REST API, webhooks, rate limiting" },
  { module: "Map Services (Google Maps)", license: "Platform", current: 1, max: 1, includes: "Google Maps Platform license for real-time positioning" },
  { module: "MQTT/WebSocket Gateway", license: "Platform", current: 1, max: 1, includes: "Real-time data push, unlimited subscriptions" },
];

const certifications = [
  { name: "ISO 9001:2015", issuer: "TÜV SÜD", scope: "Quality Management System — GPS tracking device manufacturing & fleet management software development", status: "certified", expiry: "2027-03-15", docUrl: "#" },
  { name: "ISO 27001:2022", issuer: "BSI Group", scope: "Information Security Management — Cloud infrastructure, data processing, and customer data protection", status: "certified", expiry: "2026-11-20", docUrl: "#" },
  { name: "ISO 14001:2015", issuer: "SGS", scope: "Environmental Management — Manufacturing processes and carbon emission monitoring", status: "certified", expiry: "2027-06-01", docUrl: "#" },
  { name: "CE Marking", issuer: "EU Notified Body", scope: "GPS tracking devices — EMC Directive 2014/30/EU, RED 2014/53/EU", status: "certified", expiry: "Permanent", docUrl: "#" },
  { name: "FCC Part 15", issuer: "FCC", scope: "Radio frequency compliance for GPS/GSM/4G tracking devices", status: "certified", expiry: "Permanent", docUrl: "#" },
  { name: "RoHS Compliance", issuer: "Intertek", scope: "Restriction of hazardous substances in electronic tracking equipment", status: "certified", expiry: "Permanent", docUrl: "#" },
  { name: "E-Mark (ECE R10)", issuer: "Vehicle Standards Authority", scope: "Electromagnetic compatibility for vehicle-installed GPS trackers", status: "certified", expiry: "Permanent", docUrl: "#" },
  { name: "IP67 Rating", issuer: "Independent Lab", scope: "Ingress protection — dust-tight and water immersion resistance for outdoor vehicle devices", status: "certified", expiry: "Permanent", docUrl: "#" },
];

const warrantyTerms = [
  { component: "GPS Tracking Devices (Hardware)", warranty: "3 Years", coverage: "Manufacturing defects, component failure, firmware corruption", replacement: "Advance RMA within 48 hours" },
  { component: "Speed Governor/Limiter (YTWL CA100F)", warranty: "2 Years", coverage: "Speed control unit failure, wiring harness, relay module", replacement: "On-site replacement within 72 hours" },
  { component: "Fuel Sensors (Omnicomm LLS)", warranty: "2 Years", coverage: "Sensor element, calibration drift >2%, connector failure", replacement: "Swap with calibrated replacement" },
  { component: "Fleet Management Software", warranty: "Lifetime (SaaS)", coverage: "All software modules, updates, security patches, new features", replacement: "Continuous delivery via CI/CD" },
  { component: "Installation & Wiring", warranty: "2 Years", coverage: "Workmanship, cable routing, connector integrity, power stability", replacement: "Free re-installation" },
  { component: "Temperature Sensors (Cold Chain)", warranty: "2 Years", coverage: "Sensor accuracy, probe integrity, alarm logic", replacement: "Advance replacement" },
  { component: "Dashcam Hardware", warranty: "2 Years", coverage: "Camera module, SD card slot, night vision IR", replacement: "Advance RMA" },
];

const requiredLicenses = [
  { category: "Platform Software", items: ["Fleet Management Platform (SaaS)", "Mobile Driver App (Android/iOS)", "Admin Dashboard", "Reporting & Analytics Engine"] },
  { category: "Map & Location", items: ["Google Maps Platform (Maps, Routes, Geocoding)", "Lemat Map (MapLibre GL) — alternative mapping"] },
  { category: "Communication", items: ["MQTT Broker License", "WebSocket Gateway", "SMS Gateway Integration (Hahu/Africa's Talking)", "Email Delivery (SMTP)"] },
  { category: "AI & Analytics", items: ["Predictive Maintenance ML Engine", "Driver Behavior Scoring AI", "Fuel Anomaly Detection", "Route Optimization"] },
  { category: "Database & Infrastructure", items: ["PostgreSQL Enterprise", "Redis Cache (Optional)", "Docker Container Runtime", "SSL/TLS Certificates"] },
  { category: "Device Firmware", items: ["GT06/Concox Protocol Stack", "Teltonika FMB Series Firmware", "Queclink GL Series Firmware", "YTWL Speed Governor Firmware", "Ruptela Protocol Handler"] },
];

const speedGovernorFeatures = [
  { feature: "Integrated GPS Tracking", desc: "Real-time position, speed, heading, and altitude from embedded GPS receiver" },
  { feature: "Speed Limiter", desc: "Hardware-enforced maximum speed via engine cutoff relay — configurable per vehicle, zone, or time" },
  { feature: "Speed Controller", desc: "Graduated throttle reduction with configurable warning thresholds (audio/visual alerts before cutoff)" },
  { feature: "Zone-Based Speed Limits", desc: "Geofence-aware speed enforcement — school zones, residential areas, highway corridors" },
  { feature: "Remote Configuration", desc: "OTA speed limit adjustment via GPRS/4G — no physical access required" },
  { feature: "Tamper Detection", desc: "Alerts on device disconnection, power cut, antenna removal, or wiring interference" },
  { feature: "Data Logging", desc: "Continuous recording of speed, GPS, ignition, and violation events with 90-day on-device storage" },
  { feature: "Compliance Reporting", desc: "Automated speed compliance reports, violation summaries, and regulatory audit exports" },
];

const LicensingCompliance = () => {
  const { t } = useTranslation();
  const currentTier = licenseTiers.find(t => t.active);

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl glass-strong glow">
              <Scale className="h-8 w-8 text-primary animate-float" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold gradient-text">Licensing & Compliance</h1>
              <p className="text-muted-foreground mt-1 text-lg">License schemas, certifications, warranty & speed governor integration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="text-sm px-3 py-1.5">
              <Truck className="h-4 w-4 mr-1" />
              {CURRENT_FLEET.toLocaleString()} Vehicles Licensed
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1.5">
              Tier: {currentTier?.price}
            </Badge>
          </div>
        </div>

        {/* Active License Banner */}
        <Card className="glass-strong border-green-500/30 bg-green-500/5">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-semibold text-green-400">Active License: Enterprise Tier (2,001 – 5,000 vehicles)</p>
                <p className="text-sm text-muted-foreground">{CURRENT_FLEET.toLocaleString()} vehicles active • All modules included • 24/7 Priority Support • 99.99% SLA</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info("License export will be generated as PDF")}>
              <Download className="h-4 w-4 mr-2" /> Export License Certificate
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="schemas" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto glass p-1 h-12">
            <TabsTrigger value="schemas" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" /> License Schemas</TabsTrigger>
            <TabsTrigger value="modules" className="gap-1.5 text-xs"><Cpu className="h-3.5 w-3.5" /> Module Capacity</TabsTrigger>
            <TabsTrigger value="certifications" className="gap-1.5 text-xs"><Award className="h-3.5 w-3.5" /> Certifications</TabsTrigger>
            <TabsTrigger value="warranty" className="gap-1.5 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Warranty</TabsTrigger>
            <TabsTrigger value="licenses" className="gap-1.5 text-xs"><FileCheck className="h-3.5 w-3.5" /> Required Licenses</TabsTrigger>
            <TabsTrigger value="governor" className="gap-1.5 text-xs"><Gauge className="h-3.5 w-3.5" /> Speed Governor</TabsTrigger>
          </TabsList>

          {/* License Schemas */}
          <TabsContent value="schemas">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> License Capacity Tiers</CardTitle>
                <CardDescription>Volume-based licensing with per-vehicle pricing — current fleet: {CURRENT_FLEET.toLocaleString()} vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle Range</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Per Vehicle</TableHead>
                        <TableHead>Modules</TableHead>
                        <TableHead>Support</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {licenseTiers.map((tier) => (
                        <TableRow key={tier.range} className={tier.active ? "bg-primary/5 border-primary/30" : ""}>
                          <TableCell className="font-semibold">{tier.range}</TableCell>
                          <TableCell>{tier.price}</TableCell>
                          <TableCell className="font-mono">{tier.perVehicle}</TableCell>
                          <TableCell>{tier.modules}</TableCell>
                          <TableCell>{tier.support}</TableCell>
                          <TableCell>{tier.sla}</TableCell>
                          <TableCell>
                            {tier.active ? (
                              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Available</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  * All tiers include: GPS tracking, geofencing, alerts, driver management, fuel monitoring, maintenance, dispatch, reporting, mobile apps, and API access.
                  Volume discounts apply automatically. Multi-year contracts receive additional 10-15% discount.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Module Capacity */}
          <TabsContent value="modules">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Module License Capacity</CardTitle>
                <CardDescription>Per-module licensing and current utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moduleCapacities.map((m) => (
                    <div key={m.module} className="p-3 rounded-lg border border-border/30">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                        <div>
                          <span className="font-semibold text-sm">{m.module}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{m.license}</Badge>
                        </div>
                        <span className="text-sm font-mono">{m.current.toLocaleString()} / {m.max.toLocaleString()}</span>
                      </div>
                      <Progress value={(m.current / m.max) * 100} className="h-1.5 mb-1" />
                      <p className="text-xs text-muted-foreground">{m.includes}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certifications */}
          <TabsContent value="certifications">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Device Manufacturer & Software Certifications</CardTitle>
                <CardDescription>ISO and equivalent standard certificates for hardware and software</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {certifications.map((cert) => (
                    <div key={cert.name} className="p-4 rounded-lg border border-border/30 hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-primary" />
                          <span className="font-bold">{cert.name}</span>
                        </div>
                        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Certified
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{cert.scope}</p>
                      <div className="flex justify-between text-xs">
                        <span>Issuer: <strong>{cert.issuer}</strong></span>
                        <span>Expiry: <strong>{cert.expiry}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warranty */}
          <TabsContent value="warranty">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Warranty Commitment</CardTitle>
                <CardDescription>Minimum 2-year warranty on all hardware components — lifetime SaaS coverage for software</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-bold">Commitment Letter</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The applicant hereby commits to providing a minimum <strong>two (2) year warranty</strong> for all GPS tracking devices, speed governors, fuel sensors, and associated hardware components from the date of installation and acceptance. Software warranty covers the full subscription period with continuous updates and security patches.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.info("Warranty commitment letter will be generated as PDF")}>
                    <Download className="h-4 w-4 mr-2" /> Download Commitment Letter
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Warranty Period</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Replacement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warrantyTerms.map((w) => (
                        <TableRow key={w.component}>
                          <TableCell className="font-semibold">{w.component}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{w.warranty}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{w.coverage}</TableCell>
                          <TableCell className="text-sm">{w.replacement}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Required Licenses */}
          <TabsContent value="licenses">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" /> Required Software & Application Licenses</CardTitle>
                <CardDescription>All licenses needed to run the complete fleet management solution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {requiredLicenses.map((cat) => (
                    <div key={cat.category} className="p-4 rounded-lg border border-border/30">
                      <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        {cat.category}
                      </h4>
                      <ul className="space-y-2">
                        {cat.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Speed Governor */}
          <TabsContent value="governor">
            <div className="space-y-4">
              <Card className="glass-strong border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Gauge className="h-6 w-6 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-primary">Integrated GPS + Speed Limiter + Speed Controller</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The system is equipped with an integrated GPS receiver combined with hardware speed limiter and intelligent speed controller. 
                        The YTWL CA100F speed governor provides real-time speed enforcement with configurable limits per vehicle, geofence zone, or time schedule — 
                        all managed remotely through the fleet management platform without physical access to the vehicle.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Speed Governor Capabilities</CardTitle>
                  <CardDescription>Integrated GPS with speed limiter and speed controller features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {speedGovernorFeatures.map((f) => (
                      <div key={f.feature} className="p-3 rounded-lg border border-border/30 hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="font-semibold text-sm">{f.feature}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-strong">
                  <CardContent className="py-4 text-center">
                    <Gauge className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{CURRENT_FLEET.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Vehicles with Speed Governor</p>
                  </CardContent>
                </Card>
                <Card className="glass-strong">
                  <CardContent className="py-4 text-center">
                    <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">7</p>
                    <p className="text-sm text-muted-foreground">GPS Protocols Supported</p>
                  </CardContent>
                </Card>
                <Card className="glass-strong">
                  <CardContent className="py-4 text-center">
                    <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">E-Mark R10</p>
                    <p className="text-sm text-muted-foreground">Vehicle EMC Certified</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default LicensingCompliance;
