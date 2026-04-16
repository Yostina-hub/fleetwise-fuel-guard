import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SuperAdminDriverPicker from "@/components/driver-portal/SuperAdminDriverPicker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car, FileText, Award, Clock, MapPin, Activity,
  Loader2, ChevronRight, AlertTriangle, CheckCircle2, Calendar, Shield, History,
  Inbox, PlayCircle, StopCircle
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import DriverQuickStats from "@/components/driver-portal/DriverQuickStats";
import DriverQuickActions from "@/components/driver-portal/DriverQuickActions";
import DriverFuelRequestDialog from "@/components/driver-portal/DriverFuelRequestDialog";
import DriverVehicleRequestDialog from "@/components/driver-portal/DriverVehicleRequestDialog";
import DriverInspectionDialog from "@/components/driver-portal/DriverInspectionDialog";
import DriverMaintenanceDialog from "@/components/driver-portal/DriverMaintenanceDialog";
import DriverSubmissionsTab from "@/components/driver-portal/DriverSubmissionsTab";

const DriverPortal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [activeTab, setActiveTab] = useState("assignments");

  // Dialog states
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showFuel, setShowFuel] = useState(false);
  const [showVehicle, setShowVehicle] = useState(false);
  const [showInspection, setShowInspection] = useState(false);

  // Driver self info + assigned vehicle + auth user id
  const { data: driverData, isLoading: driverLoading } = useQuery({
    queryKey: ["driver-portal-self", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data: driver } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, license_number, license_expiry, status, total_trips, total_distance_km, avatar_url, phone")
        .eq("organization_id", organizationId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      const userId = userData.user.id;
      if (!driver) return { driver: null, vehicle: null, userId };

      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, year, fuel_type, status")
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driver.id)
        .maybeSingle();

      return { driver, vehicle, userId };
    },
    enabled: !!organizationId,
  });

  const driverId = driverData?.driver?.id;
  const userId = driverData?.userId;
  const vehicle = driverData?.vehicle;
  const driver = driverData?.driver;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : undefined;

  // Today's & upcoming trips + dispatch jobs
  const { data: trips } = useQuery({
    queryKey: ["driver-portal-trips", driverId],
    queryFn: async () => {
      if (!driverId) return { active: [], upcoming: [], recent: [] };

      const [{ data: active }, { data: upcoming }, { data: recent }] = await Promise.all([
        (supabase as any).from("dispatch_jobs").select("id, job_number, status, priority, pickup_location_name, dropoff_location_name, scheduled_pickup_at, actual_pickup_at, actual_dropoff_at, odometer_start, odometer_end, distance_traveled_km")
          .eq("driver_id", driverId).in("status", ["assigned", "dispatched", "in_progress"])
          .order("scheduled_pickup_at", { ascending: true }).limit(10),
        supabase.from("dispatch_jobs").select("id, job_number, scheduled_pickup_at, pickup_location_name, dropoff_location_name, status, priority")
          .eq("driver_id", driverId).in("status", ["pending"])
          .order("scheduled_pickup_at", { ascending: true }).limit(5),
        supabase.from("trips").select("id, start_time, end_time, distance_km, start_location, end_location")
          .eq("driver_id", driverId).eq("status", "completed")
          .order("end_time", { ascending: false }).limit(10),
      ]);
      return { active: active || [], upcoming: upcoming || [], recent: recent || [] };
    },
    enabled: !!driverId,
  });

  // Latest driver score
  const { data: score } = useQuery<any>({
    queryKey: ["driver-portal-score", driverId],
    queryFn: async () => {
      if (!driverId) return null;
      const { data } = await supabase
        .from("driver_behavior_scores")
        .select("overall_score, speeding_score, braking_score, acceleration_score, idle_score, score_period_end")
        .eq("driver_id", driverId)
        .order("score_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!driverId,
  });

  // Open requests counts
  const { data: openRequests } = useQuery({
    queryKey: ["driver-portal-requests", driverId],
    queryFn: async () => {
      if (!driverId) return { maintenance: 0, fuel: 0 };
      const [m, f] = await Promise.all([
        supabase.from("maintenance_requests").select("id", { count: "exact", head: true })
          .eq("driver_id", driverId).not("status", "in", "(completed,rejected,cancelled)"),
        (supabase as any).from("fuel_requests").select("id", { count: "exact", head: true })
          .eq("driver_id", driverId).in("status", ["pending", "approved"]),
      ]);
      return { maintenance: m.count || 0, fuel: f.count || 0 };
    },
    enabled: !!driverId,
  });

  // License expiry
  const licenseExpiry = driver?.license_expiry;
  const daysUntilExpiry = useMemo(() => {
    if (!licenseExpiry) return null;
    return Math.ceil((new Date(licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [licenseExpiry]);

  // Check-in / Check-out for dispatch job (with mileage)
  const handleStartJob = async (jobId: string) => {
    const odoStr = window.prompt("Enter starting odometer (km) — leave blank to skip:");
    const odoStart = odoStr && !isNaN(Number(odoStr)) ? Number(odoStr) : null;
    try {
      const { error } = await supabase.from("dispatch_jobs").update({
        status: "in_progress",
        actual_pickup_at: new Date().toISOString(),
        ...(odoStart !== null ? { odometer_start: odoStart } : {}),
      } as any).eq("id", jobId);
      if (error) throw error;
      toast.success("Trip started — drive safely!");
      queryClient.invalidateQueries({ queryKey: ["driver-portal-trips"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to start trip");
    }
  };

  const handleCompleteJob = async (jobId: string, odoStartKnown?: number | null) => {
    const odoStr = window.prompt(
      odoStartKnown != null
        ? `Enter ending odometer (km) — start was ${odoStartKnown}:`
        : "Enter ending odometer (km) — leave blank to skip:"
    );
    const odoEnd = odoStr && !isNaN(Number(odoStr)) ? Number(odoStr) : null;
    let distance: number | null = null;
    if (odoEnd !== null && odoStartKnown != null && odoEnd >= odoStartKnown) {
      distance = odoEnd - odoStartKnown;
    }
    try {
      const { error } = await supabase.from("dispatch_jobs").update({
        status: "completed",
        actual_dropoff_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        ...(odoEnd !== null ? { odometer_end: odoEnd } : {}),
        ...(distance !== null ? { distance_traveled_km: distance } : {}),
      } as any).eq("id", jobId);
      if (error) throw error;
      toast.success(distance !== null ? `Trip completed · ${distance} km logged` : "Trip completed");
      queryClient.invalidateQueries({ queryKey: ["driver-portal-trips"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to complete trip");
    }
  };

  // Realtime subscriptions — auto-refresh on backend changes
  useEffect(() => {
    if (!driverId || !organizationId) return;
    const channel = supabase
      .channel(`driver-portal-${driverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_jobs", filter: `driver_id=eq.${driverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["driver-portal-trips"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests", filter: `driver_id=eq.${driverId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
          queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_requests", filter: `driver_id=eq.${driverId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
          queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_requests", filter: `organization_id=eq.${organizationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverId, organizationId, queryClient]);

  if (driverLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading driver portal" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold">Driver Portal</h1>
            <p className="text-muted-foreground">
              {driver ? `Welcome, ${driver.first_name} ${driver.last_name}` : "Your assignments, requests & compliance hub"}
            </p>
          </div>
          {driver?.status && (
            <Badge variant="outline" className="capitalize ml-auto">
              {driver.status}
            </Badge>
          )}
        </div>

        {!driver && (
          <Card className="glass-strong border-warning/30">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-warning" aria-hidden="true" />
              <div>
                <p className="font-medium">No driver profile linked to your account</p>
                <p className="text-sm text-muted-foreground">Contact Fleet Operations to link your driver record.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <DriverQuickStats
          vehiclePlate={vehicle?.plate_number}
          vehicleMakeModel={vehicle ? `${vehicle.make || ""} ${vehicle.model || ""}`.trim() : null}
          totalTrips={driver?.total_trips || 0}
          totalDistanceKm={Number(driver?.total_distance_km || 0)}
          safetyScore={score?.overall_score}
          openMaintenance={openRequests?.maintenance || 0}
          openFuel={openRequests?.fuel || 0}
        />

        {/* Quick Actions — open dialogs (no navigation) */}
        <DriverQuickActions
          onReportIssue={() => setShowMaintenance(true)}
          onRequestFuel={() => setShowFuel(true)}
          onRequestVehicle={() => setShowVehicle(true)}
          onPreTripInspection={() => setShowInspection(true)}
          onMyDocuments={() => navigate("/document-management")}
        />

        {/* Tabbed sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto w-full gap-1">
            <TabsTrigger value="assignments" className="gap-2">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Assignments</span>
              <span className="sm:hidden">Trips</span>
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <Inbox className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">My Submissions</span>
              <span className="sm:hidden">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Award className="h-4 w-4" aria-hidden="true" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Compliance</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" aria-hidden="true" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" aria-hidden="true" /> My Assignments
                </h2>
                <Button size="sm" variant="ghost" onClick={() => navigate("/dispatch-management")}>
                  Open dispatch <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Button>
              </div>
              <div className="space-y-3">
                {trips?.active?.length === 0 && trips?.upcoming?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" aria-hidden="true" />
                    No active or scheduled assignments
                  </div>
                ) : (
                  <>
                    {trips?.active?.map((j: any) => {
                      const inProgress = j.status === "in_progress";
                      return (
                        <div key={j.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-primary/20 text-primary border-primary/30" variant="outline">{j.status}</Badge>
                                <Badge variant="outline" className="text-xs">{j.job_number}</Badge>
                                {j.priority && (
                                  <Badge variant={j.priority === "high" ? "destructive" : "outline"} className="text-xs capitalize">
                                    {j.priority}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {j.scheduled_pickup_at ? format(new Date(j.scheduled_pickup_at), "MMM dd HH:mm") : "—"}
                                </span>
                              </div>
                              <p className="text-sm mt-2 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3" aria-hidden="true" /> {j.pickup_location_name || "—"} → {j.dropoff_location_name || "—"}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              {!inProgress ? (
                                <Button size="sm" onClick={() => handleStartJob(j.id)} className="gap-1">
                                  <PlayCircle className="w-4 h-4" aria-hidden="true" /> Check In
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleCompleteJob(j.id, j.odometer_start)} className="gap-1">
                                  <StopCircle className="w-4 h-4" aria-hidden="true" /> Check Out
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {trips?.upcoming?.map((j: any) => (
                      <div key={j.id} className="p-3 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{j.job_number}</Badge>
                          <Badge variant={j.priority === "high" ? "destructive" : "outline"} className="text-xs capitalize">
                            {j.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {j.scheduled_pickup_at ? format(new Date(j.scheduled_pickup_at), "MMM dd HH:mm") : "—"}
                          </span>
                        </div>
                        <p className="text-sm mt-1 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" aria-hidden="true" /> {j.pickup_location_name || "—"} → {j.dropoff_location_name || "—"}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <DriverSubmissionsTab driverId={driverId} organizationId={organizationId} userId={userId} />
          </TabsContent>

          <TabsContent value="performance">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" aria-hidden="true" /> My Performance
                </h2>
                {score?.score_period_end && (
                  <span className="text-xs text-muted-foreground">
                    as of {format(new Date(score.score_period_end), "MMM dd, yyyy")}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {score ? (
                  <>
                    {[
                      { label: "Speeding", value: score.speeding_score },
                      { label: "Braking", value: score.braking_score },
                      { label: "Acceleration", value: score.acceleration_score },
                      { label: "Idle Time", value: score.idle_score },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value ? Math.round(item.value) : "—"}/100</span>
                        </div>
                        <Progress value={item.value || 0} className="h-2" />
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" aria-hidden="true" />
                    No performance data yet
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card className="p-6 space-y-3">
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" aria-hidden="true" /> Documents & Compliance
              </h2>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Driving License</span>
                  {licenseExpiry ? (
                    daysUntilExpiry !== null && daysUntilExpiry < 30 ? (
                      <Badge variant="destructive" className="text-xs">
                        {daysUntilExpiry < 0 ? "Expired" : `${daysUntilExpiry} days`}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-success/10 text-success">Valid</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-xs">Not set</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {driver?.license_number || "—"}
                  {licenseExpiry && ` · Expires ${format(new Date(licenseExpiry), "MMM dd, yyyy")}`}
                </p>
              </div>

              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/licensing-compliance")}>
                <span className="flex items-center gap-2"><Shield className="w-4 h-4" aria-hidden="true" /> View Compliance Status</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/document-management")}>
                <span className="flex items-center gap-2"><FileText className="w-4 h-4" aria-hidden="true" /> Upload / View Documents</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/driver-training")}>
                <span className="flex items-center gap-2"><Award className="w-4 h-4" aria-hidden="true" /> Training Certificates</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" aria-hidden="true" /> Recent Trip History
                </h2>
                <Button size="sm" variant="ghost" onClick={() => navigate("/route-history")}>
                  View all <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Button>
              </div>
              {trips?.recent?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No completed trips yet</div>
              ) : (
                <div className="space-y-2">
                  {trips?.recent?.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30 cursor-pointer text-sm" onClick={() => navigate(`/route-history?tripId=${t.id}`)}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded bg-primary/10">
                          <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{t.start_location || "—"} → {t.end_location || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.end_time ? formatDistanceToNow(new Date(t.end_time), { addSuffix: true }) : "—"}
                            {t.distance_km && ` · ${Number(t.distance_km).toFixed(1)} km`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <DriverMaintenanceDialog
          open={showMaintenance}
          onOpenChange={setShowMaintenance}
          driverId={driverId}
          vehicleId={vehicle?.id}
          vehiclePlate={vehicle?.plate_number}
          vehicleMakeModel={vehicle ? `${vehicle.make} ${vehicle.model}` : undefined}
        />
        <DriverFuelRequestDialog
          open={showFuel}
          onOpenChange={setShowFuel}
          driverId={driverId}
          driverName={driverName}
          vehicleId={vehicle?.id}
          vehiclePlate={vehicle?.plate_number}
          vehicleFuelType={vehicle?.fuel_type}
        />
        <DriverVehicleRequestDialog
          open={showVehicle}
          onOpenChange={setShowVehicle}
          driverName={driverName}
        />
        <DriverInspectionDialog
          open={showInspection}
          onOpenChange={setShowInspection}
          driverId={driverId}
          vehicleId={vehicle?.id}
          vehiclePlate={vehicle?.plate_number}
        />
      </div>
    </Layout>
  );
};

export default DriverPortal;
