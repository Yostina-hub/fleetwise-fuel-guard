import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import GlowingCard from "./GlowingCard";

interface MonthlyRiskData {
  month: string;
  speeding: number;
  harshAcceleration: number;
  harshBraking: number;
  excessiveIdle: number;
  harshCornering: number;
}

interface RiskSafetyReportsChartProps {
  data: MonthlyRiskData[];
  loading?: boolean;
}

const RiskSafetyReportsChart = ({ data, loading }: RiskSafetyReportsChartProps) => {
  if (loading) {
    return (
      <GlowingCard className="h-80" glowColor="warning">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-56 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  const colors = {
    speeding: "hsl(var(--chart-1))",
    harshAcceleration: "hsl(var(--chart-2))",
    harshBraking: "hsl(var(--destructive))",
    excessiveIdle: "hsl(var(--chart-3))",
    harshCornering: "hsl(var(--chart-4))",
  };

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
        </div>
      );
    }
    return null;
  };

  return (
    <GlowingCard glowColor="warning">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-white tracking-tight">Risk and Safety Reports</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { key: 'speeding', label: 'Speeding', color: colors.speeding },
            { key: 'harshAcceleration', label: 'Harsh Accel', color: colors.harshAcceleration },
            { key: 'harshBraking', label: 'Harsh Braking', color: colors.harshBraking },
            { key: 'excessiveIdle', label: 'Excessive Idle', color: colors.excessiveIdle },
            { key: 'harshCornering', label: 'Harsh Cornering', color: colors.harshCornering },
          ].map((item, index) => (
            <motion.div 
              key={item.key}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
              <motion.div 
                className="w-2.5 h-2.5 rounded-sm shadow-lg" 
                style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}40` }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
              />
              <span className="text-white/70">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="h-56"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="speeding" fill={colors.speeding} name="Speeding" radius={[2, 2, 0, 0]} />
            <Bar dataKey="harshAcceleration" fill={colors.harshAcceleration} name="Harsh Accel" radius={[2, 2, 0, 0]} />
            <Bar dataKey="harshBraking" fill={colors.harshBraking} name="Harsh Braking" radius={[2, 2, 0, 0]} />
            <Bar dataKey="excessiveIdle" fill={colors.excessiveIdle} name="Excessive Idle" radius={[2, 2, 0, 0]} />
            <Bar dataKey="harshCornering" fill={colors.harshCornering} name="Harsh Cornering" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </GlowingCard>
  );
};

export default RiskSafetyReportsChart;
