/**
 * MyLicense — driver-facing personal compliance hub.
 *
 * Replaces the raw SOP page (/sop/license-renewal) for drivers. Surfaces:
 *   1. Driving license (number, class, issue/expiry, status badge, file links)
 *   2. Work permit / non-driving permits (from `documents` where document_type
 *      includes "permit")
 *   3. Medical certificate
 *   4. Training certificates (driver_training_progress + documents tagged
 *      "training_certificate")
 *   5. Renewal request timeline — workflow_instances filtered to this driver
 *      with friendly stage labels (no SOP jargon).
 *
 * The renewal CTA reuses RequestLicenseRenewalDialog; drivers never see the
 * raw workflow designer.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IdCard, ShieldCheck, FileText, Award, Heart, Clock, AlertTriangle,
  CheckCircle2, Loader2, ChevronLeft, Download, FileWarning, History,
  Calendar, Stethoscope, BookOpen, Upload,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import RequestLicenseRenewalDialog from "@/components/driver-portal/RequestLicenseRenewalDialog";
import UploadMyDocumentDialog, { type UploadDocCategory } from "@/components/driver-portal/UploadMyDocumentDialog";

interface DriverDoc {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  expiry_date: string | null;
  issue_date: string | null;
  document_number: string | null;
  is_verified: boolean;
  created_at: string;
}

interface RenewalInstance {
  id: string;
  reference_number: string | null;
  current_stage: string;
  status: string;
  created_at: string;
  updated_at: string;
  workflow_type: string;
}

/** Friendly labels for SOP stages so drivers don't see raw keys. */
const STAGE_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_review: "Pending review",
  fleet_review: "Reviewed by Fleet Ops",
  manager_approval: "Awaiting manager approval",
  approved: "Approved — preparing renewal",
  in_progress: "Renewal in progress",
  with_authority: "Submitted to authority",
  collected: "License collected",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
  in_progress: "default",
  completed: "outline",
  approved: "default",
  cancelled: "destructive",
  rejected: "destructive",
};

function expiryStatus(date?: string | null) {
  if (!date) return { tone: "muted" as const, label: "Not set", days: null as number | null };
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return { tone: "danger" as const, label: "Expired", days };
  if (days <= 30) return { tone: "danger" as const, label: `${days}d left`, days };
  if (days <= 90) return { tone: "warning" as const, label: `${days}d left`, days };
  return { tone: "ok" as const, label: "Valid", days };
}

const TONE_BADGE: Record<string, string> = {
  ok: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export default function MyLicense() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { organizationId, loading: orgLoading, isSuperAdmin } = useOrganization();
  const [showRenewal, setShowRenewal] = useState(false);
  const [activeTab, setActiveTab] = useState("license");

  // Resolve the driver record for the current user.
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ["my-license-driver", organizationId, user?.id],
    enabled: !authLoading && !orgLoading && !!organizationId && !!user,
    queryFn: async () => {
      if (!user) return null;
      const cols =
        "id, first_name, last_name, license_number, license_class, license_type, license_issue_date, license_expiry, license_verified, license_front_url, license_back_url, status, medical_certificate_expiry";
      // Primary lookup
      const primary = await supabase
        .from("drivers")
        .select(cols)
        .eq("organization_id", organizationId!)
        .eq("user_id", user.id)
        .maybeSingle();
      if (primary.data) return primary.data;
      // Email fallback (matches DriverPortal behaviour)
      const fallbackEmail = user.email?.trim().toLowerCase();
      if (!fallbackEmail) return null;
      const byEmail = await supabase
        .from("drivers")
        .select(cols)
        .eq("organization_id", organizationId!)
        .ilike("email", fallbackEmail)
        .limit(1)
        .maybeSingle();
      return byEmail.data ?? null;
    },
  });

  const driverId = driver?.id;

  // Documents (license scans, medical, work permit, training certs)
  const { data: docs } = useQuery({
    queryKey: ["my-license-docs", organizationId, driverId],
    enabled: !!organizationId && !!driverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, document_type, file_name, file_url, expiry_date, issue_date, document_number, is_verified, created_at",
        )
        .eq("organization_id", organizationId!)
        .eq("entity_type", "driver")
        .eq("entity_id", driverId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DriverDoc[];
    },
  });

  // Renewal request history (license_renewal workflow instances)
  const { data: renewals, isLoading: renewalsLoading } = useQuery({
    queryKey: ["my-license-renewals", organizationId, driverId, user?.id],
    enabled: !!organizationId && (!!driverId || !!user?.id),
    queryFn: async () => {
      let q = supabase
        .from("workflow_instances")
        .select("id, reference_number, current_stage, status, created_at, updated_at, workflow_type")
        .eq("organization_id", organizationId!)
        .eq("workflow_type", "license_renewal")
        .order("created_at", { ascending: false })
        .limit(20);
      const orParts: string[] = [];
      if (driverId) orParts.push(`driver_id.eq.${driverId}`);
      if (user?.id) orParts.push(`created_by.eq.${user.id}`);
      if (orParts.length) q = q.or(orParts.join(","));
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RenewalInstance[];
    },
  });

  // Training progress for the certificate tab
  const { data: training } = useQuery({
    queryKey: ["my-license-training", organizationId, driverId],
    enabled: !!organizationId && !!driverId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("driver_training_progress")
        .select(
          "id, status, progress_percent, score, started_at, completed_at, expires_at, course_id, driver_training_courses(title, category, is_required)",
        )
        .eq("driver_id", driverId!)
        .order("completed_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const grouped = useMemo(() => {
    const buckets = {
      license: [] as DriverDoc[],
      permit: [] as DriverDoc[],
      medical: [] as DriverDoc[],
      training: [] as DriverDoc[],
      other: [] as DriverDoc[],
    };
    for (const d of docs ?? []) {
      const t = d.document_type.toLowerCase();
      if (t.includes("license")) buckets.license.push(d);
      else if (t.includes("permit")) buckets.permit.push(d);
      else if (t.includes("medical") || t.includes("fitness")) buckets.medical.push(d);
      else if (t.includes("training") || t.includes("certif")) buckets.training.push(d);
      else buckets.other.push(d);
    }
    return buckets;
  }, [docs]);

  const isReady = !authLoading && !orgLoading && !driverLoading;

  if (!isReady) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading my license" />
        </div>
      </Layout>
    );
  }

  if (!driver) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Card className="glass-strong border-warning/30">
            <CardContent className="p-6 flex items-start gap-3">
              <FileWarning className="w-6 h-6 text-warning shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">
                  {isSuperAdmin
                    ? "No driver profile linked to your super-admin account"
                    : "No driver profile linked to your account"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSuperAdmin
                    ? "Use the Driver Portal's “View as Driver” picker to inspect a specific driver's license hub."
                    : "Ask Fleet Operations to link your driver record to your account so we can show your license, permit, and renewal status."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const lic = expiryStatus(driver.license_expiry);
  const med = expiryStatus(driver.medical_certificate_expiry);
  const fullName = `${driver.first_name} ${driver.last_name}`.trim();

  const hasOpenRenewal = (renewals ?? []).some(
    (r) => !["completed", "cancelled", "rejected"].includes(r.status),
  );

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/driver-portal")} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Driver portal
          </Button>
          <div className="flex items-center gap-3 ml-2">
            <ShieldCheck className="h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <h1 className="text-3xl font-bold">My License & Permits</h1>
              <p className="text-muted-foreground">Track your driving license, work permit, medical and training status — and request renewals.</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="gap-1"
              onClick={() => setShowRenewal(true)}
              disabled={hasOpenRenewal}
              title={hasOpenRenewal ? "You already have a renewal in progress." : ""}
            >
              <IdCard className="w-4 h-4" aria-hidden="true" />
              {hasOpenRenewal ? "Renewal in progress" : "Request license renewal"}
            </Button>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            icon={<IdCard className="w-5 h-5" />}
            title="Driving license"
            primary={driver.license_number || "—"}
            secondary={
              driver.license_expiry
                ? `Expires ${format(new Date(driver.license_expiry), "MMM dd, yyyy")}`
                : "Expiry not set"
            }
            badge={<Badge className={TONE_BADGE[lic.tone]} variant="outline">{lic.label}</Badge>}
          />
          <SummaryCard
            icon={<Award className="w-5 h-5" />}
            title="Work permit"
            primary={
              grouped.permit[0]?.document_number ?? (grouped.permit[0] ? "On file" : "Not on file")
            }
            secondary={
              grouped.permit[0]?.expiry_date
                ? `Expires ${format(new Date(grouped.permit[0].expiry_date!), "MMM dd, yyyy")}`
                : "Upload via Compliance"
            }
            badge={
              grouped.permit[0]
                ? (() => {
                    const s = expiryStatus(grouped.permit[0].expiry_date);
                    return <Badge className={TONE_BADGE[s.tone]} variant="outline">{s.label}</Badge>;
                  })()
                : <Badge className={TONE_BADGE.muted} variant="outline">Missing</Badge>
            }
          />
          <SummaryCard
            icon={<Stethoscope className="w-5 h-5" />}
            title="Medical certificate"
            primary={driver.medical_certificate_expiry ? "On file" : "Not on file"}
            secondary={
              driver.medical_certificate_expiry
                ? `Expires ${format(new Date(driver.medical_certificate_expiry), "MMM dd, yyyy")}`
                : "Ask HR to upload"
            }
            badge={<Badge className={TONE_BADGE[med.tone]} variant="outline">{med.label}</Badge>}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto w-full gap-1">
            <TabsTrigger value="license" className="gap-2"><IdCard className="h-4 w-4" /> License</TabsTrigger>
            <TabsTrigger value="permit" className="gap-2"><Award className="h-4 w-4" /> Work permit</TabsTrigger>
            <TabsTrigger value="medical" className="gap-2"><Heart className="h-4 w-4" /> Medical</TabsTrigger>
            <TabsTrigger value="training" className="gap-2"><BookOpen className="h-4 w-4" /> Training</TabsTrigger>
            <TabsTrigger value="renewals" className="gap-2"><History className="h-4 w-4" /> Renewals</TabsTrigger>
          </TabsList>

          {/* License */}
          <TabsContent value="license">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IdCard className="w-4 h-4" /> Driving license
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <Field label="Holder">{fullName}</Field>
                  <Field label="License number">{driver.license_number || "—"}</Field>
                  <Field label="Class">{driver.license_class || "—"}</Field>
                  <Field label="Type">{driver.license_type || "—"}</Field>
                  <Field label="Issue date">
                    {driver.license_issue_date ? format(new Date(driver.license_issue_date), "MMM dd, yyyy") : "—"}
                  </Field>
                  <Field label="Expiry date">
                    {driver.license_expiry ? format(new Date(driver.license_expiry), "MMM dd, yyyy") : "—"}
                  </Field>
                  <Field label="Verification">
                    {driver.license_verified ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </Field>
                  <Field label="Status">
                    <Badge className={TONE_BADGE[lic.tone]} variant="outline">{lic.label}</Badge>
                  </Field>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {driver.license_front_url && (
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <a href={driver.license_front_url} target="_blank" rel="noreferrer">
                        <Download className="w-3.5 h-3.5" /> Front scan
                      </a>
                    </Button>
                  )}
                  {driver.license_back_url && (
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <a href={driver.license_back_url} target="_blank" rel="noreferrer">
                        <Download className="w-3.5 h-3.5" /> Back scan
                      </a>
                    </Button>
                  )}
                  {!driver.license_front_url && !driver.license_back_url && (
                    <p className="text-xs text-muted-foreground">No license scans on file. Ask Fleet Ops to upload your license.</p>
                  )}
                </div>

                {lic.tone !== "ok" && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {lic.tone === "danger" && (lic.days ?? 0) < 0
                          ? "Your license has expired."
                          : "Your license is approaching its expiry date."}
                      </p>
                      <p className="text-muted-foreground">
                        File a renewal request now. Fleet Ops will track it through to collection.
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 gap-1"
                        onClick={() => setShowRenewal(true)}
                        disabled={hasOpenRenewal}
                      >
                        <IdCard className="w-3.5 h-3.5" /> {hasOpenRenewal ? "Renewal in progress" : "Request renewal"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work permit */}
          <TabsContent value="permit">
            <DocumentList
              empty="No work permits on file. If you carry a permit (e.g. HAZMAT, work-zone, foreign driver permit), ask HR to upload it."
              docs={grouped.permit}
              icon={<Award className="w-4 h-4" />}
              title="Work permits & special endorsements"
            />
          </TabsContent>

          {/* Medical */}
          <TabsContent value="medical">
            <DocumentList
              empty="No medical certificate on file. Submit your latest certificate of fitness to HR so it can be linked to your record."
              docs={grouped.medical}
              icon={<Heart className="w-4 h-4" />}
              title="Medical certificates"
            />
          </TabsContent>

          {/* Training */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Training certificates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(training ?? []).length === 0 && grouped.training.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No training records yet.</p>
                ) : (
                  <>
                    {(training ?? []).map((t: any) => {
                      const cert = t.driver_training_courses;
                      const exp = expiryStatus(t.expires_at);
                      return (
                        <div key={t.id} className="p-3 rounded-md border border-border bg-card">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{cert?.title || "Training course"}</p>
                              <p className="text-xs text-muted-foreground">
                                {cert?.category || "—"}
                                {t.completed_at && ` · Completed ${format(new Date(t.completed_at), "MMM dd, yyyy")}`}
                                {t.score != null && ` · Score ${t.score}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] capitalize">{t.status}</Badge>
                              {t.expires_at && (
                                <Badge className={TONE_BADGE[exp.tone]} variant="outline">{exp.label}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {grouped.training.map((d) => (
                      <DocRow key={d.id} doc={d} />
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Renewals */}
          <TabsContent value="renewals">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" /> License renewal history
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {renewalsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : (renewals ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You haven't filed any renewal requests yet.
                  </p>
                ) : (
                  (renewals ?? []).map((r) => (
                    <div key={r.id} className="p-3 rounded-md border border-border bg-card">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{r.reference_number || r.id.slice(0, 8)}</Badge>
                        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px] capitalize">
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          <Calendar className="inline w-3 h-3 mr-1" />
                          {format(new Date(r.created_at), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <p className="text-sm mt-1.5">
                        {STAGE_LABEL[r.current_stage] || r.current_stage.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Last update {format(new Date(r.updated_at), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Other docs (catch-all) */}
        {grouped.other.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Other documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.other.map((d) => <DocRow key={d.id} doc={d} />)}
            </CardContent>
          </Card>
        )}

        <RequestLicenseRenewalDialog
          open={showRenewal}
          onOpenChange={setShowRenewal}
          driver={driver}
        />
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}

function SummaryCard({
  icon, title, primary, secondary, badge,
}: {
  icon: React.ReactNode;
  title: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  badge: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {icon}
            <span>{title}</span>
          </div>
          {badge}
        </div>
        <p className="text-lg font-semibold truncate">{primary}</p>
        <p className="text-xs text-muted-foreground">{secondary}</p>
      </CardContent>
    </Card>
  );
}

function DocumentList({
  docs, empty, icon, title,
}: {
  docs: DriverDoc[];
  empty: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          docs.map((d) => <DocRow key={d.id} doc={d} />)
        )}
      </CardContent>
    </Card>
  );
}

function DocRow({ doc }: { doc: DriverDoc }) {
  const exp = expiryStatus(doc.expiry_date);
  return (
    <div className="p-3 rounded-md border border-border bg-card flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{doc.file_name}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {doc.document_type.replace(/_/g, " ")}
          {doc.document_number && ` · ${doc.document_number}`}
          {doc.issue_date && ` · Issued ${format(new Date(doc.issue_date), "MMM dd, yyyy")}`}
          {doc.expiry_date && ` · Expires ${format(new Date(doc.expiry_date), "MMM dd, yyyy")}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {doc.expiry_date && (
          <Badge className={TONE_BADGE[exp.tone]} variant="outline">{exp.label}</Badge>
        )}
        {doc.is_verified && (
          <Badge variant="outline" className="text-success border-success/30 bg-success/10">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
          </Badge>
        )}
        <Button asChild size="sm" variant="outline" className="gap-1">
          <a href={doc.file_url} target="_blank" rel="noreferrer">
            <Download className="w-3.5 h-3.5" /> Open
          </a>
        </Button>
      </div>
    </div>
  );
}
