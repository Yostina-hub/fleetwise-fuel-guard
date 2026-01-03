import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

const MaintenanceTrendChart = () => {
  const { schedules } = useMaintenanceSchedules();

  const chartData = useMemo(() => {
    const months: Array<{
      month: string;
      completed: number;
      scheduled: number;
      overdue: number;
    }> = [];

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthSchedules = schedules?.filter(s => {
        if (!s.next_due_date) return false;
        const dueDate = parseISO(s.next_due_date);
        return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
      }) || [];

      // Check if next_due_date is in the past for overdue count
      const now = new Date();
      const completedCount = monthSchedules.filter(s => s.is_active === false).length;
      const overdueCount = monthSchedules.filter(s => {
        if (!s.next_due_date) return false;
        return parseISO(s.next_due_date) < now;
      }).length;

      months.push({
        month: format(monthDate, "MMM"),
        completed: completedCount,
        scheduled: monthSchedules.length,
        overdue: overdueCount,
      });
    }

    return months;
  }, [schedules]);

  const hasData = chartData.some(d => d.completed > 0 || d.scheduled > 0);

  return (
    <Card className="glass-strong h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
          Maintenance Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground" role="status">
            <p>No maintenance data available for trend analysis</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="hsl(var(--success))"
                fillOpacity={1}
                fill="url(#colorCompleted)"
                strokeWidth={2}
                name="Completed"
              />
              <Area
                type="monotone"
                dataKey="scheduled"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorScheduled)"
                strokeWidth={2}
                name="Scheduled"
              />
              <Area
                type="monotone"
                dataKey="overdue"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#colorOverdue)"
                strokeWidth={2}
                name="Overdue"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceTrendChart;
