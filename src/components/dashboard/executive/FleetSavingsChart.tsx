import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import GlowingCard from "./GlowingCard";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface SavingsData {
  category: string;
  actual: number;
  potential: number;
}

interface FleetSavingsChartProps {
  data: SavingsData[];
  loading?: boolean;
}

const FleetSavingsChart = ({ data, loading }: FleetSavingsChartProps) => {
  const totalActual = data.reduce((sum, d) => sum + d.actual, 0);
  const { formattedValue: animatedTotal } = useAnimatedCounter(totalActual, { duration: 1500 });

  if (loading) {
    return (
      <GlowingCard className="h-80" glowColor="primary">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-popover border rounded-lg shadow-lg p-3"
        >
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ETB {(entry.value / 1000).toFixed(1)}K
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <GlowingCard glowColor="primary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-foreground tracking-tight">Fleet Savings Summary</h3>
        <div className="flex items-center gap-4 text-xs">
          <motion.div 
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className="w-3 h-3 rounded bg-primary shadow-lg shadow-primary/50"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-muted-foreground">This Month</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="w-3 h-3 rounded bg-warning shadow-lg shadow-warning/50" />
            <span className="text-muted-foreground">Potential</span>
          </motion.div>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="h-56"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              type="category" 
              dataKey="category" 
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={18} />
            <Bar dataKey="potential" fill="hsl(var(--warning))" radius={[0, 6, 6, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div 
        className="mt-4 pt-4 border-t border-border flex justify-between text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-muted-foreground">*Measured in Thousands</span>
        <motion.span 
          className="font-bold text-success text-lg"
          key={totalActual}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          Total Savings: ETB {animatedTotal}
        </motion.span>
      </motion.div>
    </GlowingCard>
  );
};

export default FleetSavingsChart;
