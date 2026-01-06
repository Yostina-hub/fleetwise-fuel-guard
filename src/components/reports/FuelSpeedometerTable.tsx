import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { Gauge, Fuel, Route } from "lucide-react";
import { TablePagination } from "./TablePagination";

interface Trip {
  id: string;
  vehicle_id: string;
  vehicle?: { plate_number: string };
  start_time: string;
  distance_km?: number;
  fuel_consumed_liters?: number;
  max_speed_kmh?: number;
  avg_speed_kmh?: number;
}

interface FuelSpeedometerTableProps {
  trips: Trip[];
}

export const FuelSpeedometerTable = ({ trips }: FuelSpeedometerTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Prepare chart data - last 20 data points with speed, fuel, and mileage
  const chartData = useMemo(() => {
    return trips
      .slice(0, 20)
      .map(trip => ({
        time: format(parseISO(trip.start_time), "MM-dd HH:mm"),
        speed: trip.avg_speed_kmh || trip.max_speed_kmh || 0,
        fuel: trip.fuel_consumed_liters || 0,
        mileage: trip.distance_km || 0,
      }))
      .reverse();
  }, [trips]);

  // Table data
  const tableData = useMemo(() => {
    return trips.map(trip => ({
      id: trip.id,
      vehicle: trip.vehicle?.plate_number || "Unknown",
      time: format(parseISO(trip.start_time), "yyyy-MM-dd HH:mm"),
      speed: trip.avg_speed_kmh || trip.max_speed_kmh || 0,
      maxSpeed: trip.max_speed_kmh || 0,
      fuel: trip.fuel_consumed_liters || 0,
      distance: trip.distance_km || 0,
      consumption: trip.distance_km && trip.fuel_consumed_liters
        ? ((trip.fuel_consumed_liters / trip.distance_km) * 100).toFixed(1)
        : "-",
    }));
  }, [trips]);

  const totalItems = tableData.length;
  const paginatedData = tableData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Gauge className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No fuel speedometer data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Fuel Mileage Speedometer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  yAxisId="left"
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Fuel (L) / Distance (km)', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Legend />
                <Bar 
                  yAxisId="right"
                  dataKey="mileage" 
                  fill="hsl(142, 76%, 36%)" 
                  name="Mileage (km)"
                  opacity={0.8}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="fuel" 
                  fill="hsl(199, 89%, 48%)" 
                  name="Fuel (L)"
                  opacity={0.8}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="speed" 
                  stroke="hsl(0, 84%, 60%)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Speed (km/h)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Avg Speed</TableHead>
                <TableHead className="text-right">Max Speed</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Fuel</TableHead>
                <TableHead className="text-right">Consumption</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.vehicle}</TableCell>
                  <TableCell>{row.time}</TableCell>
                  <TableCell className="text-right">{row.speed.toFixed(0)} km/h</TableCell>
                  <TableCell className="text-right">{row.maxSpeed.toFixed(0)} km/h</TableCell>
                  <TableCell className="text-right">{row.distance.toFixed(1)} km</TableCell>
                  <TableCell className="text-right">{row.fuel.toFixed(1)} L</TableCell>
                  <TableCell className="text-right">{row.consumption} L/100km</TableCell>
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
