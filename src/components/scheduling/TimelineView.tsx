import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Truck, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInHours } from "date-fns";

export const TimelineView = () => {
  const { data: upcomingTrips, isLoading } = useQuery({
    queryKey: ["timeline-upcoming"],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Get upcoming trip requests
      const { data: trips, error } = await supabase
        .from("trip_requests")
        .select(`
          id, request_number, purpose, pickup_at, return_at, status, priority,
          pickup_geofence:pickup_geofence_id(name),
          drop_geofence:drop_geofence_id(name)
        `)
        .gte("pickup_at", now)
        .in("status", ["approved", "scheduled", "dispatched", "submitted"])
        .order("pickup_at", { ascending: true })
        .limit(20);

      if (error) throw error;
      if (!trips || trips.length === 0) return [];

      // Get assignments for these trips
      const tripIds = trips.map((t: any) => t.id);
      const { data: assignments } = await supabase
        .from("trip_assignments")
        .select(`
          trip_request_id,
          status,
          vehicle:vehicle_id(plate_number, make, model),
          driver:driver_id(first_name, last_name)
        `)
        .in("trip_request_id", tripIds);

      const assignmentMap = new Map(
        (assignments || []).map((a: any) => [a.trip_request_id, a])
      );

      return trips.map((trip: any) => ({
        ...trip,
        assignment: assignmentMap.get(trip.id) || null,
      }));
    },
  });

  if (isLoading) {
    return (
      <Card><CardContent className="pt-6">
        <div className="text-center text-muted-foreground">Loading timeline...</div>
      </CardContent></Card>
    );
  }

  if (!upcomingTrips || upcomingTrips.length === 0) {
    return (
      <Card><CardContent className="pt-6">
        <div className="text-center text-muted-foreground py-8">No upcoming trips scheduled</div>
      </CardContent></Card>
    );
  }

  const statusColor: Record<string, string> = {
    submitted: "bg-warning",
    approved: "bg-success",
    scheduled: "bg-blue-500",
    dispatched: "bg-purple-500",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" /> Upcoming Trips Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-6">
            {upcomingTrips.map((trip: any) => {
              const pickupTime = parseISO(trip.pickup_at);
              const returnTime = parseISO(trip.return_at);
              const duration = differenceInHours(returnTime, pickupTime);
              const hoursUntil = differenceInHours(pickupTime, new Date());

              return (
                <div key={trip.id} className="relative pl-16">
                  <div className={`absolute left-6 w-5 h-5 rounded-full border-4 border-background ${
                    hoursUntil < 2 ? 'bg-red-500' : hoursUntil < 6 ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="absolute left-0 top-1 text-xs font-medium">
                    <div className={`${
                      hoursUntil < 2 ? 'text-red-600' : hoursUntil < 6 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {hoursUntil < 1 ? 'Soon' : hoursUntil < 24 ? `${hoursUntil}h` : `${Math.floor(hoursUntil / 24)}d`}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">{trip.request_number}</div>
                        <div className="text-sm text-muted-foreground mb-2">{trip.purpose}</div>
                      </div>
                      <Badge className={statusColor[trip.status] || 'bg-muted'}>{trip.status}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{format(pickupTime, "MMM dd, yyyy")}</div>
                          <div className="text-muted-foreground">
                            {format(pickupTime, "HH:mm")} - {format(returnTime, "HH:mm")}
                            <span className="ml-1 text-xs">({duration}h)</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium truncate">{trip.pickup_geofence?.name || 'N/A'}</div>
                          {trip.drop_geofence && (
                            <div className="text-muted-foreground truncate">→ {trip.drop_geofence.name}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {trip.assignment && (
                      <div className="flex items-center gap-4 pt-3 border-t text-sm">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{trip.assignment.vehicle?.plate_number}</span>
                          <span className="text-muted-foreground">{trip.assignment.vehicle?.make} {trip.assignment.vehicle?.model}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{trip.assignment.driver?.first_name} {trip.assignment.driver?.last_name}</span>
                        </div>
                      </div>
                    )}

                    {!trip.assignment && trip.status === "approved" && (
                      <div className="pt-3 border-t">
                        <span className="text-xs text-warning">⚠ No vehicle/driver assigned yet</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-6 pt-4 border-t text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-muted-foreground">Within 2h</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span className="text-muted-foreground">Within 6h</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-muted-foreground">Later</span></div>
        </div>
      </CardContent>
    </Card>
  );
};
