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
}

interface VehicleDriverEvent {
  id: string;
  event_type: string;
  event_time: string;
  severity: string;
  address: string | null;
}

interface VehiclePerformanceMetrics {
  avgFuelEfficiency: number | null;
  totalDistance: number;
  totalTrips: number;
  totalIdleMinutes: number;
}

export function useVehicleData(vehicleId: string | undefined) {
  // Fetch recent trips
  const { data: recentTrips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["vehicle-trips", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("trips")
        .select("id, start_time, end_time, distance_km, duration_minutes, status, driver_id")
        .eq("vehicle_id", vehicleId)
        .order("start_time", { ascending: false })
        .limit(10);
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
        .limit(5);
      if (error) throw error;
      return (data || []) as VehicleMaintenanceRecord[];
    },
    enabled: !!vehicleId,
  });

  // Fetch fuel transactions
  const { data: fuelTransactions = [], isLoading: fuelLoading } = useQuery({
    queryKey: ["vehicle-fuel", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("fuel_transactions")
        .select("id, transaction_date, fuel_amount_liters, location_name, fuel_cost")
        .eq("vehicle_id", vehicleId)
        .order("transaction_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as VehicleFuelTransaction[];
    },
    enabled: !!vehicleId,
  });

  // Fetch recent driver events
  const { data: driverEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["vehicle-events", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("driver_events")
        .select("id, event_type, event_time, severity, address")
        .eq("vehicle_id", vehicleId)
        .order("event_time", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as VehicleDriverEvent[];
    },
    enabled: !!vehicleId,
  });

  // Calculate performance metrics from trips
  const { data: performanceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["vehicle-metrics", vehicleId],
    queryFn: async (): Promise<VehiclePerformanceMetrics> => {
      if (!vehicleId) return { avgFuelEfficiency: null, totalDistance: 0, totalTrips: 0, totalIdleMinutes: 0 };
      
      // Get last 30 days of trip data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: trips, error } = await supabase
        .from("trips")
        .select("distance_km, fuel_consumed_liters, idle_time_minutes")
        .eq("vehicle_id", vehicleId)
        .gte("start_time", thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      
      const totalDistance = trips?.reduce((sum, t) => sum + (t.distance_km || 0), 0) || 0;
      const totalFuel = trips?.reduce((sum, t) => sum + (t.fuel_consumed_liters || 0), 0) || 0;
      const totalIdleMinutes = trips?.reduce((sum, t) => sum + (t.idle_time_minutes || 0), 0) || 0;
      
      return {
        avgFuelEfficiency: totalDistance > 0 && totalFuel > 0 ? (totalFuel / totalDistance) * 100 : null,
        totalDistance,
        totalTrips: trips?.length || 0,
        totalIdleMinutes,
      };
    },
    enabled: !!vehicleId,
  });

  return {
    recentTrips,
    maintenanceRecords,
    fuelTransactions,
    driverEvents,
    performanceMetrics: performanceMetrics || { avgFuelEfficiency: null, totalDistance: 0, totalTrips: 0, totalIdleMinutes: 0 },
    isLoading: tripsLoading || maintenanceLoading || fuelLoading || eventsLoading || metricsLoading,
  };
}
