import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Car, Wrench, Fuel, FileText, Award, Clock, MapPin, Activity,
  Loader2, ChevronRight, AlertTriangle, CheckCircle2, Calendar, Gauge, Shield
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, formatDistanceToNow } from "date-fns";

const DriverPortal = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();

  // Driver self info + assigned vehicle
  const { data: driverData, isLoading: driverLoading } = useQuery({
    queryKey: ["driver-portal-self", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data: driver } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, license_number, license_expiry, status, total_trips, total_distance_km, avatar_url")
        .eq("organization_id", organizationId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!driver) return { driver: null, vehicle: null };

      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, year, fuel_type, status")
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driver.id)
        .maybeSingle();

      return { driver, vehicle };
    },
    enabled: !!organizationId,
  });

  const driverId = driverData?.driver?.id;
  const vehicleId = driverData?.vehicle?.id;

  // Today's & upcoming trips
  const { data: trips } = useQuery({
    queryKey: ["driver-portal-trips", driverId],
    queryFn: async () => {
      if (!driverId) return { active: [], upcoming: [], recent: [] };
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [{ data: active }, { data: upcoming }, { data: recent }] = await Promise.all([
        supabase.from("trips").select("id, start_time, end_time, status, distance_km, start_location, end_location")
          .eq("driver_id", driverId).in("status", ["in_progress", "scheduled"])
          .order("start_time", { ascending: true }).limit(5),
        supabase.from("dispatch_jobs").select("id, job_number, scheduled_pickup_at, pickup_location_name, dropoff_location_name, status, priority")
          .eq("driver_id", driverId).in("status", ["assigned", "dispatched", "pending"])
          .order("scheduled_pickup_at", { ascending: true }).limit(5),
        supabase.from("trips").select("id, start_time, end_time, distance_km, start_location, end_location")
          .eq("driver_id", driverId).eq("status", "completed")
          .order("end_time", { ascending: false }).limit(5),
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

  // Open requests (maintenance + fuel)
  const { data: openRequests } = useQuery({
    queryKey: ["driver-portal-requests", driverId],
    queryFn: async () => {
      if (!driverId) return { maintenance: 0, fuel: 0 };
      const [m, f] = await Promise.all([
        supabase.from("maintenance_requests").select("id", { count: "exact", head: true })
          .eq("driver_id", driverId).not("status", "in", "(completed,rejected,cancelled)"),
        supabase.from("fuel_requests").select("id", { count: "exact", head: true })
          .eq("driver_id", driverId).in("status", ["pending", "approved"]),
      ]);
      return { maintenance: m.count || 0, fuel: f.count || 0 };
    },
    enabled: !!driverId,
  });

  // Documents/compliance status
  const licenseExpiry = driverData?.driver?.license_expiry;
  const daysUntilExpiry = useMemo(() => {
    if (!licenseExpiry) return null;
    return Math.ceil((new Date(licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [licenseExpiry]);

  if (driverLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const driver = driverData?.driver;
  const vehicle = driverData?.vehicle;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : "Driver";

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Hero / Welcome */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 slide-in-right">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl glass-strong glow">
              <Shield className="w-8 h-8 text-primary float-animation" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold gradient-text">
                Welcome, {driver?.first_name || "Driver"}
              </h1>
              <p className="text-muted-foreground mt-1">
                Your driver portal — assignments, requests, performance & documents
              </p>
            </div>
          </div>
          {driver?.status && (
            <Badge variant="outline" className="capitalize self-start md:self-auto">
              {driver.status}
            </Badge>
          )}
        </div>

        {!driver && (
          <Card className="glass-strong border-warning/30">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <div>
                <p className="font-medium">No driver profile linked to your account</p>
                <p className="text-sm text-muted-foreground">Contact Fleet Operations to link your driver record.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-strong">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Car className="w-6 h-6 text-primary" />
                <Badge variant="outline" className="text-xs">Assigned</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">My Vehicle</p>
              <p className="font-bold text-lg truncate">
                {vehicle ? vehicle.plate_number : "—"}
              </p>
              {vehicle && (
                <p className="text-xs text-muted-foreground truncate">{vehicle.make} {vehicle.model}</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Activity className="w-6 h-6 text-success" />
                <Badge variant="outline" className="text-xs">Lifetime</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total Trips</p>
              <p className="font-bold text-2xl">{driver?.total_trips || 0}</p>
              <p className="text-xs text-muted-foreground">
                {Number(driver?.total_distance_km || 0).toLocaleString()} km
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Award className="w-6 h-6 text-warning" />
                <Badge variant="outline" className="text-xs">Score</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Safety Rating</p>
              <p className="font-bold text-2xl">
                {score?.overall_score ? Math.round(score.overall_score) : "—"}
                {score?.overall_score && <span className="text-sm text-muted-foreground">/100</span>}
              </p>
              {score?.overall_score && (
                <Progress value={score.overall_score} className="h-1 mt-2" />
              )}
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Clock className="w-6 h-6 text-accent" />
                <Badge variant="outline" className="text-xs">Open</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">My Requests</p>
              <p className="font-bold text-2xl">
                {(openRequests?.maintenance || 0) + (openRequests?.fuel || 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {openRequests?.maintenance || 0} maint · {openRequests?.fuel || 0} fuel
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main grid: Assignments + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's Assignments */}
          <Card className="glass-strong lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Today's Assignments
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate("/driver-management")}>
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {trips?.active?.length === 0 && trips?.upcoming?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  No active or scheduled assignments
                </div>
              ) : (
                <>
                  {trips?.active?.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/20 text-primary border-primary/30" variant="outline">{t.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {t.start_time ? format(new Date(t.start_time), "HH:mm") : "—"}
                          </span>
                        </div>
                        <p className="text-sm mt-1 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {t.start_location || "—"} → {t.end_location || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {trips?.upcoming?.map((j: any) => (
                    <div key={j.id} className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{j.job_number}</Badge>
                          <Badge variant={j.priority === "high" ? "destructive" : "outline"} className="text-xs capitalize">
                            {j.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {j.scheduled_pickup_at ? format(new Date(j.scheduled_pickup_at), "MMM dd HH:mm") : "—"}
                          </span>
                        </div>
                        <p className="text-sm mt-1 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {j.pickup_location_name || "—"} → {j.dropoff_location_name || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-strong">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/driver-maintenance-request")}>
                <Wrench className="w-4 h-4 mr-2 text-warning" /> Report Vehicle Issue
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/fuel-management")}>
                <Fuel className="w-4 h-4 mr-2 text-primary" /> Request Fuel
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/vehicle-requests")}>
                <Car className="w-4 h-4 mr-2 text-accent" /> Request Vehicle
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/inspections")}>
                <Gauge className="w-4 h-4 mr-2 text-success" /> Pre-Trip Inspection
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/document-management")}>
                <FileText className="w-4 h-4 mr-2 text-muted-foreground" /> My Documents
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Performance + Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Performance breakdown */}
          <Card className="glass-strong">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4" /> My Performance
                {score?.score_period_end && (
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    as of {format(new Date(score.score_period_end), "MMM dd")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {score ? (
                <>
                  {[
                    { label: "Speeding", value: score.speeding_score, color: "bg-success" },
                    { label: "Braking", value: score.braking_score, color: "bg-primary" },
                    { label: "Acceleration", value: score.acceleration_score, color: "bg-accent" },
                    { label: "Idle", value: score.idle_score, color: "bg-warning" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.value ? Math.round(item.value) : "—"}/100</span>
                      </div>
                      <Progress value={item.value || 0} className="h-2" />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Recent Trips: <span className="font-medium text-foreground">{trips?.recent?.length || 0}</span> in last batch
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  No performance data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents & Compliance */}
          <Card className="glass-strong">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Documents & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> View Compliance Status</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/document-management")}>
                <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Upload / View Documents</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/driver-training")}>
                <span className="flex items-center gap-2"><Award className="w-4 h-4" /> Training Certificates</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Trip History */}
        <Card className="glass-strong">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> Recent Trip History
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/route-history")}>
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {trips?.recent?.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No completed trips yet</div>
            ) : (
              <div className="space-y-2">
                {trips?.recent?.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30 cursor-pointer text-sm" onClick={() => navigate(`/route-history?tripId=${t.id}`)}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded bg-primary/10">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{t.start_location || "—"} → {t.end_location || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.end_time ? formatDistanceToNow(new Date(t.end_time), { addSuffix: true }) : "—"}
                          {t.distance_km && ` · ${Number(t.distance_km).toFixed(1)} km`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DriverPortal;
