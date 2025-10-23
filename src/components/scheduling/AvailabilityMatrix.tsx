import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export const AvailabilityMatrix = () => {
  const [fromDate, setFromDate] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [toDate, setToDate] = useState(
    format(new Date(Date.now() + 8 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
  );

  const { data: availability, isLoading, refetch } = useQuery({
    queryKey: ["vehicle-availability", fromDate, toDate],
    queryFn: async () => {
      // Fetch vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles" as any)
        .select("id, plate_number, make, model, vehicle_class, status")
        .order("plate_number");

      if (vehiclesError) throw vehiclesError;

      // Fetch calendar entries for the time window
      const { data: calendar, error: calendarError } = await supabase
        .from("vehicle_calendar" as any)
        .select("vehicle_id, entry_type, window_start, window_end")
        .gte("window_end", fromDate)
        .lte("window_start", toDate);

      if (calendarError) throw calendarError;

      // Compute status for each vehicle
      return (vehicles as any)?.map((vehicle: any) => {
        const entries = (calendar as any)?.filter((e: any) => e.vehicle_id === vehicle.id) || [];
        
        let computedStatus = "available";
        let conflicts: string[] = [];

        if (vehicle.status === "out_of_service") {
          computedStatus = "out_of_service";
        } else if (entries.some((e) => e.entry_type === "maintenance")) {
          computedStatus = "maintenance";
          conflicts.push("Maintenance scheduled");
        } else if (entries.some((e) => e.entry_type === "trip")) {
          computedStatus = "scheduled";
          conflicts.push("Trip scheduled");
        }

        return {
          ...vehicle,
          computedStatus,
          conflicts,
        };
      });
    },
    enabled: !!fromDate && !!toDate,
  });

  const statusColors: Record<string, string> = {
    available: "bg-green-500",
    scheduled: "bg-blue-500",
    maintenance: "bg-orange-500",
    out_of_service: "bg-red-500",
  };

  const statusLabels: Record<string, string> = {
    available: "Available",
    scheduled: "Scheduled",
    maintenance: "Maintenance",
    out_of_service: "Out of Service",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Vehicle Availability Matrix</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Window Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <Label htmlFor="from-date">From</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="from-date"
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="to-date">To</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="to-date"
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Availability Matrix */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading availability...
          </div>
        ) : availability && availability.length > 0 ? (
          <div className="space-y-2">
            {availability.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vehicle.vehicle_class && (
                      <span className="capitalize">{vehicle.vehicle_class}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={statusColors[vehicle.computedStatus]}>
                    {statusLabels[vehicle.computedStatus]}
                  </Badge>
                  {vehicle.conflicts.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {vehicle.conflicts.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No vehicles found
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <div className="text-sm font-medium">Legend:</div>
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${statusColors[key]}`} />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
