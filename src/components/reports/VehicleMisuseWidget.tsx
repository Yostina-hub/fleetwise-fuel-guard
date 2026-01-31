import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

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
  speeding_device: "hsl(200, 85%, 55%)", // Blue
  harsh_acceleration: "hsl(0, 70%, 55%)", // Red
  harsh_cornering: "hsl(170, 60%, 50%)", // Teal
  speeding_platform: "hsl(320, 70%, 55%)", // Pink
  harsh_braking: "hsl(40, 90%, 55%)", // Orange
  excessive_idle: "hsl(80, 60%, 50%)", // Green-yellow
  speeding_road: "hsl(20, 80%, 55%)", // Orange-red
};

export const VehicleMisuseWidget = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
  const { organizationId } = useOrganization();

  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod]);

  // Fetch driver events categorized by type
  const { data: driverEvents = [] } = useQuery({
    queryKey: ["widget-misuse-events", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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

  // Fetch speed violations
  const { data: speedViolations = [] } = useQuery({
    queryKey: ["widget-misuse-speed", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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

  // Categorize events
  const categorizedData = useMemo(() => {
    const counts: Record<string, number> = {
      speeding_device: speedViolations.length,
      harsh_acceleration: 0,
      harsh_cornering: 0,
      harsh_braking: 0,
      excessive_idle: 0,
      speeding_platform: 0,
      speeding_road: 0,
    };

    driverEvents.forEach((event) => {
      const type = event.event_type?.toLowerCase() || "";
      if (type.includes("acceleration") || type.includes("accel")) {
        counts.harsh_acceleration++;
      } else if (type.includes("cornering") || type.includes("turn")) {
        counts.harsh_cornering++;
      } else if (type.includes("braking") || type.includes("brake")) {
        counts.harsh_braking++;
      } else if (type.includes("idle")) {
        counts.excessive_idle++;
      } else if (type.includes("speed")) {
        counts.speeding_platform++;
      }
    });

    return counts;
  }, [driverEvents, speedViolations.length]);

  const total = Object.values(categorizedData).reduce((sum, val) => sum + val, 0);

  const chartData = useMemo(() => {
    return [
      { name: "Speeding (device)", value: categorizedData.speeding_device, color: COLORS.speeding_device },
      { name: "Harsh acceleration", value: categorizedData.harsh_acceleration, color: COLORS.harsh_acceleration },
      { name: "Harsh cornering", value: categorizedData.harsh_cornering, color: COLORS.harsh_cornering },
      { name: "Speeding (platform)", value: categorizedData.speeding_platform, color: COLORS.speeding_platform },
      { name: "Harsh braking", value: categorizedData.harsh_braking, color: COLORS.harsh_braking },
      { name: "Excessive idle", value: categorizedData.excessive_idle, color: COLORS.excessive_idle },
      { name: "Speeding (road)", value: categorizedData.speeding_road, color: COLORS.speeding_road },
    ].filter((d) => d.value > 0);
  }, [categorizedData]);

  const legendItems = [
    { name: "Speeding (device)", color: COLORS.speeding_device },
    { name: "Harsh acceleration", color: COLORS.harsh_acceleration },
    { name: "Harsh cornering", color: COLORS.harsh_cornering },
    { name: "Speeding (platform)", color: COLORS.speeding_platform },
    { name: "Harsh braking", color: COLORS.harsh_braking },
    { name: "Excessive idle", color: COLORS.excessive_idle },
    { name: "Speeding (road)", color: COLORS.speeding_road },
  ];

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Vehicle Misuse Overview</CardTitle>
        </div>
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
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center gap-4">
          {/* Donut Chart */}
          <div className="relative w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.length > 0 ? chartData : [{ name: "No Data", value: 1, color: "hsl(var(--muted))" }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
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
              <span className="text-3xl font-bold text-foreground">{total}</span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {legendItems.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
