import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useMemo } from "react";
import { startOfDay, subDays } from "date-fns";

const GeofenceInsightsCard = () => {
  const { organizationId } = useOrganization();

  const { data: geofences } = useQuery({
    queryKey: ["geofences", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofences")
        .select("*")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: recentEvents } = useQuery({
    queryKey: ["geofence-events-recent", organizationId],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7).toISOString();
      const { data, error } = await supabase
        .from("geofence_events")
        .select("*")
        .eq("organization_id", organizationId!)
        .gte("event_time", weekAgo);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const insights = useMemo(() => {
    const result: Array<{
      type: "success" | "warning" | "info" | "critical";
      title: string;
      description: string;
      action: string;
    }> = [];

    if (!geofences || geofences.length === 0) {
      result.push({
        type: "info",
        title: "No Geofences Configured",
        description: "Create geofences to monitor vehicle location and receive alerts.",
        action: "Create geofence",
      });
      return result;
    }

    // Check for inactive geofences
    const inactiveCount = geofences.filter(g => g.is_active === false).length;
    if (inactiveCount > 0) {
      result.push({
        type: "info",
        title: `${inactiveCount} Inactive Geofence${inactiveCount > 1 ? "s" : ""}`,
        description: "Consider activating or removing unused geofences to simplify monitoring.",
        action: "Review",
      });
    }

    // High activity zones
    if (recentEvents && recentEvents.length > 0) {
      const eventsByZone: Record<string, number> = {};
      recentEvents.forEach(e => {
        if (e.geofence_id) {
          eventsByZone[e.geofence_id] = (eventsByZone[e.geofence_id] || 0) + 1;
        }
      });

      const highActivityZones = Object.entries(eventsByZone)
        .filter(([_, count]) => count > 20)
        .length;

      if (highActivityZones > 0) {
        result.push({
          type: "warning",
          title: `${highActivityZones} High-Activity Zone${highActivityZones > 1 ? "s" : ""}`,
          description: "Some geofences have unusually high event volumes. Consider adjusting boundaries.",
          action: "Analyze",
        });
      }

      // Recent unauthorized exits
      const exitEvents = recentEvents.filter(e => e.event_type === "exit");
      if (exitEvents.length > 10) {
        result.push({
          type: "warning",
          title: `${exitEvents.length} Exit Events This Week`,
          description: "Review exit patterns to identify potential unauthorized movements.",
          action: "View exits",
        });
      }
    }

    // Good coverage
    if (geofences.length >= 5) {
      const categories = new Set(geofences.map(g => g.category));
      result.push({
        type: "success",
        title: "Good Zone Coverage",
        description: `${geofences.length} zones across ${categories.size} categories provide comprehensive monitoring.`,
        action: "View all",
      });
    }

    if (result.length === 0) {
      result.push({
        type: "success",
        title: "Geofencing Status: Healthy",
        description: "All geofences are operating normally with no concerns.",
        action: "View map",
      });
    }

    return result.slice(0, 3);
  }, [geofences, recentEvents]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />;
      case "warning":
        return <Clock className="w-5 h-5 text-warning" aria-hidden="true" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />;
      default:
        return <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card className="glass-strong h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-warning" aria-hidden="true" />
          Geofence Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              {getIcon(insight.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{insight.title}</span>
                  <Badge variant={getBadgeVariant(insight.type)} className="text-xs">
                    {insight.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                <button className="text-xs text-primary hover:underline font-medium">
                  {insight.action} →
                </button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default GeofenceInsightsCard;
