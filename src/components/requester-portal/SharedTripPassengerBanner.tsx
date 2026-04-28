/**
 * SharedTripPassengerBanner
 * -------------------------
 * Surfaces shared-trip activity for the signed-in PASSENGER on the Requester
 * Portal. Specifically, it watches the global `notifications` feed for two
 * kinds emitted by the `notify_driver_on_passenger_added` trigger:
 *
 *   - `shared_trip_joined`              → "Your trip was merged into a shared ride"
 *   - `shared_trip_co_passenger_added`  → "A new co-passenger joined your trip"
 *
 * Each unread item gets a compact banner with an action to open the route
 * map (SharedTripPassengerMapDialog) and a one-click dismiss that marks the
 * notification read. The map highlights the relevant pickup so the passenger
 * sees exactly what changed without hunting through the trip list.
 */
import { useMemo, useState } from "react";
import { UserPlus, Users, MapPin, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import SharedTripPassengerMapDialog from "./SharedTripPassengerMapDialog";

const SHARED_KINDS = new Set([
  "shared_trip_joined",
  "shared_trip_co_passenger_added",
]);

interface MapPayload {
  shared_ride_id: string;
  highlight_passenger_id?: string | null;
  fallback_pickup?: { lat: number | null; lng: number | null; label: string | null } | null;
  fallback_dropoff?: { lat: number | null; lng: number | null; label: string | null } | null;
}

export default function SharedTripPassengerBanner() {
  const { notifications, markAsRead } = useNotifications();
  const [openMap, setOpenMap] = useState<MapPayload | null>(null);

  const unread = useMemo(
    () =>
      (notifications ?? []).filter(
        (n: any) => SHARED_KINDS.has(n.type) && !n.is_read,
      ),
    [notifications],
  );

  const top = unread[0];
  if (!top) return null;

  const meta = (top.metadata ?? {}) as Record<string, any>;
  const isJoined = top.type === "shared_trip_joined";

  const openMapForTop = () => {
    const isCo = top.type === "shared_trip_co_passenger_added";
    setOpenMap({
      shared_ride_id: meta.shared_ride_id,
      highlight_passenger_id: isCo
        ? meta.new_passenger_id ?? null
        : meta.passenger_id ?? null,
      fallback_pickup: isCo
        ? { lat: meta.new_pickup_lat, lng: meta.new_pickup_lng, label: meta.new_pickup_label }
        : { lat: meta.pickup_lat, lng: meta.pickup_lng, label: meta.pickup_label },
      fallback_dropoff: isCo
        ? null
        : { lat: meta.dropoff_lat, lng: meta.dropoff_lng, label: meta.dropoff_label },
    });
  };

  return (
    <>
      <div
        className="rounded-lg border border-primary/25 bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent px-4 py-3 mb-2"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            {isJoined ? (
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
            ) : (
              <UserPlus className="w-4 h-4 text-primary" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{top.title}</p>
              {unread.length > 1 && (
                <span className="text-[10px] rounded-full bg-primary/15 text-primary px-2 py-0.5">
                  +{unread.length - 1} more
                </span>
              )}
            </div>
            {top.message && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {top.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1"
              onClick={openMapForTop}
              disabled={!meta.shared_ride_id}
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              View map
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => markAsRead.mutate(top.id)}
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <SharedTripPassengerMapDialog
        open={!!openMap}
        onOpenChange={(o) => {
          if (!o) {
            // Mark this notification read when the user closes the map — they
            // have now consumed the information.
            if (top?.id && !top.is_read) markAsRead.mutate(top.id);
            setOpenMap(null);
          }
        }}
        sharedRideId={openMap?.shared_ride_id ?? null}
        highlightPassengerId={openMap?.highlight_passenger_id ?? null}
        fallbackPickup={openMap?.fallback_pickup ?? null}
        fallbackDropoff={openMap?.fallback_dropoff ?? null}
      />
    </>
  );
}
