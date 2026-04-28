/**
 * useSharedRides
 * --------------
 * Tier-1 Direct Match: queries the `find_direct_match_rides` Postgres
 * function for shared rides matching a requester's origin/destination/time
 * within their pool.
 *
 * Also exposes:
 *   - `useDriverSharedRides` — active rides for the signed-in driver, used
 *     by the driver portal manifest tab.
 *   - `useJoinSharedRide` — mutation to add a passenger to a ride.
 *   - `useUpdatePassengerStatus` — driver-side check-in / drop-off.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentDriverId } from "@/hooks/useCurrentDriverId";
import { toast } from "sonner";

export interface SharedRideMatch {
  ride_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  pool_code: string | null;
  origin_label: string;
  destination_label: string;
  departure_at: string;
  available_seats: number;
  total_seats: number;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  origin_distance_km: number;
  destination_distance_km: number;
  time_delta_minutes: number;
  match_score: number;
}

export interface FindMatchesParams {
  poolCode: string | null;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  departureAt: Date | null;
  seatsNeeded?: number;
  originRadiusKm?: number;
  destinationRadiusKm?: number;
}

/** Tier-2: a ride that *passes through* the requester's pickup, instead of
 *  starting nearby. Includes the actual detour the driver would take. */
export interface SharedRideProximityMatch {
  ride_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  pool_code: string | null;
  origin_label: string;
  destination_label: string;
  departure_at: string;
  available_seats: number;
  total_seats: number;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  detour_km: number;
  destination_distance_km: number;
  time_delta_minutes: number;
  corridor_km_used: number;
  match_score: number;
}

const isReady = (p: FindMatchesParams) =>
  p.originLat != null &&
  p.originLng != null &&
  p.destinationLat != null &&
  p.destinationLng != null &&
  p.departureAt != null;

/**
 * Direct-match suggestions for the Vehicle Request form.
 * Returns at most 10 candidate rides, ordered by match score (best first).
 */
export const useFindSharedRides = (params: FindMatchesParams, enabled = true) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: [
      "shared-rides-matches",
      organizationId,
      params.poolCode,
      params.originLat,
      params.originLng,
      params.destinationLat,
      params.destinationLng,
      params.departureAt?.toISOString(),
      params.seatsNeeded,
    ],
    enabled: enabled && !!organizationId && isReady(params),
    staleTime: 30_000,
    queryFn: async (): Promise<SharedRideMatch[]> => {
      const { data, error } = await (supabase as any).rpc("find_direct_match_rides", {
        _organization_id: organizationId,
        _pool_code: params.poolCode,
        _origin_lat: params.originLat,
        _origin_lng: params.originLng,
        _destination_lat: params.destinationLat,
        _destination_lng: params.destinationLng,
        _departure_at: params.departureAt!.toISOString(),
        _seats_needed: params.seatsNeeded ?? 1,
        _origin_radius_km: params.originRadiusKm ?? 2.0,
        _destination_radius_km: params.destinationRadiusKm ?? 2.0,
        _wait_window_min: 10,
      });
      if (error) throw error;
      return (data || []) as SharedRideMatch[];
    },
  });
};

/**
 * Tier-2 Proximity sweep: rides whose route passes near the requester's
 * pickup, even if they don't *start* there. Uses the per-pool `corridor_km`
 * setting (default 3 km).
 */
export const useFindProximityRides = (params: FindMatchesParams, enabled = true) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: [
      "shared-rides-proximity",
      organizationId,
      params.poolCode,
      params.originLat,
      params.originLng,
      params.destinationLat,
      params.destinationLng,
      params.departureAt?.toISOString(),
      params.seatsNeeded,
    ],
    enabled: enabled && !!organizationId && isReady(params),
    staleTime: 30_000,
    queryFn: async (): Promise<SharedRideProximityMatch[]> => {
      const { data, error } = await (supabase as any).rpc("find_proximity_match_rides", {
        _organization_id: organizationId,
        _pool_code: params.poolCode,
        _origin_lat: params.originLat,
        _origin_lng: params.originLng,
        _destination_lat: params.destinationLat,
        _destination_lng: params.destinationLng,
        _departure_at: params.departureAt!.toISOString(),
        _seats_needed: params.seatsNeeded ?? 1,
        _wait_window_min: 10,
        _destination_radius_km: params.destinationRadiusKm ?? 5.0,
      });
      if (error) throw error;
      return (data || []) as SharedRideProximityMatch[];
    },
  });
};

/**
 * Active shared rides where the signed-in driver is the assigned driver.
 * Used by the driver-portal "Shared Trip" tab.
 */
export const useDriverSharedRides = () => {
  const { organizationId } = useOrganization();
  const driverId = useCurrentDriverId();
  return useQuery({
    queryKey: ["driver-shared-rides", organizationId, driverId],
    enabled: !!organizationId && !!driverId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shared_rides")
        .select(
          `id, pool_code, origin_label, destination_label, departure_at,
           total_seats, available_seats, status, vehicle_id,
           origin_lat, origin_lng, destination_lat, destination_lng,
           shared_ride_passengers (
             id, vehicle_request_id, passenger_user_id, pickup_label,
             pickup_lat, pickup_lng, dropoff_label, dropoff_lat, dropoff_lng,
             seats, status, boarded_at, dropped_off_at, created_at
           )`,
        )
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .in("status", ["planned", "boarding", "in_progress"])
        .order("departure_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
};

export const useJoinSharedRide = () => {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  return useMutation({
    mutationFn: async (input: {
      rideId: string;
      vehicleRequestId: string;
      passengerUserId: string | null;
      seats?: number;
      pickupLabel?: string | null;
      pickupLat?: number | null;
      pickupLng?: number | null;
      dropoffLabel?: string | null;
    }) => {
      const { error } = await (supabase as any).from("shared_ride_passengers").insert({
        shared_ride_id: input.rideId,
        vehicle_request_id: input.vehicleRequestId,
        organization_id: organizationId,
        passenger_user_id: input.passengerUserId,
        seats: input.seats ?? 1,
        pickup_label: input.pickupLabel ?? null,
        pickup_lat: input.pickupLat ?? null,
        pickup_lng: input.pickupLng ?? null,
        dropoff_label: input.dropoffLabel ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Joined the shared ride");
      qc.invalidateQueries({ queryKey: ["shared-rides-matches"] });
      qc.invalidateQueries({ queryKey: ["driver-shared-rides"] });
    },
    onError: (e: any) => toast.error(e.message || "Could not join ride"),
  });
};

export const useUpdatePassengerStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      passengerId: string;
      status: "reserved" | "boarded" | "dropped_off" | "no_show" | "cancelled";
    }) => {
      const patch: Record<string, any> = { status: input.status };
      if (input.status === "boarded") patch.boarded_at = new Date().toISOString();
      if (input.status === "dropped_off") patch.dropped_off_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("shared_ride_passengers")
        .update(patch)
        .eq("id", input.passengerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-shared-rides"] });
    },
    onError: (e: any) => toast.error(e.message || "Update failed"),
  });
};
