/**
 * PassengerPickupMapDialog — driver-side map view of a shared ride.
 *
 * Shows the trip origin (green) → destination (red) with every passenger's
 * pickup location as a numbered amber stop. When `highlightPassengerId` is
 * set (e.g. the just-added passenger from a `passenger_added` notification),
 * that pickup is rendered first so the driver immediately sees where to go.
 *
 * Reuses the existing RouteMapPreview to keep visual parity with the
 * dispatcher tooling.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, UserPlus, Users } from "lucide-react";
import { RouteMapPreview, type RoutePoint } from "@/components/vehicle-requests/RouteMapPreview";

interface RidePassenger {
  id: string;
  pickup_label: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_label: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  status: string;
  seats: number;
}

interface RideShape {
  id: string;
  origin_label: string;
  destination_label: string;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  shared_ride_passengers?: RidePassenger[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ride: RideShape | null;
  highlightPassengerId?: string | null;
  /** When opened directly from a notification with no DB row yet, optional fallback pickup. */
  fallbackPickup?: { lat: number | null; lng: number | null; label: string | null } | null;
  fallbackDropoff?: { lat: number | null; lng: number | null; label: string | null } | null;
}

export default function PassengerPickupMapDialog({
  open,
  onOpenChange,
  ride,
  highlightPassengerId,
  fallbackPickup,
  fallbackDropoff,
}: Props) {
  const passengers = ride?.shared_ride_passengers ?? [];

  // Build numbered stops out of every passenger pickup (skip cancelled/no-show).
  const pickupStops: (RoutePoint & { highlight?: boolean })[] = passengers
    .filter(
      (p) =>
        p.pickup_lat != null &&
        p.pickup_lng != null &&
        p.status !== "cancelled" &&
        p.status !== "no_show",
    )
    .map((p) => ({
      lat: p.pickup_lat,
      lng: p.pickup_lng,
      label: p.pickup_label || "Passenger pickup",
      highlight: p.id === highlightPassengerId,
    }));

  // If the highlighted passenger isn't in the loaded ride yet (race with the
  // realtime trigger), use the notification payload coords so the map still
  // renders something useful immediately.
  if (
    highlightPassengerId &&
    fallbackPickup?.lat != null &&
    fallbackPickup?.lng != null &&
    !pickupStops.some((s) => s.highlight)
  ) {
    pickupStops.unshift({
      lat: fallbackPickup.lat,
      lng: fallbackPickup.lng,
      label: fallbackPickup.label || "New passenger pickup",
      highlight: true,
    });
  }

  const departure = ride?.origin_lat != null && ride?.origin_lng != null
    ? { lat: ride.origin_lat, lng: ride.origin_lng, label: ride.origin_label }
    : { lat: null, lng: null, label: ride?.origin_label || "Start" };

  const destination = ride?.destination_lat != null && ride?.destination_lng != null
    ? { lat: ride.destination_lat, lng: ride.destination_lng, label: ride.destination_label }
    : fallbackDropoff?.lat != null && fallbackDropoff?.lng != null
      ? { lat: fallbackDropoff.lat, lng: fallbackDropoff.lng, label: fallbackDropoff.label || "Drop-off" }
      : { lat: null, lng: null, label: ride?.destination_label || "End" };

  const highlightedLabel = pickupStops.find((s) => s.highlight)?.label;

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
            {highlightedLabel && (
              <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border border-amber-500/30">
                <UserPlus className="w-3 h-3 mr-1" />
                New: {highlightedLabel}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden">
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
