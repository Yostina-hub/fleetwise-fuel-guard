import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Droplet, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FuelEvent {
  id: string;
  vehicle_id: string;
  event_type: string;
  event_time: string;
  fuel_change_liters: number;
  fuel_change_percent: number;
  location_name?: string | null;
  status?: string | null;
}

interface FuelEventsListViewProps {
  events: FuelEvent[];
  getVehiclePlate: (vehicleId: string) => string;
  formatFuel: (liters: number) => string;
  onViewEvent?: (event: FuelEvent) => void;
  onInvestigate?: (eventId: string) => void;
  onMarkFalsePositive?: (eventId: string) => void;
}

const FuelEventsListView = ({
  events,
  getVehiclePlate,
  formatFuel,
  onViewEvent,
  onInvestigate,
  onMarkFalsePositive,
}: FuelEventsListViewProps) => {
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "refuel":
        return <Droplet className="w-4 h-4 text-success" />;
      case "theft":
      case "drain":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case "leak":
        return <Droplet className="w-4 h-4 text-warning" />;
      default:
        return <Droplet className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-success/10 text-success border-success/20 gap-1">
            <CheckCircle className="w-3 h-3" />
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "investigating":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            Investigating
          </Badge>
        );
      case "false_positive":
        return <Badge variant="secondary">False Positive</Badge>;
      default:
        return null;
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "refuel":
        return <Badge className="bg-success/10 text-success border-success/20">Refuel</Badge>;
      case "theft":
        return <Badge variant="destructive">Theft</Badge>;
      case "leak":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Leak</Badge>;
      case "drain":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Drain</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Droplet className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No fuel events found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[60px_1fr_1fr_140px_120px_1fr_80px] gap-4 px-4 py-3 bg-primary/10 text-foreground text-xs font-semibold uppercase tracking-wider">
        <div>SN</div>
        <div>Vehicle</div>
        <div>Event Type</div>
        <div>Status</div>
        <div className="text-right">Fuel Change</div>
        <div>Location</div>
        <div className="text-center">Action</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={cn(
              "grid grid-cols-[60px_1fr_1fr_140px_120px_1fr_80px] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors",
              (event.event_type === "theft" || event.event_type === "drain") &&
                "bg-destructive/5 hover:bg-destructive/10"
            )}
          >
            {/* SN */}
            <div className="text-sm text-muted-foreground">{index + 1}</div>

            {/* Vehicle */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  event.event_type === "refuel"
                    ? "bg-success/10"
                    : event.event_type === "theft" || event.event_type === "drain"
                    ? "bg-destructive/10"
                    : "bg-warning/10"
                )}
              >
                {getEventTypeIcon(event.event_type)}
              </div>
              <div>
                <div className="font-semibold">{getVehiclePlate(event.vehicle_id)}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(event.event_time), "dd MMM, HH:mm")}
                </div>
              </div>
            </div>

            {/* Event Type */}
            <div>{getEventTypeBadge(event.event_type)}</div>

            {/* Status */}
            <div>{getStatusBadge(event.status)}</div>

            {/* Fuel Change */}
            <div className="text-right">
              <div
                className={cn(
                  "font-bold",
                  event.fuel_change_liters > 0 ? "text-success" : "text-destructive"
                )}
              >
                {event.fuel_change_liters > 0 ? "+" : ""}
                {formatFuel(event.fuel_change_liters)}
              </div>
              <div className="text-xs text-muted-foreground">
                {event.fuel_change_percent > 0 ? "+" : ""}
                {event.fuel_change_percent.toFixed(1)}%
              </div>
            </div>

            {/* Location */}
            <div className="text-sm text-muted-foreground truncate" title={event.location_name || "No location"}>
              {event.location_name || "No location"}
            </div>

            {/* Action */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewEvent?.(event)}
                aria-label="View event details"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FuelEventsListView;
