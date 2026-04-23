import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SuperAdminDriverPicker from "@/components/driver-portal/SuperAdminDriverPicker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Car, FileText, Award, Clock, MapPin, Activity,
  Loader2, ChevronRight, AlertTriangle, CheckCircle2, Calendar, Shield, History,
  Inbox, PlayCircle, StopCircle
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DriverQuickStats from "@/components/driver-portal/DriverQuickStats";
import DriverQuickActions from "@/components/driver-portal/DriverQuickActions";
import { FuelRequestFormDialog } from "@/components/fuel/FuelRequestFormDialog";
import { VehicleInspectionFormDialog } from "@/components/maintenance/VehicleInspectionFormDialog";

import CreateWorkRequestDialog from "@/components/maintenance/CreateWorkRequestDialog";
import { TireRequestDialog } from "@/components/tire-management/TireRequestDialog";
import DriverSubmissionsTab from "@/components/driver-portal/DriverSubmissionsTab";
import DriverTripHistory from "@/components/driver-portal/DriverTripHistory";
import PendingPostTripBanner from "@/components/driver-portal/PendingPostTripBanner";
import DriverNotificationBanner from "@/components/driver-portal/DriverNotificationBanner";
import MyRequestsPanel from "@/components/driver-portal/MyRequestsPanel";
import RequestLicenseRenewalDialog from "@/components/driver-portal/RequestLicenseRenewalDialog";
import { AssignmentCheckInDialog } from "@/components/vehicle-requests/AssignmentCheckInDialog";
import DriverViewRequestDialog from "@/components/driver-portal/DriverViewRequestDialog";
import ReportTripIncidentDialog from "@/components/driver-portal/ReportTripIncidentDialog";
import { IdCard } from "lucide-react";
import { formatTripLocation } from "@/lib/formatTripLocation";

const DriverPortal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { organizationId, isSuperAdmin, loading: organizationLoading } = useOrganization();
  const [searchParams] = useSearchParams();
  const overrideDriverId = isSuperAdmin ? searchParams.get("driverId") : null;
  const [activeTab, setActiveTab] = useState("assignments");

  // Dialog states
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showFuel, setShowFuel] = useState(false);
  const [reportIncidentContext, setReportIncidentContext] = useState<{
    vehicleId?: string | null;
    tripId?: string | null;
    location?: string | null;
  } | null>(null);
  
  const [showTire, setShowTire] = useState(false);
  const [showInspection, setShowInspection] = useState(false);
  const [showLicenseRenewal, setShowLicenseRenewal] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<{ request: any; assignment: any } | null>(null);
  const [viewRequest, setViewRequest] = useState<any | null>(null);
  // Override prefill when launching the inspection dialog as a post-trip flow
  // (from the pending banner or from an alert deep-link).
  const [inspectionPrefillOverride, setInspectionPrefillOverride] = useState<{
    vehicle_id?: string;
    inspection_type?: string;
  } | null>(null);

  // Driver self info + assigned vehicle + auth user id
  // Super admins can override via ?driverId= to view the portal as that driver.
  const { data: driverData, isLoading: driverLoading } = useQuery({
    queryKey: ["driver-portal-self", organizationId, user?.id ?? null, overrideDriverId],
    queryFn: async () => {
      if (!organizationId) return null;
      if (!user) return null;
      const userId = user.id;
      const fallbackEmail = user.email?.trim().toLowerCase() ?? null;

      const driverColumns =
        "id, first_name, last_name, license_number, license_expiry, status, total_trips, total_distance_km, avatar_url, phone, email, user_id, organization_id";

      let driver: any = null;
      if (overrideDriverId) {
        const { data, error } = await supabase
          .from("drivers")
          .select(driverColumns)
          .eq("id", overrideDriverId)
          .maybeSingle();
        if (error) console.warn("[DriverPortal] override lookup failed:", error.message);
        driver = data;
      } else {
        // 1) Primary: drivers.user_id = auth.uid()
        const primary = await supabase
          .from("drivers")
          .select(driverColumns)
          .eq("organization_id", organizationId)
          .eq("user_id", userId)
          .maybeSingle();
        if (primary.error) console.warn("[DriverPortal] self lookup failed:", primary.error.message);
        driver = primary.data;

        // 2) Fallback: match by profile email → drivers.email and auto-link.
        // Handles drivers whose auth account was created later or re-provisioned
        // with a new auth user_id but the drivers row still points to the old one.
        if (!driver) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle();
          const email = prof?.email?.trim().toLowerCase() ?? fallbackEmail;
          if (email) {
            const { data: byEmail } = await supabase
              .from("drivers")
              .select(driverColumns)
              .eq("organization_id", organizationId)
              .ilike("email", email)
              .limit(1)
              .maybeSingle();
            if (byEmail) {
              console.info(
                "[DriverPortal] Linking driver by email fallback:",
                byEmail.id,
                "→ user",
                userId
              );
              // Best-effort auto-link so future loads use the fast path.
              const { error: linkErr } = await supabase
                .from("drivers")
                .update({ user_id: userId })
                .eq("id", byEmail.id);
              if (linkErr) {
                console.warn("[DriverPortal] auto-link failed:", linkErr.message);
              }
              driver = { ...byEmail, user_id: userId };
            }
          }
        }
      }

      if (!driver) return { driver: null, vehicle: null, activeRequest: null, userId };

      // 1) Permanent vehicle assignment (vehicles.assigned_driver_id)
      const { data: permanentVehicle } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, year, fuel_type, status")
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driver.id)
        .maybeSingle();

      // 2) Active vehicle request assignment (trip-based) — takes precedence if present
      const { data: activeRequest } = await (supabase as any)
        .from("vehicle_requests")
        .select(`
          id, request_number, status, approval_status, purpose, destination,
          needed_from, needed_until, assigned_at, driver_checked_in_at, driver_checked_out_at,
          assigned_vehicle_id,
          assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model, year, fuel_type, status)
        `)
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driver.id)
        .in("status", ["assigned", "approved", "in_progress"])
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const requestVehicle = activeRequest?.assigned_vehicle || null;
      const vehicle = requestVehicle || permanentVehicle || null;

      return { driver, vehicle, activeRequest, userId };
    },
    enabled: !authLoading && !organizationLoading && !!organizationId && !!user,
  });

  const driverId = driverData?.driver?.id;
  const userId = driverData?.userId;
  const vehicle = driverData?.vehicle;
  const driver = driverData?.driver;
  const activeRequest = driverData?.activeRequest;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : undefined;

  // Today's & upcoming trips + dispatch jobs + multi-vehicle request assignments
  const { data: trips } = useQuery({
    queryKey: ["driver-portal-trips", driverId, organizationId],
    queryFn: async () => {
      if (!driverId) return { active: [], upcoming: [], recent: [], requestAssignments: [] };

      const [{ data: active }, { data: upcoming }, { data: recent }, { data: requestAssignments }] = await Promise.all([
        (supabase as any).from("dispatch_jobs").select("id, job_number, status, priority, pickup_location_name, dropoff_location_name, scheduled_pickup_at, actual_pickup_at, actual_dropoff_at, odometer_start, odometer_end, distance_traveled_km")
          .eq("driver_id", driverId).in("status", ["assigned", "dispatched", "in_progress"])
          .order("scheduled_pickup_at", { ascending: true }).limit(10),
        supabase.from("dispatch_jobs").select("id, job_number, scheduled_pickup_at, pickup_location_name, dropoff_location_name, status, priority")
          .eq("driver_id", driverId).in("status", ["pending"])
          .order("scheduled_pickup_at", { ascending: true }).limit(5),
        supabase.from("trips").select("id, start_time, end_time, distance_km, start_location, end_location")
          .eq("driver_id", driverId).eq("status", "completed")
          .order("end_time", { ascending: false }).limit(10),
        // Multi-vehicle request assignments: each driver checks in/out their
        // own assigned vehicle within a parent vehicle_request.
        (supabase as any).from("vehicle_request_assignments")
          .select(`
            id, status, driver_checked_in_at, driver_checked_out_at,
            odometer_start, odometer_end,
            vehicle:vehicle_id(id, plate_number, make, model),
            request:vehicle_request_id(
              id, request_number, status, purpose, destination,
              needed_from, needed_until
            )
          `)
          .eq("driver_id", driverId)
          .is("driver_checked_out_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      return {
        active: active || [],
        upcoming: upcoming || [],
        recent: recent || [],
        requestAssignments: (requestAssignments || []).filter(
          (a: any) => a.request && !["completed", "cancelled", "rejected"].includes(a.request.status),
        ),
      };
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
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_requests", filter: `assigned_driver_id=eq.${driverId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["driver-portal-self"] });
          queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_requests", filter: `organization_id=eq.${organizationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_request_assignments", filter: `driver_id=eq.${driverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["driver-portal-trips"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverId, organizationId, queryClient]);

  /**
   * Deep-link handler: when arriving via /driver-portal?postTrip=<inspection_id>
   * (from an alert), look up the pending inspection and open the dialog
   * pre-filled as a post-trip checklist for the correct vehicle.
   */
  const postTripParam = searchParams.get("postTrip");
  useEffect(() => {
    if (!postTripParam || !organizationId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vehicle_inspections")
        .select("id, vehicle_id, status")
        .eq("id", postTripParam)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        toast.error("Post-trip inspection not found");
        return;
      }
      if (data.status !== "pending") {
        toast.info("This post-trip inspection has already been completed");
        return;
      }
      setInspectionPrefillOverride({ vehicle_id: data.vehicle_id, inspection_type: "post_trip" });
      setShowInspection(true);
    })();
    return () => { cancelled = true; };
  }, [postTripParam, organizationId]);

  if (authLoading || organizationLoading || driverLoading) {
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
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold">Driver Portal</h1>
            <p className="text-muted-foreground">
              {driver ? `Welcome, ${driver.first_name} ${driver.last_name}` : "Your assignments, requests & compliance hub"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {driver?.status && (
              <Badge variant="outline" className="capitalize">
                {driver.status}
              </Badge>
            )}
            {isSuperAdmin && (
              <SuperAdminDriverPicker viewingDriverName={driverName} />
            )}
          </div>
        </div>

        {!driver && (
          <Card className="glass-strong border-warning/30">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">
                  {isSuperAdmin
                    ? overrideDriverId
                      ? "Driver not found"
                      : "You are signed in as super admin"
                    : "No driver profile linked to your account"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSuperAdmin
                    ? overrideDriverId
                      ? "The selected driver could not be loaded. Pick another driver above."
                      : "Use the \"View as Driver\" picker above to inspect any driver's portal."
                    : "Your login is recognized but no driver record was found in this organization. Ask Fleet Operations to verify that your driver profile exists and that its email matches your account email exactly."}
                </p>
                {!isSuperAdmin && userId && (
                  <p className="text-xs text-muted-foreground/80 font-mono pt-1">
                    Account ID: {userId.slice(0, 8)}…
                  </p>
                )}
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

        {/* Driver notification banner — license renewed, workflow stage updates, etc. */}
        <DriverNotificationBanner
          driverId={driverId}
          onOpenRequests={() => setActiveTab("requests")}
        />

        {/* Pending post-trip inspection — hybrid enforcement */}
        <PendingPostTripBanner
          driverId={driverId}
          organizationId={organizationId || undefined}
          onStart={(insp) => {
            setInspectionPrefillOverride({ vehicle_id: insp.vehicle_id, inspection_type: "post_trip" });
            setShowInspection(true);
          }}
        />

        {/* Quick Actions — open dialogs (no navigation) */}
        <DriverQuickActions
          onReportIssue={() => setShowMaintenance(true)}
          onRequestFuel={() => setShowFuel(true)}
          
          onRequestTire={() => setShowTire(true)}
          onPreTripInspection={() => {
            setInspectionPrefillOverride(null);
            setShowInspection(true);
          }}
          onPostTripInspection={() => {
            setInspectionPrefillOverride({ vehicle_id: vehicle?.id, inspection_type: "post_trip" });
            setShowInspection(true);
          }}
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
              <span className="sm:hidden">Forms</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">My Requests</span>
              <span className="sm:hidden">SOPs</span>
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
              </div>
              {(() => {
                type Row = {
                  id: string;
                  kind: "request" | "job";
                  statusLabel: string;
                  statusTone: "success" | "primary" | "muted" | "warn";
                  reference: string;
                  when: string | null;
                  vehicle: string;
                  route: string;
                  priority?: string | null;
                  raw: any;
                };

                const rows: Row[] = [];
                const requestAssignmentIds = new Set(
                  (trips?.requestAssignments ?? [])
                    .map((a: any) => a?.request?.id)
                    .filter(Boolean),
                );

                // Include the currently active assigned request in the same table
                // so the entire section stays in one consistent format.
                if (activeRequest && !requestAssignmentIds.has(activeRequest.id)) {
                  rows.push({
                    id: `active-request-${activeRequest.id}`,
                    kind: "request",
                    statusLabel: activeRequest.driver_checked_in_at ? "Checked In" : "Assigned",
                    statusTone: activeRequest.driver_checked_in_at ? "success" : "primary",
                    reference: activeRequest.request_number || "—",
                    when: activeRequest.needed_from || null,
                    vehicle: activeRequest.assigned_vehicle
                      ? `${activeRequest.assigned_vehicle.plate_number || "—"}${activeRequest.assigned_vehicle.make ? ` · ${activeRequest.assigned_vehicle.make}` : ""}${activeRequest.assigned_vehicle.model ? ` ${activeRequest.assigned_vehicle.model}` : ""}`
                      : "—",
                    route: activeRequest.destination
                      ? `${activeRequest.purpose || "Trip"} → ${activeRequest.destination}`
                      : activeRequest.purpose || "—",
                    raw: {
                      request: activeRequest,
                      assignment: {
                        id: activeRequest.id,
                        driver_checked_in_at: activeRequest.driver_checked_in_at,
                        driver_checked_out_at: activeRequest.driver_checked_out_at,
                      },
                      vehicle: activeRequest.assigned_vehicle,
                    },
                  });
                }

                // Vehicle request assignments
                for (const a of trips?.requestAssignments ?? []) {
                  const checkedIn = !!a.driver_checked_in_at;
                  const v = a.vehicle;
                  const r = a.request;
                  rows.push({
                    id: `req-${a.id}`,
                    kind: "request",
                    statusLabel: checkedIn ? "Checked In" : "Assigned",
                    statusTone: checkedIn ? "success" : "primary",
                    reference: r?.request_number || "—",
                    when: r?.needed_from || null,
                    vehicle: v
                      ? `${v.plate_number || "—"}${v.make ? ` · ${v.make}` : ""}${v.model ? ` ${v.model}` : ""}`
                      : "—",
                    route: r?.destination
                      ? `${r?.purpose || "Trip"} → ${r.destination}`
                      : r?.purpose || "—",
                    raw: { request: r, assignment: a, vehicle: v },
                  });
                }

                // Active dispatch jobs
                for (const j of trips?.active ?? []) {
                  rows.push({
                    id: `job-${j.id}`,
                    kind: "job",
                    statusLabel: j.status === "in_progress" ? "In Progress" : j.status,
                    statusTone: j.status === "in_progress" ? "success" : "primary",
                    reference: j.job_number || "—",
                    when: j.scheduled_pickup_at || null,
                    vehicle: "—",
                    route: `${j.pickup_location_name || "—"} → ${j.dropoff_location_name || "—"}`,
                    priority: j.priority,
                    raw: j,
                  });
                }

                // Upcoming dispatch jobs
                for (const j of trips?.upcoming ?? []) {
                  rows.push({
                    id: `job-${j.id}`,
                    kind: "job",
                    statusLabel: "Scheduled",
                    statusTone: "muted",
                    reference: j.job_number || "—",
                    when: j.scheduled_pickup_at || null,
                    vehicle: "—",
                    route: `${j.pickup_location_name || "—"} → ${j.dropoff_location_name || "—"}`,
                    priority: j.priority,
                    raw: j,
                  });
                }

                rows.sort((a, b) => {
                  const at = a.when ? new Date(a.when).getTime() : Infinity;
                  const bt = b.when ? new Date(b.when).getTime() : Infinity;
                  return at - bt;
                });

                if (rows.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      No active or scheduled assignments
                    </div>
                  );
                }

                const toneClass: Record<Row["statusTone"], string> = {
                  success: "bg-success/15 text-success border-success/30",
                  primary: "bg-primary/15 text-primary border-primary/30",
                  muted: "bg-muted text-muted-foreground border-border",
                  warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                };

                return (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[160px]">Reference</TableHead>
                            <TableHead className="w-[160px]">When</TableHead>
                            <TableHead className="min-w-[220px]">Vehicle</TableHead>
                            <TableHead className="min-w-[280px]">Route / Purpose</TableHead>
                            <TableHead className="w-[180px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row) => {
                            const isRequest = row.kind === "request";
                            const a = isRequest ? row.raw.assignment : null;
                            const r = isRequest ? row.raw.request : null;
                            const v = isRequest ? row.raw.vehicle : null;
                            const j = !isRequest ? row.raw : null;
                            const checkedIn = isRequest ? !!a?.driver_checked_in_at : false;
                            const inProgress = !isRequest && j?.status === "in_progress";

                            return (
                              <TableRow key={row.id} className="align-top">
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className={cn("text-xs w-fit capitalize", toneClass[row.statusTone])}>
                                      {row.statusLabel}
                                    </Badge>
                                    {row.priority && (
                                      <Badge
                                        variant={row.priority === "high" ? "destructive" : "outline"}
                                        className="text-[10px] w-fit capitalize"
                                      >
                                        {row.priority}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {row.when ? format(new Date(row.when), "MMM dd HH:mm") : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <span className="block min-w-[180px]">{row.vehicle}</span>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <span>{row.route}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2 flex-wrap">
                                    {isRequest ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant={checkedIn ? "outline" : "default"}
                                          className="gap-1 h-8"
                                          onClick={() => setActiveAssignment({ request: r, assignment: a })}
                                        >
                                          {checkedIn ? (
                                            <><StopCircle className="w-3.5 h-3.5" aria-hidden="true" /> Out</>
                                          ) : (
                                            <><PlayCircle className="w-3.5 h-3.5" aria-hidden="true" /> In</>
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="gap-1 h-8"
                                          onClick={() =>
                                            setViewRequest({
                                              ...r,
                                              assigned_vehicle: v,
                                              assigned_vehicle_id: v?.id,
                                              driver_checked_in_at: a?.driver_checked_in_at,
                                              driver_checked_out_at: a?.driver_checked_out_at,
                                            })
                                          }
                                        >
                                          <FileText className="w-3.5 h-3.5" aria-hidden="true" /> View
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        {inProgress ? (
                                          <Button size="sm" variant="outline" onClick={() => handleCompleteJob(j.id, j.odometer_start)} className="gap-1 h-8">
                                            <StopCircle className="w-3.5 h-3.5" aria-hidden="true" /> Out
                                          </Button>
                                        ) : j ? (
                                          <Button size="sm" onClick={() => handleStartJob(j.id)} className="gap-1 h-8">
                                            <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" /> In
                                          </Button>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}

              {/* Recently completed trips — visible right after the driver checks out */}
              {trips?.recent?.length ? (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                      Recently Completed
                      <span className="text-muted-foreground/70 normal-case font-normal">
                        ({trips.recent.length})
                      </span>
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setActiveTab("history")}
                    >
                      View all <ChevronRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {trips.recent.slice(0, 5).map((t: any) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg border border-success/20 bg-success/5 flex items-start justify-between gap-3 cursor-pointer hover:bg-success/10 transition-colors"
                        onClick={() => navigate(`/route-history?tripId=${t.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="bg-success/15 text-success border-success/30 text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />
                              Completed
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {t.end_time
                                ? formatDistanceToNow(new Date(t.end_time), { addSuffix: true })
                                : "—"}
                            </span>
                            {t.distance_km != null && (
                              <span className="text-xs font-medium text-muted-foreground">
                                · {Number(t.distance_km).toFixed(1)} km
                              </span>
                            )}
                          </div>
                          <p className="text-sm mt-1 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                            {formatTripLocation(t.start_location)} → {formatTripLocation(t.end_location)}
                          </p>
                          {t.start_time && t.end_time && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {format(new Date(t.start_time), "MMM dd HH:mm")} –{" "}
                              {format(new Date(t.end_time), "HH:mm")}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" aria-hidden="true" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <DriverSubmissionsTab
              driverId={driverId}
              organizationId={organizationId}
              userId={userId}
              onViewVehicleRequest={(r) => setViewRequest(r)}
            />
          </TabsContent>

          <TabsContent value="requests">
            <MyRequestsPanel
              driverId={driverId}
              organizationId={organizationId}
              userId={userId}
              onRequestRenewal={driver ? () => setShowLicenseRenewal(true) : undefined}
            />
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
                {driver && (daysUntilExpiry === null || daysUntilExpiry < 90) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1" onClick={() => setShowLicenseRenewal(true)}>
                      <IdCard className="w-3.5 h-3.5" aria-hidden="true" /> Request renewal
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate("/my-license")}>
                      Open my license hub <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>

              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/licensing-compliance")}>
                <span className="flex items-center gap-2"><Shield className="w-4 h-4" aria-hidden="true" /> View Compliance Status</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/my-license")}>
                <span className="flex items-center gap-2"><IdCard className="w-4 h-4" aria-hidden="true" /> My License & Permits</span>
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
            <DriverTripHistory driverId={driverId} />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateWorkRequestDialog
          open={showMaintenance}
          onOpenChange={setShowMaintenance}
          driverId={driverId}
          driverName={driverName}
          vehicleId={vehicle?.id}
          vehiclePlate={vehicle?.plate_number}
        />
        <FuelRequestFormDialog
          open={showFuel}
          onOpenChange={setShowFuel}
          source="driver_portal"
          prefill={{
            request_type: "vehicle",
            vehicle_id: vehicle?.id,
            driver_id: driverId,
            driver_name: driverName,
            fuel_type: vehicle?.fuel_type || undefined,
            lockVehicle: !!vehicle?.id,
            lockDriver: !!driverId,
          }}
          invalidateKeys={[
            ["fuel-requests"],
            ["driver-portal-requests"],
            ["driver-portal-submissions"],
          ]}
        />
        {/* Vehicle/Fleet requests intentionally not available to drivers — only end-users, supervisors, and managers can initiate them. */}
        <TireRequestDialog
          open={showTire}
          onOpenChange={setShowTire}
          prefill={{ vehicle_id: vehicle?.id, driver_id: driverId }}
        />
        <VehicleInspectionFormDialog
          open={showInspection}
          onOpenChange={(v) => {
            setShowInspection(v);
            if (!v) setInspectionPrefillOverride(null);
          }}
          prefill={{
            vehicle_id: inspectionPrefillOverride?.vehicle_id ?? vehicle?.id,
            driver_id: driverId,
            inspection_type: inspectionPrefillOverride?.inspection_type ?? "pre_trip",
            lockVehicle: !!(inspectionPrefillOverride?.vehicle_id ?? vehicle?.id),
            lockDriver: !!driverId,
            enablePhotos: true,
          }}
          invalidateKeys={[
            ["vehicle-inspections"],
            ["driver-portal-submissions"],
            ["driver-pending-post-trip"],
          ]}
        />
        {activeAssignment && (
          <AssignmentCheckInDialog
            request={activeAssignment.request}
            assignment={activeAssignment.assignment}
            open={!!activeAssignment}
            onClose={() => {
              setActiveAssignment(null);
              queryClient.invalidateQueries({ queryKey: ["driver-portal-trips"] });
            }}
          />
        )}
        <DriverViewRequestDialog
          open={!!viewRequest}
          onClose={() => setViewRequest(null)}
          request={viewRequest}
          driverId={driverId}
          onPreTrip={() => {
            setInspectionPrefillOverride({
              vehicle_id: viewRequest?.assigned_vehicle?.id ?? vehicle?.id,
              inspection_type: "pre_trip",
            });
            setShowInspection(true);
          }}
          onPostTrip={() => {
            setInspectionPrefillOverride({
              vehicle_id: viewRequest?.assigned_vehicle?.id ?? vehicle?.id,
              inspection_type: "post_trip",
            });
            setShowInspection(true);
          }}
          onReportIssue={() =>
            setReportIncidentContext({
              vehicleId: viewRequest?.assigned_vehicle?.id ?? vehicle?.id ?? null,
              tripId: viewRequest?.id ?? null,
              location: viewRequest?.destination_place ?? viewRequest?.departure_place ?? null,
            })
          }
          onRequestFuel={() => setShowFuel(true)}
        />

        <ReportTripIncidentDialog
          open={!!reportIncidentContext}
          onOpenChange={(o) => {
            if (!o) setReportIncidentContext(null);
          }}
          driverId={driverId}
          vehicleId={reportIncidentContext?.vehicleId ?? vehicle?.id ?? null}
          tripId={reportIncidentContext?.tripId ?? null}
          location={reportIncidentContext?.location ?? null}
        />
      </div>
    </Layout>
  );
};

export default DriverPortal;
