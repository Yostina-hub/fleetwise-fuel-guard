/**
 * useSuggestedDrivers
 * -------------------
 * Returns a ranked list of drivers suggested for a vehicle request.
 *
 * Ranking strategy (never filters — only ranks, so supervisors can cross-pool):
 *   1. Drivers whose `assigned_vehicle.specific_pool` matches the request pool.
 *   2. Drivers whose `assigned_pool` matches the request pool.
 *   3. Active, free drivers (status = 'active', not on a trip).
 *   4. Fallback: all active drivers in the org.
 *
 * Drivers currently `on_trip` are de-prioritised but still returned so the
 * supervisor can see them (with a busy badge).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SuggestedDriver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string | null;
  pool: string | null;
  assigned_vehicle_id: string | null;
  assigned_vehicle_pool: string | null;
  in_pool: boolean;
  is_busy: boolean;
  is_top_pick: boolean;
}

interface Args {
  organizationId?: string | null;
  poolName?: string | null;
  enabled?: boolean;
}

export const useSuggestedDrivers = ({
  organizationId,
  poolName,
  enabled = true,
}: Args) => {
  return useQuery({
    queryKey: ["suggested-drivers", organizationId, poolName],
    enabled: enabled && !!organizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<SuggestedDriver[]> => {
      // NOTE: drivers table uses `assigned_pool`, not `pool`.
      const { data: drivers, error } = await (supabase as any)
        .from("drivers")
        .select(
          "id, first_name, last_name, phone, status, assigned_pool",
        )
        .eq("organization_id", organizationId!)
        .order("first_name")
        .limit(500);
      if (error) throw error;
      const list = (drivers || []) as any[];
      if (list.length === 0) return [];

      // Resolve which vehicle each driver is currently assigned to (reverse lookup
      // — drivers.assigned_vehicle_id doesn't exist; vehicles.assigned_driver_id does).
      const driverIds = list.map((d) => d.id);
      const { data: vehicles } = await (supabase as any)
        .from("vehicles")
        .select("id, specific_pool, assigned_driver_id")
        .in("assigned_driver_id", driverIds);
      const driverVehicleMap = new Map<
        string,
        { vehicleId: string; pool: string | null }
      >();
      (vehicles || []).forEach((v: any) => {
        if (v.assigned_driver_id) {
          driverVehicleMap.set(v.assigned_driver_id, {
            vehicleId: v.id,
            pool: v.specific_pool || null,
          });
        }
      });

      const scored: SuggestedDriver[] = list.map((d) => {
        const veh = driverVehicleMap.get(d.id);
        const driverPool = d.assigned_pool || null;
        const inPool =
          !!poolName &&
          ((veh?.pool && veh.pool === poolName) ||
            (driverPool && driverPool === poolName));
        const isBusy = d.status === "on_trip" || d.status === "off_duty";
        return {
          id: d.id,
          first_name: d.first_name,
          last_name: d.last_name,
          phone: d.phone,
          status: d.status,
          pool: driverPool,
          assigned_vehicle_id: veh?.vehicleId || null,
          assigned_vehicle_pool: veh?.pool || null,
          in_pool: !!inPool,
          is_busy: !!isBusy,
          is_top_pick: false,
        };
      });

      scored.sort((a, b) => {
        if (a.in_pool !== b.in_pool) return a.in_pool ? -1 : 1;
        if (a.is_busy !== b.is_busy) return a.is_busy ? 1 : -1;
        return (a.first_name || "").localeCompare(b.first_name || "");
      });

      if (scored.length) scored[0].is_top_pick = true;
      return scored;
    },
  });
};
