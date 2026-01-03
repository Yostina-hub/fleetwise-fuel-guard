import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";

interface TelemetryPoint {
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  last_communication_at: string;
}

interface RouteHistoryTrendChartProps {
  routeData: TelemetryPoint[];
}

export const RouteHistoryTrendChart = ({ routeData }: RouteHistoryTrendChartProps) => {
  const chartData = useMemo(() => {
    if (!routeData || routeData.length === 0) return [];

    // Group by 15-minute intervals
    const intervals: Record<string, { speeds: number[]; fuels: number[]; count: number }> = {};
    
    routeData.forEach(point => {
      const date = parseISO(point.last_communication_at);
      const hour = date.getHours();
      const quarter = Math.floor(date.getMinutes() / 15) * 15;
      const key = `${hour.toString().padStart(2, '0')}:${quarter.toString().padStart(2, '0')}`;
      
      if (!intervals[key]) {
        intervals[key] = { speeds: [], fuels: [], count: 0 };
      }
      
      intervals[key].speeds.push(point.speed_kmh || 0);
      intervals[key].fuels.push(point.fuel_level_percent || 0);
      intervals[key].count++;
    });

    return Object.entries(intervals)
      .map(([time, data]) => ({
        time,
        avgSpeed: Math.round(data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length),
        avgFuel: Math.round(data.fuels.reduce((a, b) => a + b, 0) / data.fuels.length),
        dataPoints: data.count
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [routeData]);

  if (chartData.length < 2) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          Speed & Fuel Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="avgSpeed"
                stroke="hsl(var(--primary))"
                fill="url(#speedGradient)"
                strokeWidth={2}
                name="Speed (km/h)"
              />
              <Area
                type="monotone"
                dataKey="avgFuel"
                stroke="hsl(var(--warning))"
                fill="url(#fuelGradient)"
                strokeWidth={2}
                name="Fuel (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Speed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-muted-foreground">Fuel</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteHistoryTrendChart;
