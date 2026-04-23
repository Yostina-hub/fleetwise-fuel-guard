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
  /** Vehicle this driver is permanently assigned to (vehicles.assigned_driver_id reverse). */
  assigned_vehicle_id: string | null;
  assigned_vehicle_plate: string | null;
  assigned_vehicle_pool: string | null;
  /** Active trip this driver is currently on (vehicle_requests). */
  active_trip_id: string | null;
  active_trip_status: string | null;
  in_pool: boolean;
  is_busy: boolean;
  is_top_pick: boolean;
  /** Human availability summary. */
  availability: "available" | "on_trip" | "off_duty" | "suspended" | "inactive";
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

      // Resolve which vehicle each driver is permanently assigned to.
      const driverIds = list.map((d) => d.id);
      const { data: vehicles } = await (supabase as any)
        .from("vehicles")
        .select("id, plate_number, specific_pool, assigned_driver_id")
        .in("assigned_driver_id", driverIds);
      const driverVehicleMap = new Map<
        string,
        { vehicleId: string; plate: string | null; pool: string | null }
      >();
      (vehicles || []).forEach((v: any) => {
        if (v.assigned_driver_id) {
          driverVehicleMap.set(v.assigned_driver_id, {
            vehicleId: v.id,
            plate: v.plate_number || null,
            pool: v.specific_pool || null,
          });
        }
      });

      // Active trips per driver — so the picker can show "On trip VR-XXX".
      const { data: activeTrips } = await (supabase as any)
        .from("vehicle_requests")
        .select("id, assigned_driver_id, status")
        .eq("organization_id", organizationId!)
        .in("status", ["assigned", "in_progress", "checked_out"])
        .in("assigned_driver_id", driverIds);
      const tripByDriver = new Map<string, { id: string; status: string }>();
      (activeTrips || []).forEach((t: any) => {
        if (t.assigned_driver_id) {
          tripByDriver.set(t.assigned_driver_id, { id: t.id, status: t.status });
        }
      });

      const scored: SuggestedDriver[] = list.map((d) => {
        const veh = driverVehicleMap.get(d.id);
        const driverPool = d.assigned_pool || null;
        const inPool =
          !!poolName &&
          ((veh?.pool && veh.pool === poolName) ||
            (driverPool && driverPool === poolName));
        const trip = tripByDriver.get(d.id);
        let availability: SuggestedDriver["availability"] = "available";
        if (d.status === "suspended") availability = "suspended";
        else if (d.status === "off_duty") availability = "off_duty";
        else if (d.status && d.status !== "active") availability = "inactive";
        else if (trip || d.status === "on_trip") availability = "on_trip";
        const isBusy = availability !== "available";
        return {
          id: d.id,
          first_name: d.first_name,
          last_name: d.last_name,
          phone: d.phone,
          status: d.status,
          pool: driverPool,
          assigned_vehicle_id: veh?.vehicleId || null,
          assigned_vehicle_plate: veh?.plate || null,
          assigned_vehicle_pool: veh?.pool || null,
          active_trip_id: trip?.id || null,
          active_trip_status: trip?.status || null,
          in_pool: !!inPool,
          is_busy: isBusy,
          is_top_pick: false,
          availability,
        };
      });

      // Sort: available first → in-pool → has-vehicle → name
      const availabilityRank: Record<string, number> = {
        available: 0,
        on_trip: 1,
        off_duty: 2,
        suspended: 3,
        inactive: 4,
      };
      scored.sort((a, b) => {
        const ra = availabilityRank[a.availability] ?? 9;
        const rb = availabilityRank[b.availability] ?? 9;
        if (ra !== rb) return ra - rb;
        if (a.in_pool !== b.in_pool) return a.in_pool ? -1 : 1;
        if (!!a.assigned_vehicle_id !== !!b.assigned_vehicle_id) {
          return a.assigned_vehicle_id ? -1 : 1;
        }
        return (a.first_name || "").localeCompare(b.first_name || "");
      });

      const topAvailable = scored.find((d) => d.availability === "available");
      if (topAvailable) topAvailable.is_top_pick = true;
      return scored;
    },
  });
};
