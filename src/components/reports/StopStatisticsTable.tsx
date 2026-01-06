import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ITEMS_PER_PAGE = 10;

interface Trip {
  id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  idle_time_minutes?: number;
  distance_km?: number;
  start_location_name?: string;
  end_location_name?: string;
  stops_count?: number;
  vehicle?: { plate_number: string } | null;
  driver?: { first_name: string; last_name: string } | null;
}

interface StopStatisticsTableProps {
  trips: Trip[];
}

interface StopEvent {
  id: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  stopDurationMinutes: number;
  location: string;
}

export const StopStatisticsTable = ({ trips }: StopStatisticsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Generate stop events from trips (using idle time as proxy for stops)
  const stopEvents = useMemo<StopEvent[]>(() => {
    return trips
      .filter(t => t.idle_time_minutes && t.idle_time_minutes > 2) // At least 2 min stop
      .map(trip => ({
        id: trip.id,
        vehiclePlate: trip.vehicle?.plate_number || "Unknown",
        startTime: trip.start_time,
        endTime: trip.end_time || trip.start_time,
        stopDurationMinutes: trip.idle_time_minutes || 0,
        location: trip.start_location_name || trip.end_location_name || "-",
      }))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [trips]);

  // Chart data - aggregate by day
  const chartData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    stopEvents.forEach(stop => {
      const day = format(new Date(stop.startTime), "MM-dd");
      dayMap[day] = (dayMap[day] || 0) + stop.stopDurationMinutes;
    });
    return Object.entries(dayMap)
      .map(([day, duration]) => ({ day, duration: Math.round(duration / 60 * 10) / 10 }))
      .slice(-7);
  }, [stopEvents]);

  const totalItems = stopEvents.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStops = stopEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (stopEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Stop Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No vehicle stops recorded in this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Stop Duration by Day (hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => [`${value}h`, "Duration"]}
                />
                <Bar dataKey="duration" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            Stop Statistics ({totalItems} stops)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Starting Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">End Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stop Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedStops.map((stop) => (
                  <tr key={stop.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{stop.vehiclePlate}</td>
                    <td className="px-4 py-3 text-sm">{format(new Date(stop.startTime), "yyyy-MM-dd HH:mm:ss")}</td>
                    <td className="px-4 py-3 text-sm">{format(new Date(stop.endTime), "yyyy-MM-dd HH:mm:ss")}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-medium",
                        stop.stopDurationMinutes > 30 ? "text-amber-500" : "text-foreground"
                      )}>
                        {formatDuration(stop.stopDurationMinutes)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate" title={stop.location}>
                      {stop.location}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};
