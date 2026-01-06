import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import GlowingCard from "./GlowingCard";

interface StopsData {
  day: string;
  shortStops: number;
  mediumStops: number;
  longStops: number;
}

interface StopsAnalysisChartProps {
  data: StopsData[];
  loading?: boolean;
}

const StopsAnalysisChart = ({ data, loading }: StopsAnalysisChartProps) => {
  if (loading) {
    return (
      <GlowingCard className="h-72" glowColor="primary">
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
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded" style={{ backgroundColor: entry.color }} />
              {entry.name}: {entry.value}
            </p>
          ))}
          <p className="text-sm font-medium mt-2 pt-2 border-t">
            Total: {payload.reduce((sum: number, p: any) => sum + p.value, 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <GlowingCard glowColor="primary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Number of Stops Per Day</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
            <span>Short (&lt;10 mins)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span>10-20 mins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
            <span>20-30 mins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
            <span>30-40 mins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
            <span>Long (&gt;40 mins)</span>
          </div>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-48"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="shortStops" stackId="a" fill="hsl(var(--chart-1))" name="Short stops" radius={[0, 0, 0, 0]} />
            <Bar dataKey="mediumStops" stackId="a" fill="hsl(var(--chart-2))" name="Medium stops" radius={[0, 0, 0, 0]} />
            <Bar dataKey="longStops" stackId="a" fill="hsl(var(--destructive))" name="Long stops" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </GlowingCard>
  );
};

export default StopsAnalysisChart;
