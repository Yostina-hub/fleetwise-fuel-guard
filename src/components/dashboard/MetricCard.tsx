import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  trendPositive?: boolean; // Whether "up" is good or bad
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  trendPositive = true,
  variant = 'default',
  className
}: MetricCardProps) => {
  const variantStyles = {
    default: 'from-muted/50 to-transparent',
    primary: 'from-primary/10 to-transparent',
    success: 'from-success/10 to-transparent',
    warning: 'from-warning/10 to-transparent',
    destructive: 'from-destructive/10 to-transparent'
  };

  const iconVariants = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive'
  };

  const isPositiveTrend = trendPositive ? trend === 'up' : trend === 'down';
  const isNegativeTrend = trendPositive ? trend === 'down' : trend === 'up';

  return (
    <Card className={cn("relative overflow-hidden hover:shadow-md transition-shadow", className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br", variantStyles[variant])} />
      <CardContent className="relative pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", iconVariants[variant])}>
            {icon}
          </div>
        </div>
        
        {trend && trendValue && (
          <div className={cn(
            "flex items-center gap-1 mt-3 text-xs",
            isPositiveTrend ? 'text-success' : isNegativeTrend ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
