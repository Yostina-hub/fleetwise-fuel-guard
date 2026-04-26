/**
 * useRouteGeofenceCheck
 * ---------------------
 * Validates a vehicle request's pickup + destination against the
 * organisation's active geofences. Used by the assignment flow to prevent
 * supervisors from dispatching vehicles to addresses that fall outside any
 * known operational zone — a strong signal that the request has bad
 * coordinates or is out of policy.
 *
 * Returns a per-point classification:
 *   - "in_zone"     → point is inside at least one active geofence (zone
 *                     name is returned for the badge).
 *   - "out_of_zone" → coordinates known but no fence contains the point.
 *   - "no_coords"   → request lacks lat/lng; cannot validate.
 *
 * The aggregate `valid` flag is true only when both pickup and destination
 * are `in_zone`. The picker treats anything else as "needs supervisor
 * override".
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  findContainingGeofence,
  type GeofenceLite,
} from "@/lib/geo/geofenceUtils";

export type RoutePointStatus = "in_zone" | "out_of_zone" | "no_coords";

export interface RouteGeofenceCheck {
  pickup: {
    status: RoutePointStatus;
    fence_name: string | null;
  };
  destination: {
    status: RoutePointStatus;
    fence_name: string | null;
  };
  /** True only when both points are inside an active geofence. */
  valid: boolean;
  /** True when at least one coord is provided but lies outside all fences. */
  has_warning: boolean;
  /** Number of active geofences considered. */
  fence_count: number;
}

interface Args {
  organizationId?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  enabled?: boolean;
}

const classify = (
  lat: number | null | undefined,
  lng: number | null | undefined,
  fences: GeofenceLite[],
): { status: RoutePointStatus; fence_name: string | null } => {
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return { status: "no_coords", fence_name: null };
  }
  const found = findContainingGeofence(
    { lat: Number(lat), lng: Number(lng) },
    fences,
  );
  return found
    ? { status: "in_zone", fence_name: found.name }
    : { status: "out_of_zone", fence_name: null };
};

export const useRouteGeofenceCheck = ({
  organizationId,
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  enabled = true,
}: Args) => {
  return useQuery({
    queryKey: [
      "route-geofence-check",
      organizationId,
      pickupLat,
      pickupLng,
      destinationLat,
      destinationLng,
    ],
    enabled: enabled && !!organizationId,
    staleTime: 60_000,
    queryFn: async (): Promise<RouteGeofenceCheck> => {
      const { data: fences } = await (supabase as any)
        .from("geofences")
        .select(
          "id, name, geometry_type, center_lat, center_lng, radius_meters, polygon_points, is_active",
        )
        .eq("organization_id", organizationId!)
        .eq("is_active", true);
      const list = (fences || []) as GeofenceLite[];

      const pickup = classify(pickupLat, pickupLng, list);
      const destination = classify(destinationLat, destinationLng, list);

      const has_warning =
        pickup.status === "out_of_zone" ||
        destination.status === "out_of_zone";

      // "valid" is strict: both points must be inside a fence. If the org
      // has no fences at all, we don't penalise — return valid=true so the
      // banner stays out of the way.
      const valid =
        list.length === 0
          ? true
          : pickup.status === "in_zone" && destination.status === "in_zone";

      return {
        pickup,
        destination,
        valid,
        has_warning,
        fence_count: list.length,
      };
    },
  });
};
