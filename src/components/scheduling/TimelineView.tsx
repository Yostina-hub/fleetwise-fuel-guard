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
      
      const { data, error } = await supabase
        .from("trip_assignments" as any)
        .select(`
          *,
          trip_request:trip_request_id(
            request_number,
            purpose,
            pickup_at,
            return_at,
            pickup_geofence:pickup_geofence_id(name),
            drop_geofence:drop_geofence_id(name)
          ),
          vehicle:vehicle_id(plate_number, make, model),
          driver:driver_id(first_name, last_name)
        `)
        .gte("trip_request.pickup_at", now)
        .in("status", ["scheduled", "dispatched"])
        .order("trip_request.pickup_at", { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading timeline...</div>
        </CardContent>
      </Card>
    );
  }

  if (!upcomingTrips || upcomingTrips.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No upcoming trips scheduled
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Upcoming Trips Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline Items */}
          <div className="space-y-6">
            {upcomingTrips.map((trip: any, index: number) => {
              const pickupTime = parseISO(trip.trip_request?.pickup_at);
              const returnTime = parseISO(trip.trip_request?.return_at);
              const duration = differenceInHours(returnTime, pickupTime);
              const hoursUntil = differenceInHours(pickupTime, new Date());

              return (
                <div key={trip.id} className="relative pl-16">
                  {/* Timeline Dot */}
                  <div className={`absolute left-6 w-5 h-5 rounded-full border-4 border-background ${
                    hoursUntil < 2 ? 'bg-red-500' :
                    hoursUntil < 6 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />

                  {/* Time Badge */}
                  <div className="absolute left-0 top-1 text-xs font-medium">
                    <div className={`${
                      hoursUntil < 2 ? 'text-red-600' :
                      hoursUntil < 6 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {hoursUntil < 1 ? 'Soon' : 
                       hoursUntil < 24 ? `${hoursUntil}h` :
                       `${Math.floor(hoursUntil / 24)}d`
                      }
                    </div>
                  </div>

                  {/* Trip Card */}
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">
                          {trip.trip_request?.request_number}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {trip.trip_request?.purpose}
                        </div>
                      </div>
                      <Badge className={
                        trip.status === 'scheduled' ? 'bg-blue-500' :
                        trip.status === 'dispatched' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }>
                        {trip.status}
                      </Badge>
                    </div>

                    {/* Time Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {format(pickupTime, "MMM dd, yyyy")}
                          </div>
                          <div className="text-muted-foreground">
                            {format(pickupTime, "HH:mm")} - {format(returnTime, "HH:mm")}
                            <span className="ml-1 text-xs">({duration}h)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium truncate">
                            {trip.trip_request?.pickup_geofence?.name || 'N/A'}
                          </div>
                          {trip.trip_request?.drop_geofence && (
                            <div className="text-muted-foreground truncate">
                              → {trip.trip_request.drop_geofence.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assignment Info */}
                    <div className="flex items-center gap-4 pt-3 border-t text-sm">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{trip.vehicle?.plate_number}</span>
                          <span className="text-muted-foreground ml-1">
                            {trip.vehicle?.make} {trip.vehicle?.model}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {trip.driver?.first_name} {trip.driver?.last_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Within 2 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Within 6 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Later</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
