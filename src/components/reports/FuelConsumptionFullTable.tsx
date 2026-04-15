import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fuel } from "lucide-react";
import { format } from "date-fns";
import { TablePagination } from "./TablePagination";
import { useState, useMemo } from "react";

interface FuelConsumptionFullTableProps {
  transactions: any[];
  fuelEvents: any[];
}

export const FuelConsumptionFullTable = ({ transactions, fuelEvents }: FuelConsumptionFullTableProps) => {
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Merge and aggregate per vehicle
  const vehicleData = useMemo(() => {
    const map = new Map<string, {
      plate: string;
      totalLiters: number;
      totalCost: number;
      fillCount: number;
      drainCount: number;
      avgPricePerLiter: number;
      lastFillDate: string;
      maxOdometer: number;
      minOdometer: number;
      vendors: Set<string>;
    }>();

    (transactions || []).forEach((t: any) => {
      const plate = t.vehicle?.plate_number || "Unknown";
      const existing = map.get(plate) || {
        plate,
        totalLiters: 0,
        totalCost: 0,
        fillCount: 0,
        drainCount: 0,
        avgPricePerLiter: 0,
        lastFillDate: "",
        maxOdometer: 0,
        minOdometer: Infinity,
        vendors: new Set<string>(),
      };
      existing.totalLiters += Number(t.fuel_amount_liters) || 0;
      existing.totalCost += Number(t.fuel_cost) || 0;
      existing.fillCount += 1;
      if (t.transaction_date > existing.lastFillDate) existing.lastFillDate = t.transaction_date;
      if (t.odometer_km) {
        existing.maxOdometer = Math.max(existing.maxOdometer, t.odometer_km);
        existing.minOdometer = Math.min(existing.minOdometer, t.odometer_km);
      }
      if (t.vendor_name) existing.vendors.add(t.vendor_name);
      map.set(plate, existing);
    });

    // Count drain events from fuel_events
    (fuelEvents || []).filter((e: any) => e.event_type === "drain" || e.event_type === "fuel_drain").forEach((e: any) => {
      const plate = e.vehicle?.plate_number || "Unknown";
      const existing = map.get(plate);
      if (existing) existing.drainCount += 1;
    });

    return Array.from(map.values()).map(v => ({
      ...v,
      avgPricePerLiter: v.totalLiters > 0 ? v.totalCost / v.totalLiters : 0,
      distanceCovered: v.maxOdometer > 0 && v.minOdometer < Infinity ? v.maxOdometer - v.minOdometer : 0,
      efficiency: v.maxOdometer > 0 && v.minOdometer < Infinity && v.totalLiters > 0
        ? ((v.maxOdometer - v.minOdometer) / v.totalLiters).toFixed(1)
        : "—",
      vendorList: Array.from(v.vendors).join(", ") || "—",
    })).sort((a, b) => b.totalCost - a.totalCost);
  }, [transactions, fuelEvents]);

  const paged = vehicleData.slice((page - 1) * perPage, page * perPage);

  const totals = useMemo(() => ({
    liters: vehicleData.reduce((s, v) => s + v.totalLiters, 0),
    cost: vehicleData.reduce((s, v) => s + v.totalCost, 0),
    fills: vehicleData.reduce((s, v) => s + v.fillCount, 0),
    drains: vehicleData.reduce((s, v) => s + v.drainCount, 0),
  }), [vehicleData]);

  if (vehicleData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Fuel className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Fuel Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No fuel consumption data found for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fuel className="w-5 h-5 text-primary" />
            Comprehensive Fuel Report ({vehicleData.length} vehicles)
          </CardTitle>
          <div className="flex gap-3 text-xs">
            <Badge variant="outline" className="gap-1">Total: {totals.liters.toFixed(0)} L</Badge>
            <Badge variant="outline" className="gap-1">Cost: {totals.cost.toFixed(0)}</Badge>
            <Badge variant="outline" className="gap-1">Fills: {totals.fills}</Badge>
            {totals.drains > 0 && <Badge variant="destructive" className="gap-1">Drains: {totals.drains}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Liters</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Avg Price/L</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fills</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Drains</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Distance (km)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Efficiency (km/L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vendors</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Fill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((v, i) => (
                <tr key={v.plate + i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.plate}</td>
                  <td className="px-4 py-3 font-mono">{v.totalLiters.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono">{v.totalCost.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono">{v.avgPricePerLiter.toFixed(2)}</td>
                  <td className="px-4 py-3">{v.fillCount}</td>
                  <td className="px-4 py-3">
                    {v.drainCount > 0 ? (
                      <Badge variant="destructive" className="text-xs">{v.drainCount}</Badge>
                    ) : "0"}
                  </td>
                  <td className="px-4 py-3 font-mono">{v.distanceCovered > 0 ? v.distanceCovered.toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 font-mono">{v.efficiency}</td>
                  <td className="px-4 py-3 text-xs max-w-[150px] truncate">{v.vendorList}</td>
                  <td className="px-4 py-3 text-sm">{v.lastFillDate ? format(new Date(v.lastFillDate), "MMM d, yyyy") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vehicleData.length > perPage && (
          <div className="p-4 border-t">
            <TablePagination currentPage={page} totalItems={vehicleData.length} itemsPerPage={perPage} onPageChange={setPage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
