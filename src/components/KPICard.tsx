import { ReactNode, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning" | "destructive";
  prefix?: string;
  suffix?: string;
  animationDelay?: number;
}

const KPICard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  variant = "default",
  prefix = "",
  suffix = "",
  animationDelay = 0
}: KPICardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Parse numeric value for animation
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value;
  const isNumeric = !isNaN(numericValue) && isFinite(numericValue);
  
  const { formattedValue, isAnimating } = useAnimatedCounter(
    isVisible && isNumeric ? numericValue : 0, 
    { 
      duration: 1500, 
      delay: animationDelay,
      decimals: String(numericValue).includes('.') ? 1 : 0
    }
  );

  useEffect(() => {
    // Small delay to trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend.value < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-success";
    if (trend.value < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          iconBg: "bg-success/10 text-success",
          glow: "hover:shadow-success/10",
          border: "hover:border-success/30"
        };
      case "warning":
        return {
          iconBg: "bg-warning/10 text-warning",
          glow: "hover:shadow-warning/10",
          border: "hover:border-warning/30"
        };
      case "destructive":
        return {
          iconBg: "bg-destructive/10 text-destructive",
          glow: "hover:shadow-destructive/10",
          border: "hover:border-destructive/30"
        };
      default:
        return {
          iconBg: "bg-primary/10 text-primary",
          glow: "hover:shadow-primary/10",
          border: "hover:border-primary/30"
        };
    }
  };

  const styles = getVariantStyles();
  const displayValue = isNumeric ? `${prefix}${formattedValue}${suffix}` : value;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg group border-border/50",
      styles.glow,
      styles.border,
      "hover:-translate-y-1"
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
        variant === "success" && "bg-gradient-to-br from-success/5 to-transparent",
        variant === "warning" && "bg-gradient-to-br from-warning/5 to-transparent",
        variant === "destructive" && "bg-gradient-to-br from-destructive/5 to-transparent",
        variant === "default" && "bg-gradient-to-br from-primary/5 to-transparent"
      )} />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn(
            "p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110",
            styles.iconBg
          )}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="relative">
        <div className={cn(
          "text-3xl font-bold tabular-nums transition-all duration-300",
          isAnimating && "text-primary"
        )}>
          {displayValue}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-sm font-medium",
            getTrendColor()
          )}>
            <span className="transition-transform duration-300 group-hover:scale-110">
              {getTrendIcon()}
            </span>
            <span>{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </CardContent>
      
      {/* Animated border on hover */}
      <div className={cn(
        "absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 ease-out",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
        variant === "destructive" && "bg-destructive",
        variant === "default" && "bg-primary"
      )} />
    </Card>
  );
};

export default KPICard;