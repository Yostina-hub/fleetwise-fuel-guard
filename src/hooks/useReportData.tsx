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
  // Fuel metrics
  totalFuelCost: number;
  fuelTransactionCount: number;
  avgFuelPrice: number;
  fuelTheftCount: number;
  // Safety metrics
  speedingEvents: number;
  harshBrakingEvents: number;
  harshAccelerationEvents: number;
  totalAlerts: number;
  criticalAlerts: number;
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
  // Maintenance metrics
  scheduledMaintenance: number;
  overdueMaintenance: number;
  workOrdersTotal: number;
  workOrdersCompleted: number;
  // Cost metrics
  totalVehicleCosts: number;
  maintenanceCosts: number;
  // Driver metrics
  avgDriverScore: number;
  topDriverScore: number;
  driversNeedingCoaching: number;
  // Dispatch metrics
  dispatchJobsTotal: number;
  dispatchJobsCompleted: number;
  slaMetPercentage: number;
  // Inspection metrics
  inspectionsTotal: number;
  inspectionsFailed: number;
  // Trends (compared to previous period)
  distanceTrend: number;
  fuelTrend: number;
  efficiencyTrend: number;
  safetyTrend: number;
  costTrend: number;
  tripsTrend: number;
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
        .select(`
          *,
          vehicle:vehicle_id (plate_number, make, model),
          driver:driver_id (first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .gte('start_time', startOfDay(dateRange.start).toISOString())
        .lte('start_time', endOfDay(dateRange.end).toISOString())
        .order('start_time', { ascending: false });
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
        .select(`
          *,
          vehicle:vehicle_id (plate_number),
          driver:driver_id (first_name, last_name)
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
          geofence:geofence_id (name, category),
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

  // Fetch fuel transactions
  const { data: fuelTransactions, isLoading: fuelLoading } = useQuery({
    queryKey: ['report-fuel-transactions', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('fuel_transactions')
        .select(`
          *,
          vehicle:vehicle_id (plate_number)
        `)
        .eq('organization_id', organizationId)
        .gte('transaction_date', startOfDay(dateRange.start).toISOString())
        .lte('transaction_date', endOfDay(dateRange.end).toISOString())
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch fuel events (drain/fill)
  const { data: fuelEvents } = useQuery({
    queryKey: ['report-fuel-events', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('fuel_events')
        .select(`
          *,
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

  // Fetch fuel theft cases
  const { data: fuelTheftCases } = useQuery({
    queryKey: ['report-fuel-theft', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('fuel_theft_cases')
        .select(`
          *,
          vehicle:vehicle_id (plate_number)
        `)
        .eq('organization_id', organizationId)
        .gte('detected_at', startOfDay(dateRange.start).toISOString())
        .lte('detected_at', endOfDay(dateRange.end).toISOString())
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['report-alerts', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          vehicle:vehicle_id (plate_number),
          driver:driver_id (first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .gte('alert_time', startOfDay(dateRange.start).toISOString())
        .lte('alert_time', endOfDay(dateRange.end).toISOString())
        .order('alert_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch maintenance schedules
  const { data: maintenanceSchedules, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['report-maintenance', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select(`
          *,
          vehicle:vehicle_id (plate_number, make, model)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch work orders
  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ['report-work-orders', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicle_id (plate_number)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startOfDay(dateRange.start).toISOString())
        .lte('created_at', endOfDay(dateRange.end).toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch vehicle costs
  const { data: vehicleCosts, isLoading: costsLoading } = useQuery({
    queryKey: ['report-vehicle-costs', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('vehicle_costs')
        .select(`
          *,
          vehicle:vehicle_id (plate_number)
        `)
        .eq('organization_id', organizationId)
        .gte('cost_date', startOfDay(dateRange.start).toISOString())
        .lte('cost_date', endOfDay(dateRange.end).toISOString())
        .order('cost_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch previous period costs for trends
  const { data: prevVehicleCosts } = useQuery({
    queryKey: ['report-vehicle-costs-prev', organizationId, previousStart.toISOString(), previousEnd.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('vehicle_costs')
        .select('amount, cost_type')
        .eq('organization_id', organizationId)
        .gte('cost_date', startOfDay(previousStart).toISOString())
        .lte('cost_date', endOfDay(previousEnd).toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch driver behavior scores (note: no FK to drivers table, so we fetch separately)
  const { data: driverScores, isLoading: scoresLoading } = useQuery({
    queryKey: ['report-driver-scores', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('driver_behavior_scores')
        .select(`
          *,
          vehicle:vehicle_id (plate_number)
        `)
        .eq('organization_id', organizationId)
        .order('score_period_end', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch drivers for score mapping
  const { data: allDriversForScores } = useQuery({
    queryKey: ['report-drivers-for-scores', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('drivers')
        .select('id, first_name, last_name')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Merge driver info into scores
  const driverScoresWithDrivers = useMemo(() => {
    if (!driverScores) return [];
    const driverMap = new Map(allDriversForScores?.map(d => [d.id, d]) || []);
    return driverScores.map(score => ({
      ...score,
      driver: driverMap.get(score.driver_id) || null,
    }));
  }, [driverScores, allDriversForScores]);

  // Fetch dispatch jobs
  const { data: dispatchJobs, isLoading: dispatchLoading } = useQuery({
    queryKey: ['report-dispatch-jobs', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('dispatch_jobs')
        .select(`
          *,
          vehicle:vehicle_id (plate_number),
          driver:driver_id (first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startOfDay(dateRange.start).toISOString())
        .lte('created_at', endOfDay(dateRange.end).toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch vehicle inspections
  const { data: vehicleInspections, isLoading: inspectionsLoading } = useQuery({
    queryKey: ['report-inspections', organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select(`
          *,
          vehicle:vehicle_id (plate_number)
        `)
        .eq('organization_id', organizationId)
        .gte('inspection_date', startOfDay(dateRange.start).toISOString())
        .lte('inspection_date', endOfDay(dateRange.end).toISOString())
        .order('inspection_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch documents for expiry tracking
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['report-documents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
  const metrics = useMemo<ReportMetrics>(() => {
    // Current period calculations
    const totalDistance = trips?.reduce((sum, t) => sum + (Number(t.distance_km) || 0), 0) || 0;
    const totalFuelConsumed = trips?.reduce((sum, t) => sum + (Number(t.fuel_consumed_liters) || 0), 0) || 0;
    const avgEfficiency = totalDistance > 0 && totalFuelConsumed > 0 
      ? totalDistance / totalFuelConsumed 
      : 0;
    const idleTime = trips?.reduce((sum, t) => sum + (t.idle_time_minutes || 0), 0) || 0;

    // Fuel metrics
    const totalFuelCost = fuelTransactions?.reduce((sum, t) => sum + (Number(t.fuel_cost) || 0), 0) || 0;
    const fuelTransactionCount = fuelTransactions?.length || 0;
    const totalFuelLiters = fuelTransactions?.reduce((sum, t) => sum + (Number(t.fuel_amount_liters) || 0), 0) || 0;
    const avgFuelPrice = totalFuelLiters > 0 ? totalFuelCost / totalFuelLiters : 0;
    const fuelTheftCount = fuelTheftCases?.length || 0;

    // Safety events
    const speedingEvents = (driverEvents?.filter(e => e.event_type === 'speeding').length || 0) + (speedViolations?.length || 0);
    const harshBrakingEvents = driverEvents?.filter(e => e.event_type === 'harsh_braking').length || 0;
    const harshAccelerationEvents = driverEvents?.filter(e => e.event_type === 'harsh_acceleration').length || 0;
    const totalAlerts = alerts?.length || 0;
    const criticalAlerts = alerts?.filter(a => a.severity === 'critical' || a.severity === 'high').length || 0;

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

    // Maintenance metrics
    const scheduledMaintenance = maintenanceSchedules?.filter(m => m.next_due_date).length || 0;
    const now = new Date();
    const overdueMaintenance = maintenanceSchedules?.filter(m => 
      m.next_due_date && new Date(m.next_due_date) < now
    ).length || 0;
    const workOrdersTotal = workOrders?.length || 0;
    const workOrdersCompleted = workOrders?.filter(w => w.status === 'completed').length || 0;

    // Cost metrics
    const totalVehicleCosts = vehicleCosts?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;
    const maintenanceCosts = vehicleCosts?.filter(c => c.cost_type === 'maintenance')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;

    // Driver metrics
    const latestScores = driverScores?.reduce((acc, score) => {
      if (!acc[score.driver_id] || new Date(score.score_period_end) > new Date(acc[score.driver_id].score_period_end)) {
        acc[score.driver_id] = score;
      }
      return acc;
    }, {} as Record<string, any>) || {};
    const uniqueDriverScores = Object.values(latestScores);
    const avgDriverScore = uniqueDriverScores.length > 0
      ? uniqueDriverScores.reduce((sum: number, s: any) => sum + (s.overall_score || 0), 0) / uniqueDriverScores.length
      : 0;
    const topDriverScore = uniqueDriverScores.length > 0
      ? Math.max(...uniqueDriverScores.map((s: any) => s.overall_score || 0))
      : 0;
    const driversNeedingCoaching = uniqueDriverScores.filter((s: any) => 
      s.overall_score < 70 || s.safety_rating === 'poor'
    ).length;

    // Dispatch metrics
    const dispatchJobsTotal = dispatchJobs?.length || 0;
    const dispatchJobsCompleted = dispatchJobs?.filter(j => j.status === 'completed').length || 0;
    const jobsWithSla = dispatchJobs?.filter(j => j.sla_met !== null) || [];
    const slaMetPercentage = jobsWithSla.length > 0
      ? (jobsWithSla.filter(j => j.sla_met).length / jobsWithSla.length) * 100
      : 0;

    // Inspection metrics
    const inspectionsTotal = vehicleInspections?.length || 0;
    const inspectionsFailed = vehicleInspections?.filter(i => !i.certified_safe).length || 0;

    // Trend calculations (comparing to previous period)
    const prevDistance = prevTrips?.reduce((sum, t) => sum + (Number(t.distance_km) || 0), 0) || 0;
    const prevFuel = prevTrips?.reduce((sum, t) => sum + (Number(t.fuel_consumed_liters) || 0), 0) || 0;
    const prevEfficiency = prevDistance > 0 && prevFuel > 0 ? prevDistance / prevFuel : 0;
    const prevSafetyEvents = prevDriverEvents?.filter(e => 
      e.event_type === 'speeding' || e.event_type === 'harsh_braking' || e.event_type === 'harsh_acceleration'
    ).length || 0;
    const prevCosts = prevVehicleCosts?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;
    const prevTripsCount = prevTrips?.length || 0;

    const distanceTrend = prevDistance > 0 ? ((totalDistance - prevDistance) / prevDistance) * 100 : 0;
    const fuelTrend = prevFuel > 0 ? ((totalFuelConsumed - prevFuel) / prevFuel) * 100 : 0;
    const efficiencyTrend = prevEfficiency > 0 ? ((avgEfficiency - prevEfficiency) / prevEfficiency) * 100 : 0;
    const currentSafetyEvents = speedingEvents + harshBrakingEvents + harshAccelerationEvents;
    const safetyTrend = prevSafetyEvents > 0 ? ((currentSafetyEvents - prevSafetyEvents) / prevSafetyEvents) * 100 : 0;
    const costTrend = prevCosts > 0 ? ((totalVehicleCosts - prevCosts) / prevCosts) * 100 : 0;
    const tripsTrend = prevTripsCount > 0 ? ((totalTrips - prevTripsCount) / prevTripsCount) * 100 : 0;

    return {
      totalDistance,
      totalFuelConsumed,
      avgEfficiency,
      idleTime,
      totalFuelCost,
      fuelTransactionCount,
      avgFuelPrice,
      fuelTheftCount,
      speedingEvents,
      harshBrakingEvents,
      harshAccelerationEvents,
      totalAlerts,
      criticalAlerts,
      totalTrips,
      completedTrips,
      avgTripDuration,
      geofenceEntries,
      geofenceExits,
      avgDwellTime,
      totalIncidents,
      openIncidents,
      scheduledMaintenance,
      overdueMaintenance,
      workOrdersTotal,
      workOrdersCompleted,
      totalVehicleCosts,
      maintenanceCosts,
      avgDriverScore,
      topDriverScore,
      driversNeedingCoaching,
      dispatchJobsTotal,
      dispatchJobsCompleted,
      slaMetPercentage,
      inspectionsTotal,
      inspectionsFailed,
      distanceTrend,
      fuelTrend,
      efficiencyTrend,
      safetyTrend,
      costTrend,
      tripsTrend,
    };
  }, [
    trips, prevTrips, driverEvents, prevDriverEvents, geofenceEvents, incidents,
    fuelTransactions, fuelTheftCases, alerts, maintenanceSchedules, workOrders,
    vehicleCosts, prevVehicleCosts, driverScores, dispatchJobs, vehicleInspections,
    speedViolations
  ]);

  return {
    metrics,
    trips: trips || [],
    driverEvents: driverEvents || [],
    geofenceEvents: geofenceEvents || [],
    incidents: incidents || [],
    speedViolations: speedViolations || [],
    fuelTransactions: fuelTransactions || [],
    fuelEvents: fuelEvents || [],
    fuelTheftCases: fuelTheftCases || [],
    alerts: alerts || [],
    maintenanceSchedules: maintenanceSchedules || [],
    workOrders: workOrders || [],
    vehicleCosts: vehicleCosts || [],
    driverScores: driverScoresWithDrivers || [],
    dispatchJobs: dispatchJobs || [],
    vehicleInspections: vehicleInspections || [],
    documents: documents || [],
    loading: tripsLoading || eventsLoading || geofenceLoading || incidentsLoading || 
             violationsLoading || fuelLoading || alertsLoading || maintenanceLoading ||
             workOrdersLoading || costsLoading || scoresLoading || dispatchLoading || 
             inspectionsLoading || documentsLoading,
  };
};
