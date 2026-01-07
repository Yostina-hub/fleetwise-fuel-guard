import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VehicleTrip {
  id: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  status: string | null;
  driver_id: string | null;
  start_location: string | null;
  end_location: string | null;
  max_speed_kmh: number | null;
  avg_speed_kmh: number | null;
  idle_time_minutes: number | null;
  fuel_consumed_liters: number | null;
}

interface VehicleMaintenanceRecord {
  id: string;
  service_type: string;
  next_due_date: string | null;
  last_service_date: string | null;
  priority: string | null;
}

interface VehicleFuelTransaction {
  id: string;
  transaction_date: string;
  fuel_amount_liters: number;
  location_name: string | null;
  fuel_cost: number | null;
  transaction_type: string | null;
  odometer_km: number | null;
}

interface VehicleDriverEvent {
  id: string;
  event_type: string;
  event_time: string;
  severity: string;
  address: string | null;
  speed_kmh: number | null;
  speed_limit_kmh: number | null;
  lat: number | null;
  lng: number | null;
}

interface VehiclePerformanceMetrics {
  avgFuelEfficiency: number | null;
  totalDistance: number;
  totalTrips: number;
  totalIdleMinutes: number;
  avgSpeed: number | null;
  maxSpeed: number | null;
  totalDriveTime: number;
}

export function useVehicleData(vehicleId: string | undefined) {
  // Fetch trips for last 90 days (increased from 10 records)
  const { data: recentTrips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["vehicle-trips", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      // Get trips from last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data, error } = await supabase
        .from("trips")
        .select(`
          id, 
          start_time, 
          end_time, 
          distance_km, 
          duration_minutes, 
          status, 
          driver_id,
          start_location,
          end_location,
          max_speed_kmh,
          avg_speed_kmh,
          idle_time_minutes,
          fuel_consumed_liters
        `)
        .eq("vehicle_id", vehicleId)
        .gte("start_time", ninetyDaysAgo.toISOString())
        .order("start_time", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as VehicleTrip[];
    },
    enabled: !!vehicleId,
  });

  // Fetch maintenance schedules
  const { data: maintenanceRecords = [], isLoading: maintenanceLoading } = useQuery({
    queryKey: ["vehicle-maintenance", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("id, service_type, next_due_date, last_service_date, priority")
        .eq("vehicle_id", vehicleId)
        .order("next_due_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []) as VehicleMaintenanceRecord[];
      return (data || []) as VehicleMaintenanceRecord[];
    },
    enabled: !!vehicleId,
  });

  // Fetch fuel transactions for last 90 days
  const { data: fuelTransactions = [], isLoading: fuelLoading } = useQuery({
    queryKey: ["vehicle-fuel", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data, error } = await supabase
        .from("fuel_transactions")
        .select("id, transaction_date, fuel_amount_liters, location_name, fuel_cost, transaction_type, odometer_km")
        .eq("vehicle_id", vehicleId)
        .gte("transaction_date", ninetyDaysAgo.toISOString())
        .order("transaction_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as VehicleFuelTransaction[];
    },
    enabled: !!vehicleId,
  });

  // Fetch driver events for last 90 days
  const { data: driverEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["vehicle-events", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data, error } = await supabase
        .from("driver_events")
        .select("id, event_type, event_time, severity, address, speed_kmh, speed_limit_kmh, lat, lng")
        .eq("vehicle_id", vehicleId)
        .gte("event_time", ninetyDaysAgo.toISOString())
        .order("event_time", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as VehicleDriverEvent[];
    },
    enabled: !!vehicleId,
  });

  // Calculate performance metrics from trips (last 30 days)
  const performanceMetrics = useQuery({
    queryKey: ["vehicle-metrics", vehicleId],
    queryFn: async (): Promise<VehiclePerformanceMetrics> => {
      if (!vehicleId) return { 
        avgFuelEfficiency: null, 
        totalDistance: 0, 
        totalTrips: 0, 
        totalIdleMinutes: 0,
        avgSpeed: null,
        maxSpeed: null,
        totalDriveTime: 0
      };
      
      // Get last 30 days of trip data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: trips, error } = await supabase
        .from("trips")
        .select("distance_km, fuel_consumed_liters, idle_time_minutes, duration_minutes, avg_speed_kmh, max_speed_kmh")
        .eq("vehicle_id", vehicleId)
        .gte("start_time", thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      
      const totalDistance = trips?.reduce((sum, t) => sum + (t.distance_km || 0), 0) || 0;
      const totalFuel = trips?.reduce((sum, t) => sum + (t.fuel_consumed_liters || 0), 0) || 0;
      const totalIdleMinutes = trips?.reduce((sum, t) => sum + (t.idle_time_minutes || 0), 0) || 0;
      const totalDriveTime = trips?.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) || 0;
      
      // Calculate averages
      const tripsWithSpeed = trips?.filter(t => t.avg_speed_kmh) || [];
      const avgSpeed = tripsWithSpeed.length > 0 
        ? tripsWithSpeed.reduce((sum, t) => sum + (t.avg_speed_kmh || 0), 0) / tripsWithSpeed.length 
        : null;
      const maxSpeed = trips?.reduce((max, t) => Math.max(max, t.max_speed_kmh || 0), 0) || null;
      
      return {
        avgFuelEfficiency: totalDistance > 0 && totalFuel > 0 ? (totalFuel / totalDistance) * 100 : null,
        totalDistance,
        totalTrips: trips?.length || 0,
        totalIdleMinutes,
        avgSpeed,
        maxSpeed,
        totalDriveTime
      };
    },
    enabled: !!vehicleId,
  });

  return {
    recentTrips,
    maintenanceRecords,
    fuelTransactions,
    driverEvents,
    performanceMetrics: performanceMetrics.data || { 
      avgFuelEfficiency: null, 
      totalDistance: 0, 
      totalTrips: 0, 
      totalIdleMinutes: 0,
      avgSpeed: null,
      maxSpeed: null,
      totalDriveTime: 0
    },
    isLoading: tripsLoading || maintenanceLoading || fuelLoading || eventsLoading || performanceMetrics.isLoading,
  };
}