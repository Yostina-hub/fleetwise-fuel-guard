import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface SchedulingInsightsCardProps {
  utilizationRate: number;
  avgApprovalTime: number;
  peakDay: string;
  completionRate: number;
}

const SchedulingInsightsCard = ({
  utilizationRate,
  avgApprovalTime,
  peakDay,
  completionRate
}: SchedulingInsightsCardProps) => {
  const insights = [
    {
      icon: TrendingUp,
      text: `Fleet utilization is at ${utilizationRate}% this week`,
      color: utilizationRate >= 70 ? "text-green-500" : "text-orange-500"
    },
    {
      icon: Clock,
      text: `Average approval time: ${avgApprovalTime} hours`,
      color: "text-blue-500"
    },
    {
      icon: TrendingUp,
      text: `${peakDay} is your busiest scheduling day`,
      color: "text-purple-500"
    },
    {
      icon: CheckCircle,
      text: `Trip completion rate: ${completionRate}%`,
      color: completionRate >= 90 ? "text-green-500" : "text-orange-500"
    }
  ];

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          Scheduling Insights
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

export default SchedulingInsightsCard;
