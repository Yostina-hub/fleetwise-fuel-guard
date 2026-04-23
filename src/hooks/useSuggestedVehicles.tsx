/**
 * useSuggestedVehicles
 * --------------------
 * Returns a ranked list of vehicles suggested for a vehicle request.
 *
 * Ranking strategy:
 *   1. Vehicles whose `specific_pool` matches the request pool (in-pool first).
 *   2. Inside the pickup geofence (if pickup coords known).
 *   3. Closest by live GPS distance to pickup.
 *   4. Fallback: roster order so the supervisor can still pick one.
 *
 * IMPORTANT: We never *filter out* vehicles that are out of pool — we only
 * down-rank them. This lets supervisors cross-check resources from other
 * pools/regions/zones when their own pool is exhausted.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  findContainingGeofence,
  haversineKm,
  isInsideGeofence,
  type GeofenceLite,
} from "@/lib/geo/geofenceUtils";

export interface SuggestedVehicle {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  status: string | null;
  specific_pool: string | null;
  seating_capacity: number | null;
  assigned_driver_id: string | null;
  /** Display name of the driver permanently assigned to this vehicle (vehicles.assigned_driver_id). */
  assigned_driver_name: string | null;
  distance_km: number | null;
  has_gps: boolean;
  in_geofence: boolean;
  in_pool: boolean;
  is_idle: boolean;
  is_top_pick: boolean;
  /** Active trip currently using this vehicle, if any. */
  active_trip_id: string | null;
  active_trip_status: string | null;
  /** Human availability summary used by the picker UI. */
  availability: "available" | "busy" | "maintenance" | "inactive";
}

interface Args {
  organizationId?: string | null;
  poolName?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  passengers?: number | null;
  enabled?: boolean;
}

export const useSuggestedVehicles = ({
  organizationId,
  poolName,
  pickupLat,
  pickupLng,
  passengers,
  enabled = true,
}: Args) => {
  return useQuery({
    queryKey: [
      "suggested-vehicles",
      organizationId,
      poolName,
      pickupLat,
      pickupLng,
      passengers,
    ],
    enabled: enabled && !!organizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<SuggestedVehicle[]> => {
      // 1. All active vehicles in the org — never filter by pool here, only rank.
      const { data: vehicles, error } = await supabase
        .from("vehicles")
        .select(
          "id, plate_number, make, model, status, specific_pool, seating_capacity, assigned_driver_id",
        )
        .eq("organization_id", organizationId!)
        .eq("status", "active")
        .limit(500);
      if (error) throw error;

      const list = vehicles || [];
      if (list.length === 0) return [];

      // 2. Latest telemetry
      const ids = list.map((v) => v.id);
      const { data: telemetry } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, latitude, longitude")
        .in("vehicle_id", ids);
      const teleMap = new Map<string, { lat: number; lng: number }>();
      (telemetry || []).forEach((t) => {
        if (t.latitude != null && t.longitude != null) {
          teleMap.set(t.vehicle_id, {
            lat: Number(t.latitude),
            lng: Number(t.longitude),
          });
        }
      });

      // 3. Idle check — vehicles already assigned to an in-flight trip are busy.
      const { data: activeTrips } = await (supabase as any)
        .from("vehicle_requests")
        .select("assigned_vehicle_id, status")
        .eq("organization_id", organizationId!)
        .in("status", ["assigned", "in_progress", "checked_out"])
        .in("assigned_vehicle_id", ids);
      const busyIds = new Set<string>(
        (activeTrips || [])
          .map((t: any) => t.assigned_vehicle_id)
          .filter(Boolean),
      );

      // 4. Active geofences (only needed if we have pickup coords)
      let pickupFence: GeofenceLite | null = null;
      if (pickupLat != null && pickupLng != null) {
        const { data: fences } = await (supabase as any)
          .from("geofences")
          .select(
            "id, name, geometry_type, center_lat, center_lng, radius_meters, polygon_points, is_active",
          )
          .eq("organization_id", organizationId!)
          .eq("is_active", true);
        pickupFence = findContainingGeofence(
          { lat: pickupLat, lng: pickupLng },
          (fences || []) as GeofenceLite[],
        );
      }

      // 5. Score each vehicle
      const scored: SuggestedVehicle[] = list.map((v) => {
        const tele = teleMap.get(v.id);
        let distance_km: number | null = null;
        let in_geofence = false;
        if (tele && pickupLat != null && pickupLng != null) {
          distance_km = Number(
            haversineKm({ lat: pickupLat, lng: pickupLng }, tele).toFixed(2),
          );
          if (pickupFence) {
            in_geofence = isInsideGeofence(tele, pickupFence);
          }
        }
        const fitsCapacity =
          passengers == null ||
          v.seating_capacity == null ||
          v.seating_capacity >= passengers;
        const in_pool = !!(poolName && v.specific_pool === poolName);
        return {
          ...v,
          distance_km,
          has_gps: !!tele,
          in_geofence,
          in_pool,
          is_idle: !busyIds.has(v.id),
          is_top_pick: false,
          // Capacity mismatch: heavily down-rank
          _capacityPenalty: fitsCapacity ? 0 : 1000,
        } as SuggestedVehicle & { _capacityPenalty: number };
      });

      // 6. Sort: in-pool first → idle → in-geofence → has-GPS+distance → roster.
      scored.sort((a: any, b: any) => {
        if (a._capacityPenalty !== b._capacityPenalty) {
          return a._capacityPenalty - b._capacityPenalty;
        }
        if (a.in_pool !== b.in_pool) return a.in_pool ? -1 : 1;
        if (a.is_idle !== b.is_idle) return a.is_idle ? -1 : 1;
        if (a.in_geofence !== b.in_geofence) return a.in_geofence ? -1 : 1;
        if (a.has_gps !== b.has_gps) return a.has_gps ? -1 : 1;
        if (a.has_gps && b.has_gps) {
          return (a.distance_km ?? 9e9) - (b.distance_km ?? 9e9);
        }
        return (a.plate_number || "").localeCompare(b.plate_number || "");
      });

      // Mark top pick
      if (scored.length) scored[0].is_top_pick = true;
      // Strip internal field
      return scored.map(({ _capacityPenalty, ...v }: any) => v);
    },
  });
};
