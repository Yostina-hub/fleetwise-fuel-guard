import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, TrendingDown, ExternalLink, Sparkles, ChevronRight, Clock } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'success';
  title: string;
  description: string;
  impact?: string;
  action?: string;
}

const FuelInsightsCard = () => {
  const { formatCurrency, settings } = useOrganizationSettings();
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // AI-generated insights based on fleet data patterns
  const insights: Insight[] = [
    {
      id: '1',
      type: 'tip',
      title: 'Optimize Route Planning',
      description: 'Analysis shows 15% of fuel is used during non-optimized routes. Consider implementing real-time traffic-based routing.',
      impact: `Save up to ${formatCurrency(450)}/month`,
      action: 'View Route Analytics'
    },
    {
      id: '2',
      type: 'warning',
      title: 'High Idle Time Detected',
      description: '3 vehicles exceed the 30-minute daily idle threshold. This wastes approximately 2.5L of fuel per vehicle daily.',
      impact: `${formatCurrency(225)}/week potential loss`,
      action: 'View Idle Report'
    },
    {
      id: '3',
      type: 'success',
      title: 'Fuel Efficiency Improved',
      description: 'Fleet average fuel efficiency improved by 8% compared to last month. Driver coaching program showing results.',
      impact: '8% improvement'
    },
    {
      id: '4',
      type: 'tip',
      title: 'Bulk Fuel Purchase Opportunity',
      description: 'Current diesel prices are 5% below monthly average. Consider topping up depot reserves.',
      impact: 'Save on bulk purchase',
      action: 'Check Depot Stock'
    }
  ];

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
