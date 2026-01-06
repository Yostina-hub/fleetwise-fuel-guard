import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, subMonths, startOfMonth } from "date-fns";

interface AnimatedBarChartProps {
  trips: any[];
  loading?: boolean;
}

const AnimatedBarChart = ({ trips, loading }: AnimatedBarChartProps) => {
  const { formatCurrency } = useOrganizationSettings();

  // Calculate revenue by month
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(new Date(), 5 - i));
    const monthEnd = startOfMonth(subMonths(new Date(), 4 - i));
    
    const monthTrips = trips.filter(t => {
      const d = new Date(t.created_at);
      return d >= monthStart && (i === 5 || d < monthEnd);
    });

    const revenue = monthTrips.reduce((sum, t) => sum + (t.distance_km || 0) * 15, 0);
    const tripsCount = monthTrips.length;

    return {
      month: format(monthStart, 'MMM'),
      revenue,
      trips: tripsCount,
      isCurrentMonth: i === 5,
    };
  });

  const avgRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0) / 6;
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Monthly Revenue
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="w-3 h-3 text-success" />
            6 Months
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barCategoryGap="20%">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="barGradientHighlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
              />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <ReferenceLine 
                y={avgRevenue} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Avg', 
                  position: 'right',
                  fill: 'hsl(var(--warning))',
                  fontSize: 10
                }}
              />
              <Bar 
                dataKey="revenue" 
                radius={[6, 6, 0, 0]}
                animationDuration={1500}
                animationBegin={0}
              >
                {monthlyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isCurrentMonth ? "url(#barGradientHighlight)" : "url(#barGradient)"}
                    className="drop-shadow-sm"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div>
            <span className="text-sm text-muted-foreground">Total Revenue</span>
            <p className="text-xl font-bold">
              {formatCurrency(monthlyData.reduce((sum, d) => sum + d.revenue, 0))}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Avg Monthly</span>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(avgRevenue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnimatedBarChart;
