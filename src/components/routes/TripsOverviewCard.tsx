import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Navigation, 
  Clock, 
  TrendingUp, 
  Activity,
  MapPin,
  Route,
  Fuel,
  Timer
} from "lucide-react";
import { useTripMetrics } from "@/hooks/useTripMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Trip {
  id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  vehicle: {
    plate_number: string;
  } | null;
  driver: {
    first_name: string;
    last_name: string;
  } | null;
}

const TripsOverviewCard = () => {
  const { organizationId } = useOrganization();
  const { metrics, loading: metricsLoading } = useTripMetrics();

  // Fetch recent trips with details
  const { data: recentTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ['recent-trips-detailed', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          status,
          start_time,
          end_time,
          distance_km,
          duration_minutes,
          vehicle:vehicles(plate_number),
          driver:drivers(first_name, last_name)
        `)
        .eq('organization_id', organizationId!)
        .order('start_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as unknown as Trip[];
    },
    enabled: !!organizationId,
  });


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">In Progress</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (metricsLoading || tripsLoading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Trips Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Trips Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Route className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Trips</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalTrips}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Distance Covered</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalDistanceKm.toLocaleString()} km</p>
          </div>
          
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold">{formatDuration(metrics.averageDurationMinutes)}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold">{metrics.inProgressTrips}</p>
          </div>
        </div>

        {/* Trips by Hour Chart */}
        {metrics.tripsByHour.length > 0 && (
          <div className="p-4 rounded-xl bg-muted/30">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trips by Time of Day
            </h4>
            <div className="flex items-end gap-2 h-20">
              {metrics.tripsByHour.map((item) => {
                const maxTrips = Math.max(...metrics.tripsByHour.map(t => t.trips), 1);
                const height = (item.trips / maxTrips) * 100;
                return (
                  <div key={item.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-primary/60 rounded-t transition-all duration-300 hover:bg-primary"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${item.trips} trips`}
                    />
                    <span className="text-[10px] text-muted-foreground">{item.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Trips Table */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Trips
          </h4>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!recentTrips || recentTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No trips recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTrips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">
                        {trip.vehicle?.plate_number || '-'}
                      </TableCell>
                      <TableCell>
                        {trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(trip.start_time), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        {trip.distance_km ? `${Number(trip.distance_km).toFixed(1)} km` : '-'}
                      </TableCell>
                      <TableCell>
                        {formatDuration(trip.duration_minutes)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(trip.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripsOverviewCard;
