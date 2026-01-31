import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";

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
  speedingDevice: "#0072BC",
  harshBraking: "#f59e0b",
  harshAcceleration: "#ef4444",
  excessiveIdle: "#8DC63F",
  harshCornering: "#14b8a6",
  speedingRoad: "#fb923c",
  speedingPlatform: "#be185d",
};

export const VehicleMisuseDonut = () => {
  const [period, setPeriod] = useState<TimePeriod>("last_7_days");
  const { organizationId } = useOrganization();

  const dateRange = useMemo(() => getDateRange(period), [period]);

  // Fetch driver events
  const { data: driverEvents = [] } = useQuery({
    queryKey: ["vehicle-misuse-events", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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
    queryKey: ["vehicle-misuse-speed", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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
    const counts = {
      speedingDevice: speedViolations.length,
      harshAcceleration: 0,
      harshCornering: 0,
      harshBraking: 0,
      excessiveIdle: 0,
      speedingPlatform: 0,
      speedingRoad: 0,
    };

    driverEvents.forEach((event) => {
      const type = event.event_type?.toLowerCase() || "";
      if (type.includes("acceleration") || type.includes("accel")) {
        counts.harshAcceleration++;
      } else if (type.includes("cornering") || type.includes("turn")) {
        counts.harshCornering++;
      } else if (type.includes("braking") || type.includes("brake")) {
        counts.harshBraking++;
      } else if (type.includes("idle")) {
        counts.excessiveIdle++;
      } else if (type.includes("speed")) {
        counts.speedingPlatform++;
      }
    });

    return counts;
  }, [driverEvents, speedViolations.length]);

  const total = Object.values(categorizedData).reduce((sum, val) => sum + val, 0);

  const chartData = useMemo(() => [
    { name: "Speeding (device)", value: categorizedData.speedingDevice, color: COLORS.speedingDevice },
    { name: "harsh braking", value: categorizedData.harshBraking, color: COLORS.harshBraking },
    { name: "harsh acceleration", value: categorizedData.harshAcceleration, color: COLORS.harshAcceleration },
    { name: "excessive idle", value: categorizedData.excessiveIdle, color: COLORS.excessiveIdle },
    { name: "harsh cornering", value: categorizedData.harshCornering, color: COLORS.harshCornering },
    { name: "Speeding (road speed)", value: categorizedData.speedingRoad, color: COLORS.speedingRoad },
    { name: "Speeding (platform)", value: categorizedData.speedingPlatform, color: COLORS.speedingPlatform },
  ].filter(item => item.value > 0), [categorizedData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="border-cyan-500/20 backdrop-blur-sm overflow-hidden hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-500" style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-red-500/5 pointer-events-none" />
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <Settings2 className="w-5 h-5 text-amber-400" />
              </motion.div>
              Vehicle Misuse Overview
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
                  data={chartData.length > 0 ? chartData : [{ name: "No Data", value: 1, color: "hsl(var(--muted))" }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {(chartData.length > 0 ? chartData : [{ name: "No Data", value: 1, color: "hsl(var(--muted))" }]).map((entry, index) => (
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
                transition={{ delay: 0.4 }}
              >
                Total
              </motion.span>
              <motion.span 
                className="text-4xl font-bold text-foreground"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                {total.toLocaleString()}
              </motion.span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              { label: 'Speeding (device)', color: COLORS.speedingDevice },
              { label: 'Harsh braking', color: COLORS.harshBraking },
              { label: 'Harsh acceleration', color: COLORS.harshAcceleration },
              { label: 'Excessive idle', color: COLORS.excessiveIdle },
              { label: 'Harsh cornering', color: COLORS.harshCornering },
              { label: 'Speeding (road)', color: COLORS.speedingRoad },
              { label: 'Speeding (platform)', color: COLORS.speedingPlatform },
            ].map((item, index) => (
              <motion.div 
                key={item.label}
                className="flex items-center gap-2 group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                whileHover={{ x: 2 }}
              >
                <motion.div 
                  className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.15 }}
                />
                <span className="text-foreground/70 truncate group-hover:text-foreground transition-colors text-xs">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VehicleMisuseDonut;
