import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export const IncidentTrendChart = () => {
  const { incidents, loading } = useIncidentsManagement();

  const chartData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const count = incidents?.filter(incident => {
        const incidentDate = new Date(incident.incident_time);
        return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
      }).length || 0;

      months.push({
        month: format(date, 'MMM'),
        incidents: count,
        color: count > 5 ? 'hsl(var(--destructive))' : count > 2 ? 'hsl(38, 92%, 50%)' : 'hsl(142, 76%, 36%)'
      });
    }
    return months;
  })();

  const totalIncidents = chartData.reduce((sum, m) => sum + m.incidents, 0);
  const avgPerMonth = (totalIncidents / 6).toFixed(1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            Incident Trend (6 Months)
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            Avg: {avgPerMonth}/month
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value} incidents`, 'Count']}
              />
              <Bar dataKey="incidents" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Low (0-2)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium (3-5)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive"></span> High (6+)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
