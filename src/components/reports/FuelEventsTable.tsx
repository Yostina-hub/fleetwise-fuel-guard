import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FuelEvent {
  id: string;
  event_time: string;
  event_type: string;
  fuel_before_liters?: number;
  fuel_after_liters?: number;
  fuel_change_liters?: number;
  lat?: number;
  lng?: number;
  vehicle?: { plate_number: string } | null;
}

interface FuelEventsTableProps {
  events: FuelEvent[];
}

export const FuelEventsTable = ({ events }: FuelEventsTableProps) => {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Fuel className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Fuel Events Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No fuel drain or fill events detected in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Fuel className="w-5 h-5 text-primary" />
          Fuel Events ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Before (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">After (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Change (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    {format(new Date(event.event_time), "MMM d, yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {event.vehicle?.plate_number || "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit",
                      event.event_type === "drain" ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
                    )}>
                      {event.event_type === "drain" && <AlertTriangle className="w-3 h-3" />}
                      {event.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{event.fuel_before_liters != null ? Number(event.fuel_before_liters).toFixed(1) : "-"}</td>
                  <td className="px-4 py-3">{event.fuel_after_liters != null ? Number(event.fuel_after_liters).toFixed(1) : "-"}</td>
                  <td className={cn(
                    "px-4 py-3 font-medium",
                    Number(event.fuel_change_liters || 0) < 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {event.fuel_change_liters != null 
                      ? `${Number(event.fuel_change_liters) > 0 ? "+" : ""}${Number(event.fuel_change_liters).toFixed(1)}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
