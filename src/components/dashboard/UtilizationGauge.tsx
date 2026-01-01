import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";

interface UtilizationGaugeProps {
  utilizationRate: number;
  activeVehicles: number;
  totalVehicles: number;
  trend?: 'up' | 'down' | 'stable';
}

const UtilizationGauge = ({ 
  utilizationRate, 
  activeVehicles, 
  totalVehicles,
  trend = 'stable'
}: UtilizationGaugeProps) => {
  const { strokeDasharray, strokeDashoffset, color, label } = useMemo(() => {
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (utilizationRate / 100) * circumference;
    
    let gaugeColor = 'hsl(var(--success))';
    let gaugeLabel = 'Excellent';
    
    if (utilizationRate < 50) {
      gaugeColor = 'hsl(var(--destructive))';
      gaugeLabel = 'Low';
    } else if (utilizationRate < 70) {
      gaugeColor = 'hsl(var(--warning))';
      gaugeLabel = 'Moderate';
    } else if (utilizationRate < 85) {
      gaugeColor = 'hsl(var(--primary))';
      gaugeLabel = 'Good';
    }
    
    return {
      strokeDasharray: circumference,
      strokeDashoffset: offset,
      color: gaugeColor,
      label: gaugeLabel
    };
  }, [utilizationRate]);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-4 h-4 text-primary" />
          Fleet Utilization
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center justify-center">
          <div className="relative w-36 h-36">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{utilizationRate.toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-semibold text-success">{activeVehicles}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-semibold">{totalVehicles}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
        
        {/* Trend indicator */}
        <div className="flex items-center justify-center gap-1 mt-3">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4 text-destructive" />
          ) : null}
          <span className={`text-xs ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {trend === 'up' ? '+5.2% vs last week' : trend === 'down' ? '-3.1% vs last week' : 'Stable'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default UtilizationGauge;
