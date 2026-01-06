import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Power, PowerOff } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";
import {
  AreaChart,
  Area,
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
  distance_km?: number;
  vehicle?: { plate_number: string } | null;
}

interface IgnitionStatisticsTableProps {
  trips: Trip[];
}

interface IgnitionEvent {
  id: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  mileageKm: number;
  startPosition: string;
  endPosition: string;
}

export const IgnitionStatisticsTable = ({ trips }: IgnitionStatisticsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Convert trips to ignition events (trip start = ignition on, trip end = ignition off)
  const ignitionEvents = useMemo<IgnitionEvent[]>(() => {
    return trips
      .filter(t => t.end_time) // Only completed trips
      .map(trip => {
        const start = new Date(trip.start_time);
        const end = new Date(trip.end_time!);
        return {
          id: trip.id,
          vehiclePlate: trip.vehicle?.plate_number || "Unknown",
          startTime: trip.start_time,
          endTime: trip.end_time!,
          durationSeconds: differenceInSeconds(end, start),
          mileageKm: trip.distance_km || 0,
          startPosition: "-",
          endPosition: "-",
        };
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [trips]);

  // Chart data - total running time per day
  const chartData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    ignitionEvents.forEach(event => {
      const day = format(new Date(event.startTime), "yyyy-MM-dd");
      dayMap[day] = (dayMap[day] || 0) + event.durationSeconds / 3600; // hours
    });
    return Object.entries(dayMap)
      .map(([day, hours]) => ({ day, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-7);
  }, [ignitionEvents]);

  const totalItems = ignitionEvents.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = ignitionEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (ignitionEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Power className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Ignition Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No ignition events recorded in this period</p>
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
            <Power className="w-5 h-5 text-green-500" />
            Ignition Statistics Chart (hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => [`${value}h`, "Running Time"]}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Power className="w-5 h-5 text-primary" />
            Ignition Events ({totalItems} events)
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Mileage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Start Position</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">End Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{event.vehiclePlate}</td>
                    <td className="px-4 py-3 text-sm">{format(new Date(event.startTime), "yyyy-MM-dd HH:mm:ss")}</td>
                    <td className="px-4 py-3 text-sm">{format(new Date(event.endTime), "yyyy-MM-dd HH:mm:ss")}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-medium",
                        event.durationSeconds > 7200 ? "text-amber-500" : "text-foreground"
                      )}>
                        {formatDuration(event.durationSeconds)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-primary font-medium">
                      {event.mileageKm > 0 ? `${Number(event.mileageKm).toFixed(1)}` : "0"}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[150px] truncate">{event.startPosition}</td>
                    <td className="px-4 py-3 text-sm max-w-[150px] truncate">{event.endPosition}</td>
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
