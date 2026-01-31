import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

type TimePeriod = "today" | "yesterday" | "last_7_days" | "last_30_days" | "this_month";

const TIME_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
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
      return { start: subDays(today, 6), end: endOfDay(today) };
    case "last_30_days":
      return { start: subDays(today, 29), end: endOfDay(today) };
    case "this_month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    default:
      return { start: subDays(today, 6), end: endOfDay(today) };
  }
};

const COLORS = {
  overSpeeds: "#0072BC",
  alerts: "#f59e0b",
  harshBehavior: "#ef4444",
  noGoKeepIn: "#8DC63F",
};

export const FleetViolationsDonut = () => {
  const [period, setPeriod] = useState<TimePeriod>("last_7_days");
  const { organizationId } = useOrganization();

  const dateRange = useMemo(() => getDateRange(period), [period]);

  // Fetch speed violations
  const { data: speedViolations = [] } = useQuery({
    queryKey: ["fleet-violations-speed", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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

  // Fetch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["fleet-violations-alerts", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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

  // Fetch driver events (harsh behavior)
  const { data: driverEvents = [] } = useQuery({
    queryKey: ["fleet-violations-driver-events", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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

  // Fetch geofence events (no-go/keep-in)
  const { data: geofenceEvents = [] } = useQuery({
    queryKey: ["fleet-violations-geofence", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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

  const data = useMemo(() => ({
    overSpeeds: speedViolations.length,
    alerts: alerts.length,
    harshBehavior: driverEvents.length,
    noGoKeepIn: geofenceEvents.length,
  }), [speedViolations.length, alerts.length, driverEvents.length, geofenceEvents.length]);

  const total = useMemo(() => 
    data.overSpeeds + data.alerts + data.harshBehavior + data.noGoKeepIn,
    [data]
  );

  const chartData = useMemo(() => [
    { name: "OverSpeeds", value: data.overSpeeds, color: COLORS.overSpeeds },
    { name: "Alerts", value: data.alerts, color: COLORS.alerts },
    { name: "Harsh Behavior", value: data.harshBehavior, color: COLORS.harshBehavior },
    { name: "NO-Go/Keep In", value: data.noGoKeepIn, color: COLORS.noGoKeepIn },
  ], [data]);

  const percentages = useMemo(() => ({
    overSpeeds: total > 0 ? ((data.overSpeeds / total) * 100).toFixed(1) : "0",
    alerts: total > 0 ? ((data.alerts / total) * 100).toFixed(1) : "0",
    harshBehavior: total > 0 ? ((data.harshBehavior / total) * 100).toFixed(1) : "0",
    noGoKeepIn: total > 0 ? ((data.noGoKeepIn / total) * 100).toFixed(1) : "0",
  }), [data, total]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="border-cyan-500/20 backdrop-blur-sm relative overflow-hidden hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-500" style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-[#8DC63F]/5 pointer-events-none" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Settings2 className="w-5 h-5 text-cyan-400" />
              </motion.div>
              Fleet Violations
            </CardTitle>
            <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-white/10 border-cyan-500/30 text-white">
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
          </div>
        </CardHeader>

        <CardContent className="pt-0 relative">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.length > 0 && total > 0 ? chartData : [{ name: "No Data", value: 1, color: "hsl(var(--muted))" }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {(chartData.length > 0 && total > 0 ? chartData : [{ name: "No Data", value: 1, color: "hsl(var(--muted))" }]).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="drop-shadow-md"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                className="text-sm text-muted-foreground font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Total
              </motion.span>
              <motion.span 
                className="text-4xl font-bold text-foreground"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {total.toLocaleString()}
              </motion.span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {[
              { key: 'overSpeeds', label: 'OverSpeeds', color: COLORS.overSpeeds, value: percentages.overSpeeds },
              { key: 'alerts', label: 'Alerts', color: COLORS.alerts, value: percentages.alerts },
              { key: 'harshBehavior', label: 'Harsh Behavior', color: COLORS.harshBehavior, value: percentages.harshBehavior },
              { key: 'noGoKeepIn', label: 'NO-Go/Keep In', color: COLORS.noGoKeepIn, value: percentages.noGoKeepIn },
            ].map((item, index) => (
              <motion.div 
                key={item.key}
                className="flex items-center gap-2 group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <motion.div 
                  className="w-3 h-3 rounded-sm shadow-sm"
                  style={{ backgroundColor: item.color }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
                <span className="text-sm font-bold ml-auto text-foreground">{item.value}%</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FleetViolationsDonut;
