import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useMemo } from "react";

interface TripMetrics {
  totalTrips: number;
  totalDistanceKm: number;
  averageDurationMinutes: number;
  tripsByHour: { hour: string; trips: number }[];
  inProgressTrips: number;
  completedToday: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

export const useTripMetrics = (dateRange?: DateRange) => {
  const { organizationId } = useOrganization();

  const effectiveDateRange = useMemo(() => {
    if (dateRange) return dateRange;
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
    };
  }, [dateRange]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ['trip-metrics', organizationId, effectiveDateRange.start.toISOString(), effectiveDateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('trips')
        .select('id, status, start_time, end_time, distance_km, duration_minutes')
        .eq('organization_id', organizationId)
        .gte('start_time', effectiveDateRange.start.toISOString())
        .lte('start_time', effectiveDateRange.end.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const metrics = useMemo<TripMetrics>(() => {
    if (!trips || trips.length === 0) {
      return {
        totalTrips: 0,
        totalDistanceKm: 0,
        averageDurationMinutes: 0,
        tripsByHour: [],
        inProgressTrips: 0,
        completedToday: 0,
      };
    }

    const totalTrips = trips.length;
    const totalDistanceKm = trips.reduce((sum, trip) => sum + (Number(trip.distance_km) || 0), 0);
    
    const completedTrips = trips.filter(t => t.status === 'completed' && t.duration_minutes);
    const averageDurationMinutes = completedTrips.length > 0
      ? Math.round(completedTrips.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / completedTrips.length)
      : 0;

    // Group trips by hour
    const hourBuckets: Record<string, number> = {};
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    hours.forEach(h => hourBuckets[h] = 0);

    trips.forEach(trip => {
      const hour = new Date(trip.start_time).getHours();
      let bucket: string;
      if (hour < 4) bucket = '00:00';
      else if (hour < 8) bucket = '04:00';
      else if (hour < 12) bucket = '08:00';
      else if (hour < 16) bucket = '12:00';
      else if (hour < 20) bucket = '16:00';
      else bucket = '20:00';
      
      hourBuckets[bucket]++;
    });

    const tripsByHour = hours.map(hour => ({
      hour,
      trips: hourBuckets[hour],
    }));

    // Today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const inProgressTrips = trips.filter(t => t.status === 'in_progress').length;
    const completedToday = trips.filter(t => {
      if (t.status !== 'completed' || !t.end_time) return false;
      const endDate = new Date(t.end_time);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === today.getTime();
    }).length;

    return {
      totalTrips,
      totalDistanceKm,
      averageDurationMinutes,
      tripsByHour,
      inProgressTrips,
      completedToday,
    };
  }, [trips]);

  return {
    metrics,
    loading: isLoading,
  };
};
