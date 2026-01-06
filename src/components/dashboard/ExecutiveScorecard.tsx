import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Crown, AlertTriangle, Activity, DollarSign, Users } from "lucide-react";
import { ExecutiveKPI } from "@/hooks/useExecutiveMetrics";

interface ExecutiveScorecardProps {
  kpis: ExecutiveKPI[];
  loading?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Operations: <Activity className="w-4 h-4" />,
  Safety: <AlertTriangle className="w-4 h-4" />,
  Finance: <DollarSign className="w-4 h-4" />,
  HR: <Users className="w-4 h-4" />,
};

const ExecutiveScorecard = ({ kpis, loading }: ExecutiveScorecardProps) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-l-destructive bg-destructive/5';
      case 'medium': return 'border-l-warning bg-warning/5';
      default: return 'border-l-success bg-success/5';
    }
  };

  const groupedKpis = kpis.reduce((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, ExecutiveKPI[]>);

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-warning" />
            Executive Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-warning" />
            Executive Scorecard
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedKpis).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                {categoryIcons[category] || <Activity className="w-4 h-4" />}
              </div>
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{category}</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {items.map((kpi, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${getPriorityColor(kpi.priority)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                    {getTrendIcon(kpi.trend)}
                  </div>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs font-medium ${kpi.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">{kpi.changeLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ExecutiveScorecard;
