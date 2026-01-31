import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";

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
      return { start: subDays(today, 6), end: endOfDay(today) };
    case "this_week":
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case "this_month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    default:
      return { start: subDays(today, 6), end: endOfDay(today) };
  }
};

export const TotalTripsWidget = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
  const [showChart, setShowChart] = useState(true);
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();

  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod]);
  const daysInRange = useMemo(() => eachDayOfInterval({ start: dateRange.start, end: dateRange.end }), [dateRange]);

  // Fetch trips
  const { data: trips = [] } = useQuery({
    queryKey: ["widget-trips", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
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
  const totalAssets = vehicles.length;

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
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Total Trips</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={showChart} onCheckedChange={setShowChart} className="data-[state=checked]:bg-success" />
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
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Stats Row */}
        <div className="flex items-center gap-8 mb-4">
          <div>
            <div className="text-xs text-muted-foreground">All trips</div>
            <div className="text-2xl font-bold text-success">{totalTrips.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Daily average</div>
            <div className="text-2xl font-bold text-primary">{dailyAverage}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Assets</div>
            <div className="text-2xl font-bold text-chart-2">{totalAssets}</div>
          </div>
        </div>

        {/* Bar Chart */}
        {showChart && chartData.length > 0 && (
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
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
                <Bar dataKey="trips" radius={[4, 4, 0, 0]} fill="hsl(var(--success))">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill="hsl(var(--success))"
                      fillOpacity={0.6 + (entry.trips / maxTrips) * 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
