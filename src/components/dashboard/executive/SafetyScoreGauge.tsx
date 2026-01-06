import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import GlowingCard from "./GlowingCard";

interface SafetyScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

const SafetyScoreGauge = ({ score, label, size = "md", showLabels = true }: SafetyScoreGaugeProps) => {
  const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, fontSize: "text-2xl" },
    md: { width: 160, strokeWidth: 10, fontSize: "text-3xl" },
    lg: { width: 200, strokeWidth: 12, fontSize: "text-4xl" },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2 - 10;
  const circumference = radius * Math.PI; // Semi-circle
  const progress = (score / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return { stroke: "hsl(var(--success))", bg: "hsl(var(--success) / 0.1)" };
    if (value >= 60) return { stroke: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.1)" };
    return { stroke: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.1)" };
  };

  const colors = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width / 2 + 20 }}>
        <svg
          width={config.width}
          height={config.width / 2 + 20}
          viewBox={`0 0 ${config.width} ${config.width / 2 + 20}`}
          className="transform"
        >
          {/* Background arc */}
          <path
            d={`M ${config.strokeWidth / 2 + 10} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2 - 10} ${config.width / 2}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <motion.path
            d={`M ${config.strokeWidth / 2 + 10} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2 - 10} ${config.width / 2}`}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          {/* Scale labels */}
          {showLabels && (
            <>
              <text x="15" y={config.width / 2 + 15} className="fill-muted-foreground text-xs">0</text>
              <text x={config.width / 2 - 5} y="15" className="fill-muted-foreground text-xs">50</text>
              <text x={config.width - 25} y={config.width / 2 + 15} className="fill-muted-foreground text-xs">100</text>
            </>
          )}
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <motion.span
            className={cn("font-bold", config.fontSize)}
            style={{ color: colors.stroke }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {score}
          </motion.span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground mt-1">{label}</span>
    </div>
  );
};

interface SafetyScoreCardProps {
  overallScore: number;
  categories: { name: string; score: number; count: number; icon: React.ReactNode }[];
  loading?: boolean;
}

export const SafetyScoreCard = ({ overallScore, categories, loading }: SafetyScoreCardProps) => {
  if (loading) {
    return (
      <GlowingCard className="h-64" glowColor="success">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  return (
    <GlowingCard glowColor={overallScore >= 80 ? "success" : overallScore >= 60 ? "warning" : "destructive"}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Safety Score</h3>
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Last 30 days</span>
      </div>
      
      <div className="flex items-start gap-6">
        <SafetyScoreGauge score={overallScore} label="Overall" size="lg" />
        
        <div className="flex-1 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Safety Categories</h4>
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="p-1.5 rounded bg-muted/50">{cat.icon}</div>
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span>{cat.name}</span>
                  <span className="font-medium">{cat.count} Vehicles</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlowingCard>
  );
};

export default SafetyScoreGauge;
