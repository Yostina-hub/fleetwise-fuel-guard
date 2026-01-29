import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertTriangle, Award } from "lucide-react";

interface DriverScoringInsightsCardProps {
  topImprover: string;
  riskPattern: string;
  avgImprovement: number;
  coachingEffectiveness: number;
}

const DriverScoringInsightsCard = ({
  topImprover,
  riskPattern,
  avgImprovement,
  coachingEffectiveness
}: DriverScoringInsightsCardProps) => {
  const insights = [
    {
      icon: Award,
      text: `${topImprover} showed the best score improvement this month`,
      color: "text-green-500"
    },
    {
      icon: AlertTriangle,
      text: `Most common risk factor: ${riskPattern}`,
      color: "text-orange-500"
    },
    {
      icon: TrendingUp,
      text: `Fleet average improved ${avgImprovement}% from last month`,
      color: "text-blue-500"
    },
    {
      icon: TrendingUp,
      text: `Coaching sessions show ${coachingEffectiveness}% effectiveness rate`,
      color: "text-purple-500"
    }
  ];

  return (
    <Card 
      className="border border-cyan-500/20"
      style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Lightbulb className="h-5 w-5 text-amber-400" aria-hidden="true" />
          Driver Scoring Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
            <insight.icon className={`h-4 w-4 ${insight.color === "text-green-500" ? "text-[#8DC63F]" : insight.color === "text-orange-500" ? "text-amber-400" : insight.color}`} aria-hidden="true" />
            <span className="text-sm text-white/80">{insight.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DriverScoringInsightsCard;
