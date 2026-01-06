import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HourData {
  hour: string;
  trips: number;
  isCurrentHour?: boolean;
}

interface TripActivityHeatmapProps {
  data: HourData[];
  peakHour: string;
  averageTrips: number;
  loading?: boolean;
}

const TripActivityHeatmap = ({ data, peakHour, averageTrips, loading }: TripActivityHeatmapProps) => {
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-6 h-64"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/30 rounded w-1/3" />
          <div className="h-40 bg-muted/20 rounded-xl" />
        </div>
      </motion.div>
    );
  }

  const maxTrips = Math.max(...data.map(d => d.trips));

  const getBarColor = (trips: number, isCurrentHour?: boolean) => {
    if (isCurrentHour) return 'hsl(var(--primary))';
    const intensity = trips / maxTrips;
    if (intensity > 0.7) return 'hsl(var(--success))';
    if (intensity > 0.4) return 'hsl(var(--warning))';
    return 'hsl(var(--muted-foreground) / 0.3)';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-popover border rounded-lg shadow-xl p-3"
        >
          <p className="font-medium text-sm">{payload[0].payload.hour}</p>
          <p className="text-lg font-bold text-primary">{payload[0].value} trips</p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Trip Activity</h3>
              <p className="text-sm text-muted-foreground">Hourly distribution today</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
              <Zap className="w-3 h-3" />
              Peak: {peakHour}
            </Badge>
          </div>
        </div>

        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Bar dataKey="trips" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.trips, entry.isCurrentHour)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Trips</p>
            <p className="text-lg font-bold text-foreground">
              {data.reduce((sum, d) => sum + d.trips, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Average/Hour</p>
            <p className="text-lg font-bold text-foreground">{averageTrips}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Peak Activity</p>
            <p className="text-lg font-bold text-success">{maxTrips}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TripActivityHeatmap;
