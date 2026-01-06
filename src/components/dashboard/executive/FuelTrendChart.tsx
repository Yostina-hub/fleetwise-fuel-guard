import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import GlowingCard from "./GlowingCard";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FuelTrendData {
  month: string;
  consumption: number;
  cost: number;
}

interface FuelTrendChartProps {
  data: FuelTrendData[];
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  loading?: boolean;
}

const FuelTrendChart = ({ data, trend, trendPercentage, loading }: FuelTrendChartProps) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'down' ? 'text-success' : trend === 'up' ? 'text-destructive' : 'text-muted-foreground';

  if (loading) {
    return (
      <GlowingCard className="h-64" glowColor="warning">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{label}</p>
          <p className="text-sm text-warning">
            Consumption: {payload[0]?.value?.toLocaleString()} L
          </p>
          <p className="text-sm text-primary">
            Cost: ETB {payload[1]?.value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <GlowingCard glowColor="warning">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Last 3 Months Fuel Trend</h3>
          <div className="flex items-center gap-2 mt-1">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className={`text-sm font-medium ${trendColor}`}>
              {trendPercentage.toFixed(1)}% {trend === 'down' ? 'decrease' : trend === 'up' ? 'increase' : 'stable'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Fuel Usage</span>
          <p className="text-2xl font-bold text-warning">
            {data.reduce((s, d) => s + d.consumption, 0).toLocaleString()} L
          </p>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-40"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="consumption"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              fill="url(#fuelGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </GlowingCard>
  );
};

export default FuelTrendChart;
