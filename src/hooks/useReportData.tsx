import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useMemo } from "react";
import { startOfDay, endOfDay, subDays, differenceInDays } from "date-fns";

interface DateRange {
  start: Date;
  end: Date;
}

export interface ReportMetrics {
  // Vehicle metrics
  totalDistance: number;
  totalFuelConsumed: number;
  avgEfficiency: number;
  idleTime: number;
  // Safety metrics
  speedingEvents: number;
  harshBrakingEvents: number;
  harshAccelerationEvents: number;
  // Trip metrics
  totalTrips: number;
  completedTrips: number;
  avgTripDuration: number;
  // Geofence metrics
  geofenceEntries: number;
  geofenceExits: number;
  avgDwellTime: number;
  // Incident metrics
  totalIncidents: number;
  openIncidents: number;
  // Trends (compared to previous period)
  distanceTrend: number;
  fuelTrend: number;
  efficiencyTrend: number;
  safetyTrend: number;
}

export const useReportData = (dateRange: DateRange) => {
  const { organizationId } = useOrganization();

  // Calculate previous period for trend comparison
  const daysDiff = differenceInDays(dateRange.end, dateRange.start) || 7;
  const previousStart = subDays(dateRange.start, daysDiff);
  const previousEnd = subDays(dateRange.end, daysDiff);

  // Fetch trips
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ['report-trips', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('start_time', startOfDay(dateRange.start).toISOString())
        .lte('start_time', endOfDay(dateRange.end).toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch previous period trips for trends
  const { data: prevTrips } = useQuery({
    queryKey: ['report-trips-prev', organizationId, previousStart.toISOString(), previousEnd.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('trips')
        .select('distance_km, fuel_consumed_liters, duration_minutes')
        .eq('organization_id', organizationId)
        .gte('start_time', startOfDay(previousStart).toISOString())
        .lte('start_time', endOfDay(previousEnd).toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch driver events (speeding, harsh braking, etc.)
  const { data: driverEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['report-driver-events', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('driver_events')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('event_time', startOfDay(dateRange.start).toISOString())
        .lte('event_time', endOfDay(dateRange.end).toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch previous driver events for trends
  const { data: prevDriverEvents } = useQuery({
    queryKey: ['report-driver-events-prev', organizationId, previousStart.toISOString(), previousEnd.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('driver_events')
        .select('event_type')
        .eq('organization_id', organizationId)
        .gte('event_time', startOfDay(previousStart).toISOString())
        .lte('event_time', endOfDay(previousEnd).toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch geofence events
  const { data: geofenceEvents, isLoading: geofenceLoading } = useQuery({
    queryKey: ['report-geofence-events', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('geofence_events')
        .select(`
          *,
          geofence:geofence_id (name),
          vehicle:vehicle_id (plate_number)
        `)
        .eq('organization_id', organizationId)
        .gte('event_time', startOfDay(dateRange.start).toISOString())
        .lte('event_time', endOfDay(dateRange.end).toISOString())
        .order('event_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch incidents
  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['report-incidents', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          vehicle:vehicle_id (plate_number),
          driver:driver_id (first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .gte('incident_time', startOfDay(dateRange.start).toISOString())
        .lte('incident_time', endOfDay(dateRange.end).toISOString())
        .order('incident_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch speed violations
  const { data: speedViolations, isLoading: violationsLoading } = useQuery({
    queryKey: ['report-speed-violations', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('speed_violations')
        .select(`
          *,
          vehicle:vehicle_id (plate_number),
          driver:driver_id (first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .gte('violation_time', startOfDay(dateRange.start).toISOString())
        .lte('violation_time', endOfDay(dateRange.end).toISOString())
        .order('violation_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Calculate metrics
  const metrics = useMemo<ReportMetrics>(() => {
    // Current period calculations
    const totalDistance = trips?.reduce((sum, t) => sum + (Number(t.distance_km) || 0), 0) || 0;
    const totalFuelConsumed = trips?.reduce((sum, t) => sum + (Number(t.fuel_consumed_liters) || 0), 0) || 0;
    const avgEfficiency = totalDistance > 0 && totalFuelConsumed > 0 
      ? totalDistance / totalFuelConsumed 
      : 0;
    const idleTime = trips?.reduce((sum, t) => sum + (t.idle_time_minutes || 0), 0) || 0;

    // Safety events
    const speedingEvents = driverEvents?.filter(e => e.event_type === 'speeding').length || 0;
    const harshBrakingEvents = driverEvents?.filter(e => e.event_type === 'harsh_braking').length || 0;
    const harshAccelerationEvents = driverEvents?.filter(e => e.event_type === 'harsh_acceleration').length || 0;

    // Trip metrics
    const totalTrips = trips?.length || 0;
    const completedTrips = trips?.filter(t => t.status === 'completed').length || 0;
    const tripsWithDuration = trips?.filter(t => t.duration_minutes) || [];
    const avgTripDuration = tripsWithDuration.length > 0
      ? tripsWithDuration.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / tripsWithDuration.length
      : 0;

    // Geofence metrics
    const geofenceEntries = geofenceEvents?.filter(e => e.event_type === 'enter').length || 0;
    const geofenceExits = geofenceEvents?.filter(e => e.event_type === 'exit').length || 0;
    const eventsWithDwell = geofenceEvents?.filter(e => e.dwell_time_minutes) || [];
    const avgDwellTime = eventsWithDwell.length > 0
      ? eventsWithDwell.reduce((sum, e) => sum + (e.dwell_time_minutes || 0), 0) / eventsWithDwell.length
      : 0;

    // Incident metrics
    const totalIncidents = incidents?.length || 0;
    const openIncidents = incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0;

    // Trend calculations (comparing to previous period)
    const prevDistance = prevTrips?.reduce((sum, t) => sum + (Number(t.distance_km) || 0), 0) || 0;
    const prevFuel = prevTrips?.reduce((sum, t) => sum + (Number(t.fuel_consumed_liters) || 0), 0) || 0;
    const prevEfficiency = prevDistance > 0 && prevFuel > 0 ? prevDistance / prevFuel : 0;
    const prevSafetyEvents = prevDriverEvents?.filter(e => 
      e.event_type === 'speeding' || e.event_type === 'harsh_braking' || e.event_type === 'harsh_acceleration'
    ).length || 0;

    const distanceTrend = prevDistance > 0 ? ((totalDistance - prevDistance) / prevDistance) * 100 : 0;
    const fuelTrend = prevFuel > 0 ? ((totalFuelConsumed - prevFuel) / prevFuel) * 100 : 0;
    const efficiencyTrend = prevEfficiency > 0 ? ((avgEfficiency - prevEfficiency) / prevEfficiency) * 100 : 0;
    const currentSafetyEvents = speedingEvents + harshBrakingEvents + harshAccelerationEvents;
    const safetyTrend = prevSafetyEvents > 0 ? ((currentSafetyEvents - prevSafetyEvents) / prevSafetyEvents) * 100 : 0;

    return {
      totalDistance,
      totalFuelConsumed,
      avgEfficiency,
      idleTime,
      speedingEvents,
      harshBrakingEvents,
      harshAccelerationEvents,
      totalTrips,
      completedTrips,
      avgTripDuration,
      geofenceEntries,
      geofenceExits,
      avgDwellTime,
      totalIncidents,
      openIncidents,
      distanceTrend,
      fuelTrend,
      efficiencyTrend,
      safetyTrend,
    };
  }, [trips, prevTrips, driverEvents, prevDriverEvents, geofenceEvents, incidents]);

  return {
    metrics,
    trips: trips || [],
    driverEvents: driverEvents || [],
    geofenceEvents: geofenceEvents || [],
    incidents: incidents || [],
    speedViolations: speedViolations || [],
    loading: tripsLoading || eventsLoading || geofenceLoading || incidentsLoading || violationsLoading,
  };
};
