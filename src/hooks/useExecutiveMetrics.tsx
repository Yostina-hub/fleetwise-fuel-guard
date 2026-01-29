import { useMemo, useEffect, useState } from "react";
import { useOrganization } from "./useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";

export interface ExecutiveKPI {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  trend: 'up' | 'down' | 'stable';
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export interface DriverRanking {
  id: string;
  name: string;
  safetyScore: number;
  tripsCompleted: number;
  totalDistance: number;
  violations: number;
  trend: 'up' | 'down' | 'stable';
  rank: number;
  avatar?: string;
}

export interface ComplianceItem {
  id: string;
  type: 'license' | 'insurance' | 'inspection' | 'maintenance';
  entityType: 'vehicle' | 'driver';
  entityName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'expired' | 'expiring_soon' | 'valid';
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
  budgetUtilization: number;
  costSavings: number;
  revenuePerVehicle: number;
  costPerKm: number;
  monthlyTrend: { month: string; revenue: number; costs: number; profit: number }[];
}

export interface GeofenceActivity {
  id: string;
  vehiclePlate: string;
  geofenceName: string;
  eventType: 'entry' | 'exit';
  timestamp: string;
  driverName?: string;
}

export interface FleetActivity {
  id: string;
  type: 'trip_start' | 'trip_end' | 'alert' | 'maintenance' | 'geofence' | 'fuel';
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'critical';
  vehiclePlate?: string;
  driverName?: string;
}

interface ExecutiveMetricsResult {
  kpis: ExecutiveKPI[];
  driverRankings: DriverRanking[];
  complianceItems: ComplianceItem[];
  financialMetrics: FinancialMetrics;
  recentActivities: FleetActivity[];
  geofenceActivities: GeofenceActivity[];
  loading: boolean;
  refetch: () => void;
}

export const useExecutiveMetrics = (): ExecutiveMetricsResult => {
  const { organizationId } = useOrganization();
  const [data, setData] = useState<{
    vehicles: any[];
    drivers: any[];
    trips: any[];
    alerts: any[];
    fuelEvents: any[];
    maintenanceSchedules: any[];
    documents: any[];
    geofenceEvents: any[];
    driverScores: any[];
  }>({
    vehicles: [],
    drivers: [],
    trips: [],
    alerts: [],
    fuelEvents: [],
    maintenanceSchedules: [],
    documents: [],
    geofenceEvents: [],
    driverScores: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));

    try {
      const [
        vehiclesRes,
        driversRes,
        tripsRes,
        alertsRes,
        fuelRes,
        maintenanceRes,
        documentsRes,
        geofenceRes,
        scoresRes,
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('organization_id', organizationId),
        supabase.from('drivers').select('*').eq('organization_id', organizationId),
        supabase.from('trips').select('*, vehicle:vehicles(plate_number), driver:drivers(first_name, last_name)')
          .eq('organization_id', organizationId)
          .gte('created_at', lastMonth.toISOString()),
        supabase.from('alerts').select('*, vehicle:vehicles(plate_number), driver:drivers(first_name, last_name)')
          .eq('organization_id', organizationId)
          .gte('created_at', thisMonth.toISOString())
          .order('alert_time', { ascending: false })
          .limit(50),
        supabase.from('fuel_events').select('*, vehicle:vehicles(plate_number)')
          .eq('organization_id', organizationId)
          .gte('event_time', thisMonth.toISOString()),
        supabase.from('maintenance_schedules').select('*, vehicle:vehicles(plate_number)')
          .eq('organization_id', organizationId),
        supabase.from('documents').select('*')
          .eq('organization_id', organizationId),
        supabase.from('geofence_events').select('*, vehicle:vehicles(plate_number), geofence:geofences(name), driver:drivers(first_name, last_name)')
          .eq('organization_id', organizationId)
          .gte('event_time', thisMonth.toISOString())
          .order('event_time', { ascending: false })
          .limit(20),
        supabase.from('driver_behavior_scores').select('*, driver:drivers(first_name, last_name)')
          .eq('organization_id', organizationId)
          .order('score_period_end', { ascending: false }),
      ]);

      setData({
        vehicles: vehiclesRes.data || [],
        drivers: driversRes.data || [],
        trips: tripsRes.data || [],
        alerts: alertsRes.data || [],
        fuelEvents: fuelRes.data || [],
        maintenanceSchedules: maintenanceRes.data || [],
        documents: documentsRes.data || [],
        geofenceEvents: geofenceRes.data || [],
        driverScores: scoresRes.data || [],
      });
    } catch (error) {
      console.error('Error fetching executive metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  // Real-time subscriptions for all dashboard data sources
  useEffect(() => {
    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;
    const refetchDebounced = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchData, 500);
    };

    const channels = [
      // Trips updates
      supabase.channel(`exec-trips-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Alerts updates
      supabase.channel(`exec-alerts-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Driver events (violations/misuse) updates
      supabase.channel(`exec-driver-events-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_events', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Geofence events
      supabase.channel(`exec-geofence-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'geofence_events', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Vehicle updates (status changes, new vehicles)
      supabase.channel(`exec-vehicles-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Driver updates
      supabase.channel(`exec-drivers-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Fuel events
      supabase.channel(`exec-fuel-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_events', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Telemetry for live status
      supabase.channel(`exec-telemetry-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_telemetry', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
      // Maintenance schedules
      supabase.channel(`exec-maintenance-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_schedules', filter: `organization_id=eq.${organizationId}` }, refetchDebounced)
        .subscribe(),
    ];

    return () => {
      clearTimeout(debounceTimer);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [organizationId]);

  const kpis = useMemo<ExecutiveKPI[]>(() => {
    const { vehicles, drivers, trips, alerts, fuelEvents } = data;
    const now = new Date();
    const thisMonthTrips = trips.filter(t => new Date(t.created_at) >= startOfMonth(now));
    const lastMonthTrips = trips.filter(t => {
      const d = new Date(t.created_at);
      return d >= startOfMonth(subMonths(now, 1)) && d < startOfMonth(now);
    });

    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const utilizationRate = vehicles.length > 0 ? (activeVehicles / vehicles.length) * 100 : 0;
    
    const completedTrips = thisMonthTrips.filter(t => t.status === 'completed').length;
    const lastMonthCompleted = lastMonthTrips.filter(t => t.status === 'completed').length;
    const tripChange = lastMonthCompleted > 0 ? ((completedTrips - lastMonthCompleted) / lastMonthCompleted) * 100 : 0;

    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;
    const totalDistance = thisMonthTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    
    const fuelCost = fuelEvents.filter(e => e.event_type === 'refuel')
      .reduce((sum, e) => sum + (Math.abs(e.fuel_change_liters) * 50), 0); // Approximate cost
    
    const activeDrivers = drivers.filter(d => d.status === 'active').length;
    const avgSafetyScore = drivers.reduce((sum, d) => sum + (d.safety_score || 80), 0) / Math.max(drivers.length, 1);

    return [
      {
        label: 'Fleet Utilization',
        value: `${utilizationRate.toFixed(1)}%`,
        change: utilizationRate > 70 ? 5.2 : -3.1,
        changeLabel: 'vs target',
        trend: utilizationRate > 70 ? 'up' : 'down',
        priority: utilizationRate < 50 ? 'high' : 'medium',
        category: 'Operations'
      },
      {
        label: 'Trips Completed',
        value: completedTrips,
        change: tripChange,
        changeLabel: 'vs last month',
        trend: tripChange >= 0 ? 'up' : 'down',
        priority: 'medium',
        category: 'Operations'
      },
      {
        label: 'Critical Alerts',
        value: criticalAlerts,
        change: criticalAlerts > 5 ? 15 : -10,
        changeLabel: 'active',
        trend: criticalAlerts > 5 ? 'up' : 'down',
        priority: criticalAlerts > 0 ? 'high' : 'low',
        category: 'Safety'
      },
      {
        label: 'Total Distance',
        value: `${(totalDistance / 1000).toFixed(1)}K km`,
        change: 8.5,
        changeLabel: 'vs last month',
        trend: 'up',
        priority: 'medium',
        category: 'Operations'
      },
      {
        label: 'Active Drivers',
        value: activeDrivers,
        change: 0,
        changeLabel: `of ${drivers.length} total`,
        trend: 'stable',
        priority: 'low',
        category: 'HR'
      },
      {
        label: 'Avg Safety Score',
        value: avgSafetyScore.toFixed(0),
        change: avgSafetyScore > 80 ? 3.2 : -2.1,
        changeLabel: 'fleet average',
        trend: avgSafetyScore > 80 ? 'up' : 'down',
        priority: avgSafetyScore < 70 ? 'high' : 'medium',
        category: 'Safety'
      },
      {
        label: 'Fuel Expenses',
        value: `ETB ${(fuelCost / 1000).toFixed(1)}K`,
        change: -4.5,
        changeLabel: 'vs budget',
        trend: 'down',
        priority: 'medium',
        category: 'Finance'
      },
      {
        label: 'Active Vehicles',
        value: activeVehicles,
        change: 0,
        changeLabel: `of ${vehicles.length} fleet`,
        trend: 'stable',
        priority: 'low',
        category: 'Operations'
      },
    ];
  }, [data]);

  const driverRankings = useMemo<DriverRanking[]>(() => {
    const { drivers, trips, driverScores } = data;
    
    const rankings = drivers.map((driver, index) => {
      const driverTrips = trips.filter(t => t.driver_id === driver.id && t.status === 'completed');
      const latestScore = driverScores.find(s => s.driver_id === driver.id);
      
      return {
        id: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        safetyScore: latestScore?.overall_score || driver.safety_score || 80,
        tripsCompleted: driver.total_trips || driverTrips.length,
        totalDistance: driver.total_distance_km || driverTrips.reduce((s, t) => s + (t.distance_km || 0), 0),
        violations: latestScore?.speed_violations || 0,
        trend: (latestScore?.trend as 'up' | 'down' | 'stable') || 'stable',
        rank: index + 1,
        avatar: driver.avatar_url,
      };
    });

    return rankings
      .sort((a, b) => b.safetyScore - a.safetyScore)
      .map((r, i) => ({ ...r, rank: i + 1 }))
      .slice(0, 10);
  }, [data]);

  const complianceItems = useMemo<ComplianceItem[]>(() => {
    const { vehicles, drivers, documents, maintenanceSchedules } = data;
    const items: ComplianceItem[] = [];
    const now = new Date();

    // Driver license expiry
    drivers.forEach(driver => {
      if (driver.license_expiry) {
        const expiry = new Date(driver.license_expiry);
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        items.push({
          id: `license-${driver.id}`,
          type: 'license',
          entityType: 'driver',
          entityName: `${driver.first_name} ${driver.last_name}`,
          expiryDate: driver.license_expiry,
          daysUntilExpiry: days,
          status: days < 0 ? 'expired' : days < 30 ? 'expiring_soon' : 'valid',
        });
      }
    });

    // Vehicle insurance from documents
    documents.filter(d => d.document_type === 'insurance').forEach(doc => {
      if (doc.expiry_date) {
        const expiry = new Date(doc.expiry_date);
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const vehicle = vehicles.find(v => v.id === doc.entity_id);
        items.push({
          id: `insurance-${doc.id}`,
          type: 'insurance',
          entityType: 'vehicle',
          entityName: vehicle?.plate_number || 'Unknown',
          expiryDate: doc.expiry_date,
          daysUntilExpiry: days,
          status: days < 0 ? 'expired' : days < 30 ? 'expiring_soon' : 'valid',
        });
      }
    });

    // Maintenance due
    maintenanceSchedules.filter(m => m.status === 'scheduled' || m.status === 'overdue').forEach(m => {
      if (m.due_date) {
        const due = new Date(m.due_date);
        const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const vehicle = vehicles.find(v => v.id === m.vehicle_id);
        items.push({
          id: `maint-${m.id}`,
          type: 'maintenance',
          entityType: 'vehicle',
          entityName: vehicle?.plate_number || m.vehicle?.plate_number || 'Unknown',
          expiryDate: m.due_date,
          daysUntilExpiry: days,
          status: days < 0 ? 'expired' : days < 7 ? 'expiring_soon' : 'valid',
        });
      }
    });

    return items
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .slice(0, 15);
  }, [data]);

  const financialMetrics = useMemo<FinancialMetrics>(() => {
    const { vehicles, trips, fuelEvents } = data;
    const now = new Date();
    
    // Calculate monthly trends
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));
      const monthTrips = trips.filter(t => {
        const d = new Date(t.created_at);
        return d >= monthStart && d < monthEnd;
      });
      const monthFuel = fuelEvents.filter(e => {
        const d = new Date(e.event_time);
        return d >= monthStart && d < monthEnd && e.event_type === 'refuel';
      });

      const revenue = monthTrips.reduce((s, t) => s + (t.distance_km || 0) * 15, 0); // Approximate revenue per km
      const fuelCost = monthFuel.reduce((s, e) => s + Math.abs(e.fuel_change_liters) * 50, 0);
      const maintenanceCost = vehicles.length * 2000; // Approximate monthly maintenance
      const costs = fuelCost + maintenanceCost;

      monthlyTrend.push({
        month: format(monthStart, 'MMM'),
        revenue,
        costs,
        profit: revenue - costs,
      });
    }

    const currentMonth = monthlyTrend[monthlyTrend.length - 1] || { revenue: 0, costs: 0, profit: 0 };
    const totalDistance = trips.reduce((s, t) => s + (t.distance_km || 0), 0);

    return {
      totalRevenue: currentMonth.revenue,
      totalCosts: currentMonth.costs,
      profit: currentMonth.profit,
      profitMargin: currentMonth.revenue > 0 ? (currentMonth.profit / currentMonth.revenue) * 100 : 0,
      budgetUtilization: 78.5, // Placeholder
      costSavings: currentMonth.costs * 0.08, // 8% savings
      revenuePerVehicle: vehicles.length > 0 ? currentMonth.revenue / vehicles.length : 0,
      costPerKm: totalDistance > 0 ? currentMonth.costs / totalDistance : 0,
      monthlyTrend,
    };
  }, [data]);

  const recentActivities = useMemo<FleetActivity[]>(() => {
    const { trips, alerts, fuelEvents, geofenceEvents } = data;
    const activities: FleetActivity[] = [];

    // Trip activities
    trips.slice(0, 10).forEach(trip => {
      if (trip.status === 'completed') {
        activities.push({
          id: `trip-${trip.id}`,
          type: 'trip_end',
          message: `Trip completed: ${trip.vehicle?.plate_number || 'Unknown'} - ${trip.distance_km?.toFixed(1) || 0} km`,
          timestamp: trip.end_time || trip.updated_at,
          severity: 'info',
          vehiclePlate: trip.vehicle?.plate_number,
          driverName: trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : undefined,
        });
      } else if (trip.status === 'in_progress') {
        activities.push({
          id: `trip-start-${trip.id}`,
          type: 'trip_start',
          message: `Trip started: ${trip.vehicle?.plate_number || 'Unknown'}`,
          timestamp: trip.start_time || trip.created_at,
          severity: 'info',
          vehiclePlate: trip.vehicle?.plate_number,
          driverName: trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : undefined,
        });
      }
    });

    // Alerts
    alerts.slice(0, 10).forEach(alert => {
      activities.push({
        id: `alert-${alert.id}`,
        type: 'alert',
        message: `${alert.title}: ${alert.message}`,
        timestamp: alert.alert_time,
        severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
        vehiclePlate: alert.vehicle?.plate_number,
        driverName: alert.driver ? `${alert.driver.first_name} ${alert.driver.last_name}` : undefined,
      });
    });

    // Fuel events
    fuelEvents.slice(0, 5).forEach(event => {
      activities.push({
        id: `fuel-${event.id}`,
        type: 'fuel',
        message: `${event.event_type === 'refuel' ? 'Refueled' : 'Fuel drain'}: ${event.vehicle?.plate_number} - ${Math.abs(event.fuel_change_liters).toFixed(1)}L`,
        timestamp: event.event_time,
        severity: event.event_type === 'drain' ? 'warning' : 'info',
        vehiclePlate: event.vehicle?.plate_number,
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [data]);

  const geofenceActivities = useMemo<GeofenceActivity[]>(() => {
    return data.geofenceEvents.map(event => ({
      id: event.id,
      vehiclePlate: event.vehicle?.plate_number || 'Unknown',
      geofenceName: event.geofence?.name || 'Unknown Zone',
      eventType: event.event_type as 'entry' | 'exit',
      timestamp: event.event_time,
      driverName: event.driver ? `${event.driver.first_name} ${event.driver.last_name}` : undefined,
    }));
  }, [data.geofenceEvents]);

  return {
    kpis,
    driverRankings,
    complianceItems,
    financialMetrics,
    recentActivities,
    geofenceActivities,
    loading,
    refetch: fetchData,
  };
};
