import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Route, Clock, Fuel, Gauge } from "lucide-react";

interface Trip {
  id: string;
  start_time: string;
  end_time?: string;
  distance_km?: number;
  duration_minutes?: number;
  fuel_consumed_liters?: number;
  avg_speed_kmh?: number;
  max_speed_kmh?: number;
  status: string;
  idle_time_minutes?: number;
  vehicle_id: string;
  driver_id?: string;
}

interface TripsTableProps {
  trips: Trip[];
}

export const TripsTable = ({ trips }: TripsTableProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Route className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Trips</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No trips recorded in the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Route className="w-5 h-5 text-primary" />
          Trips ({trips.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Avg Speed</TableHead>
              <TableHead>Max Speed</TableHead>
              <TableHead>Fuel Used</TableHead>
              <TableHead>Idle Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.slice(0, 50).map((trip) => (
              <TableRow key={trip.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(trip.start_time), "MMM d, HH:mm")}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {trip.end_time 
                    ? format(new Date(trip.end_time), "MMM d, HH:mm")
                    : "-"}
                </TableCell>
                <TableCell>
                  {trip.duration_minutes 
                    ? `${Math.round(trip.duration_minutes)} min`
                    : "-"}
                </TableCell>
                <TableCell>
                  {trip.distance_km 
                    ? `${Number(trip.distance_km).toFixed(1)} km`
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-muted-foreground" />
                    {trip.avg_speed_kmh 
                      ? `${Number(trip.avg_speed_kmh).toFixed(0)} km/h`
                      : "-"}
                  </div>
                </TableCell>
                <TableCell>
                  {trip.max_speed_kmh 
                    ? `${Number(trip.max_speed_kmh).toFixed(0)} km/h`
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-muted-foreground" />
                    {trip.fuel_consumed_liters 
                      ? `${Number(trip.fuel_consumed_liters).toFixed(1)} L`
                      : "-"}
                  </div>
                </TableCell>
                <TableCell>
                  {trip.idle_time_minutes 
                    ? `${trip.idle_time_minutes} min`
                    : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(trip.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
