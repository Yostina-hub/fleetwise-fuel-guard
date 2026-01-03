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
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          Driver Scoring Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <insight.icon className={`h-4 w-4 ${insight.color}`} aria-hidden="true" />
            <span className="text-sm">{insight.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DriverScoringInsightsCard;
