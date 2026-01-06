import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import GlowingCard from "./GlowingCard";
import { Badge } from "@/components/ui/badge";

interface UsageData {
  date: string;
  trips: number;
}

interface FleetUsageChartProps {
  data: UsageData[];
  dateRange: string;
  loading?: boolean;
}

const FleetUsageChart = ({ data, dateRange, loading }: FleetUsageChartProps) => {
  if (loading) {
    return (
      <GlowingCard className="h-72" glowColor="success">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  const avgTrips = data.length > 0 
    ? Math.round(data.reduce((sum, d) => sum + d.trips, 0) / data.length)
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <p className="text-lg font-bold text-success">
            {payload[0].value} trips
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <GlowingCard glowColor="success">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Fleet Usage Report</h3>
        <Badge variant="outline" className="text-xs">
          {dateRange}
        </Badge>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div>
          <span className="text-xs text-muted-foreground">Total Trips</span>
          <p className="text-2xl font-bold text-success">
            {data.reduce((sum, d) => sum + d.trips, 0).toLocaleString()}
          </p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground">Avg/Day</span>
          <p className="text-2xl font-bold">{avgTrips}</p>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-36"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="trips" 
              fill="hsl(var(--success))" 
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </GlowingCard>
  );
};

export default FleetUsageChart;
