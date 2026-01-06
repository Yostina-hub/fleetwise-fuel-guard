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
        <h3 className="font-semibold text-lg">Risk and Safety Reports</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.speeding }} />
            <span>Speeding</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.harshAcceleration }} />
            <span>Harsh Accel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.harshBraking }} />
            <span>Harsh Braking</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.excessiveIdle }} />
            <span>Excessive Idle</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.harshCornering }} />
            <span>Harsh Cornering</span>
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
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="speeding" fill={colors.speeding} name="Speeding" />
            <Bar dataKey="harshAcceleration" fill={colors.harshAcceleration} name="Harsh Accel" />
            <Bar dataKey="harshBraking" fill={colors.harshBraking} name="Harsh Braking" />
            <Bar dataKey="excessiveIdle" fill={colors.excessiveIdle} name="Excessive Idle" />
            <Bar dataKey="harshCornering" fill={colors.harshCornering} name="Harsh Cornering" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </GlowingCard>
  );
};

export default RiskSafetyReportsChart;
