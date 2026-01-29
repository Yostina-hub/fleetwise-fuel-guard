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
        <Card 
          key={stat.label} 
          className="border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
          style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <stat.icon className={`h-5 w-5 ${stat.color === "text-green-500" ? "text-[#8DC63F]" : stat.color === "text-orange-500" ? "text-amber-400" : stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/60">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DriverScoringQuickStats;
