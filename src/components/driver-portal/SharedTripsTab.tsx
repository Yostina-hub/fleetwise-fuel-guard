/**
 * SharedTripsTab — Driver Portal
 * -------------------------------
 * Shows the driver their active shared rides + per-passenger pickup/dropoff
 * status with check-in / check-out actions. Real-time refresh every 30 s.
 *
 * Also surfaces a real-time passenger-added alert: when a dispatcher joins
 * a passenger to one of the driver's rides, the trigger
 * `notify_driver_on_passenger_added` inserts a `passenger_added` row into
 * `driver_notifications`. This tab listens to that channel, pops a Sonner
 * toast, and lets the driver open the pickup map with one click.
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useDriverSharedRides,
  useUpdatePassengerStatus,
} from "@/hooks/useSharedRides";
import { useCurrentDriverId } from "@/hooks/useCurrentDriverId";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Map as MapIcon,
  MapPin,
  Users,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import PassengerPickupMapDialog from "./PassengerPickupMapDialog";

interface Passenger {
  id: string;
  vehicle_request_id: string;
  passenger_user_id: string | null;
  pickup_label: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_label: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  seats: number;
  status: "reserved" | "boarded" | "dropped_off" | "no_show" | "cancelled";
  boarded_at: string | null;
  dropped_off_at: string | null;
  created_at?: string | null;
}

const statusBadge = (status: Passenger["status"]) => {
  switch (status) {
    case "boarded":
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">On board</Badge>;
    case "dropped_off":
      return <Badge variant="secondary">Dropped off</Badge>;
    case "no_show":
      return <Badge variant="destructive">No show</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">Waiting</Badge>;
  }
};

interface MapState {
  ride: any | null;
  highlightPassengerId: string | null;
  fallbackPickup: { lat: number | null; lng: number | null; label: string | null } | null;
  fallbackDropoff: { lat: number | null; lng: number | null; label: string | null } | null;
}

export const SharedTripsTab = () => {
  const { data: rides = [], isLoading, refetch } = useDriverSharedRides();
  const updateStatus = useUpdatePassengerStatus();
  const driverId = useCurrentDriverId();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mapState, setMapState] = useState<MapState>({
    ride: null,
    highlightPassengerId: null,
    fallbackPickup: null,
    fallbackDropoff: null,
  });

  // Track which passenger ids we've already alerted about so a re-render
  // (or a reconnect) doesn't spam toasts. Persists in-memory per session.
  const alertedRef = useRef<Set<string>>(new Set());

  /**
   * Realtime subscription on driver_notifications scoped to this driver.
   * Only `passenger_added` rows trigger the alert + map shortcut here; the
   * notification bell still handles the general inbox.
   */
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`driver-passenger-alerts:${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_notifications",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const n: any = payload.new;
          if (n?.kind !== "passenger_added") return;
          const pid = n.payload?.passenger_id;
          if (pid && alertedRef.current.has(pid)) return;
          if (pid) alertedRef.current.add(pid);

          // Refresh ride list so the new passenger row appears.
          refetch();

          toast(
            n.payload?.passenger_name
              ? `New passenger: ${n.payload.passenger_name}`
              : "New passenger added to your shared trip",
            {
              description: n.payload?.pickup_label
                ? `Pickup: ${n.payload.pickup_label}`
                : "Tap to view pickup location.",
              duration: 12_000,
              action: {
                label: "View map",
                onClick: () => {
                  const ride = (rides as any[]).find(
                    (r) => r.id === n.payload?.shared_ride_id,
                  );
                  setMapState({
                    ride: ride ?? {
                      id: n.payload?.shared_ride_id,
                      origin_label: n.payload?.origin_label || "Trip start",
                      destination_label: n.payload?.destination_label || "Trip end",
                      shared_ride_passengers: [],
                    },
                    highlightPassengerId: pid ?? null,
                    fallbackPickup: {
                      lat: n.payload?.pickup_lat ?? null,
                      lng: n.payload?.pickup_lng ?? null,
                      label: n.payload?.pickup_label ?? null,
                    },
                    fallbackDropoff: {
                      lat: n.payload?.dropoff_lat ?? null,
                      lng: n.payload?.dropoff_lng ?? null,
                      label: n.payload?.dropoff_label ?? null,
                    },
                  });
                },
              },
            },
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, rides]);

  /**
   * Deep-link support: the notification bell links to
   * `/driver-portal?tab=shared&ride=<id>`. Auto-open the map when that param
   * is present and matches a loaded ride.
   */
  useEffect(() => {
    const rideParam = searchParams.get("ride");
    if (!rideParam) return;
    const ride = (rides as any[]).find((r) => r.id === rideParam);
    if (ride) {
      setMapState({
        ride,
        highlightPassengerId: null,
        fallbackPickup: null,
        fallbackDropoff: null,
      });
      // Strip the param so we don't re-open on every render.
      const next = new URLSearchParams(searchParams);
      next.delete("ride");
      setSearchParams(next, { replace: true });
    }
  }, [rides, searchParams, setSearchParams]);

  const openRideMap = (ride: any, highlightPassengerId: string | null = null) =>
    setMapState({
      ride,
      highlightPassengerId,
      fallbackPickup: null,
      fallbackDropoff: null,
    });

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Loading your shared trips…
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No active shared trips. When a dispatcher assigns you a multi-passenger ride it will show up here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rides.map((ride: any) => {
        const passengers: Passenger[] = ride.shared_ride_passengers ?? [];
        return (
          <Card key={ride.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="truncate">{ride.origin_label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate">{ride.destination_label}</span>
                <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                  {ride.status}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(ride.departure_at), "MMM d, HH:mm")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {ride.available_seats}/{ride.total_seats} seats free
                </span>
                {ride.pool_code && (
                  <Badge variant="secondary" className="text-[10px]">
                    {ride.pool_code}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {passengers.length === 0 ? (
                <div className="text-xs text-muted-foreground">No passengers yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {passengers.map((p) => (
                    <li
                      key={p.id}
                      className="py-2 flex items-center gap-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Request {p.vehicle_request_id.slice(0, 8)}
                          </span>
                          {statusBadge(p.status)}
                          <span className="text-xs text-muted-foreground">
                            {p.seats} seat{p.seats === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Pickup: {p.pickup_label || "—"} → Dropoff:{" "}
                          {p.dropoff_label || ride.destination_label}
                        </div>
                      </div>
                      {p.status === "reserved" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                passengerId: p.id,
                                status: "boarded",
                              })
                            }
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            Check in
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                passengerId: p.id,
                                status: "no_show",
                              })
                            }
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {p.status === "boarded" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              passengerId: p.id,
                              status: "dropped_off",
                            })
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Drop off
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SharedTripsTab;
