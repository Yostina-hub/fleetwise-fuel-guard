/**
 * RequestRouteMapCard
 * --------------------
 * Compact, reusable route preview shown inside every vehicle-request
 * assignment dialog (Quick Assign, Vehicle+Driver Assign, Multi-Vehicle,
 * Cross-Pool). Provides operators the same spatial context that was
 * previously only visible for consolidated parent trips.
 *
 * Pure presentational — receives a request-like object and renders the
 * existing RouteMapPreview. Hides itself gracefully when neither
 * coordinates nor place text are present.
 */
import { Navigation } from "lucide-react";
import { RouteMapPreview } from "./RouteMapPreview";

interface RequestLike {
  departure_place?: string | null;
  departure_lat?: number | null;
  departure_lng?: number | null;
  destination?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  pool_location?: string | null;
}

interface Props {
  request: RequestLike | null | undefined;
  heightPx?: number;
  className?: string;
}

export const RequestRouteMapCard = ({ request, heightPx = 200, className }: Props) => {
  if (!request) return null;

  const departureLat = request.departure_lat ?? null;
  const departureLng = request.departure_lng ?? null;
  const destinationLat = request.destination_lat ?? null;
  const destinationLng = request.destination_lng ?? null;
  const departurePlace = request.departure_place || request.pool_location || null;
  const destinationPlace = request.destination || null;

  const hasOrigin = (departureLat != null && departureLng != null) || !!departurePlace;
  const hasDest = (destinationLat != null && destinationLng != null) || !!destinationPlace;

  if (!hasOrigin && !hasDest) return null;

  return (
    <div className={`rounded-lg border overflow-hidden bg-card ${className ?? ""}`}>
      <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
        <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold">Trip Route</span>
        <span className="text-[11px] text-muted-foreground ml-auto truncate min-w-0">
          {departurePlace || "Start"} → {destinationPlace || "Destination"}
        </span>
      </div>
      <RouteMapPreview
        departure={{
          lat: departureLat,
          lng: departureLng,
          label: departurePlace || "Start",
        }}
        destination={{
          lat: destinationLat,
          lng: destinationLng,
          label: destinationPlace || "Destination",
        }}
        heightPx={heightPx}
      />
    </div>
  );
};
