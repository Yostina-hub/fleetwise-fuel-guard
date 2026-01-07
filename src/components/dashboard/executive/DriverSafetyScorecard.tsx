import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import GlowingCard from "./GlowingCard";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";

interface RiskCategory {
  label: string;
  count: number;
  color: string;
  range: string;
}

interface DriverSafetyScorecardProps {
  categories: RiskCategory[];
  loading?: boolean;
}

const DriverSafetyScorecard = ({ categories, loading }: DriverSafetyScorecardProps) => {
  if (loading) {
    return (
      <GlowingCard className="h-80" glowColor="success">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  const total = categories.reduce((sum, cat) => sum + cat.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.label}</p>
          <p className="text-sm text-muted-foreground">{data.range}</p>
          <p className="text-lg font-bold" style={{ color: data.color }}>
            {data.count} drivers
          </p>
          <p className="text-xs text-muted-foreground">
            {((data.count / total) * 100).toFixed(1)}% of fleet
          </p>
        </div>
      );
    }
    return null;
  };

  const getIcon = (label: string) => {
    if (label.includes('High Risk')) return <ShieldX className="w-4 h-4" />;
    if (label.includes('Medium High')) return <ShieldAlert className="w-4 h-4" />;
    if (label.includes('Medium')) return <AlertTriangle className="w-4 h-4" />;
    if (label.includes('Low')) return <Shield className="w-4 h-4" />;
    return <ShieldCheck className="w-4 h-4" />;
  };

  return (
    <GlowingCard glowColor="success">
      <h3 className="font-bold text-lg mb-4 text-foreground tracking-tight">Driver Safety Scorecard</h3>
      
      <div className="flex items-center gap-6">
        <motion.div 
          className="relative w-40 h-40"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="count"
              >
                {categories.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="drop-shadow-lg"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ShieldCheck className="w-6 h-6 text-success mb-1 drop-shadow-lg" />
            </motion.div>
            <motion.span 
              className="text-2xl font-bold text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {total}
            </motion.span>
            <span className="text-xs text-muted-foreground">Drivers</span>
          </div>
        </motion.div>

        <div className="flex-1 space-y-2.5">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, ease: "easeOut" }}
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 group"
            >
              <motion.div 
                className="w-3 h-3 rounded-sm flex-shrink-0 shadow-lg" 
                style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}40` }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.2 }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                    {getIcon(cat.label)}
                    {cat.label}
                  </span>
                  <span className="text-sm font-bold text-foreground">{cat.count}</span>
                </div>
                <span className="text-xs text-muted-foreground">{cat.range}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlowingCard>
  );
};

export default DriverSafetyScorecard;
