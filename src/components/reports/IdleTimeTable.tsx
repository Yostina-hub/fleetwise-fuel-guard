import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface Trip {
  id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  idle_time_minutes?: number;
  distance_km?: number;
  vehicle?: { plate_number: string } | null;
  driver?: { first_name: string; last_name: string } | null;
}

interface IdleTimeTableProps {
  trips: Trip[];
}

export const IdleTimeTable = ({ trips }: IdleTimeTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const tripsWithIdle = trips
    .filter(t => t.idle_time_minutes && t.idle_time_minutes > 0)
    .sort((a, b) => (b.idle_time_minutes || 0) - (a.idle_time_minutes || 0));

  const totalItems = tripsWithIdle.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTrips = tripsWithIdle.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (tripsWithIdle.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Idle Time Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No trips with idle time recorded in this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Idle Time Analysis ({totalItems} trips)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trip Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Idle Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Idle %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTrips.map((trip) => {
                const idlePercent = trip.duration_minutes ? ((trip.idle_time_minutes || 0) / trip.duration_minutes) * 100 : 0;
                return (
                  <tr key={trip.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">{format(new Date(trip.start_time), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-4 py-3 font-medium">{trip.vehicle?.plate_number || "Unknown"}</td>
                    <td className="px-4 py-3">{trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : "-"}</td>
                    <td className="px-4 py-3">{trip.duration_minutes ? `${Math.floor(trip.duration_minutes / 60)}h ${trip.duration_minutes % 60}m` : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(trip.idle_time_minutes || 0) > 30 && <AlertCircle className="w-4 h-4 text-amber-500" />}
                        <span className={cn("font-medium", (trip.idle_time_minutes || 0) > 60 ? "text-red-500" : (trip.idle_time_minutes || 0) > 30 ? "text-amber-500" : "text-foreground")}>{trip.idle_time_minutes}m</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={cn("font-medium", idlePercent > 30 ? "text-red-500" : idlePercent > 15 ? "text-amber-500" : "text-green-500")}>{idlePercent.toFixed(1)}%</span></td>
                    <td className="px-4 py-3">{trip.distance_km ? `${Number(trip.distance_km).toFixed(1)} km` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
      </CardContent>
    </Card>
  );
};