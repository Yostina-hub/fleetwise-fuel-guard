/**
 * SharedRideMatchSuggestions
 * --------------------------
 * Tier-1 "Direct Match" suggestions surfaced inside the Vehicle Request form.
 * As soon as the requester has picked an origin, destination, departure
 * time, pool, and passenger count, this panel queries the
 * `find_direct_match_rides` RPC and offers them the chance to **join an
 * existing ride** instead of submitting a brand-new request.
 *
 * Joining a ride still creates a normal vehicle_request (so audit trail and
 * approval work) — the ride link is added immediately after submission via
 * `useJoinSharedRide`.
 */
import { useMemo, useState } from "react";
import {
  useFindSharedRides,
  useFindProximityRides,
  type SharedRideMatch,
  type SharedRideProximityMatch,
} from "@/hooks/useSharedRides";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Clock, Sparkles, ArrowRight, Route } from "lucide-react";
import { format } from "date-fns";
import { SharedRideMatchMap } from "./SharedRideMatchMap";

interface Props {
  poolCode: string | null;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  departureAt: Date | null;
  passengers: number;
  /** Called when the requester picks a ride. The form hands the ride id to
   *  the submit handler so it can join after insert. */
  onSelect: (ride: SharedRideMatch) => void;
  /** Currently chosen ride id, for visual selection state. */
  selectedRideId?: string | null;
}

export const SharedRideMatchSuggestions = ({
  poolCode,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  departureAt,
  passengers,
  onSelect,
  selectedRideId,
}: Props) => {
  const { data, isLoading } = useFindSharedRides({
    poolCode,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    departureAt,
    seatsNeeded: passengers,
  });
  const { data: proxData, isLoading: proxLoading } = useFindProximityRides({
    poolCode,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    departureAt,
    seatsNeeded: passengers,
  });

  const matches = useMemo(() => data ?? [], [data]);
  const proximityMatches = useMemo(() => proxData ?? [], [proxData]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Hide entirely until the form has enough data to query.
  if (!originLat || !destinationLat || !departureAt) return null;
  if (
    !isLoading &&
    !proxLoading &&
    matches.length === 0 &&
    proximityMatches.length === 0
  )
    return null;

  // For the SVG map: combine direct + proximity matches so all candidate
  // routes are visible at once. Proximity rides are flagged so the map can
  // (optionally) style them differently in a future iteration.
  const allMapPoints: SharedRideMatch[] = [
    ...matches,
    ...proximityMatches.map<SharedRideMatch>((p) => ({
      ride_id: p.ride_id,
      vehicle_id: p.vehicle_id,
      driver_id: p.driver_id,
      pool_code: p.pool_code,
      origin_label: p.origin_label,
      destination_label: p.destination_label,
      departure_at: p.departure_at,
      available_seats: p.available_seats,
      total_seats: p.total_seats,
      origin_lat: p.origin_lat,
      origin_lng: p.origin_lng,
      destination_lat: p.destination_lat,
      destination_lng: p.destination_lng,
      origin_distance_km: p.detour_km,
      destination_distance_km: p.destination_distance_km,
      time_delta_minutes: p.time_delta_minutes,
      match_score: p.match_score,
    })),
  ];

  const totalCount = matches.length + proximityMatches.length;
  const corridorKm = proximityMatches[0]?.corridor_km_used;

  // Adapt a proximity match into the SharedRideMatch shape used by onSelect.
  // (the join mutation only needs ride_id and labels, both of which are present)
  const proxAsMatch = (p: SharedRideProximityMatch): SharedRideMatch => ({
    ride_id: p.ride_id,
    vehicle_id: p.vehicle_id,
    driver_id: p.driver_id,
    pool_code: p.pool_code,
    origin_label: p.origin_label,
    destination_label: p.destination_label,
    departure_at: p.departure_at,
    available_seats: p.available_seats,
    total_seats: p.total_seats,
    origin_lat: p.origin_lat,
    origin_lng: p.origin_lng,
    destination_lat: p.destination_lat,
    destination_lng: p.destination_lng,
    origin_distance_km: p.detour_km,
    destination_distance_km: p.destination_distance_km,
    time_delta_minutes: p.time_delta_minutes,
    match_score: p.match_score,
  });

  return (
    <Card className="p-3 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">
          {isLoading || proxLoading
            ? "Looking for shared rides…"
            : `${totalCount} shared ride${totalCount === 1 ? "" : "s"} match your trip`}
        </span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          ±10 min wait window
        </Badge>
      </div>

      {allMapPoints.length > 0 && originLng != null && destinationLng != null && (
        <div className="mb-2">
          <SharedRideMatchMap
            matches={allMapPoints}
            reqOriginLat={originLat}
            reqOriginLng={originLng}
            reqDestLat={destinationLat}
            reqDestLng={destinationLng}
            selectedRideId={hoveredId ?? selectedRideId ?? null}
            onHover={setHoveredId}
            onSelect={(rideId) => {
              const direct = matches.find((x) => x.ride_id === rideId);
              if (direct) return onSelect(direct);
              const prox = proximityMatches.find((x) => x.ride_id === rideId);
              if (prox) onSelect(proxAsMatch(prox));
            }}
          />
        </div>
      )}

      {/* Tier-1: Direct matches */}
      {matches.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Direct matches
          </div>
          <div className="space-y-2">
            {matches.map((m) => {
              const minutesEarly = Math.round(m.time_delta_minutes);
              const isSelected = selectedRideId === m.ride_id;
              return (
                <button
                  key={m.ride_id}
                  type="button"
                  onClick={() => onSelect(m)}
                  className={`w-full text-left rounded-md border p-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate">{m.origin_label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate">{m.destination_label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(m.departure_at), "MMM d, HH:mm")}
                      {minutesEarly !== 0 && (
                        <span className="text-primary">
                          ({minutesEarly > 0 ? "+" : ""}
                          {minutesEarly} min)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {m.available_seats}/{m.total_seats} seats
                    </span>
                    <span>
                      Pickup ~{m.origin_distance_km.toFixed(1)} km · Dropoff ~
                      {m.destination_distance_km.toFixed(1)} km
                    </span>
                    {m.pool_code && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {m.pool_code}
                      </Badge>
                    )}
                  </div>
                  {isSelected && (
                    <div className="mt-1 text-xs text-primary font-medium">
                      ✓ Selected — your request will join this ride
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Tier-2: Rides passing through */}
      {proximityMatches.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-3 mb-1 flex items-center gap-1">
            <Route className="w-3 h-3" />
            Rides passing through
            {corridorKm != null && (
              <span className="text-muted-foreground/70 normal-case">
                · within {Number(corridorKm).toFixed(1)} km of route
              </span>
            )}
          </div>
          <div className="space-y-2">
            {proximityMatches.map((p) => {
              const minutesEarly = Math.round(p.time_delta_minutes);
              const isSelected = selectedRideId === p.ride_id;
              return (
                <button
                  key={p.ride_id}
                  type="button"
                  onClick={() => onSelect(proxAsMatch(p))}
                  className={`w-full text-left rounded-md border p-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Route className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate">{p.origin_label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate">{p.destination_label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(p.departure_at), "MMM d, HH:mm")}
                      {minutesEarly !== 0 && (
                        <span className="text-primary">
                          ({minutesEarly > 0 ? "+" : ""}
                          {minutesEarly} min)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {p.available_seats}/{p.total_seats} seats
                    </span>
                    <span>
                      Driver detour ~{p.detour_km.toFixed(1)} km · Dropoff ~
                      {p.destination_distance_km.toFixed(1)} km
                    </span>
                    {p.pool_code && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {p.pool_code}
                      </Badge>
                    )}
                  </div>
                  {isSelected && (
                    <div className="mt-1 text-xs text-primary font-medium">
                      ✓ Selected — driver will detour to pick you up
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-2 text-[11px] text-muted-foreground">
        Or continue without joining — we'll create a brand-new trip for you.
      </div>
    </Card>
  );
};

export default SharedRideMatchSuggestions;
