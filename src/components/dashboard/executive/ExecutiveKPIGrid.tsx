import { motion } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Minus, 
  Activity, AlertTriangle, DollarSign, Users,
  Truck, Route, Fuel, Target
} from "lucide-react";
import { ExecutiveKPI } from "@/hooks/useExecutiveMetrics";
import GlowingCard from "./GlowingCard";
import SparklineChart from "./SparklineChart";

interface ExecutiveKPIGridProps {
  kpis: ExecutiveKPI[];
  loading?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Operations: <Activity className="w-5 h-5" />,
  Safety: <AlertTriangle className="w-5 h-5" />,
  Finance: <DollarSign className="w-5 h-5" />,
  HR: <Users className="w-5 h-5" />,
};

const kpiIcons: Record<string, React.ReactNode> = {
  'Fleet Utilization': <Truck className="w-6 h-6" />,
  'Trips Completed': <Route className="w-6 h-6" />,
  'Critical Alerts': <AlertTriangle className="w-6 h-6" />,
  'Total Distance': <Activity className="w-6 h-6" />,
  'Active Drivers': <Users className="w-6 h-6" />,
  'Avg Safety Score': <Target className="w-6 h-6" />,
  'Fuel Expenses': <Fuel className="w-6 h-6" />,
  'Active Vehicles': <Truck className="w-6 h-6" />,
};

const ExecutiveKPIGrid = ({ kpis, loading }: ExecutiveKPIGridProps) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4" />;
      case 'down': return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isPositiveTrend: boolean = true) => {
    if (trend === 'stable') return 'text-muted-foreground';
    if (trend === 'up') return isPositiveTrend ? 'text-success' : 'text-destructive';
    return isPositiveTrend ? 'text-destructive' : 'text-success';
  };

  const getGlowColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'primary';
    }
  };

  const generateMockSparkline = (trend: 'up' | 'down' | 'stable') => {
    const base = Array.from({ length: 7 }, () => Math.random() * 20 + 40);
    if (trend === 'up') {
      return base.map((v, i) => v + i * 5);
    } else if (trend === 'down') {
      return base.map((v, i) => v - i * 3);
    }
    return base;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div 
            key={i} 
            className="h-36 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const isNegativeGood = kpi.label.includes('Cost') || kpi.label.includes('Expenses') || kpi.label.includes('Alert');
        const trendColor = getTrendColor(kpi.trend, !isNegativeGood);
        
        return (
          <GlowingCard 
            key={kpi.label}
            delay={index * 0.05}
            glowColor={getGlowColor(kpi.priority)}
            className="relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-transparent rounded-full blur-2xl" />
            </div>

            <div className="relative space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {kpiIcons[kpi.label] || categoryIcons[kpi.category]}
                  </div>
                </div>
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {kpi.category}
                </span>
              </div>

              {/* Value */}
              <div className="space-y-1">
                <motion.h3 
                  className="text-3xl font-bold tracking-tight"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                >
                  {kpi.value}
                </motion.h3>
                <p className="text-sm text-white/80 font-medium">{kpi.label}</p>
              </div>

              {/* Trend & Sparkline */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                  {getTrendIcon(kpi.trend)}
                  <span className="font-medium">
                    {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                  </span>
                  <span className="text-white/60 text-xs">{kpi.changeLabel}</span>
                </div>
                
                <div className="opacity-70">
                  <SparklineChart 
                    data={generateMockSparkline(kpi.trend)}
                    width={60}
                    height={24}
                    color={trendColor.includes('success') ? 'hsl(var(--success))' : 
                           trendColor.includes('destructive') ? 'hsl(var(--destructive))' : 
                           'hsl(var(--primary))'}
                  />
                </div>
              </div>
            </div>
          </GlowingCard>
        );
      })}
    </div>
  );
};

export default ExecutiveKPIGrid;
