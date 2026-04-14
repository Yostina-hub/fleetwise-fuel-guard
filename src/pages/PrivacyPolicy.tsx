import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, Clock, UserCheck, Mail, Globe, Database, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const sections = [
  {
    icon: Database,
    title: "Data We Collect",
    items: [
      { category: "Vehicle Telemetry", data: "GPS coordinates, speed, heading, fuel level, engine status, altitude", basis: "Legitimate Interest", retention: "6 months (hot), 24 months (cold)" },
      { category: "Driver Information", data: "Name, license number, employee ID, email, phone, safety scores", basis: "Contract Performance", retention: "Duration of employment + 2 years" },
      { category: "Trip Records", data: "Start/end locations, distance, duration, route history", basis: "Legitimate Interest", retention: "12 months" },
      { category: "Fuel Transactions", data: "Amount, cost, station, odometer reading", basis: "Contract Performance", retention: "24 months" },
      { category: "Dash Cam Events", data: "Video clips, AI-detected events, thumbnails", basis: "Legitimate Interest / Consent", retention: "90 days" },
      { category: "Authentication Logs", data: "Login timestamps, IP addresses, user agents", basis: "Legal Obligation", retention: "12 months" },
    ],
  },
  {
    icon: Eye,
    title: "How We Use Your Data",
    items: [
      "Real-time vehicle tracking and fleet operations management",
      "Driver safety scoring and behavior analytics",
      "Fuel consumption monitoring and theft detection",
      "Maintenance scheduling and predictive analytics",
      "Geofence enforcement and route optimization",
      "Regulatory compliance (speed governor enforcement)",
      "Incident investigation and insurance claims",
      "System security and abuse prevention",
    ],
  },
  {
    icon: UserCheck,
    title: "Your Rights Under GDPR",
    rights: [
      { right: "Right of Access (Art. 15)", desc: "Request a copy of all personal data we hold about you" },
      { right: "Right to Rectification (Art. 16)", desc: "Correct inaccurate or incomplete personal data" },
      { right: "Right to Erasure (Art. 17)", desc: "Request deletion of your personal data ('right to be forgotten')" },
      { right: "Right to Restrict Processing (Art. 18)", desc: "Limit how we use your data while disputes are resolved" },
      { right: "Right to Data Portability (Art. 20)", desc: "Receive your data in a machine-readable format (JSON/CSV)" },
      { right: "Right to Object (Art. 21)", desc: "Object to processing based on legitimate interest" },
    ],
  },
];

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">
            FleetWise Fleet Management System — Data Protection & Privacy Notice
          </p>
          <Badge variant="outline">Last Updated: April 2026 • GDPR Compliant</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This Privacy Policy explains how FleetWise ("we", "us") collects, uses, stores, and
              protects personal data in connection with our fleet management platform. We are
              committed to compliance with the EU General Data Protection Regulation (GDPR) and
              applicable local data protection laws.
            </p>
            <p>
              <strong>Data Controller:</strong> Your organization (the fleet operator) acts as the
              Data Controller. FleetWise operates as the Data Processor under a Data Processing
              Agreement (DPA).
            </p>
            <p>
              <strong>Data Protection Officer:</strong> Contact your organization's designated DPO
              or reach us at <span className="text-primary">dpo@fleetwise.et</span>.
            </p>
          </CardContent>
        </Card>

        {/* Data We Collect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> {sections[0].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections[0].items.map((item: any, i: number) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.category}</span>
                    <Badge variant="secondary">{item.basis}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.data}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Retention: {item.retention}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How We Use Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> {sections[1].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(sections[1].items as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-1">•</span> {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> {sections[2].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {(sections[2] as any).rights.map((r: any, i: number) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <span className="font-medium text-sm">{r.right}</span>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              To exercise any of these rights, submit a request through{" "}
              <strong>Security → GDPR Data Requests</strong> in the application, or email{" "}
              <span className="text-primary">dpo@fleetwise.et</span>.
            </p>
          </CardContent>
        </Card>

        {/* Security Measures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Security Measures (Art. 32)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              {[
                "352 Row Level Security (RLS) policies",
                "AES-256 encryption at rest",
                "TLS 1.3 encryption in transit",
                "Multi-factor authentication support",
                "Brute-force & IP lockout protection",
                "Per-device rate limiting (120 req/min)",
                "Audit logging of all data access",
                "Automated session expiry & token rotation",
                "Input validation & XSS/CSRF prevention",
                "Content Security Policy (CSP) enforcement",
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-3 w-3 text-green-500 flex-shrink-0" /> {m}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Transfers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> International Data Transfers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Vehicle telemetry data is processed through our cloud infrastructure. Where data is
              transferred outside your jurisdiction, we ensure adequate protection through Standard
              Contractual Clauses (SCCs) or equivalent mechanisms approved under GDPR Art. 46.
            </p>
          </CardContent>
        </Card>

        <Separator />
        <p className="text-xs text-center text-muted-foreground pb-4">
          This policy is reviewed annually. For questions, contact{" "}
          <span className="text-primary">dpo@fleetwise.et</span> or your organization's Data
          Protection Officer.
        </p>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
