import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PerformanceMetric {
  metric: string;
  value: number;
  target: number;
  fullMark: number;
}

interface PerformanceRadarProps {
  data: PerformanceMetric[];
  overallScore: number;
  loading?: boolean;
}

const PerformanceRadar = ({ data, overallScore, loading }: PerformanceRadarProps) => {
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-6 h-80"
      >
        <div className="animate-pulse flex items-center justify-center h-full">
          <div className="w-48 h-48 rounded-full bg-muted/30" />
        </div>
      </motion.div>
    );
  }

  const radarData = data.map(d => ({
    subject: d.metric,
    A: d.value,
    B: d.target,
    fullMark: d.fullMark,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 overflow-hidden"
    >
      {/* Glow effect */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Performance Analysis</h3>
            <p className="text-sm text-white/70">Fleet vs Target Metrics</p>
          </div>
          <motion.div 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30"
            whileHover={{ scale: 1.05 }}
          >
            <Target className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-white/70">Overall</p>
              <p className="text-xl font-bold text-primary">{overallScore}%</p>
            </div>
          </motion.div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.3}
              />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }}
              />
              <Radar
                name="Target"
                dataKey="B"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted))"
                fillOpacity={0.3}
                strokeDasharray="5 5"
              />
              <Radar
                name="Actual"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-white/80 font-medium">Current Performance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted border border-white/30" />
            <span className="text-xs text-white/80 font-medium">Target</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceRadar;
