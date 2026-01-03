import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";

interface FuelTrendChartProps {
  fuelEvents: Array<{
    event_time: string;
    fuel_change_liters: number;
    event_type: string;
  }>;
}

const FuelTrendChart = ({ fuelEvents }: FuelTrendChartProps) => {
  const chartData = useMemo(() => {
    // Generate last 14 days of aggregated data
    const days: Record<string, { consumption: number; refuels: number }> = {};
    
    for (let i = 13; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      days[date] = { consumption: 0, refuels: 0 };
    }

    fuelEvents.forEach(event => {
      const date = format(new Date(event.event_time), "yyyy-MM-dd");
      if (days[date] && event.event_type === 'refuel') {
        days[date].consumption += Math.abs(event.fuel_change_liters);
        days[date].refuels += 1;
      }
    });

    return Object.entries(days).map(([date, data]) => ({
      date,
      displayDate: format(new Date(date), "MMM dd"),
      consumption: Math.round(data.consumption),
      refuels: data.refuels
    }));
  }, [fuelEvents]);

  const totalConsumption = chartData.reduce((sum, d) => sum + d.consumption, 0);
  const avgDaily = Math.round(totalConsumption / 14);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Consumption Trend
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Calendar className="w-3 h-3" />
            Last 14 days
          </Badge>
        </div>
        <div className="flex gap-4 mt-2">
          <div>
            <span className="text-2xl font-bold">{totalConsumption.toLocaleString()}L</span>
            <span className="text-sm text-muted-foreground ml-2">total</span>
          </div>
          <div className="border-l pl-4">
            <span className="text-2xl font-bold">{avgDaily}L</span>
            <span className="text-sm text-muted-foreground ml-2">avg/day</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                tickFormatter={(value) => `${value}L`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value}L`, 'Consumption']}
              />
              <Area
                type="monotone"
                dataKey="consumption"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#consumptionGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelTrendChart;
