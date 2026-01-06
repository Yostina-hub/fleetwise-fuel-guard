import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import GlowingCard from "./GlowingCard";

interface DistanceData {
  time: string;
  [groupName: string]: number | string;
}

interface GroupConfig {
  name: string;
  color: string;
}

interface DistanceByGroupChartProps {
  data: DistanceData[];
  groups: GroupConfig[];
  loading?: boolean;
}

const DistanceByGroupChart = ({ data, groups, loading }: DistanceByGroupChartProps) => {
  if (loading) {
    return (
      <GlowingCard className="h-80 lg:col-span-2" glowColor="primary">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-56 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 max-h-48 overflow-auto">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded" style={{ backgroundColor: entry.color }} />
              {entry.name}: {entry.value?.toFixed(1)} km
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <GlowingCard glowColor="primary" className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Distance by Group per Hour</h3>
        <div className="flex flex-wrap gap-2 text-xs max-w-md">
          {groups.slice(0, 6).map((group) => (
            <div key={group.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: group.color }} />
              <span className="truncate max-w-[80px]">{group.name}</span>
            </div>
          ))}
          {groups.length > 6 && (
            <span className="text-muted-foreground">+{groups.length - 6} more</span>
          )}
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-56"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} label={{ value: 'Distance', angle: -90, position: 'insideLeft', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            {groups.map((group) => (
              <Line
                key={group.name}
                type="monotone"
                dataKey={group.name}
                stroke={group.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </GlowingCard>
  );
};

export default DistanceByGroupChart;
