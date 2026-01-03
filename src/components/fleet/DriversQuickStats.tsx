import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, AlertTriangle, Award, Activity } from "lucide-react";

interface DriversQuickStatsProps {
  totalDrivers: number;
  activeDrivers: number;
  inactiveDrivers: number;
  suspendedDrivers: number;
  avgSafetyScore?: number;
  licensesExpiringSoon?: number;
}

const DriversQuickStats = ({
  totalDrivers,
  activeDrivers,
  inactiveDrivers,
  suspendedDrivers,
  avgSafetyScore = 0,
  licensesExpiringSoon = 0,
}: DriversQuickStatsProps) => {
  const stats = [
    {
      label: "Total Drivers",
      value: totalDrivers.toString(),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Active",
      value: activeDrivers.toString(),
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Inactive",
      value: inactiveDrivers.toString(),
      icon: UserX,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
    {
      label: "Suspended",
      value: suspendedDrivers.toString(),
      icon: AlertTriangle,
      color: suspendedDrivers > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: suspendedDrivers > 0 ? "bg-destructive/10" : "bg-muted/50",
    },
    {
      label: "Avg Safety Score",
      value: avgSafetyScore > 0 ? `${avgSafetyScore}%` : "N/A",
      icon: Award,
      color: avgSafetyScore >= 80 ? "text-success" : avgSafetyScore >= 60 ? "text-warning" : "text-destructive",
      bgColor: avgSafetyScore >= 80 ? "bg-success/10" : avgSafetyScore >= 60 ? "bg-warning/10" : "bg-destructive/10",
    },
    {
      label: "Licenses Expiring",
      value: licensesExpiringSoon.toString(),
      icon: Activity,
      color: licensesExpiringSoon > 0 ? "text-warning" : "text-success",
      bgColor: licensesExpiringSoon > 0 ? "bg-warning/10" : "bg-success/10",
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

export default DriversQuickStats;
