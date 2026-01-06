import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { Droplet, AlertTriangle, TrendingDown } from "lucide-react";
import { TablePagination } from "./TablePagination";

interface FuelEvent {
  id: string;
  vehicle_id: string;
  vehicle?: { plate_number: string };
  event_time: string;
  event_type: string;
  fuel_level_before?: number;
  fuel_level_after?: number;
  volume_liters?: number;
  location_name?: string;
  lat?: number;
  lng?: number;
}

interface FuelDrainReportTableProps {
  events: FuelEvent[];
}

export const FuelDrainReportTable = ({ events }: FuelDrainReportTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter for drain/spill events only
  const drainEvents = useMemo(() => {
    return events
      .filter(e => e.event_type === 'drain' || e.event_type === 'spill' || e.event_type === 'theft')
      .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
  }, [events]);

  // Chart data
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, "MMM dd"),
        fullDate: startOfDay(date),
        volume: 0,
        count: 0,
      };
    });

    drainEvents.forEach(event => {
      const eventDate = startOfDay(parseISO(event.event_time));
      const dayData = last7Days.find(d => d.fullDate.getTime() === eventDate.getTime());
      if (dayData) {
        dayData.volume += Math.abs(event.volume_liters || 0);
        dayData.count += 1;
      }
    });

    return last7Days.map(d => ({
      date: d.date,
      volume: Math.round(d.volume * 10) / 10,
      count: d.count,
    }));
  }, [drainEvents]);

  // Totals
  const totals = useMemo(() => {
    return drainEvents.reduce(
      (acc, e) => ({
        volume: acc.volume + Math.abs(e.volume_liters || 0),
        count: acc.count + 1,
      }),
      { volume: 0, count: 0 }
    );
  }, [drainEvents]);

  const totalItems = drainEvents.length;
  const paginatedData = drainEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (drainEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Droplet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No fuel drain/spill data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <Droplet className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fuel Loss</p>
                <p className="text-2xl font-bold">{totals.volume.toFixed(1)} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drain Events</p>
                <p className="text-2xl font-bold">{totals.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <TrendingDown className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg per Event</p>
                <p className="text-2xl font-bold">
                  {totals.count > 0 ? (totals.volume / totals.count).toFixed(1) : 0} L
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Fuel Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="hsl(0, 84%, 60%)" 
                  fill="hsl(0, 84%, 60%)" 
                  fillOpacity={0.3} 
                  name="Volume Lost (L)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fuel Drain/Spill Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Volume Lost</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.vehicle?.plate_number || "Unknown"}</TableCell>
                  <TableCell>{format(parseISO(event.event_time), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        event.event_type === 'theft' 
                          ? "bg-red-500/10 text-red-600 border-red-500/20"
                          : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                      }
                    >
                      {event.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{event.fuel_level_before?.toFixed(1) || "-"} L</TableCell>
                  <TableCell className="text-right">{event.fuel_level_after?.toFixed(1) || "-"} L</TableCell>
                  <TableCell className="text-right">
                    <span className="text-red-600 font-medium">
                      -{Math.abs(event.volume_liters || 0).toFixed(1)} L
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {event.location_name || (event.lat && event.lng ? `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}` : "-")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};
