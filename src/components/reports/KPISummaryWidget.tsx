import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportMetrics } from "@/hooks/useReportData";

interface KPIWidgetProps {
  metrics: ReportMetrics;
}

export const KPISummaryWidget = ({ metrics }: KPIWidgetProps) => {
  const navigate = useNavigate();

  const kpis = useMemo(() => [
    { name: "Fuel Efficiency", actual: metrics.avgEfficiency, target: 12, unit: "km/L", trend: metrics.efficiencyTrend },
    { name: "Safety Score", actual: metrics.avgDriverScore, target: 85, unit: "%", trend: -metrics.safetyTrend },
    { name: "SLA Compliance", actual: metrics.slaMetPercentage, target: 95, unit: "%", trend: 0 },
    { name: "Overdue Maint.", actual: metrics.overdueMaintenance, target: 0, unit: "", trend: 0, lowerBetter: true },
  ], [metrics]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Target className="w-4 h-4 text-primary" />
            KPI Overview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/kpi-scorecard')} className="text-xs gap-1 h-7">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {kpis.map((kpi, i) => {
          const isLowerBetter = kpi.lowerBetter;
          const pct = kpi.target > 0 
            ? Math.min(100, (kpi.actual / kpi.target) * 100) 
            : (kpi.actual === 0 ? 100 : 0);
          const isOnTarget = isLowerBetter ? kpi.actual === 0 : kpi.actual >= kpi.target;

          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{kpi.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {kpi.actual.toFixed(1)}{kpi.unit} / {kpi.target}{kpi.unit}
                  </span>
                  {kpi.trend > 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> :
                   kpi.trend < 0 ? <TrendingDown className="h-3 w-3 text-destructive" /> :
                   <Minus className="h-3 w-3 text-muted-foreground" />}
                  <Badge variant={isOnTarget ? "default" : "destructive"} className="text-[10px] h-4 px-1.5">
                    {isOnTarget ? "✓" : "✗"}
                  </Badge>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
