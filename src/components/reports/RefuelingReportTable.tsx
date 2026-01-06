import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { Fuel, MapPin, TrendingUp } from "lucide-react";
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

interface RefuelingReportTableProps {
  events: FuelEvent[];
}

export const RefuelingReportTable = ({ events }: RefuelingReportTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter for refueling events only
  const refuelingEvents = useMemo(() => {
    return events
      .filter(e => e.event_type === 'fill' || e.event_type === 'refuel')
      .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
  }, [events]);

  // Chart data - daily refueling volume
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

    refuelingEvents.forEach(event => {
      const eventDate = startOfDay(parseISO(event.event_time));
      const dayData = last7Days.find(d => d.fullDate.getTime() === eventDate.getTime());
      if (dayData) {
        dayData.volume += event.volume_liters || 0;
        dayData.count += 1;
      }
    });

    return last7Days.map(d => ({
      date: d.date,
      volume: Math.round(d.volume * 10) / 10,
      count: d.count,
    }));
  }, [refuelingEvents]);

  // Totals
  const totals = useMemo(() => {
    return refuelingEvents.reduce(
      (acc, e) => ({
        volume: acc.volume + (e.volume_liters || 0),
        count: acc.count + 1,
      }),
      { volume: 0, count: 0 }
    );
  }, [refuelingEvents]);

  const totalItems = refuelingEvents.length;
  const paginatedData = refuelingEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (refuelingEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Fuel className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No refueling data available</p>
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
              <div className="p-3 rounded-lg bg-green-500/10">
                <Fuel className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Refueled</p>
                <p className="text-2xl font-bold">{totals.volume.toFixed(1)} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Refueling Events</p>
                <p className="text-2xl font-bold">{totals.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Fuel className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg per Refuel</p>
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
          <CardTitle className="text-lg">Daily Refueling Volume</CardTitle>
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
                  stroke="hsl(142, 76%, 36%)" 
                  fill="hsl(142, 76%, 36%)" 
                  fillOpacity={0.3} 
                  name="Volume (L)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Refueling Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.vehicle?.plate_number || "Unknown"}</TableCell>
                  <TableCell>{format(parseISO(event.event_time), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell className="text-right">{event.fuel_level_before?.toFixed(1) || "-"} L</TableCell>
                  <TableCell className="text-right">{event.fuel_level_after?.toFixed(1) || "-"} L</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      +{event.volume_liters?.toFixed(1) || 0} L
                    </Badge>
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
