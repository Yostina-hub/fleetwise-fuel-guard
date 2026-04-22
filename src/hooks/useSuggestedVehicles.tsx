/**
 * useSuggestedVehicles
 * --------------------
 * Returns a ranked list of pool vehicles suggested for a vehicle request.
 *
 * Ranking strategy (per the product spec):
 *   1. Closest vehicle by live GPS distance to the pickup point.
 *   2. Geofence boost: vehicles whose last GPS position is inside the same
 *      geofence that contains the pickup point are flagged with `inGeofence`
 *      and pinned to the top.
 *   3. Fallback: if no telemetry exists, vehicles are returned in their
 *      natural pool roster order so the supervisor can still pick one.
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
  distance_km: number | null;
  has_gps: boolean;
  in_geofence: boolean;
  is_top_pick: boolean;
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
      // 1. Pool vehicles
      let q = supabase
        .from("vehicles")
        .select(
          "id, plate_number, make, model, status, specific_pool, seating_capacity, assigned_driver_id",
        )
        .eq("organization_id", organizationId!)
        .eq("status", "active");
      if (poolName) q = q.eq("specific_pool", poolName);
      const { data: vehicles, error } = await q.limit(100);
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

      // 3. Active geofences (only needed if we have pickup coords)
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

      // 4. Score each vehicle
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
        return {
          ...v,
          distance_km,
          has_gps: !!tele,
          in_geofence,
          is_top_pick: false,
          // Capacity mismatch: heavily down-rank
          _capacityPenalty: fitsCapacity ? 0 : 1000,
        } as SuggestedVehicle & { _capacityPenalty: number };
      });

      // 5. Sort: in-geofence first, then has-GPS+distance, then no-GPS roster.
      scored.sort((a: any, b: any) => {
        if (a._capacityPenalty !== b._capacityPenalty) {
          return a._capacityPenalty - b._capacityPenalty;
        }
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
