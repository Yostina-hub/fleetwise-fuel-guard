/**
 * SharedTripsTab — Driver Portal
 * -------------------------------
 * Shows the driver their active shared rides + per-passenger pickup/dropoff
 * status with check-in / check-out actions. Real-time refresh every 30 s.
 */
import {
  useDriverSharedRides,
  useUpdatePassengerStatus,
} from "@/hooks/useSharedRides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

interface Passenger {
  id: string;
  vehicle_request_id: string;
  passenger_user_id: string | null;
  pickup_label: string | null;
  dropoff_label: string | null;
  seats: number;
  status: "reserved" | "boarded" | "dropped_off" | "no_show" | "cancelled";
  boarded_at: string | null;
  dropped_off_at: string | null;
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

export const SharedTripsTab = () => {
  const { data: rides = [], isLoading } = useDriverSharedRides();
  const updateStatus = useUpdatePassengerStatus();

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
