import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportMetrics } from "@/hooks/useReportData";

interface ReportsQuickStatsProps {
  metrics: ReportMetrics;
  vehicleCount: number;
  driverCount: number;
}

export const ReportsQuickStats = ({ metrics, vehicleCount, driverCount }: ReportsQuickStatsProps) => {
  const stats = [
    {
      label: "Total Vehicles",
      value: vehicleCount,
      icon: FileText,
      trend: null,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Drivers",
      value: driverCount,
      icon: BarChart3,
      trend: null,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Trips Completed",
      value: metrics.completedTrips,
      icon: CheckCircle2,
      trend: metrics.tripsTrend,
      trendPositive: true,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Active Alerts",
      value: metrics.criticalAlerts,
      icon: AlertTriangle,
      trend: null,
      trendPositive: false,
      color: metrics.criticalAlerts > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: metrics.criticalAlerts > 0 ? "bg-destructive/10" : "bg-muted/50",
    },
    {
      label: "Overdue Maintenance",
      value: metrics.overdueMaintenance,
      icon: Clock,
      trend: null,
      trendPositive: false,
      color: metrics.overdueMaintenance > 0 ? "text-amber-500" : "text-green-500",
      bgColor: metrics.overdueMaintenance > 0 ? "bg-amber-500/10" : "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <Card 
          key={index} 
          className="border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
          style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("p-2 rounded-lg bg-white/5 border border-white/10")}>
                <stat.icon className={cn("w-4 h-4", stat.color === "text-primary" ? "text-cyan-400" : stat.color === "text-green-500" ? "text-[#8DC63F]" : stat.color)} />
              </div>
              {stat.trend !== null && stat.trend !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  stat.trendPositive 
                    ? stat.trend > 0 ? "text-[#8DC63F]" : "text-red-400"
                    : stat.trend > 0 ? "text-red-400" : "text-[#8DC63F]"
                )}>
                  {stat.trend > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stat.trend).toFixed(0)}%</span>
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</div>
            <div className="text-xs text-white/60 mt-1">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
