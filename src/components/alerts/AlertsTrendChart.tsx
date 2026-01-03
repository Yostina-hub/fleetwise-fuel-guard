import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useMemo } from "react";
import { format, subDays, startOfDay, isWithinInterval, parseISO } from "date-fns";

const AlertsTrendChart = () => {
  const { alerts } = useAlerts({});

  const chartData = useMemo(() => {
    const days: Array<{
      day: string;
      critical: number;
      warning: number;
      info: number;
    }> = [];

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const dayDate = subDays(new Date(), i);
      const dayStart = startOfDay(dayDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAlerts = alerts?.filter(a => {
        const alertTime = parseISO(a.alert_time);
        return isWithinInterval(alertTime, { start: dayStart, end: dayEnd });
      }) || [];

      days.push({
        day: format(dayDate, "EEE"),
        critical: dayAlerts.filter(a => a.severity === "critical").length,
        warning: dayAlerts.filter(a => a.severity === "warning").length,
        info: dayAlerts.filter(a => a.severity === "info").length,
      });
    }

    return days;
  }, [alerts]);

  const hasData = chartData.some(d => d.critical > 0 || d.warning > 0 || d.info > 0);

  return (
    <Card className="glass-strong h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
          Alert Trends (7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground" role="status">
            <p>No alert data available for trend analysis</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
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
              <Bar dataKey="critical" fill="hsl(var(--destructive))" name="Critical" radius={[4, 4, 0, 0]} />
              <Bar dataKey="warning" fill="hsl(var(--warning))" name="Warning" radius={[4, 4, 0, 0]} />
              <Bar dataKey="info" fill="hsl(var(--primary))" name="Info" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsTrendChart;
