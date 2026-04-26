/**
 * useOnTheWayVehicles
 * -------------------
 * Surfaces vehicles that are CURRENTLY on an active trip whose route happens
 * to pass close to a new pickup → drop request. The supervisor can then
 * "piggy-back" the new request on that trip instead of dispatching a fresh
 * vehicle, saving fuel and shortening time-to-pickup.
 *
 * Matching rules (intentionally conservative — supervisor still has to
 * approve):
 *   • The vehicle must be currently `assigned` or `in_progress` on a request
 *     in the same organisation.
 *   • Vehicle must report live GPS in the last 30 minutes.
 *   • The vehicle's live position must be within `corridorKm` (default 5 km)
 *     of the new request's pickup point.
 *   • The vehicle's active-trip destination must be within `corridorKm`
 *     (default 8 km) of the new request's destination — meaning the existing
 *     route already heads roughly the same way.
 *   • The vehicle must have remaining seating capacity (active trip
 *     passengers + new request passengers ≤ seating_capacity, or capacity
 *     unknown).
 *
 * Returned matches include a `detour_km` heuristic estimate (extra km to
 * collect the new pickup vs continuing direct), driver name, plate, current
 * trip number, and a confidence score so the picker can rank them.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo/geofenceUtils";

export interface OnTheWayMatch {
  vehicle_id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  seating_capacity: number | null;
  remaining_seats: number | null;
  driver_id: string | null;
  driver_name: string | null;
  /** The active trip the vehicle is currently on. */
  current_request_id: string;
  current_request_number: string | null;
  current_destination: string | null;
  /** Live GPS to new request pickup. */
  km_to_pickup: number;
  /** Current trip destination to the new request destination. */
  km_dest_to_dest: number;
  /** Heuristic extra kilometres if we add the new pickup to the current trip. */
  detour_km: number;
  /** Higher = better match. Used to sort. */
  score: number;
}

interface Args {
  organizationId?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  passengers?: number | null;
  /** Corridor radius around pickup point, in km. */
  pickupCorridorKm?: number;
  /** Corridor radius around destination, in km. */
  destinationCorridorKm?: number;
  /** GPS freshness window — drop telemetry older than this many minutes. */
  staleMinutes?: number;
  enabled?: boolean;
}

export const useOnTheWayVehicles = ({
  organizationId,
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  passengers,
  pickupCorridorKm = 5,
  destinationCorridorKm = 8,
  staleMinutes = 30,
  enabled = true,
}: Args) => {
  return useQuery({
    queryKey: [
      "on-the-way-vehicles",
      organizationId,
      pickupLat,
      pickupLng,
      destinationLat,
      destinationLng,
      passengers,
      pickupCorridorKm,
      destinationCorridorKm,
      staleMinutes,
    ],
    enabled:
      enabled &&
      !!organizationId &&
      pickupLat != null &&
      pickupLng != null,
    staleTime: 20_000,
    queryFn: async (): Promise<OnTheWayMatch[]> => {
      // 1. Active trips for the org with assigned vehicles.
      const { data: activeTrips, error: tripErr } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, assigned_vehicle_id, assigned_driver_id, " +
            "destination, destination_lat, destination_lng, departure_lat, " +
            "departure_lng, passengers",
        )
        .eq("organization_id", organizationId!)
        .in("status", ["assigned", "in_progress", "checked_out"])
        .not("assigned_vehicle_id", "is", null)
        .is("deleted_at", null)
        .limit(500);
      if (tripErr) throw tripErr;
      if (!activeTrips || activeTrips.length === 0) return [];

      const vehicleIds = Array.from(
        new Set(activeTrips.map((t: any) => t.assigned_vehicle_id)),
      ) as string[];

      // 2. Vehicle metadata (plate, capacity).
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, seating_capacity")
        .in("id", vehicleIds);
      const vehicleMap = new Map<string, any>();
      (vehicles || []).forEach((v: any) => vehicleMap.set(v.id, v));

      // 3. Latest live telemetry — drop anything older than `staleMinutes`.
      const { data: tele } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, latitude, longitude, last_communication_at")
        .in("vehicle_id", vehicleIds);
      const cutoffMs = Date.now() - staleMinutes * 60_000;
      const teleMap = new Map<string, { lat: number; lng: number }>();
      (tele || []).forEach((t: any) => {
        if (t.latitude == null || t.longitude == null) return;
        const last = t.last_communication_at
          ? new Date(t.last_communication_at).getTime()
          : 0;
        if (last && last < cutoffMs) return;
        teleMap.set(t.vehicle_id, {
          lat: Number(t.latitude),
          lng: Number(t.longitude),
        });
      });

      // 4. Driver names for matched vehicles.
      const driverIds = Array.from(
        new Set(
          activeTrips
            .map((t: any) => t.assigned_driver_id)
            .filter(Boolean),
        ),
      ) as string[];
      const driverMap = new Map<string, string>();
      if (driverIds.length) {
        const { data: drv } = await supabase
          .from("drivers")
          .select("id, first_name, last_name")
          .in("id", driverIds);
        (drv || []).forEach((d: any) =>
          driverMap.set(
            d.id,
            `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Driver",
          ),
        );
      }

      const pickupPt = { lat: pickupLat!, lng: pickupLng! };
      const destPt =
        destinationLat != null && destinationLng != null
          ? { lat: destinationLat, lng: destinationLng }
          : null;

      const matches: OnTheWayMatch[] = [];
      // Track best match per vehicle (a vehicle could be on multiple legs;
      // take the most relevant one).
      const seen = new Map<string, OnTheWayMatch>();

      for (const trip of activeTrips as any[]) {
        const vehicle = vehicleMap.get(trip.assigned_vehicle_id);
        if (!vehicle) continue;
        const live = teleMap.get(trip.assigned_vehicle_id);
        if (!live) continue;

        // Pickup-corridor check.
        const kmToPickup = haversineKm(live, pickupPt);
        if (kmToPickup > pickupCorridorKm) continue;

        // Destination-corridor check (skip if request has no dest coords —
        // we still allow the match but with reduced confidence).
        const tripDest =
          trip.destination_lat != null && trip.destination_lng != null
            ? { lat: Number(trip.destination_lat), lng: Number(trip.destination_lng) }
            : null;
        let kmDestToDest = Infinity;
        if (destPt && tripDest) {
          kmDestToDest = haversineKm(tripDest, destPt);
          if (kmDestToDest > destinationCorridorKm) continue;
        } else if (destPt && !tripDest) {
          // Active trip has no destination coord — supervisor still benefits
          // from knowing the vehicle is near the pickup. Use a wide penalty.
          kmDestToDest = destinationCorridorKm;
        }

        // Capacity check.
        const cap = vehicle.seating_capacity ?? null;
        const tripPax = trip.passengers || 0;
        const newPax = passengers || 1;
        const remaining = cap != null ? cap - tripPax : null;
        if (remaining != null && remaining < newPax) continue;

        // Detour heuristic: if we deviate to pickup then to destination
        // instead of going direct from live → tripDest.
        const directKm = tripDest ? haversineKm(live, tripDest) : 0;
        const viaPickupKm =
          kmToPickup +
          (destPt ? haversineKm(pickupPt, destPt) : 0) +
          (destPt && tripDest ? Math.min(0, kmDestToDest) : 0);
        const detour = Math.max(0, viaPickupKm - directKm);

        // Score: closer pickup + closer dest = higher. Lower detour = higher.
        const score =
          1000 -
          kmToPickup * 50 -
          (kmDestToDest === Infinity ? 0 : kmDestToDest * 20) -
          detour * 10;

        const match: OnTheWayMatch = {
          vehicle_id: trip.assigned_vehicle_id,
          plate_number: vehicle.plate_number,
          make: vehicle.make ?? null,
          model: vehicle.model ?? null,
          seating_capacity: cap,
          remaining_seats: remaining,
          driver_id: trip.assigned_driver_id ?? null,
          driver_name: trip.assigned_driver_id
            ? driverMap.get(trip.assigned_driver_id) ?? null
            : null,
          current_request_id: trip.id,
          current_request_number: trip.request_number ?? null,
          current_destination: trip.destination ?? null,
          km_to_pickup: Number(kmToPickup.toFixed(2)),
          km_dest_to_dest:
            kmDestToDest === Infinity ? Number.NaN : Number(kmDestToDest.toFixed(2)),
          detour_km: Number(detour.toFixed(2)),
          score: Number(score.toFixed(1)),
        };

        const prev = seen.get(match.vehicle_id);
        if (!prev || prev.score < match.score) {
          seen.set(match.vehicle_id, match);
        }
      }

      seen.forEach((m) => matches.push(m));
      matches.sort((a, b) => b.score - a.score);
      return matches.slice(0, 8);
    },
  });
};
