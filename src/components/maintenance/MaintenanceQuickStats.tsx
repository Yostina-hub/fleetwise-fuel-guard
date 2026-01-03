import { Card, CardContent } from "@/components/ui/card";
import { Calendar, AlertCircle, CheckCircle, Clock, Wrench, TrendingUp } from "lucide-react";

interface MaintenanceQuickStatsProps {
  totalScheduled: number;
  overdueCount: number;
  completedThisMonth: number;
  complianceRate: number;
  upcomingThisWeek?: number;
  avgCostPerService?: number;
}

const MaintenanceQuickStats = ({
  totalScheduled,
  overdueCount,
  completedThisMonth,
  complianceRate,
  upcomingThisWeek = 0,
  avgCostPerService = 0,
}: MaintenanceQuickStatsProps) => {
  const stats = [
    {
      label: "Active Schedules",
      value: totalScheduled.toString(),
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Overdue",
      value: overdueCount.toString(),
      icon: AlertCircle,
      color: overdueCount > 0 ? "text-destructive" : "text-success",
      bgColor: overdueCount > 0 ? "bg-destructive/10" : "bg-success/10",
    },
    {
      label: "Completed",
      value: completedThisMonth.toString(),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Compliance",
      value: `${Math.round(complianceRate)}%`,
      icon: TrendingUp,
      color: complianceRate >= 90 ? "text-success" : complianceRate >= 70 ? "text-warning" : "text-destructive",
      bgColor: complianceRate >= 90 ? "bg-success/10" : complianceRate >= 70 ? "bg-warning/10" : "bg-destructive/10",
    },
    {
      label: "Due This Week",
      value: upcomingThisWeek.toString(),
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Avg Cost",
      value: avgCostPerService > 0 ? `$${avgCostPerService.toLocaleString()}` : "N/A",
      icon: Wrench,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MaintenanceQuickStats;
