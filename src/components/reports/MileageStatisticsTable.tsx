import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, TrendingUp } from "lucide-react";
import { format } from "date-fns";
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
  distance_km?: number;
  fuel_consumed_liters?: number;
  vehicle?: { plate_number: string } | null;
}

interface MileageStatisticsTableProps {
  trips: Trip[];
}

interface MileageRecord {
  id: string;
  vehiclePlate: string;
  date: string;
  drivenDistanceKm: number;
  fuelConsumption: number;
  fuelAmount: number;
  oilSpill: number;
}

export const MileageStatisticsTable = ({ trips }: MileageStatisticsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Aggregate trips by vehicle and date
  const mileageRecords = useMemo<MileageRecord[]>(() => {
    const recordMap: Record<string, MileageRecord> = {};
    
    trips.forEach(trip => {
      const vehiclePlate = trip.vehicle?.plate_number || "Unknown";
      const date = format(new Date(trip.start_time), "yyyy-MM-dd HH:mm:ss");
      const key = `${vehiclePlate}-${date}`;
      
      if (!recordMap[key]) {
        recordMap[key] = {
          id: trip.id,
          vehiclePlate,
          date,
          drivenDistanceKm: 0,
          fuelConsumption: 0,
          fuelAmount: 0,
          oilSpill: 0,
        };
      }
      
      recordMap[key].drivenDistanceKm += trip.distance_km || 0;
      recordMap[key].fuelAmount += trip.fuel_consumed_liters || 0;
      if (recordMap[key].drivenDistanceKm > 0 && recordMap[key].fuelAmount > 0) {
        recordMap[key].fuelConsumption = (recordMap[key].fuelAmount / recordMap[key].drivenDistanceKm) * 100;
      }
    });
    
    return Object.values(recordMap)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trips]);

  // Chart data - total distance per day
  const chartData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    trips.forEach(trip => {
      const day = format(new Date(trip.start_time), "yyyy-MM-dd HH:mm:ss");
      dayMap[day] = (dayMap[day] || 0) + (trip.distance_km || 0);
    });
    return Object.entries(dayMap)
      .map(([day, km]) => ({ day, km: Math.round(km * 10) / 10 }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-7);
  }, [trips]);

  const totalItems = mileageRecords.length;
  const totalDistance = mileageRecords.reduce((sum, r) => sum + r.drivenDistanceKm, 0);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = mileageRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (mileageRecords.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Gauge className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Mileage Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No mileage records found in this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-bold">{totalDistance.toFixed(1)} km</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Records</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Gauge className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg per Record</p>
                <p className="text-2xl font-bold">{(totalDistance / totalItems).toFixed(1)} km</p>
              </div>
              <Gauge className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="w-5 h-5 text-primary" />
            Mileage Chart (km)
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
                  formatter={(value: number) => [`${value} km`, "Distance"]}
                />
                <Area
                  type="monotone"
                  dataKey="km"
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
            <Gauge className="w-5 h-5 text-primary" />
            Mileage Statistics ({totalItems} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">License Plate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Driven Distance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fuel Consumption</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fuel Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Oil Spill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{record.vehiclePlate}</td>
                    <td className="px-4 py-3 text-sm">{record.vehiclePlate}</td>
                    <td className="px-4 py-3 text-sm">{record.date}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">
                        {record.drivenDistanceKm.toFixed(1)} km
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-medium",
                        record.fuelConsumption > 15 ? "text-red-500" : 
                        record.fuelConsumption > 10 ? "text-amber-500" : "text-green-500"
                      )}>
                        {record.fuelConsumption > 0 ? record.fuelConsumption.toFixed(1) : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{record.fuelAmount > 0 ? record.fuelAmount.toFixed(1) : "0"}</td>
                    <td className="px-4 py-3">{record.oilSpill}</td>
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
