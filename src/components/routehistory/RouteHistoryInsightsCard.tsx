import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Clock,
  Zap,
  MapPin
} from "lucide-react";
import { useMemo } from "react";

interface TelemetryPoint {
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  engine_on: boolean | null;
  last_communication_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface RouteHistoryInsightsCardProps {
  routeData: TelemetryPoint[];
  avgSpeed: number;
  maxSpeed: number;
  fuelConsumed: number;
  durationMinutes: number;
}

interface Insight {
  id: string;
  type: "positive" | "warning" | "info";
  icon: typeof TrendingUp;
  title: string;
  description: string;
}

export const RouteHistoryInsightsCard = ({
  routeData,
  avgSpeed,
  maxSpeed,
  fuelConsumed,
  durationMinutes
}: RouteHistoryInsightsCardProps) => {
  const insights = useMemo<Insight[]>(() => {
    if (!routeData || routeData.length === 0) return [];

    const result: Insight[] = [];

    // Analyze idle time
    const idlePoints = routeData.filter(p => (p.speed_kmh || 0) < 2 && p.engine_on);
    const idlePercentage = (idlePoints.length / routeData.length) * 100;
    
    if (idlePercentage > 30) {
      result.push({
        id: "high-idle",
        type: "warning",
        icon: Clock,
        title: "High Idle Time",
        description: `${idlePercentage.toFixed(0)}% of journey spent idling. Consider route optimization.`
      });
    } else if (idlePercentage < 10) {
      result.push({
        id: "low-idle",
        type: "positive",
        icon: TrendingUp,
        title: "Efficient Journey",
        description: `Only ${idlePercentage.toFixed(0)}% idle time - excellent route efficiency.`
      });
    }

    // Analyze speed patterns
    const speedingPoints = routeData.filter(p => (p.speed_kmh || 0) > 100);
    const speedingPercentage = (speedingPoints.length / routeData.length) * 100;
    
    if (speedingPercentage > 15) {
      result.push({
        id: "speeding",
        type: "warning",
        icon: AlertTriangle,
        title: "Speeding Detected",
        description: `${speedingPercentage.toFixed(0)}% of journey above 100 km/h. Review driving behavior.`
      });
    }

    // Fuel efficiency insight
    const kmPerPercent = durationMinutes > 0 ? fuelConsumed / (durationMinutes / 60) : 0;
    if (fuelConsumed > 0 && kmPerPercent < 5) {
      result.push({
        id: "fuel-efficient",
        type: "positive",
        icon: Zap,
        title: "Fuel Efficient",
        description: `Low fuel consumption rate detected during this journey.`
      });
    } else if (fuelConsumed > 20) {
      result.push({
        id: "high-fuel",
        type: "warning",
        icon: TrendingDown,
        title: "High Fuel Usage",
        description: `${fuelConsumed.toFixed(1)}% fuel consumed. Check for driving inefficiencies.`
      });
    }

    // Frequent stops detection
    let stopCount = 0;
    for (let i = 1; i < routeData.length; i++) {
      const prev = routeData[i - 1];
      const curr = routeData[i];
      if ((prev.speed_kmh || 0) > 5 && (curr.speed_kmh || 0) < 2) {
        stopCount++;
      }
    }
    
    if (stopCount > 10) {
      result.push({
        id: "frequent-stops",
        type: "info",
        icon: MapPin,
        title: "Frequent Stops",
        description: `${stopCount} stops detected. Consider optimizing delivery sequence.`
      });
    }

    // Speed consistency
    const speeds = routeData.map(p => p.speed_kmh || 0).filter(s => s > 5);
    if (speeds.length > 0) {
      const avgMovingSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const variance = speeds.reduce((sum, s) => sum + Math.pow(s - avgMovingSpeed, 2), 0) / speeds.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev < 15) {
        result.push({
          id: "consistent-speed",
          type: "positive",
          icon: TrendingUp,
          title: "Consistent Driving",
          description: "Steady speed maintained throughout journey - good driving pattern."
        });
      }
    }

    return result.slice(0, 4); // Limit to 4 insights
  }, [routeData, avgSpeed, maxSpeed, fuelConsumed, durationMinutes]);

  if (insights.length === 0) {
    return null;
  }

  const getTypeStyles = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return "bg-success/10 text-success border-success/20";
      case "warning":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
          Route Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`p-3 rounded-lg border ${getTypeStyles(insight.type)}`}
          >
            <div className="flex items-start gap-2">
              <insight.icon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RouteHistoryInsightsCard;
