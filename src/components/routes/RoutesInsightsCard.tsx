import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, MapPin, Clock } from "lucide-react";

interface RoutesInsightsCardProps {
  topRoute: string;
  avgDeliveryTime: number;
  frequentSite: string;
  efficiencyGain: number;
}

const RoutesInsightsCard = ({
  topRoute,
  avgDeliveryTime,
  frequentSite,
  efficiencyGain
}: RoutesInsightsCardProps) => {
  const insights = [
    {
      icon: TrendingUp,
      text: `"${topRoute}" is your most used route this month`,
      color: "text-blue-500"
    },
    {
      icon: Clock,
      text: `Average delivery time: ${avgDeliveryTime} minutes`,
      color: "text-green-500"
    },
    {
      icon: MapPin,
      text: `"${frequentSite}" is your most visited customer site`,
      color: "text-orange-500"
    },
    {
      icon: TrendingUp,
      text: `Route optimization saved ${efficiencyGain}% in travel distance`,
      color: "text-purple-500"
    }
  ];

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          Route Insights
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

export default RoutesInsightsCard;
