import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, AlertTriangle } from "lucide-react";
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
  ReferenceLine,
} from "recharts";

const ITEMS_PER_PAGE = 10;

interface SpeedViolation {
  id: string;
  violation_time: string;
  speed_kmh?: number;
  speed_limit_kmh?: number;
  severity?: string;
  location_name?: string;
  vehicle?: { plate_number: string } | null;
  driver?: { first_name: string; last_name: string } | null;
}

interface SpeedReportTableProps {
  violations: SpeedViolation[];
}

export const SpeedReportTable = ({ violations }: SpeedReportTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Sort by time
  const sortedViolations = useMemo(() => {
    return [...violations].sort((a, b) => 
      new Date(b.violation_time).getTime() - new Date(a.violation_time).getTime()
    );
  }, [violations]);

  // Chart data - speed over time
  const chartData = useMemo(() => {
    const timeData = sortedViolations
      .slice()
      .reverse()
      .map(v => ({
        time: format(new Date(v.violation_time), "HH:mm:ss"),
        speed: v.speed_kmh || 0,
        limit: v.speed_limit_kmh || 80,
      }))
      .slice(-20); // Last 20 points for readability
    return timeData;
  }, [sortedViolations]);

  const totalItems = sortedViolations.length;
  const avgSpeed = sortedViolations.length > 0 
    ? sortedViolations.reduce((sum, v) => sum + (v.speed_kmh || 0), 0) / sortedViolations.length 
    : 0;
  const maxSpeed = sortedViolations.length > 0 
    ? Math.max(...sortedViolations.map(v => v.speed_kmh || 0)) 
    : 0;
  
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedViolations = sortedViolations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (sortedViolations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Gauge className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Speed Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No speed records found in this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Gauge className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Speed</p>
                <p className="text-2xl font-bold">{avgSpeed.toFixed(1)} km/h</p>
              </div>
              <Gauge className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Max Speed</p>
                <p className="text-2xl font-bold text-red-500">{maxSpeed} km/h</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="w-5 h-5 text-primary" />
            Speed Report (km/h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} km/h`, 
                    name === 'speed' ? 'Speed' : 'Limit'
                  ]}
                />
                <ReferenceLine y={80} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="Limit" />
                <Area
                  type="monotone"
                  dataKey="speed"
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
            Speed Violations ({totalItems} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Speed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Over By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedViolations.map((violation) => {
                  const overBy = (violation.speed_kmh || 0) - (violation.speed_limit_kmh || 0);
                  return (
                    <tr key={violation.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(violation.violation_time), "yyyy-MM-dd HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3 font-medium">{violation.vehicle?.plate_number || "-"}</td>
                      <td className="px-4 py-3">
                        {violation.driver 
                          ? `${violation.driver.first_name} ${violation.driver.last_name}` 
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-red-500">
                          {violation.speed_kmh || 0} km/h
                        </span>
                      </td>
                      <td className="px-4 py-3">{violation.speed_limit_kmh || 80} km/h</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "font-medium",
                          overBy > 20 ? "text-red-500" : 
                          overBy > 10 ? "text-amber-500" : "text-foreground"
                        )}>
                          +{overBy} km/h
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          violation.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          violation.severity === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        )}>
                          {violation.severity || "medium"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[150px] truncate" title={violation.location_name}>
                        {violation.location_name || "-"}
                      </td>
                    </tr>
                  );
                })}
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
