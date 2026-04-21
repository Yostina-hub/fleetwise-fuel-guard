import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car, MapPin, Calendar, History, ClipboardList, Package,
  PlayCircle, StopCircle, ChevronRight, CheckCircle2, Plus, AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import DriverTripHistory from "@/components/driver-portal/DriverTripHistory";
import { CheckInOutDialog, type CheckInOutPayload } from "@/components/trips/CheckInOutDialog";


interface DriverTripsViewProps {
  driverId?: string | null;
  driverName?: string;
}

const DriverTripsView = ({ driverId, driverName }: DriverTripsViewProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [tab, setTab] = useState("active");
  // Check-in/out dialog target (replaces window.prompt flow)
  const [checkTarget, setCheckTarget] = useState<
    | { mode: "in"; jobId: string }
    | { mode: "out"; jobId: string; odometerStart: number | null }
    | null
  >(null);

  // Active vehicle request assignment + dispatch jobs
  const { data: assignments, isLoading: aLoading } = useQuery({
    queryKey: ["driver-trips-assignments", driverId, organizationId],
    queryFn: async () => {
      if (!driverId || !organizationId) return { active: [], upcoming: [], vehicleReq: null };
      const [{ data: active }, { data: upcoming }, { data: vehicleReq }] = await Promise.all([
        (supabase as any).from("dispatch_jobs")
          .select("id, job_number, status, priority, pickup_location_name, dropoff_location_name, scheduled_pickup_at, actual_pickup_at, odometer_start, odometer_end, distance_traveled_km")
          .eq("driver_id", driverId).in("status", ["assigned", "dispatched", "in_progress"])
          .order("scheduled_pickup_at", { ascending: true }).limit(20),
        supabase.from("dispatch_jobs")
          .select("id, job_number, scheduled_pickup_at, pickup_location_name, dropoff_location_name, status, priority")
          .eq("driver_id", driverId).in("status", ["pending"])
          .order("scheduled_pickup_at", { ascending: true }).limit(10),
        (supabase as any).from("vehicle_requests")
          .select(`id, request_number, status, purpose, destination, needed_from, needed_until,
                   assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model)`)
          .eq("organization_id", organizationId)
          .eq("assigned_driver_id", driverId)
          .in("status", ["assigned", "approved", "in_progress"])
          .order("needed_from", { ascending: true }).limit(1).maybeSingle(),
      ]);
      return { active: active || [], upcoming: upcoming || [], vehicleReq };
    },
    enabled: !!driverId && !!organizationId,
  });

  // My vehicle requests (all statuses)
  const { data: myVehicleRequests, isLoading: vrLoading } = useQuery({
    queryKey: ["driver-trips-vehicle-requests", driverId, organizationId],
    queryFn: async () => {
      if (!driverId || !organizationId) return [];
      const { data } = await (supabase as any).from("vehicle_requests")
        .select(`id, request_number, status, purpose, destination, needed_from, needed_until, created_at,
                 assigned_vehicle:assigned_vehicle_id(plate_number, make, model)`)
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driverId)
        .order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!driverId && !!organizationId,
  });

  // Realtime — refresh on any change concerning this driver
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase.channel(`driver-trips-${driverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_jobs", filter: `driver_id=eq.${driverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["driver-trips-assignments"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_requests", filter: `assigned_driver_id=eq.${driverId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["driver-trips-assignments"] });
          queryClient.invalidateQueries({ queryKey: ["driver-trips-vehicle-requests"] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `driver_id=eq.${driverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["driver-trip-history"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverId, queryClient]);

  const handleStartJob = async (jobId: string) => {
    const odoStr = window.prompt("Enter starting odometer (km) — leave blank to skip:");
    const odoStart = odoStr && !isNaN(Number(odoStr)) ? Number(odoStr) : null;
    try {
      const { error } = await (supabase as any).from("dispatch_jobs").update({
        status: "in_progress",
        actual_pickup_at: new Date().toISOString(),
        ...(odoStart !== null ? { odometer_start: odoStart } : {}),
      }).eq("id", jobId);
      if (error) throw error;
      toast.success("Trip started — drive safely!");
      queryClient.invalidateQueries({ queryKey: ["driver-trips-assignments"] });
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
      const { error } = await (supabase as any).from("dispatch_jobs").update({
        status: "completed",
        actual_dropoff_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        ...(odoEnd !== null ? { odometer_end: odoEnd } : {}),
        ...(distance !== null ? { distance_traveled_km: distance } : {}),
      }).eq("id", jobId);
      if (error) throw error;
      toast.success(distance !== null ? `Trip completed · ${distance} km logged` : "Trip completed");
      queryClient.invalidateQueries({ queryKey: ["driver-trips-assignments"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to complete trip");
    }
  };

  if (!driverId) {
    return (
      <Card className="p-6 flex items-center gap-3 border-warning/30">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <div className="text-sm">
          <p className="font-medium">No driver profile linked to your account</p>
          <p className="text-muted-foreground">Contact Fleet Operations to link your driver record.</p>
        </div>
      </Card>
    );
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      assigned: "bg-primary/15 text-primary border-primary/30",
      approved: "bg-success/15 text-success border-success/30",
      in_progress: "bg-blue-500/15 text-blue-500 border-blue-500/30",
      completed: "bg-success/15 text-success border-success/30",
      pending: "bg-warning/15 text-warning border-warning/30",
      submitted: "bg-warning/15 text-warning border-warning/30",
      rejected: "bg-destructive/15 text-destructive border-destructive/30",
      cancelled: "bg-muted text-muted-foreground border-border",
    };
    return <Badge variant="outline" className={`${map[s] || map.pending} capitalize text-[10px]`}>{s.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Trips</h1>
          <p className="text-sm text-muted-foreground">
            {driverName ? `Welcome, ${driverName}` : "Your assignments and trip history"}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="active" className="text-xs gap-1">
            <Calendar className="w-3.5 h-3.5" /> Active & Upcoming
          </TabsTrigger>
          <TabsTrigger value="vehicle-requests" className="text-xs gap-1">
            <ClipboardList className="w-3.5 h-3.5" /> My Vehicle Requests
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <History className="w-3.5 h-3.5" /> Trip History
          </TabsTrigger>
        </TabsList>

        {/* Active & Upcoming */}
        <TabsContent value="active" className="mt-4 space-y-4">
          {/* Assigned vehicle banner */}
          {assignments?.vehicleReq?.assigned_vehicle && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className="bg-success/20 text-success border-success/30" variant="outline">
                      <Car className="w-3 h-3 mr-1" /> Vehicle Assigned
                    </Badge>
                    <Badge variant="outline" className="text-xs">{assignments.vehicleReq.request_number}</Badge>
                    {statusBadge(assignments.vehicleReq.status)}
                  </div>
                  <p className="text-sm font-semibold">
                    {assignments.vehicleReq.assigned_vehicle.plate_number} · {assignments.vehicleReq.assigned_vehicle.make} {assignments.vehicleReq.assigned_vehicle.model}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {assignments.vehicleReq.purpose || "—"}
                    {assignments.vehicleReq.destination && ` → ${assignments.vehicleReq.destination}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {assignments.vehicleReq.needed_from && `From ${format(new Date(assignments.vehicleReq.needed_from), "MMM dd HH:mm")}`}
                    {assignments.vehicleReq.needed_until && ` · Until ${format(new Date(assignments.vehicleReq.needed_until), "MMM dd HH:mm")}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Active Dispatch Jobs</h3>
              {aLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : assignments?.active?.length === 0 && assignments?.upcoming?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No active or scheduled assignments
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments?.active?.map((j: any) => {
                    const inProgress = j.status === "in_progress";
                    return (
                      <div key={j.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {statusBadge(j.status)}
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
                              <MapPin className="w-3 h-3" /> {j.pickup_location_name || "—"} → {j.dropoff_location_name || "—"}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {!inProgress ? (
                              <Button size="sm" onClick={() => handleStartJob(j.id)} className="gap-1">
                                <PlayCircle className="w-4 h-4" /> Check In
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleCompleteJob(j.id, j.odometer_start)} className="gap-1">
                                <StopCircle className="w-4 h-4" /> Check Out
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {assignments?.upcoming?.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-4 mb-1">Upcoming</p>
                      {assignments.upcoming.map((j: any) => (
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
                            <MapPin className="w-3 h-3" /> {j.pickup_location_name || "—"} → {j.dropoff_location_name || "—"}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My vehicle requests */}
        <TabsContent value="vehicle-requests" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {vrLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : !myVehicleRequests || myVehicleRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No vehicle requests yet
                  <p className="text-xs mt-2 max-w-sm mx-auto">
                    Fleet requests are submitted by end-users, supervisors, or managers.
                    Ask your dispatcher or supervisor to file a request on your behalf.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myVehicleRequests.map((r: any) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => navigate(`/vehicle-requests?id=${r.id}`)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{r.request_number}</Badge>
                        {statusBadge(r.status)}
                        <span className="text-xs text-muted-foreground">
                          {r.created_at && formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                        <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                      </div>
                      <p className="text-sm mt-1.5 font-medium truncate">{r.purpose || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.destination && `→ ${r.destination}`}
                        {r.assigned_vehicle && ` · ${r.assigned_vehicle.plate_number}`}
                        {r.needed_from && ` · ${format(new Date(r.needed_from), "MMM dd HH:mm")}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <DriverTripHistory driverId={driverId} />
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default DriverTripsView;
