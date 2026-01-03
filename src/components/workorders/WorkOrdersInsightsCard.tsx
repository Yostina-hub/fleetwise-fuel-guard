import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertCircle, Clock } from "lucide-react";

interface WorkOrdersInsightsCardProps {
  avgCompletionTime: number;
  overdueCount: number;
  topVehicle: string;
  costTrend: number;
}

const WorkOrdersInsightsCard = ({
  avgCompletionTime,
  overdueCount,
  topVehicle,
  costTrend
}: WorkOrdersInsightsCardProps) => {
  const insights = [
    {
      icon: Clock,
      text: `Average completion time: ${avgCompletionTime} days`,
      color: "text-blue-500"
    },
    {
      icon: AlertCircle,
      text: `${overdueCount} work orders are overdue`,
      color: overdueCount > 0 ? "text-red-500" : "text-green-500"
    },
    {
      icon: TrendingUp,
      text: `${topVehicle} has the most work orders this month`,
      color: "text-orange-500"
    },
    {
      icon: TrendingUp,
      text: `Maintenance costs are ${costTrend >= 0 ? 'up' : 'down'} ${Math.abs(costTrend)}% vs last month`,
      color: costTrend >= 0 ? "text-red-500" : "text-green-500"
    }
  ];

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          Work Order Insights
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

export default WorkOrdersInsightsCard;
