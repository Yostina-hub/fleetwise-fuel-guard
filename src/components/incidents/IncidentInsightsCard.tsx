import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Clock, MapPin } from "lucide-react";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";

export const IncidentInsightsCard = () => {
  const { incidents, loading } = useIncidentsManagement();

  const generateInsights = () => {
    if (loading || !incidents || incidents.length === 0) {
      return [
        {
          type: "info",
          icon: Lightbulb,
          title: "No incidents recorded",
          description: "Your fleet has a clean record. Keep up the safe driving practices!",
          action: "Continue monitoring"
        }
      ];
    }

    const insights = [];
    const openCases = incidents.filter(i => i.status === 'reported' || i.status === 'investigating').length;
    const recentIncidents = incidents.filter(i => {
      const incidentDate = new Date(i.incident_time);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return incidentDate >= weekAgo;
    });
    const highSeverity = incidents.filter(i => i.severity === 'critical' || i.severity === 'high');

    if (openCases > 3) {
      insights.push({
        type: "warning",
        icon: Clock,
        title: `${openCases} cases pending resolution`,
        description: "Consider prioritizing incident resolution to reduce liability exposure.",
        action: "Review open cases"
      });
    }

    if (recentIncidents.length >= 3) {
      insights.push({
        type: "alert",
        icon: TrendingUp,
        title: `${recentIncidents.length} incidents this week`,
        description: "Incident rate is higher than average. Review driver behavior patterns.",
        action: "Analyze patterns"
      });
    } else if (recentIncidents.length === 0) {
      insights.push({
        type: "success",
        icon: TrendingDown,
        title: "Zero incidents this week",
        description: "Excellent safety performance! Maintain current safety protocols.",
        action: "Keep it up!"
      });
    }

    if (highSeverity.length > 0) {
      insights.push({
        type: "critical",
        icon: AlertTriangle,
        title: `${highSeverity.length} high-severity incidents`,
        description: "Critical incidents require immediate management attention.",
        action: "Prioritize review"
      });
    }

    // Location-based insight
    const locationCounts: Record<string, number> = {};
    incidents.forEach(i => {
      if (i.location) {
        locationCounts[i.location] = (locationCounts[i.location] || 0) + 1;
      }
    });
    const hotspots = Object.entries(locationCounts).filter(([_, count]) => count >= 2);
    if (hotspots.length > 0) {
      insights.push({
        type: "info",
        icon: MapPin,
        title: "Incident hotspots detected",
        description: `Multiple incidents at ${hotspots.length} location(s). Consider route optimization.`,
        action: "View locations"
      });
    }

    return insights.length > 0 ? insights : [{
      type: "success",
      icon: Lightbulb,
      title: "Fleet safety on track",
      description: "No concerning patterns detected. Continue regular safety monitoring.",
      action: "Stay vigilant"
    }];
  };

  const insights = generateInsights();

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "critical": return "destructive";
      case "warning": return "outline";
      case "alert": return "secondary";
      case "success": return "default";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Safety Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`p-1.5 rounded-md ${
              insight.type === 'critical' ? 'bg-destructive/10 text-destructive' :
              insight.type === 'warning' ? 'bg-orange-500/10 text-orange-600' :
              insight.type === 'success' ? 'bg-green-500/10 text-green-600' :
              'bg-blue-500/10 text-blue-600'
            }`}>
              <insight.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{insight.title}</span>
                <Badge variant={getBadgeVariant(insight.type)} className="text-[10px]">
                  {insight.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
              <p className="text-xs text-primary mt-1 font-medium">{insight.action}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
