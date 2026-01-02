import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Clock, Fuel, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface Trip {
  vehicle_id: string;
  distance_km?: number;
  duration_minutes?: number;
  fuel_consumed_liters?: number;
  idle_time_minutes?: number;
  vehicle?: { plate_number: string; make?: string; model?: string } | null;
}

interface VehicleUtilizationTableProps {
  trips: Trip[];
}

export const VehicleUtilizationTable = ({ trips }: VehicleUtilizationTableProps) => {
  // Aggregate by vehicle
  const vehicleStats = useMemo(() => {
    const stats: Record<string, {
      plate_number: string;
      make?: string;
      model?: string;
      totalDistance: number;
      totalDuration: number;
      totalFuel: number;
      totalIdle: number;
      tripCount: number;
    }> = {};

    trips.forEach(trip => {
      if (!trip.vehicle_id) return;
      
      if (!stats[trip.vehicle_id]) {
        stats[trip.vehicle_id] = {
          plate_number: trip.vehicle?.plate_number || "Unknown",
          make: trip.vehicle?.make,
          model: trip.vehicle?.model,
          totalDistance: 0,
          totalDuration: 0,
          totalFuel: 0,
          totalIdle: 0,
          tripCount: 0,
        };
      }

      stats[trip.vehicle_id].totalDistance += Number(trip.distance_km) || 0;
      stats[trip.vehicle_id].totalDuration += trip.duration_minutes || 0;
      stats[trip.vehicle_id].totalFuel += Number(trip.fuel_consumed_liters) || 0;
      stats[trip.vehicle_id].totalIdle += trip.idle_time_minutes || 0;
      stats[trip.vehicle_id].tripCount += 1;
    });

    return Object.entries(stats)
      .map(([id, data]) => ({
        id,
        ...data,
        efficiency: data.totalFuel > 0 ? data.totalDistance / data.totalFuel : 0,
        idlePercent: data.totalDuration > 0 ? (data.totalIdle / data.totalDuration) * 100 : 0,
      }))
      .sort((a, b) => b.totalDistance - a.totalDistance);
  }, [trips]);

  if (vehicleStats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Utilization Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No trip data available for utilization analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="w-5 h-5 text-primary" />
          Vehicle Utilization Report ({vehicleStats.length} vehicles)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trips</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  <div className="flex items-center gap-1">
                    <Route className="w-3 h-3" />
                    Distance
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Duration
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  <div className="flex items-center gap-1">
                    <Fuel className="w-3 h-3" />
                    Fuel Used
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Efficiency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Idle %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicleStats.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">{v.plate_number}</span>
                      {v.make && <span className="text-sm text-muted-foreground ml-2">{v.make} {v.model}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{v.tripCount}</td>
                  <td className="px-4 py-3">{v.totalDistance.toFixed(1)} km</td>
                  <td className="px-4 py-3">
                    {Math.floor(v.totalDuration / 60)}h {v.totalDuration % 60}m
                  </td>
                  <td className="px-4 py-3">{v.totalFuel.toFixed(1)} L</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "font-medium",
                      v.efficiency >= 12 ? "text-green-500" :
                      v.efficiency >= 8 ? "text-amber-500" :
                      v.efficiency > 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {v.efficiency > 0 ? `${v.efficiency.toFixed(1)} km/L` : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "font-medium",
                      v.idlePercent <= 10 ? "text-green-500" :
                      v.idlePercent <= 20 ? "text-amber-500" :
                      "text-red-500"
                    )}>
                      {v.idlePercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
