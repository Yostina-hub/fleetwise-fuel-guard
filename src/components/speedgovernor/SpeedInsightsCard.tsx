import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin
} from "lucide-react";
import { useSpeedGovernor } from "@/hooks/useSpeedGovernor";

export const SpeedInsightsCard = () => {
  const { kpis } = useSpeedGovernor();

  // Generate insights based on real data
  const generateInsights = () => {
    const insights: Array<{
      type: "success" | "warning" | "info";
      icon: typeof TrendingUp;
      title: string;
      description: string;
    }> = [];

    // Compliance insight
    if (kpis?.complianceRate >= 95) {
      insights.push({
        type: "success",
        icon: CheckCircle,
        title: "Excellent Compliance",
        description: `Fleet maintains ${kpis.complianceRate}% speed compliance. Keep up the great work!`
      });
    } else if (kpis?.complianceRate < 80) {
      insights.push({
        type: "warning",
        icon: AlertTriangle,
        title: "Compliance Needs Attention",
        description: `Fleet compliance at ${kpis?.complianceRate || 0}%. Consider driver coaching sessions.`
      });
    }

    // Violation trend insight
    if (kpis?.todayViolations !== undefined && kpis?.yesterdayViolations !== undefined) {
      const change = kpis.todayViolations - kpis.yesterdayViolations;
      if (change < 0) {
        insights.push({
          type: "success",
          icon: TrendingDown,
          title: "Violations Decreasing",
          description: `${Math.abs(change)} fewer violations today compared to yesterday. Positive trend!`
        });
      } else if (change > 5) {
        insights.push({
          type: "warning",
          icon: TrendingUp,
          title: "Violation Spike Detected",
          description: `${change} more violations today. Review route conditions and driver behavior.`
        });
      }
    }

    // Peak hours insight
    insights.push({
      type: "info",
      icon: Clock,
      title: "Peak Risk Hours",
      description: "Historical data shows 6-9 AM and 4-7 PM have highest violation rates. Consider extra monitoring."
    });

    // Geofence insight
    insights.push({
      type: "info",
      icon: MapPin,
      title: "Speed Zone Coverage",
      description: "Configure speed limits for specific areas like school zones, urban centers, and highway segments."
    });

    return insights.slice(0, 4); // Show max 4 insights
  };

  const insights = generateInsights();

  const getInsightStyles = (type: "success" | "warning" | "info") => {
    switch (type) {
      case "success":
        return "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400";
      case "warning":
        return "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400";
      case "info":
        return "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400";
    }
  };

  const getBadgeVariant = (type: "success" | "warning" | "info") => {
    switch (type) {
      case "success": return "default";
      case "warning": return "destructive";
      case "info": return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          Speed Insights & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getInsightStyles(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <insight.icon className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold">{insight.title}</h4>
                    <Badge variant={getBadgeVariant(insight.type)} className="text-[10px] px-1.5 py-0">
                      {insight.type === "success" ? "Good" : insight.type === "warning" ? "Action" : "Tip"}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-90">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
