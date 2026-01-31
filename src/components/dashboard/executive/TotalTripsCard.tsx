import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";

type TimePeriod = "today" | "yesterday" | "last_7_days" | "last_30_days";

const TIME_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
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
    default:
      return { start: subDays(today, 6), end: endOfDay(today) };
  }
};

export const TotalTripsCard = () => {
  const [period, setPeriod] = useState<TimePeriod>("today");
  const [showChart, setShowChart] = useState(true);
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();

  const dateRange = useMemo(() => getDateRange(period), [period]);
  const daysInRange = useMemo(() => eachDayOfInterval({ start: dateRange.start, end: dateRange.end }), [dateRange]);

  // Fetch trips
  const { data: trips = [] } = useQuery({
    queryKey: ["total-trips-widget", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("trips")
        .select("id, start_time")
        .eq("organization_id", organizationId)
        .gte("start_time", dateRange.start.toISOString())
        .lte("start_time", dateRange.end.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Calculate metrics
  const totalTrips = trips.length;
  const dailyAverage = daysInRange.length > 0 ? Math.round(totalTrips / daysInRange.length) : 0;
  const activeAssets = vehicles.filter(v => v.status === 'active').length;

  // Prepare chart data
  const chartData = useMemo(() => {
    const tripsByDay: Record<string, number> = {};

    // Initialize all days
    daysInRange.forEach((day) => {
      tripsByDay[format(day, "d")] = 0;
    });

    // Count trips per day
    trips.forEach((trip) => {
      const day = format(new Date(trip.start_time), "d");
      if (tripsByDay[day] !== undefined) {
        tripsByDay[day]++;
      }
    });

    return Object.entries(tripsByDay).map(([day, count]) => ({
      day,
      trips: count,
    }));
  }, [trips, daysInRange]);

  const maxTrips = Math.max(...chartData.map((d) => d.trips), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="border-cyan-500/20 backdrop-blur-sm overflow-hidden hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-500" style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#8DC63F]/5 via-transparent to-cyan-500/5 pointer-events-none" />
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Settings2 className="w-5 h-5 text-[#8DC63F]" />
              </motion.div>
              Total Trips
            </CardTitle>
            <div className="flex items-center gap-3">
              <Switch 
                checked={showChart} 
                onCheckedChange={setShowChart}
                className="data-[state=checked]:bg-[#8DC63F]"
              />
              <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[100px] h-8 text-xs bg-white/10 border-cyan-500/30 text-white">
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
          </div>
        </CardHeader>

        <CardContent className="pt-0 relative">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'All trips', value: totalTrips, color: 'text-[#8DC63F]' },
              { label: 'Daily average', value: dailyAverage, color: 'text-cyan-400' },
              { label: 'Assets', value: activeAssets, color: 'text-emerald-400' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <p className="text-xs text-white/60 font-medium">{stat.label}</p>
                <motion.p 
                  className={`text-3xl font-bold ${stat.color}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, type: "spring", stiffness: 200 }}
                >
                  {stat.value}
                </motion.p>
              </motion.div>
            ))}
          </div>

          {showChart && chartData.length > 0 && (
            <motion.div 
              className="h-40"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 160 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={40}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
                    domain={[0, Math.ceil(maxTrips * 1.2)]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} trips`, "Trips"]}
                  />
                  <Bar dataKey="trips" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#8DC63F"
                        fillOpacity={0.6 + (entry.trips / maxTrips) * 0.4}
                        className="drop-shadow-sm"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TotalTripsCard;
