import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Clock, CheckCircle, PlayCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface TripStats {
  inProgress: number;
  completedToday: number;
  totalDistance: number;
  avgDuration: number;
}

const TripsOverviewCard = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [stats, setStats] = useState<TripStats>({
    inProgress: 0,
    completedToday: 0,
    totalDistance: 0,
    avgDuration: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    const fetchTripStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get in-progress trips
        const { data: inProgressTrips } = await supabase
          .from('trips')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('status', 'in_progress');

        // Get today's completed trips
        const { data: completedTrips } = await supabase
          .from('trips')
          .select('distance_km, duration_minutes')
          .eq('organization_id', organizationId)
          .eq('status', 'completed')
          .gte('end_time', today.toISOString());

        const totalDistance = completedTrips?.reduce((sum, t) => sum + (t.distance_km || 0), 0) || 0;
        const avgDuration = completedTrips && completedTrips.length > 0
          ? completedTrips.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / completedTrips.length
          : 0;

        setStats({
          inProgress: inProgressTrips?.length || 0,
          completedToday: completedTrips?.length || 0,
          totalDistance: Math.round(totalDistance),
          avgDuration: Math.round(avgDuration),
        });
      } catch (error) {
        console.error('Error fetching trip stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTripStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('trips-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => fetchTripStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Route className="w-4 h-4 text-primary" />
          Today's Trips
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/routes')}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <PlayCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : stats.completedToday}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-info/10">
              <Route className="w-4 h-4 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : `${stats.totalDistance}`}</p>
              <p className="text-xs text-muted-foreground">Km Today</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : `${stats.avgDuration}`}</p>
              <p className="text-xs text-muted-foreground">Avg. Min</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripsOverviewCard;
