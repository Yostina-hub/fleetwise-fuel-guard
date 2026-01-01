import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

interface FleetStats {
  total: number;
  moving: number;
  idle: number;
  offline: number;
}

interface UseFleetStatsOptions {
  statusFilter?: string;
  vehicleTypeFilter?: string;
  fuelTypeFilter?: string;
  ownershipFilter?: string;
  searchQuery?: string;
}

export const useFleetStats = (options: UseFleetStatsOptions = {}) => {
  const { organizationId } = useOrganization();
  const [stats, setStats] = useState<FleetStats>({ total: 0, moving: 0, idle: 0, offline: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    statusFilter = "all",
    vehicleTypeFilter = "all",
    fuelTypeFilter = "all",
    ownershipFilter = "all",
    searchQuery = ""
  } = options;

  const fetchStats = useCallback(async () => {
    if (!organizationId) {
      setStats({ total: 0, moving: 0, idle: 0, offline: 0 });
      setLoading(false);
      return;
    }

    setError(null);
    try {
      // Build base query for filtered vehicle IDs
      let vehicleQuery = supabase
        .from("vehicles")
        .select("id, status")
        .eq("organization_id", organizationId);

      if (statusFilter !== "all") {
        vehicleQuery = vehicleQuery.eq("status", statusFilter);
      }
      if (vehicleTypeFilter !== "all") {
        vehicleQuery = vehicleQuery.eq("vehicle_type", vehicleTypeFilter);
      }
      if (fuelTypeFilter !== "all") {
        vehicleQuery = vehicleQuery.eq("fuel_type", fuelTypeFilter);
      }
      if (ownershipFilter !== "all") {
        vehicleQuery = vehicleQuery.eq("ownership_type", ownershipFilter);
      }
      if (searchQuery) {
        vehicleQuery = vehicleQuery.or(
          `plate_number.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,vin.ilike.%${searchQuery}%`
        );
      }

      const { data: vehicles, error: vehicleError } = await vehicleQuery;
      if (vehicleError) throw vehicleError;

      if (!vehicles || vehicles.length === 0) {
        setStats({ total: 0, moving: 0, idle: 0, offline: 0 });
        setLoading(false);
        return;
      }

      const vehicleIds = vehicles.map(v => v.id);
      const total = vehicleIds.length;

      // Fetch telemetry for all filtered vehicles to determine real-time status
      const { data: telemetry, error: telemetryError } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, device_connected, engine_on, speed_kmh, last_communication_at")
        .in("vehicle_id", vehicleIds)
        .order("last_communication_at", { ascending: false });

      if (telemetryError) throw telemetryError;

      // Get latest telemetry per vehicle
      const telemetryMap = new Map<string, { device_connected: boolean; engine_on: boolean; speed_kmh: number }>();
      telemetry?.forEach(t => {
        if (!telemetryMap.has(t.vehicle_id)) {
          telemetryMap.set(t.vehicle_id, {
            device_connected: t.device_connected || false,
            engine_on: t.engine_on || false,
            speed_kmh: t.speed_kmh || 0
          });
        }
      });

      // Calculate stats based on telemetry
      let moving = 0;
      let idle = 0;
      let offline = 0;

      vehicleIds.forEach(id => {
        const t = telemetryMap.get(id);
        if (t?.device_connected) {
          if (t.engine_on && t.speed_kmh > 0) {
            moving++;
          } else {
            idle++;
          }
        } else {
          offline++;
        }
      });

      setStats({ total, moving, idle, offline });
    } catch (err) {
      console.error("Error fetching fleet stats:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch fleet stats"));
    } finally {
      setLoading(false);
    }
  }, [organizationId, statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Subscribe to realtime changes for both vehicles and telemetry
  useEffect(() => {
    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;

    const vehicleChannel = supabase
      .channel(`fleet-stats-vehicles-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchStats, 500);
        }
      )
      .subscribe();

    const telemetryChannel = supabase
      .channel(`fleet-stats-telemetry-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_telemetry',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchStats, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(vehicleChannel);
      supabase.removeChannel(telemetryChannel);
    };
  }, [organizationId, fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};
