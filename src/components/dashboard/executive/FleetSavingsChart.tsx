import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts";
import GlowingCard from "./GlowingCard";

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
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ETB {(entry.value / 1000).toFixed(1)}K
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <GlowingCard glowColor="primary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Fleet Savings Summary</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>This Month</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-warning" />
            <span>Potential</span>
          </div>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-56"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
            <Bar dataKey="potential" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="mt-4 pt-4 border-t flex justify-between text-sm">
        <span className="text-muted-foreground">*Measured in Thousands</span>
        <span className="font-medium text-success">
          Total Savings: ETB {data.reduce((sum, d) => sum + d.actual, 0).toLocaleString()}
        </span>
      </div>
    </GlowingCard>
  );
};

export default FleetSavingsChart;
