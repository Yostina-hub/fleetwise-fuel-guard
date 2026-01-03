import { Card, CardContent } from "@/components/ui/card";
import { Gauge, AlertTriangle, TrendingDown, Shield, Users, Zap } from "lucide-react";
import { useSpeedGovernor } from "@/hooks/useSpeedGovernor";
import { Skeleton } from "@/components/ui/skeleton";

export const SpeedQuickStats = () => {
  const { kpis, kpisLoading } = useSpeedGovernor();

  const stats = [
    {
      label: "Compliance Rate",
      value: kpisLoading ? null : `${kpis?.complianceRate || 0}%`,
      icon: Shield,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      trend: kpis?.complianceRate >= 90 ? "Excellent" : kpis?.complianceRate >= 75 ? "Good" : "Needs Attention"
    },
    {
      label: "Active Governors",
      value: kpisLoading ? null : `${kpis?.activeGovernors || 0}/${kpis?.totalGovernors || 0}`,
      icon: Gauge,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      trend: "Monitored"
    },
    {
      label: "Today's Violations",
      value: kpisLoading ? null : kpis?.todayViolations || 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
      trend: kpis?.todayViolations === 0 ? "Zero violations!" : 
             kpis && kpis.todayViolations < (kpis.yesterdayViolations || 0) ? "Improving" : "Monitor closely"
    },
    {
      label: "Avg Speed Limit",
      value: kpisLoading ? null : `${kpis?.avgSpeedLimit || 80} km/h`,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-500/10",
      trend: "Fleet average"
    },
    {
      label: "ISA Status",
      value: kpisLoading ? null : "Active",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      trend: "Intelligent Speed Assist"
    },
    {
      label: "Alerts (24h)",
      value: kpisLoading ? null : kpis?.alertsSent24h || 0,
      icon: Users,
      color: "text-teal-600",
      bgColor: "bg-teal-500/10",
      trend: "Notifications sent"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
            </div>
            <div>
              {stat.value === null ? (
                <Skeleton className="h-7 w-16 mb-1" />
              ) : (
                <p className="text-xl font-bold">{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">{stat.trend}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
