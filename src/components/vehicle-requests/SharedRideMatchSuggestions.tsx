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

  const matches = useMemo(() => data ?? [], [data]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Hide entirely until the form has enough data to query.
  if (!originLat || !destinationLat || !departureAt) return null;
  if (!isLoading && matches.length === 0) return null;

  return (
    <Card className="p-3 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">
          {isLoading
            ? "Looking for shared rides…"
            : `${matches.length} shared ride${matches.length === 1 ? "" : "s"} match your trip`}
        </span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          ±10 min wait window
        </Badge>
      </div>

      {matches.length > 0 && originLng != null && destinationLng != null && (
        <div className="mb-2">
          <SharedRideMatchMap
            matches={matches}
            reqOriginLat={originLat}
            reqOriginLng={originLng}
            reqDestLat={destinationLat}
            reqDestLng={destinationLng}
            selectedRideId={hoveredId ?? selectedRideId ?? null}
            onHover={setHoveredId}
            onSelect={(rideId) => {
              const m = matches.find((x) => x.ride_id === rideId);
              if (m) onSelect(m);
            }}
          />
        </div>
      )}

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
      <div className="mt-2 text-[11px] text-muted-foreground">
        Or continue without joining — we'll create a brand-new trip for you.
      </div>
    </Card>
  );
};

export default SharedRideMatchSuggestions;
