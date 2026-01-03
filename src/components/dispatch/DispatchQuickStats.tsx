import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface DispatchQuickStatsProps {
  totalJobs: number;
  activeJobs: number;
  completedToday: number;
  pendingAssignment: number;
  slaAtRisk: number;
  onTimeRate: number;
}

const DispatchQuickStats = ({
  totalJobs,
  activeJobs,
  completedToday,
  pendingAssignment,
  slaAtRisk,
  onTimeRate,
}: DispatchQuickStatsProps) => {
  const stats = [
    {
      label: "Total Jobs",
      value: totalJobs.toString(),
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Active",
      value: activeJobs.toString(),
      icon: Truck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Completed Today",
      value: completedToday.toString(),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Pending Assignment",
      value: pendingAssignment.toString(),
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "SLA At Risk",
      value: slaAtRisk.toString(),
      icon: AlertTriangle,
      color: slaAtRisk > 0 ? "text-destructive" : "text-success",
      bgColor: slaAtRisk > 0 ? "bg-destructive/10" : "bg-success/10",
    },
    {
      label: "On-Time Rate",
      value: `${onTimeRate}%`,
      icon: TrendingUp,
      color: onTimeRate >= 90 ? "text-success" : onTimeRate >= 75 ? "text-warning" : "text-destructive",
      bgColor: onTimeRate >= 90 ? "bg-success/10" : onTimeRate >= 75 ? "bg-warning/10" : "bg-destructive/10",
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

export default DispatchQuickStats;
