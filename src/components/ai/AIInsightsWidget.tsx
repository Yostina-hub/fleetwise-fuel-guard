import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Sparkles,
  Zap,
  ChevronRight
} from "lucide-react";
import { useFleetAI, AIInsight } from "@/hooks/useFleetAI";
import { cn } from "@/lib/utils";

interface AIInsightsWidgetProps {
  insightType: 'dashboard' | 'tracking' | 'speed' | 'fuel';
  title?: string;
  description?: string;
  compact?: boolean;
  autoLoad?: boolean;
  className?: string;
}

const InsightIcon = ({ type }: { type: AIInsight['type'] }) => {
  switch (type) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-success" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};

const InsightBadge = ({ type }: { type: AIInsight['type'] }) => {
  const variants: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
    info: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <Badge variant="outline" className={cn("text-xs", variants[type] || variants.info)}>
      {type}
    </Badge>
  );
};

const HealthScoreGauge = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s >= 80) return "text-success";
    if (s >= 60) return "text-warning";
    return "text-destructive";
  };

  const getLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    return "Needs Attention";
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            className={getColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-lg font-bold", getColor(score))}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">Fleet Health</p>
        <p className={cn("text-xs", getColor(score))}>{getLabel(score)}</p>
      </div>
    </div>
  );
};

export function AIInsightsWidget({ 
  insightType, 
  title = "AI Insights",
  description = "Powered by FleetAI",
  compact = false,
  autoLoad = false,
  className
}: AIInsightsWidgetProps) {
  const { loading, insights, error, fetchInsights } = useFleetAI();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (autoLoad && !hasLoaded) {
      fetchInsights(insightType);
      setHasLoaded(true);
    }
  }, [autoLoad, hasLoaded, fetchInsights, insightType]);

  const handleRefresh = () => {
    fetchInsights(insightType);
  };

  if (compact) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10">
                <Brain className="h-4 w-4 text-violet-600" />
              </div>
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : insights ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{insights.summary}</p>
              {insights.insights.slice(0, 2).map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <InsightIcon type={insight.type} />
                  <span>{insight.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleRefresh} className="w-full gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Generate Insights
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 shadow-lg">
              <Brain className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Zap className="h-3 w-3" />
                  AI Powered
                </Badge>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "Analyzing..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        ) : insights ? (
          <div className="space-y-6">
            {/* Summary & Health Score */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-4">{insights.summary}</p>
                
                {/* Trends */}
                <div className="flex flex-wrap gap-2">
                  {insights.trends.improving.map((trend, i) => (
                    <Badge key={`imp-${i}`} variant="outline" className="gap-1 text-success border-success/20 bg-success/5">
                      <TrendingUp className="h-3 w-3" />
                      {trend}
                    </Badge>
                  ))}
                  {insights.trends.declining.map((trend, i) => (
                    <Badge key={`dec-${i}`} variant="outline" className="gap-1 text-destructive border-destructive/20 bg-destructive/5">
                      <TrendingDown className="h-3 w-3" />
                      {trend}
                    </Badge>
                  ))}
                </div>
              </div>
              <HealthScoreGauge score={insights.healthScore} />
            </div>

            {/* Insights List */}
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-3">
                {insights.insights.map((insight, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border transition-colors hover:bg-muted/50",
                      insight.type === 'critical' && "border-destructive/30 bg-destructive/5",
                      insight.type === 'warning' && "border-warning/30 bg-warning/5",
                      insight.type === 'success' && "border-success/30 bg-success/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <InsightIcon type={insight.type} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{insight.title}</p>
                            <InsightBadge type={insight.type} />
                          </div>
                          <p className="text-xs text-muted-foreground">{insight.description}</p>
                          {insight.metric && (
                            <p className="text-xs font-medium text-primary">{insight.metric}</p>
                          )}
                          {insight.action && (
                            <div className="flex items-center gap-1 text-xs text-primary mt-2">
                              <ChevronRight className="h-3 w-3" />
                              <span>{insight.action}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-4 rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Get AI-Powered Insights</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              FleetAI analyzes your fleet data to provide actionable insights, detect anomalies, and predict issues.
            </p>
            <Button onClick={handleRefresh} className="gap-2">
              <Brain className="h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
