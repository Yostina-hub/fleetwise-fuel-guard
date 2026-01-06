import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Truck, 
  Users, 
  Route, 
  Fuel,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportMetrics } from "@/hooks/useReportData";

interface MetricItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  description: string;
  trend?: number;
  suffix?: string;
}

interface ReportsMetricCardsProps {
  metrics: ReportMetrics;
  vehicleCount: number;
  driverCount: number;
  activeTab: string;
}

export const ReportsMetricCards = ({ 
  metrics, 
  vehicleCount, 
  driverCount,
  activeTab 
}: ReportsMetricCardsProps) => {
  // Dynamic metrics based on active tab
  const getMetricsForTab = (): MetricItem[] => {
    const baseMetrics: MetricItem[] = [
      {
        label: "Fleet Size",
        value: vehicleCount,
        icon: Truck,
        color: "from-primary/20 to-primary/5",
        iconColor: "text-primary",
        description: "Active vehicles",
      },
      {
        label: "Drivers",
        value: driverCount,
        icon: Users,
        color: "from-blue-500/20 to-blue-500/5",
        iconColor: "text-blue-500",
        description: "Registered drivers",
      },
    ];

    switch (activeTab) {
      case "trips":
        return [
          ...baseMetrics,
          {
            label: "Total Trips",
            value: metrics.totalTrips,
            icon: Route,
            color: "from-green-500/20 to-green-500/5",
            iconColor: "text-green-500",
            description: "In selected period",
            trend: metrics.tripsTrend,
          },
          {
            label: "Completed",
            value: metrics.completedTrips,
            icon: CheckCircle2,
            color: "from-emerald-500/20 to-emerald-500/5",
            iconColor: "text-emerald-500",
            description: "Successfully finished",
          },
        ];
      case "fuel":
        return [
          ...baseMetrics,
          {
            label: "Avg Efficiency",
            value: `${metrics.avgEfficiency.toFixed(1)}`,
            suffix: "km/L",
            icon: Fuel,
            color: "from-amber-500/20 to-amber-500/5",
            iconColor: "text-amber-500",
            description: "Fleet average",
            trend: metrics.efficiencyTrend,
          },
          {
            label: "Fuel Events",
            value: metrics.totalTrips,
            icon: Activity,
            color: "from-orange-500/20 to-orange-500/5",
            iconColor: "text-orange-500",
            description: "Recorded events",
          },
        ];
      case "alerts":
        return [
          ...baseMetrics,
          {
            label: "Critical Alerts",
            value: metrics.criticalAlerts,
            icon: AlertTriangle,
            color: metrics.criticalAlerts > 0 
              ? "from-destructive/20 to-destructive/5" 
              : "from-green-500/20 to-green-500/5",
            iconColor: metrics.criticalAlerts > 0 ? "text-destructive" : "text-green-500",
            description: metrics.criticalAlerts > 0 ? "Require attention" : "All clear",
          },
          {
            label: "Speeding Events",
            value: metrics.speedingEvents,
            icon: Activity,
            color: "from-red-500/20 to-red-500/5",
            iconColor: "text-red-500",
            description: "Detected violations",
          },
        ];
      case "maintenance":
        return [
          ...baseMetrics,
          {
            label: "Overdue",
            value: metrics.overdueMaintenance,
            icon: Clock,
            color: metrics.overdueMaintenance > 0 
              ? "from-amber-500/20 to-amber-500/5" 
              : "from-green-500/20 to-green-500/5",
            iconColor: metrics.overdueMaintenance > 0 ? "text-amber-500" : "text-green-500",
            description: metrics.overdueMaintenance > 0 ? "Need attention" : "All on schedule",
          },
          {
            label: "Scheduled",
            value: metrics.scheduledMaintenance,
            icon: CheckCircle2,
            color: "from-blue-500/20 to-blue-500/5",
            iconColor: "text-blue-500",
            description: "Upcoming services",
          },
        ];
      default:
        return [
          ...baseMetrics,
          {
            label: "Completed Trips",
            value: metrics.completedTrips,
            icon: CheckCircle2,
            color: "from-green-500/20 to-green-500/5",
            iconColor: "text-green-500",
            description: "In selected period",
            trend: metrics.tripsTrend,
          },
          {
            label: "Active Alerts",
            value: metrics.criticalAlerts,
            icon: AlertTriangle,
            color: metrics.criticalAlerts > 0 
              ? "from-destructive/20 to-destructive/5" 
              : "from-muted/20 to-muted/5",
            iconColor: metrics.criticalAlerts > 0 ? "text-destructive" : "text-muted-foreground",
            description: metrics.criticalAlerts > 0 ? "Require attention" : "All clear",
          },
        ];
    }
  };

  const displayMetrics = getMetricsForTab();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {displayMetrics.map((metric, index) => (
        <Card 
          key={index} 
          className={cn(
            "relative overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300",
            "bg-gradient-to-br",
            metric.color
          )}
        >
          {/* Decorative circle */}
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-background/20 rounded-full blur-xl" />
          
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2.5 rounded-xl bg-background/80 backdrop-blur-sm shadow-sm")}>
                <metric.icon className={cn("w-5 h-5", metric.iconColor)} aria-hidden="true" />
              </div>
              {metric.trend !== undefined && metric.trend !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  metric.trend > 0 
                    ? "bg-green-500/20 text-green-600" 
                    : "bg-red-500/20 text-red-600"
                )}>
                  {metric.trend > 0 ? (
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span>{Math.abs(metric.trend).toFixed(0)}%</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </span>
                {metric.suffix && (
                  <span className="text-sm text-muted-foreground">{metric.suffix}</span>
                )}
              </div>
              <div className="text-sm font-medium text-foreground/80">{metric.label}</div>
              <div className="text-xs text-muted-foreground">{metric.description}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
