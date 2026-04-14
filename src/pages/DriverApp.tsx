import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck, MapPin, Fuel, AlertTriangle, FileText, Settings,
  User, Heart, Trophy, Star, Clock, Shield, TrendingUp,
  CheckCircle2, BookOpen, CreditCard, Calendar,
} from "lucide-react";
import { DriverMobileView } from "@/components/driver/DriverMobileView";
import { useDispatchJobs, DispatchJob } from "@/hooks/useDispatchJobs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { WellnessCheckForm } from "@/components/drivers/WellnessCheckForm";
import { WellnessCheckHistory } from "@/components/drivers/WellnessCheckHistory";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, differenceInDays, isPast } from "date-fns";

import { useTranslation } from 'react-i18next';
interface MobileDispatchJob {
  id: string;
  job_number: string;
  status: string;
  priority: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;
  scheduled_pickup_at: string | null;
  scheduled_dropoff_at: string | null;
  cargo_description: string | null;
  special_instructions: string | null;
}

const mapToMobileJob = (job: DispatchJob): MobileDispatchJob => ({
  id: job.id,
  job_number: job.job_number,
  status: job.status,
  priority: job.priority || null,
  customer_name: job.customer_name || null,
  customer_phone: job.customer_phone || null,
  pickup_location_name: job.pickup_location_name || null,
  dropoff_location_name: job.dropoff_location_name || null,
  scheduled_pickup_at: job.scheduled_pickup_at || null,
  scheduled_dropoff_at: job.scheduled_dropoff_at || null,
  cargo_description: job.cargo_description || null,
  special_instructions: job.special_instructions || null,
});

const DriverApp = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [complianceEvents, setComplianceEvents] = useState<any[]>([]);
  const [behaviorScore, setBehaviorScore] = useState<any>(null);
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { jobs, updateJobStatus, capturePOD } = useDispatchJobs();

  // Fetch driver data
  useEffect(() => {
    async function fetchDriverData() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDriverId(data.id);
        setDriverData(data);
      }
    }
    fetchDriverData();
  }, [user?.id]);

  // Fetch driver-specific data in parallel
  useEffect(() => {
    if (!driverId || !organizationId) return;

    const fetchAll = async () => {
      const [docsRes, rewardsRes, compRes, scoreRes] = await Promise.all([
        supabase.from("documents").select("*")
          .eq("entity_type", "driver").eq("entity_id", driverId)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("driver_rewards").select("*")
          .eq("driver_id", driverId).eq("organization_id", organizationId)
          .order("issued_at", { ascending: false }).limit(10),
        supabase.from("driver_compliance_events").select("*")
          .eq("driver_id", driverId).eq("organization_id", organizationId)
          .neq("status", "completed")
          .order("due_date", { ascending: true }).limit(10),
        supabase.from("driver_behavior_scores").select("*")
          .eq("driver_id", driverId).eq("organization_id", organizationId)
          .order("score_period_end", { ascending: false }).limit(1),
      ]);
      setDocuments((docsRes.data as any) || []);
      setRewards((rewardsRes.data as any) || []);
      setComplianceEvents((compRes.data as any) || []);
      if (scoreRes.data && scoreRes.data.length > 0) setBehaviorScore(scoreRes.data[0]);
    };
    fetchAll();
  }, [driverId, organizationId]);

  const driverJobs = jobs.filter(j => j.status !== "pending").map(mapToMobileJob);

  const handleAcceptJob = (jobId: string) => {
    updateJobStatus(jobId, "en_route");
    toast.success("Job accepted");
  };

  const handleUpdateStatus = (jobId: string, status: string) => {
    const statusMap: Record<string, DispatchJob['status']> = {
      'en_route_pickup': 'en_route', 'arrived_pickup': 'arrived',
      'en_route_dropoff': 'en_route', 'arrived_dropoff': 'arrived', 'completed': 'completed',
    };
    updateJobStatus(jobId, statusMap[status] || 'en_route');
  };

  const handleCapturePOD = (jobId: string, data: { recipient_name: string; notes: string; photos: string[] }) => {
    capturePOD({
      job_id: jobId, captured_at: new Date().toISOString(),
      recipient_name: data.recipient_name, notes: data.notes, photo_urls: data.photos,
    });
  };

  const getExpiryBadge = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (isPast(new Date(date))) return <Badge variant="destructive" className="text-[10px]">{t('common.expired', 'Expired')}</Badge>;
    if (days <= 30) return <Badge variant="destructive" className="text-[10px]">{days}d left</Badge>;
    if (days <= 90) return <Badge variant="secondary" className="text-[10px]">{days}d left</Badge>;
    return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400">Valid</Badge>;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="pb-20">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    Welcome, {driverData ? `${driverData.first_name}` : user?.email?.split("@")[0] || "Driver"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {driverData?.employee_id && `ID: ${driverData.employee_id} · `}
                    {driverData?.status && <Badge variant={driverData.status === "active" ? "default" : "secondary"} className="text-[10px]">{driverData.status}</Badge>}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="p-3 text-center">
                  <Shield className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <p className="text-2xl font-bold">{driverData?.safety_score || behaviorScore?.overall_score?.toFixed(0) || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Safety Score</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{driverData?.total_trips?.toLocaleString() || "0"}</p>
                  <p className="text-[10px] text-muted-foreground">Total Trips</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <MapPin className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <p className="text-2xl font-bold">{driverData?.total_distance_km ? `${(driverData.total_distance_km / 1000).toFixed(1)}K` : "0"}</p>
                  <p className="text-[10px] text-muted-foreground">Total km</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <p className="text-2xl font-bold">{rewards.length}</p>
                  <p className="text-[10px] text-muted-foreground">Rewards</p>
                </CardContent></Card>
              </div>

              {/* Upcoming Compliance */}
              {complianceEvents.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-amber-400" /> Upcoming Deadlines
                    </h3>
                    <div className="space-y-2">
                      {complianceEvents.slice(0, 5).map(evt => (
                        <div key={evt.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{evt.title}</p>
                            <p className="text-[10px] text-muted-foreground">Due: {format(new Date(evt.due_date), "MMM dd, yyyy")}</p>
                          </div>
                          {isPast(new Date(evt.due_date))
                            ? <Badge variant="destructive" className="text-[10px]">{t('common.overdue', 'Overdue')}</Badge>
                            : <Badge variant="secondary" className="text-[10px]">{differenceInDays(new Date(evt.due_date), new Date())}d</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Behavior Breakdown */}
              {behaviorScore && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-primary" /> Performance Breakdown
                    </h3>
                    {[
                      { label: "Speeding", value: behaviorScore.speeding_score },
                      { label: "Braking", value: behaviorScore.braking_score },
                      { label: "Acceleration", value: behaviorScore.acceleration_score },
                      { label: "Idle", value: behaviorScore.idle_score },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-muted-foreground w-24">{item.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.value >= 80 ? "bg-emerald-400" : item.value >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${item.value}%` }} />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Wellness Tab */}
          {activeTab === "wellness" && driverId && (
            <div className="p-4 space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" /> Wellness Check
              </h1>
              <WellnessCheckForm driverId={driverId} />
              <WellnessCheckHistory driverId={driverId} limit={5} />
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <DriverMobileView
              jobs={driverJobs}
              onAcceptJob={handleAcceptJob}
              onUpdateStatus={handleUpdateStatus}
              onCapturePOD={handleCapturePOD}
            />
          )}

          {/* Documents Tab — Live Data */}
          {activeTab === "documents" && (
            <div className="p-4 space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" /> My Documents
              </h1>

              {/* License info from driver record */}
              {driverData && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold mb-3">License Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5 border-b">
                        <div>
                          <p className="text-sm font-medium">Driver's License</p>
                          <p className="text-[10px] text-muted-foreground">
                            #{driverData.license_number} · Class {driverData.license_class || "—"}
                          </p>
                        </div>
                        {getExpiryBadge(driverData.license_expiry)}
                      </div>
                      {driverData.medical_certificate_expiry && (
                        <div className="flex justify-between items-center py-1.5 border-b">
                          <div>
                            <p className="text-sm font-medium">Medical Certificate</p>
                            <p className="text-[10px] text-muted-foreground">
                              Expires: {format(new Date(driverData.medical_certificate_expiry), "MMM dd, yyyy")}
                            </p>
                          </div>
                          {getExpiryBadge(driverData.medical_certificate_expiry)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Uploaded documents */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Uploaded Documents ({documents.length})</h3>
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet</p>
                  ) : (
                    <div className="divide-y">
                      {documents.map(doc => (
                        <div key={doc.id} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium truncate max-w-[200px]">{doc.file_name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{doc.document_type.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.is_verified
                              ? <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400">{t('documents.verified', 'Verified')}</Badge>
                              : <Badge variant="outline" className="text-[10px]">{t('common.pending', 'Pending')}</Badge>}
                            {getExpiryBadge(doc.expiry_date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Profile Tab — Live Data */}
          {activeTab === "profile" && (
            <div className="p-4 space-y-4">
              <h1 className="text-2xl font-bold">{t('pages.driver_app.title', 'My Profile')}</h1>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {driverData ? `${driverData.first_name} ${driverData.last_name}` : user?.email?.split("@")[0]}
                      </h2>
                      <p className="text-muted-foreground text-sm">{driverData?.email || user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Employee ID", value: driverData?.employee_id || "—" },
                      { label: "Phone", value: driverData?.phone || "—" },
                      { label: "Safety Score", value: driverData?.safety_score?.toString() || "—" },
                      { label: "Total Trips", value: driverData?.total_trips?.toLocaleString() || "0" },
                      { label: "Total Distance", value: driverData?.total_distance_km ? `${driverData.total_distance_km.toLocaleString()} km` : "0 km" },
                      { label: "Hire Date", value: driverData?.hire_date ? format(new Date(driverData.hire_date), "MMM dd, yyyy") : "—" },
                      { label: "License #", value: driverData?.license_number || "—" },
                      { label: "License Class", value: driverData?.license_class || "—" },
                      { label: "Status", value: driverData?.status || "—" },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground text-sm">{item.label}</span>
                        <span className="font-medium text-sm">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Emergency Contact */}
                  {driverData?.emergency_contact_name && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs font-semibold mb-1">Emergency Contact</p>
                      <p className="text-sm">{driverData.emergency_contact_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {driverData.emergency_contact_relationship} · {driverData.emergency_contact_phone}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rewards */}
              {rewards.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-amber-400" /> My Rewards
                    </h3>
                    <div className="divide-y">
                      {rewards.map(r => (
                        <div key={r.id} className="py-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{r.title}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{r.reward_type?.replace(/_/g, " ")}</p>
                          </div>
                          {r.value_amount > 0 && <span className="text-sm font-bold text-emerald-400">${r.value_amount}</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
          <div className="flex justify-around py-2">
            {[
              { key: "dashboard", icon: TrendingUp, label: "Home" },
              { key: "wellness", icon: Heart, label: "Wellness" },
              { key: "jobs", icon: MapPin, label: "Jobs" },
              { key: "documents", icon: FileText, label: "Docs" },
              { key: "profile", icon: User, label: "Profile" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center gap-1 px-4 py-2 ${
                  activeTab === tab.key ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DriverApp;
