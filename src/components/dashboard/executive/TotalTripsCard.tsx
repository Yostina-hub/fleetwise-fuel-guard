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
      <Card className="bg-card border-border">
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
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="bg-card border-border overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-500">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5 pointer-events-none" />
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground tracking-tight">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Settings2 className="w-5 h-5 text-primary" />
              </motion.div>
              Total Trips
            </CardTitle>
            <div className="flex items-center gap-3">
              <Switch 
                checked={showChart} 
                onCheckedChange={setShowChart}
                className="data-[state=checked]:bg-primary"
              />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/50 border-border">
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

        <CardContent className="pt-0 relative">
          {/* Stats Row with enhanced styling */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'All trips', value: allTrips, color: 'text-primary' },
              { label: 'Daily average', value: dailyAverage, color: 'text-secondary' },
              { label: 'Assets', value: activeAssets, color: 'text-success' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
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

          {/* Chart with smooth reveal */}
          {showChart && (
            <motion.div 
              className="h-40"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 160 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
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
                  <Bar dataKey="trips" radius={[6, 6, 0, 0]}>
                    {defaultChartData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#8DC63F"
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
