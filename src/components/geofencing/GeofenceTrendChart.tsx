import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { subDays, format, startOfDay, eachDayOfInterval } from "date-fns";
import { useMemo } from "react";

const GeofenceTrendChart = () => {
  const { organizationId } = useOrganization();

  const { data: events } = useQuery({
    queryKey: ["geofence-events-trend", organizationId],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data, error } = await supabase
        .from("geofence_events")
        .select("event_time, event_type")
        .eq("organization_id", organizationId!)
        .gte("event_time", sevenDaysAgo)
        .order("event_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayEvents = events?.filter((e) => {
        const eventDate = new Date(e.event_time);
        return eventDate >= dayStart && eventDate < dayEnd;
      }) || [];

      return {
        date: format(day, "EEE"),
        entries: dayEvents.filter((e) => e.event_type === "entry").length,
        exits: dayEvents.filter((e) => e.event_type === "exit").length,
        dwellAlerts: dayEvents.filter((e) => e.event_type === "dwell_exceeded").length,
      };
    });
  }, [events]);

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Event Trends (7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDwell" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="entries"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorEntries)"
                strokeWidth={2}
                name="Entries"
              />
              <Area
                type="monotone"
                dataKey="exits"
                stroke="hsl(var(--muted-foreground))"
                fillOpacity={1}
                fill="url(#colorExits)"
                strokeWidth={2}
                name="Exits"
              />
              <Area
                type="monotone"
                dataKey="dwellAlerts"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#colorDwell)"
                strokeWidth={2}
                name="Dwell Alerts"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeofenceTrendChart;
