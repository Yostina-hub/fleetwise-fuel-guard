import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertCircle, Clock, Navigation, Route as RouteIcon, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RouteMapPreview } from "@/components/vehicle-requests/RouteMapPreview";

export interface TripOverviewItem {
  id: string;
  request_number: string | null;
  status: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_place: string | null;
  destination: string | null;
  driver_checked_in_at: string | null;
  driver_checked_out_at: string | null;
  needed_from: string | null;
  needed_until: string | null;
  driver_checkin_odometer: number | null;
  driver_checkout_odometer: number | null;
  driver_name: string | null;
}

interface TripOverviewMapProps {
  trips: TripOverviewItem[];
  vehiclePlate?: string | null;
  selectedDateLabel: string;
}

export const TripOverviewMap = ({ trips, vehiclePlate, selectedDateLabel }: TripOverviewMapProps) => {
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id ?? "");

  useEffect(() => {
    if (!trips.some((trip) => trip.id === selectedTripId)) {
      setSelectedTripId(trips[0]?.id ?? "");
    }
  }, [trips, selectedTripId]);

  const trip = useMemo(
    () => trips.find((item) => item.id === selectedTripId) ?? trips[0] ?? null,
    [trips, selectedTripId],
  );

  if (!trip) return null;

  const startTs = trip.driver_checked_in_at || trip.needed_from;
  const endTs = trip.driver_checked_out_at || trip.needed_until;
  const distanceKm =
    trip.driver_checkin_odometer != null && trip.driver_checkout_odometer != null
      ? Math.max(0, Number(trip.driver_checkout_odometer) - Number(trip.driver_checkin_odometer))
      : null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-foreground">
            <AlertCircle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold">Trip overview</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            No GPS telemetry for {selectedDateLabel}
            {vehiclePlate ? <span className="text-foreground"> · {vehiclePlate}</span> : null}
          </p>
        </div>

        {trips.length > 1 && (
          <Select value={selectedTripId} onValueChange={setSelectedTripId}>
            <SelectTrigger className="h-9 w-[210px] text-xs">
              <SelectValue placeholder="Select trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((item, index) => (
                <SelectItem key={item.id} value={item.id} className="text-xs">
                  #{index + 1} · {item.request_number || item.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="relative flex-1 min-h-0">
        <RouteMapPreview
          departure={{
            lat: trip.departure_lat,
            lng: trip.departure_lng,
            label: trip.departure_place || "Start",
          }}
          destination={{
            lat: trip.destination_lat,
            lng: trip.destination_lng,
            label: trip.destination || "Destination",
          }}
          heightPx={560}
        />

        <Card className="absolute bottom-4 left-4 right-4 border-border/80 bg-card/95 shadow-lg backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="gap-1 font-mono">
                <Navigation className="h-3 w-3" />
                {trip.request_number || "Trip"}
              </Badge>
              <Badge variant={trip.status === "completed" ? "default" : "secondary"} className="capitalize">
                {String(trip.status || "scheduled").replace(/_/g, " ")}
              </Badge>
              {trip.driver_name && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {trip.driver_name}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <p className="text-[11px] text-muted-foreground">Start</p>
                <p className="text-sm font-medium truncate">{trip.departure_place || "—"}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {startTs ? format(parseISO(startTs), "HH:mm") : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">End</p>
                <p className="text-sm font-medium truncate">{trip.destination || "—"}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {endTs ? format(parseISO(endTs), "HH:mm") : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Distance</p>
                <p className="text-sm font-medium">{distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Availability</p>
                <p className="text-sm font-medium">
                  {trip.departure_lat != null && trip.departure_lng != null && trip.destination_lat != null && trip.destination_lng != null
                    ? "Route visible"
                    : "Missing coordinates"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TripOverviewMap;
