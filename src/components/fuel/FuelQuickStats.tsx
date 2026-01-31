import { TrendingUp, TrendingDown, Minus, Fuel, Gauge, AlertTriangle, DollarSign, Droplet, Clock } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { cn } from "@/lib/utils";

interface FuelQuickStatsProps {
  totalConsumption: number;
  anomalyCount: number;
  avgEfficiency: string | null;
  eventsCount: number;
  consumptionTrend: { value: number; direction: 'up' | 'down' | 'neutral' };
  avgCostPerLiter: number;
}

const FuelQuickStats = ({ 
  totalConsumption, 
  anomalyCount, 
  avgEfficiency, 
  eventsCount,
  consumptionTrend,
  avgCostPerLiter
}: FuelQuickStatsProps) => {
  const { formatCurrency } = useOrganizationSettings();

  const estimatedMonthlyCost = totalConsumption * avgCostPerLiter;
  const potentialSavings = estimatedMonthlyCost * 0.12;

  const stats = [
    {
      label: "ALL",
      value: eventsCount,
      icon: Droplet,
      color: "text-primary",
      bgColor: "bg-primary/20 border-primary/30",
      highlight: true,
    },
    {
      label: "CONSUMPTION",
      value: `${totalConsumption.toLocaleString()}L`,
      icon: Fuel,
      color: "text-success",
      bgColor: "bg-success/10 border-success/30",
      trend: consumptionTrend,
    },
    {
      label: "EFFICIENCY",
      value: avgEfficiency || "—",
      icon: Gauge,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 border-blue-500/30",
    },
    {
      label: "ANOMALIES",
      value: anomalyCount,
      icon: AlertTriangle,
      color: anomalyCount > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: anomalyCount > 0 ? "bg-destructive/10 border-destructive/30" : "bg-muted border-border",
      alert: anomalyCount > 0,
    },
    {
      label: "SAVINGS",
      value: formatCurrency(potentialSavings),
      icon: DollarSign,
      color: "text-warning",
      bgColor: "bg-warning/10 border-warning/30",
    },
    {
      label: "MONTHLY COST",
      value: formatCurrency(estimatedMonthlyCost),
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted border-border",
    },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
            stat.bgColor,
            stat.highlight && "ring-2 ring-primary/30"
          )}
        >
          <stat.icon className={cn("w-5 h-5", stat.color)} />
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight">
              {stat.value}
              {stat.trend && (
                <span className={cn(
                  "ml-2 text-xs font-medium",
                  stat.trend.direction === 'down' ? 'text-success' : 
                  stat.trend.direction === 'up' ? 'text-destructive' : 
                  'text-muted-foreground'
                )}>
                  {stat.trend.direction === 'down' ? (
                    <TrendingDown className="w-3 h-3 inline mr-0.5" />
                  ) : stat.trend.direction === 'up' ? (
                    <TrendingUp className="w-3 h-3 inline mr-0.5" />
                  ) : (
                    <Minus className="w-3 h-3 inline mr-0.5" />
                  )}
                  {Math.abs(stat.trend.value)}%
                </span>
              )}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {stat.label}
            </span>
          </div>
          {stat.alert && (
            <span className="ml-auto w-2 h-2 rounded-full bg-destructive animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
};

export default FuelQuickStats;
