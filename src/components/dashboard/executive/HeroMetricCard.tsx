import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HeroMetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  color: 'primary' | 'success' | 'warning' | 'secondary' | 'destructive';
  subtitle?: string;
  delay?: number;
}

const colorMap = {
  primary: {
    bg: 'from-primary/10 to-primary/5',
    border: 'border-primary/30 hover:border-primary/60',
    icon: 'bg-primary/15 text-primary',
    glow: 'shadow-primary/10',
    ring: 'bg-primary',
  },
  success: {
    bg: 'from-success/10 to-success/5',
    border: 'border-success/30 hover:border-success/60',
    icon: 'bg-success/15 text-success',
    glow: 'shadow-success/10',
    ring: 'bg-success',
  },
  warning: {
    bg: 'from-warning/10 to-warning/5',
    border: 'border-warning/30 hover:border-warning/60',
    icon: 'bg-warning/15 text-warning',
    glow: 'shadow-warning/10',
    ring: 'bg-warning',
  },
  secondary: {
    bg: 'from-secondary/10 to-secondary/5',
    border: 'border-secondary/30 hover:border-secondary/60',
    icon: 'bg-secondary/15 text-secondary',
    glow: 'shadow-secondary/10',
    ring: 'bg-secondary',
  },
  destructive: {
    bg: 'from-destructive/10 to-destructive/5',
    border: 'border-destructive/30 hover:border-destructive/60',
    icon: 'bg-destructive/15 text-destructive',
    glow: 'shadow-destructive/10',
    ring: 'bg-destructive',
  },
};

const HeroMetricCard = ({
  title,
  value,
  suffix = '',
  prefix = '',
  icon,
  trend = 'stable',
  trendValue = 0,
  color,
  subtitle,
  delay = 0,
}: HeroMetricCardProps) => {
  const { formattedValue } = useAnimatedCounter(value, { 
    duration: 2000, 
    decimals: suffix.includes('%') || String(value).includes('.') ? 1 : 0 
  });
  
  const colors = colorMap[color];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay, 
        ease: [0.22, 1, 0.36, 1] 
      }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`
        relative overflow-hidden rounded-2xl 
        bg-gradient-to-br ${colors.bg}
        backdrop-blur-sm border ${colors.border}
        transition-all duration-300
        shadow-lg ${colors.glow}
        group cursor-default
        bg-card
      `}
    >
      {/* Animated ring */}
      <svg className="absolute -right-8 -top-8 w-32 h-32 opacity-20">
        <motion.circle
          cx="64"
          cy="64"
          r="50"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className={colors.icon.split(' ')[1]}
          strokeDasharray="314"
          initial={{ strokeDashoffset: 314 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2, delay: delay + 0.5, ease: 'easeOut' }}
        />
      </svg>

      {/* Shine effect on hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
      />

      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className={`p-3 rounded-xl ${colors.icon}`}
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.div>
          
          {trend !== 'stable' && (
            <motion.div 
              className={`flex items-center gap-1 text-sm ${trendColor} bg-muted/50 px-2 py-1 rounded-lg`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 }}
            >
              <TrendIcon className="w-3.5 h-3.5" />
              <span className="font-medium">{Math.abs(trendValue).toFixed(1)}%</span>
            </motion.div>
          )}
        </div>

        <div className="space-y-1">
          <motion.div 
            className="text-4xl font-bold text-foreground tracking-tight"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.2 }}
          >
            {prefix}{formattedValue}{suffix}
          </motion.div>
          <p className="text-sm font-medium text-foreground/80">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Bottom accent line */}
        <motion.div 
          className={`absolute bottom-0 left-0 h-1 ${colors.ring}`}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1, delay: delay + 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
};

export default HeroMetricCard;
