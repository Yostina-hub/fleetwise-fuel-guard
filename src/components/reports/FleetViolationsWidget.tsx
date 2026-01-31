import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Settings2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";

type TimePeriod = "today" | "yesterday" | "last_7_days" | "this_week" | "this_month";

const TIME_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

const getDateRange = (period: TimePeriod) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return { start: startOfDay(today), end: endOfDay(today) };
    case "yesterday":
      const yesterday = subDays(today, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case "last_7_days":
      return { start: subDays(today, 7), end: endOfDay(today) };
    case "this_week":
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case "this_month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    default:
      return { start: subDays(today, 7), end: endOfDay(today) };
  }
};

const COLORS = {
  overspeeds: "hsl(200, 85%, 55%)", // Blue
  alerts: "hsl(40, 90%, 55%)", // Orange
  harsh_behavior: "hsl(0, 70%, 55%)", // Red
  geofence: "hsl(80, 60%, 50%)", // Green
};

interface FleetViolationsWidgetProps {
  onClose?: () => void;
}

export const FleetViolationsWidget = ({ onClose }: FleetViolationsWidgetProps) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
  const { organizationId } = useOrganization();

  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod]);

  // Fetch speed violations
  const { data: speedViolations = [] } = useQuery({
    queryKey: ["widget-speed-violations", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("speed_violations")
        .select("id")
        .eq("organization_id", organizationId)
        .gte("violation_time", dateRange.start.toISOString())
        .lte("violation_time", dateRange.end.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch driver events (harsh behavior)
  const { data: driverEvents = [] } = useQuery({
    queryKey: ["widget-driver-events", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("driver_events")
        .select("id, event_type")
        .eq("organization_id", organizationId)
        .gte("event_time", dateRange.start.toISOString())
        .lte("event_time", dateRange.end.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch geofence events
  const { data: geofenceEvents = [] } = useQuery({
    queryKey: ["widget-geofence-events", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("geofence_events")
        .select("id")
        .eq("organization_id", organizationId)
        .gte("event_time", dateRange.start.toISOString())
        .lte("event_time", dateRange.end.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["widget-alerts", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("alerts")
        .select("id")
        .eq("organization_id", organizationId)
        .gte("alert_time", dateRange.start.toISOString())
        .lte("alert_time", dateRange.end.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const total = speedViolations.length + driverEvents.length + geofenceEvents.length + alerts.length;

  const chartData = useMemo(() => {
    const data = [
      { name: "OverSpeeds", value: speedViolations.length, color: COLORS.overspeeds },
      { name: "Alerts", value: alerts.length, color: COLORS.alerts },
      { name: "Harsh Behavior", value: driverEvents.length, color: COLORS.harsh_behavior },
      { name: "NO-Go/Keep In", value: geofenceEvents.length, color: COLORS.geofence },
    ];
    return data.filter(d => d.value > 0);
  }, [speedViolations.length, driverEvents.length, geofenceEvents.length, alerts.length]);

  const legendData = [
    { name: "OverSpeeds", value: speedViolations.length, percentage: total > 0 ? ((speedViolations.length / total) * 100).toFixed(1) : "0.0", color: COLORS.overspeeds },
    { name: "Alerts", value: alerts.length, percentage: total > 0 ? ((alerts.length / total) * 100).toFixed(1) : "0.0", color: COLORS.alerts },
    { name: "Harsh Behavior", value: driverEvents.length, percentage: total > 0 ? ((driverEvents.length / total) * 100).toFixed(1) : "0.0", color: COLORS.harsh_behavior },
    { name: "NO-Go/Keep In", value: geofenceEvents.length, percentage: total > 0 ? ((geofenceEvents.length / total) * 100).toFixed(1) : "0.0", color: COLORS.geofence },
  ];

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Fleet Violations</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="w-28 h-8 text-xs bg-muted/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.length > 0 ? chartData : [{ name: "No Data", value: 1, color: "hsl(var(--muted))" }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {(chartData.length > 0 ? chartData : [{ name: "No Data", value: 1, color: "hsl(var(--muted))" }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">{total}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {legendData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
