/**
 * RequestRouteMapCard
 * --------------------
 * Compact, reusable route preview shown inside every vehicle-request
 * assignment dialog (Quick Assign, Vehicle+Driver Assign, Multi-Vehicle,
 * Cross-Pool). Provides operators the same spatial context that was
 * previously only visible for consolidated parent trips.
 *
 * Also overlays the organisation's active geofences so dispatchers can see
 * at a glance whether the pickup/destination fall inside an operational
 * zone — matching the warning shown by the assignment validation.
 */
import { Navigation, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RouteMapPreview, type GeofenceOverlay } from "./RouteMapPreview";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

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
  /** Hide geofence overlays (defaults to false — they show by default). */
  hideGeofences?: boolean;
}

export const RequestRouteMapCard = ({ request, heightPx = 200, className, hideGeofences = false }: Props) => {
  const { effectiveOrganizationId } = useOrganizationContext();

  const { data: geofences = [] } = useQuery({
    queryKey: ["assign-route-geofences", effectiveOrganizationId],
    enabled: !hideGeofences && !!effectiveOrganizationId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GeofenceOverlay[]> => {
      const { data, error } = await (supabase as any)
        .from("geofences")
        .select("id, name, geometry_type, center_lat, center_lng, radius_meters, polygon_points, is_active")
        .eq("organization_id", effectiveOrganizationId!)
        .eq("is_active", true);
      if (error) return [];
      return (data || []) as GeofenceOverlay[];
    },
  });

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
        {!hideGeofences && geofences.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded-full px-1.5 py-0.5">
            <Layers className="w-3 h-3" />
            {geofences.length} zone{geofences.length === 1 ? "" : "s"}
          </span>
        )}
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
        geofences={hideGeofences ? [] : geofences}
      />
    </div>
  );
};
