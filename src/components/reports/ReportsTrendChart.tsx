import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Activity, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportsTrendChartProps {
  trips: any[];
  driverEvents: any[];
  activeTab: string;
}

export const ReportsTrendChart = ({ trips, driverEvents, activeTab }: ReportsTrendChartProps) => {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const chartData = useMemo(() => {
    // Group trips by date
    const tripsByDate: Record<string, { trips: number; distance: number; events: number }> = {};
    
    trips.forEach(trip => {
      const date = new Date(trip.start_time).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      if (!tripsByDate[date]) {
        tripsByDate[date] = { trips: 0, distance: 0, events: 0 };
      }
      tripsByDate[date].trips++;
      tripsByDate[date].distance += trip.distance_km || 0;
    });

    // Add driver events
    driverEvents.forEach(event => {
      const date = new Date(event.event_time).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      if (!tripsByDate[date]) {
        tripsByDate[date] = { trips: 0, distance: 0, events: 0 };
      }
      tripsByDate[date].events++;
    });

    // Convert to array and sort by date
    return Object.entries(tripsByDate)
      .map(([date, data]) => ({
        date,
        trips: data.trips,
        distance: Math.round(data.distance),
        events: data.events,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date + " 2026");
        const dateB = new Date(b.date + " 2026");
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-14); // Last 14 days
  }, [trips, driverEvents]);

  const getChartConfig = () => {
    switch (activeTab) {
      case "driver":
        return {
          dataKey: "events",
          label: "Driver Events",
          color: "hsl(var(--destructive))",
          secondaryKey: "trips",
          secondaryLabel: "Trips",
          secondaryColor: "hsl(var(--primary))",
        };
      default:
        return {
          dataKey: "trips",
          label: "Trips",
          color: "hsl(var(--primary))",
          secondaryKey: "distance",
          secondaryLabel: "Distance (km)",
          secondaryColor: "hsl(var(--chart-2))",
        };
    }
  };

  const config = getChartConfig();

  if (chartData.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Activity Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No data available for the selected period
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Activity Trend
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2", chartType === "area" && "bg-muted")}
              onClick={() => setChartType("area")}
            >
              <Activity className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2", chartType === "bar" && "bg-muted")}
              onClick={() => setChartType("bar")}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={config.dataKey}
                  name={config.label}
                  stroke={config.color}
                  fillOpacity={1}
                  fill="url(#colorPrimary)"
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar 
                  dataKey={config.dataKey} 
                  name={config.label}
                  fill={config.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey={config.secondaryKey} 
                  name={config.secondaryLabel}
                  fill={config.secondaryColor} 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
