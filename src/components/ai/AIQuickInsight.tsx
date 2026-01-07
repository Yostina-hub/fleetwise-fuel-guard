import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Fuel,
  Gauge,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIQuickInsightProps {
  type: 'fuel' | 'speed' | 'tracking' | 'general';
  title: string;
  insight: string;
  trend?: 'up' | 'down' | 'neutral';
  severity?: 'info' | 'warning' | 'success' | 'critical';
  metric?: string;
  className?: string;
}

export function AIQuickInsight({
  type,
  title,
  insight,
  trend = 'neutral',
  severity = 'info',
  metric,
  className
}: AIQuickInsightProps) {
  const getIcon = () => {
    switch (type) {
      case 'fuel':
        return <Fuel className="h-4 w-4" />;
      case 'speed':
        return <Gauge className="h-4 w-4" />;
      case 'tracking':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return "from-red-500/10 to-red-600/10 border-red-500/20";
      case 'warning':
        return "from-amber-500/10 to-orange-500/10 border-amber-500/20";
      case 'success':
        return "from-green-500/10 to-emerald-500/10 border-green-500/20";
      default:
        return "from-violet-500/10 to-purple-500/10 border-violet-500/20";
    }
  };

  const getTextColor = () => {
    switch (severity) {
      case 'critical':
        return "text-red-600";
      case 'warning':
        return "text-amber-600";
      case 'success':
        return "text-green-600";
      default:
        return "text-violet-600";
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden border bg-gradient-to-br",
      getSeverityColor(),
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg bg-white/50 dark:bg-black/20",
            getTextColor()
          )}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{title}</span>
              <Badge variant="secondary" className="gap-1 text-xs h-5">
                <Brain className="h-3 w-3" />
                AI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{insight}</p>
            {metric && (
              <div className="flex items-center gap-1 mt-2">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
                {trend === 'down' && <TrendingUp className="h-3 w-3 text-destructive rotate-180" />}
                <span className={cn(
                  "text-xs font-medium",
                  trend === 'up' && "text-success",
                  trend === 'down' && "text-destructive"
                )}>
                  {metric}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AIInsightBannerProps {
  insights: Array<{
    type: 'fuel' | 'speed' | 'tracking' | 'general';
    title: string;
    insight: string;
    severity?: 'info' | 'warning' | 'success' | 'critical';
  }>;
  className?: string;
}

export function AIInsightBanner({ insights, className }: AIInsightBannerProps) {
  if (insights.length === 0) return null;

  const topInsight = insights[0];
  const getSeverityStyles = () => {
    switch (topInsight.severity) {
      case 'critical':
        return "bg-destructive/10 border-destructive/20 text-destructive";
      case 'warning':
        return "bg-warning/10 border-warning/20 text-warning";
      case 'success':
        return "bg-success/10 border-success/20 text-success";
      default:
        return "bg-primary/10 border-primary/20 text-primary";
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border",
      getSeverityStyles(),
      className
    )}>
      <div className="p-1.5 rounded-lg bg-white/50 dark:bg-black/20">
        <Brain className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{topInsight.title}</span>
          {topInsight.severity === 'critical' && (
            <AlertTriangle className="h-4 w-4" />
          )}
        </div>
        <p className="text-xs opacity-80">{topInsight.insight}</p>
      </div>
      {insights.length > 1 && (
        <Badge variant="secondary" className="text-xs">
          +{insights.length - 1} more
        </Badge>
      )}
    </div>
  );
}
