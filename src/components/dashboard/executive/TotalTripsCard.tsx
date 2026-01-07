import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

interface TotalTripsCardProps {
  allTrips: number;
  dailyAverage: number;
  activeAssets: number;
  chartData?: { hour: string; trips: number }[];
  loading?: boolean;
}

export const TotalTripsCard = ({ 
  allTrips, 
  dailyAverage, 
  activeAssets, 
  chartData,
  loading 
}: TotalTripsCardProps) => {
  const [period, setPeriod] = useState("today");
  const [showChart, setShowChart] = useState(true);

  const defaultChartData = useMemo(() => {
    if (chartData) return chartData;
    // Generate sample hourly data
    return Array.from({ length: 8 }, (_, i) => ({
      hour: `${10 + i}`,
      trips: Math.floor(Math.random() * 4) + 10,
    }));
  }, [chartData]);

  if (loading) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Total Trips
            </CardTitle>
            <div className="flex items-center gap-3">
              <Switch 
                checked={showChart} 
                onCheckedChange={setShowChart}
                className="data-[state=checked]:bg-primary"
              />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">All trips</p>
              <p className="text-2xl font-bold text-foreground">{allTrips}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daily average</p>
              <p className="text-2xl font-bold text-foreground">{dailyAverage}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assets</p>
              <p className="text-2xl font-bold text-foreground">{activeAssets}</p>
            </div>
          </div>

          {/* Chart */}
          {showChart && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defaultChartData} barSize={40}>
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    domain={[10, 'auto']}
                  />
                  <Bar dataKey="trips" radius={[4, 4, 0, 0]}>
                    {defaultChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#8DC63F" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TotalTripsCard;
