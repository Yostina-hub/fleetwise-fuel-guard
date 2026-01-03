import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, Award, MessageSquare } from "lucide-react";

interface DriverScoringQuickStatsProps {
  fleetAvgScore: number;
  highRiskDrivers: number;
  improvedThisMonth: number;
  coachingPending: number;
}

const DriverScoringQuickStats = ({
  fleetAvgScore,
  highRiskDrivers,
  improvedThisMonth,
  coachingPending
}: DriverScoringQuickStatsProps) => {
  const stats = [
    {
      label: "Fleet Avg Score",
      value: fleetAvgScore,
      icon: TrendingUp,
      color: fleetAvgScore >= 70 ? "text-green-500" : "text-orange-500",
      bgColor: fleetAvgScore >= 70 ? "bg-green-500/10" : "bg-orange-500/10"
    },
    {
      label: "High-Risk Drivers",
      value: highRiskDrivers,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      label: "Improved This Month",
      value: improvedThisMonth,
      icon: Award,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Coaching Pending",
      value: coachingPending,
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
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

export default DriverScoringQuickStats;
