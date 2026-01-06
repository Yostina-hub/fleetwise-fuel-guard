import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DataPoint {
  date: string;
  value: number;
  previousValue?: number;
}

interface TrendSparklineCardProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  currentValue: string;
  color: 'primary' | 'success' | 'warning' | 'destructive' | 'secondary';
  loading?: boolean;
}

const colorMap = {
  primary: {
    stroke: 'hsl(var(--primary))',
    fill: 'url(#primaryGradient)',
    badge: 'bg-primary/10 text-primary border-primary/30',
  },
  success: {
    stroke: 'hsl(var(--success))',
    fill: 'url(#successGradient)',
    badge: 'bg-success/10 text-success border-success/30',
  },
  warning: {
    stroke: 'hsl(var(--warning))',
    fill: 'url(#warningGradient)',
    badge: 'bg-warning/10 text-warning border-warning/30',
  },
  destructive: {
    stroke: 'hsl(var(--destructive))',
    fill: 'url(#destructiveGradient)',
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  secondary: {
    stroke: 'hsl(var(--secondary))',
    fill: 'url(#secondaryGradient)',
    badge: 'bg-secondary/10 text-secondary border-secondary/30',
  },
};

const TrendSparklineCard = ({
  title,
  subtitle,
  data,
  trend,
  trendValue,
  currentValue,
  color,
  loading,
}: TrendSparklineCardProps) => {
  const colors = colorMap[color];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-5 h-48"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/30 rounded w-1/2" />
          <div className="h-8 bg-muted/20 rounded w-2/3" />
          <div className="h-20 bg-muted/10 rounded" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="relative rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 overflow-hidden p-5 hover:border-primary/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <motion.p 
            className="text-2xl font-bold text-foreground mt-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {currentValue}
          </motion.p>
        </div>
        <Badge variant="outline" className={`${colors.badge} gap-1`}>
          <TrendIcon className="w-3 h-3" />
          {Math.abs(trendValue).toFixed(1)}%
        </Badge>
      </div>

      {/* Chart */}
      <div className="h-20 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="destructiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="secondaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.stroke}
              fill={colors.fill}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {subtitle && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

export default TrendSparklineCard;
