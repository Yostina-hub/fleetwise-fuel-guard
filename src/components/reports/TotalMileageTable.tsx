import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { Route, Fuel, Clock, TrendingUp } from "lucide-react";
import { TablePagination } from "./TablePagination";

interface Trip {
  id: string;
  vehicle_id: string;
  vehicle?: { plate_number: string };
  start_time: string;
  end_time?: string;
  distance_km?: number;
  fuel_consumed_liters?: number;
  duration_minutes?: number;
}

interface TotalMileageTableProps {
  trips: Trip[];
}

interface VehicleMileageSummary {
  vehicle: string;
  vehicleId: string;
  totalDistance: number;
  totalFuel: number;
  totalDuration: number;
  tripCount: number;
  avgDistancePerTrip: number;
  avgFuelConsumption: number;
}

export const TotalMileageTable = ({ trips }: TotalMileageTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Aggregate by vehicle
  const vehicleSummaries = useMemo(() => {
    const summaryMap = new Map<string, VehicleMileageSummary>();

    trips.forEach(trip => {
      const vehicleId = trip.vehicle_id;
      const plate = trip.vehicle?.plate_number || "Unknown";
      
      if (!summaryMap.has(vehicleId)) {
        summaryMap.set(vehicleId, {
          vehicle: plate,
          vehicleId,
          totalDistance: 0,
          totalFuel: 0,
          totalDuration: 0,
          tripCount: 0,
          avgDistancePerTrip: 0,
          avgFuelConsumption: 0,
        });
      }

      const summary = summaryMap.get(vehicleId)!;
      summary.totalDistance += trip.distance_km || 0;
      summary.totalFuel += trip.fuel_consumed_liters || 0;
      summary.totalDuration += trip.duration_minutes || 0;
      summary.tripCount += 1;
    });

    // Calculate averages
    summaryMap.forEach(summary => {
      summary.avgDistancePerTrip = summary.tripCount > 0 ? summary.totalDistance / summary.tripCount : 0;
      summary.avgFuelConsumption = summary.totalDistance > 0 
        ? (summary.totalFuel / summary.totalDistance) * 100 
        : 0;
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.totalDistance - a.totalDistance);
  }, [trips]);

  // Chart data - daily totals
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, "MMM dd"),
        fullDate: startOfDay(date),
        distance: 0,
        fuel: 0,
      };
    });

    trips.forEach(trip => {
      const tripDate = startOfDay(parseISO(trip.start_time));
      const dayData = last7Days.find(d => d.fullDate.getTime() === tripDate.getTime());
      if (dayData) {
        dayData.distance += trip.distance_km || 0;
        dayData.fuel += trip.fuel_consumed_liters || 0;
      }
    });

    return last7Days.map(d => ({
      date: d.date,
      distance: Math.round(d.distance * 10) / 10,
      fuel: Math.round(d.fuel * 10) / 10,
    }));
  }, [trips]);

  // Totals
  const totals = useMemo(() => {
    return vehicleSummaries.reduce(
      (acc, v) => ({
        distance: acc.distance + v.totalDistance,
        fuel: acc.fuel + v.totalFuel,
        duration: acc.duration + v.totalDuration,
        trips: acc.trips + v.tripCount,
      }),
      { distance: 0, fuel: 0, duration: 0, trips: 0 }
    );
  }, [vehicleSummaries]);

  const totalItems = vehicleSummaries.length;
  const paginatedData = vehicleSummaries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (vehicleSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No mileage data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Route className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-bold">{totals.distance.toFixed(1)} km</p>
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
                <p className="text-sm text-muted-foreground">Total Fuel</p>
                <p className="text-2xl font-bold">{totals.fuel.toFixed(1)} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="text-2xl font-bold">{formatDuration(totals.duration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{totals.trips}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Mileage Trend</CardTitle>
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
                  dataKey="distance" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3} 
                  name="Distance (km)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vehicle Mileage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Total Distance</TableHead>
                <TableHead className="text-right">Total Fuel</TableHead>
                <TableHead className="text-right">Consumption</TableHead>
                <TableHead className="text-right">Trips</TableHead>
                <TableHead className="text-right">Avg Distance/Trip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((summary) => (
                <TableRow key={summary.vehicleId}>
                  <TableCell className="font-medium">{summary.vehicle}</TableCell>
                  <TableCell className="text-right">{summary.totalDistance.toFixed(1)} km</TableCell>
                  <TableCell className="text-right">{summary.totalFuel.toFixed(1)} L</TableCell>
                  <TableCell className="text-right">{summary.avgFuelConsumption.toFixed(1)} L/100km</TableCell>
                  <TableCell className="text-right">{summary.tripCount}</TableCell>
                  <TableCell className="text-right">{summary.avgDistancePerTrip.toFixed(1)} km</TableCell>
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
