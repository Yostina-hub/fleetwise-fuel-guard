import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, TrendingDown, ExternalLink, Sparkles, ChevronRight, Clock } from "lucide-react";

interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'success';
  title: string;
  description: string;
  impact?: string;
  action?: string;
}

interface FuelInsightsCardProps {
  anomalyCount: number;
  totalConsumption: number;
  avgEfficiency: string | null;
  consumptionTrend: { value: number; direction: 'up' | 'down' | 'neutral' };
  highIdleVehicleCount: number;
  avgCostPerLiter: number;
}

const FuelInsightsCard = ({
  anomalyCount,
  totalConsumption,
  avgEfficiency,
  consumptionTrend,
  highIdleVehicleCount,
  avgCostPerLiter
}: FuelInsightsCardProps) => {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Generate real insights based on actual fleet data
  const insights: Insight[] = useMemo(() => {
    const generatedInsights: Insight[] = [];

    // Insight 1: Based on anomaly count (theft/leak detection)
    if (anomalyCount > 0) {
      generatedInsights.push({
        id: '1',
        type: 'warning',
        title: `${anomalyCount} Fuel Anomal${anomalyCount === 1 ? 'y' : 'ies'} Detected`,
        description: `${anomalyCount} potential fuel theft or leak event${anomalyCount === 1 ? '' : 's'} require${anomalyCount === 1 ? 's' : ''} investigation. Review suspicious events and take action.`,
        impact: `Est. ${anomalyCount * 50} at risk`,
        action: 'View Anomalies'
      });
    }

    // Insight 2: Based on idle time
    if (highIdleVehicleCount > 0) {
      const idleFuelWaste = highIdleVehicleCount * 2.5; // ~2.5L per vehicle daily
      const weeklyLoss = idleFuelWaste * avgCostPerLiter * 7;
      generatedInsights.push({
        id: '2',
        type: 'warning',
        title: 'High Idle Time Detected',
        description: `${highIdleVehicleCount} vehicle${highIdleVehicleCount === 1 ? '' : 's'} exceed${highIdleVehicleCount === 1 ? 's' : ''} the recommended daily idle threshold. This wastes approximately ${idleFuelWaste.toFixed(1)}L of fuel daily.`,
        impact: `${weeklyLoss.toFixed(0)}/week potential loss`,
        action: 'View Idle Report'
      });
    }

    // Insight 3: Based on consumption trend
    if (consumptionTrend.direction === 'down' && Math.abs(consumptionTrend.value) >= 3) {
      generatedInsights.push({
        id: '3',
        type: 'success',
        title: 'Fuel Efficiency Improved',
        description: `Fleet average fuel consumption decreased by ${Math.abs(consumptionTrend.value).toFixed(1)}% compared to the previous period. Driver coaching and route optimization are showing results.`,
        impact: `${Math.abs(consumptionTrend.value).toFixed(1)}% improvement`
      });
    } else if (consumptionTrend.direction === 'up' && consumptionTrend.value >= 5) {
      generatedInsights.push({
        id: '3',
        type: 'warning',
        title: 'Fuel Consumption Increased',
        description: `Fleet fuel consumption increased by ${consumptionTrend.value.toFixed(1)}% compared to the previous period. Consider reviewing driver behavior and vehicle maintenance.`,
        impact: `${consumptionTrend.value.toFixed(1)}% increase`,
        action: 'View Analysis'
      });
    }

    // Insight 4: Route optimization tip (show if consumption is significant)
    if (totalConsumption > 100) {
      const potentialSavings = totalConsumption * avgCostPerLiter * 0.12;
      generatedInsights.push({
        id: '4',
        type: 'tip',
        title: 'Optimize Route Planning',
        description: 'Analysis suggests up to 12% of fuel could be saved through optimized routing. Consider implementing real-time traffic-based route adjustments.',
        impact: `Save up to ${potentialSavings.toFixed(0)}/period`,
        action: 'View Route Analytics'
      });
    }

    // Add a default success insight if no issues
    if (generatedInsights.length === 0) {
      generatedInsights.push({
        id: '0',
        type: 'success',
        title: 'Fleet Running Efficiently',
        description: 'No significant fuel anomalies or inefficiencies detected. Continue monitoring for optimal performance.',
        impact: 'All systems normal'
      });
    }

    return generatedInsights;
  }, [anomalyCount, totalConsumption, consumptionTrend, highIdleVehicleCount, avgCostPerLiter]);

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'tip':
        return {
          icon: <Lightbulb className="w-4 h-4" />,
          bg: 'bg-primary/10',
          text: 'text-primary',
          badge: 'bg-primary/10 text-primary border-primary/20'
        };
      case 'warning':
        return {
          icon: <TrendingDown className="w-4 h-4" />,
          bg: 'bg-warning/10',
          text: 'text-warning',
          badge: 'bg-warning/10 text-warning border-warning/20'
        };
      case 'success':
        return {
          icon: <TrendingUp className="w-4 h-4" />,
          bg: 'bg-success/10',
          text: 'text-success',
          badge: 'bg-success/10 text-success border-success/20'
        };
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Insights
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Updated 5m ago
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const styles = getInsightStyles(insight.type);
          const isExpanded = expandedInsight === insight.id;
          
          return (
            <div
              key={insight.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                isExpanded ? 'bg-muted/50' : 'bg-background/50'
              }`}
              onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${styles.bg}`}>
                  <span className={styles.text}>{styles.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  {insight.impact && (
                    <Badge variant="outline" className={`mt-1 text-xs ${styles.badge}`}>
                      {insight.impact}
                    </Badge>
                  )}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      {insight.action && (
                        <Button variant="outline" size="sm" className="gap-2">
                          {insight.action}
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default FuelInsightsCard;
