/**
 * SharedTripPassengerMapDialog
 * ----------------------------
 * Passenger-side map view of a shared ride. Loads the ride + every
 * (non-cancelled) passenger pickup, then renders the route via the existing
 * RouteMapPreview. The pickup matching `highlightPassengerId` (e.g. the just-
 * added co-passenger from the inbox notification) is rendered in amber and
 * called out in the legend so the rider can see at a glance how the route
 * changed.
 *
 * Falls back to the notification payload's coordinates if the ride row hasn't
 * propagated to the client yet (race with the realtime trigger).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, UserPlus, Loader2 } from "lucide-react";
import { RouteMapPreview, type RoutePoint } from "@/components/vehicle-requests/RouteMapPreview";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sharedRideId: string | null;
  highlightPassengerId?: string | null;
  fallbackPickup?: { lat: number | null; lng: number | null; label: string | null } | null;
  fallbackDropoff?: { lat: number | null; lng: number | null; label: string | null } | null;
}

export default function SharedTripPassengerMapDialog({
  open,
  onOpenChange,
  sharedRideId,
  highlightPassengerId,
  fallbackPickup,
  fallbackDropoff,
}: Props) {
  const { data: ride, isLoading } = useQuery({
    queryKey: ["shared-trip-passenger-map", sharedRideId],
    enabled: open && !!sharedRideId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shared_rides")
        .select(
          `id, origin_label, destination_label,
           origin_lat, origin_lng, destination_lat, destination_lng,
           shared_ride_passengers (
             id, status, pickup_label, pickup_lat, pickup_lng,
             dropoff_label, dropoff_lat, dropoff_lng, seats
           )`,
        )
        .eq("id", sharedRideId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const passengers = (ride?.shared_ride_passengers ?? []).filter(
    (p: any) => p.status !== "cancelled" && p.status !== "no_show",
  );

  const pickupStops: (RoutePoint & { highlight?: boolean })[] = passengers
    .filter((p: any) => p.pickup_lat != null && p.pickup_lng != null)
    .map((p: any) => ({
      lat: p.pickup_lat,
      lng: p.pickup_lng,
      label: p.pickup_label || "Passenger pickup",
      highlight: p.id === highlightPassengerId,
    }));

  // Race: highlighted passenger not yet in the loaded ride — splice in payload
  if (
    highlightPassengerId &&
    fallbackPickup?.lat != null &&
    fallbackPickup?.lng != null &&
    !pickupStops.some((s) => s.highlight)
  ) {
    pickupStops.unshift({
      lat: fallbackPickup.lat,
      lng: fallbackPickup.lng,
      label: fallbackPickup.label || "New pickup",
      highlight: true,
    });
  }

  const departure =
    ride?.origin_lat != null && ride?.origin_lng != null
      ? { lat: ride.origin_lat, lng: ride.origin_lng, label: ride.origin_label }
      : { lat: null, lng: null, label: ride?.origin_label || "Start" };

  const destination =
    ride?.destination_lat != null && ride?.destination_lng != null
      ? { lat: ride.destination_lat, lng: ride.destination_lng, label: ride.destination_label }
      : fallbackDropoff?.lat != null && fallbackDropoff?.lng != null
        ? {
            lat: fallbackDropoff.lat,
            lng: fallbackDropoff.lng,
            label: fallbackDropoff.label || "Drop-off",
          }
        : { lat: null, lng: null, label: ride?.destination_label || "End" };

  const highlighted = pickupStops.find((s) => s.highlight);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Shared trip route
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {ride && (
              <span className="text-xs">
                {ride.origin_label} → {ride.destination_label}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px]">
              <Users className="w-3 h-3 mr-1" />
              {pickupStops.length} pickup{pickupStops.length === 1 ? "" : "s"}
            </Badge>
            {highlighted && (
              <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border border-amber-500/30">
                <UserPlus className="w-3 h-3 mr-1" />
                New: {highlighted.label}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          <RouteMapPreview
            departure={departure}
            destination={destination}
            stops={pickupStops.map(({ highlight, ...rest }) => rest)}
            heightPx={420}
          />
        </div>

        {pickupStops.length > 0 && (
          <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {pickupStops.map((s, i) => (
              <li
                key={`${s.lat}:${s.lng}:${i}`}
                className={`flex items-start gap-2 text-xs rounded-md border px-2 py-1.5 ${
                  s.highlight
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    s.highlight
                      ? "bg-amber-500 text-white"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 truncate">{s.label}</span>
                {s.highlight && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    New
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
