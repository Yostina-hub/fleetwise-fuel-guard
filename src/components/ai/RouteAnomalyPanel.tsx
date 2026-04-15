import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  RefreshCw,
  AlertTriangle,
  Fuel,
  Gauge,
  MapPin,
  Clock,
  Zap,
  Brain,
  Route,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RouteAnomaly {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  timeRange?: string;
}

interface RouteAnomalyAnalysis {
  riskScore: number;
  drivingScore: number;
  summary: string;
  anomalies: RouteAnomaly[];
  insights: string[];
}

interface RouteAnomalyPanelProps {
  vehicleId: string;
  organizationId: string;
  date: string;
  telemetryPoints?: any[];
  className?: string;
}

const AnomalyTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "fuel_anomaly": return <Fuel className="h-4 w-4" />;
    case "speed_anomaly": return <Gauge className="h-4 w-4" />;
    case "gps_tampering": return <MapPin className="h-4 w-4" />;
    case "route_deviation": return <Route className="h-4 w-4" />;
    case "idle_abuse": return <Clock className="h-4 w-4" />;
    case "time_anomaly": return <Clock className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

const severityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

const scoreColor = (score: number) =>
  score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : score >= 40 ? "text-orange-400" : "text-destructive";

const riskColor = (risk: number) =>
  risk <= 20 ? "text-green-400" : risk <= 40 ? "text-amber-400" : risk <= 60 ? "text-orange-400" : "text-destructive";

export function RouteAnomalyPanel({
  vehicleId,
  organizationId,
  date,
  telemetryPoints,
  className,
}: RouteAnomalyPanelProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<RouteAnomalyAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-route-anomaly", {
        body: {
          vehicleId,
          organizationId,
          date,
          telemetryPoints: telemetryPoints?.slice(0, 200),
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setAnalysis(data);
    } catch (err: any) {
      console.error("Route anomaly analysis failed:", err);
      setError(err?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-violet-500/5 via-blue-500/5 to-cyan-500/5 border-b pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20">
              <Brain className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                AI Route Analysis
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Zap className="h-2.5 w-2.5" /> AI-Powered
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Anomaly detection & driving analysis</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={loading}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {loading ? "Analyzing..." : analysis ? "Re-scan" : "Analyze"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 animate-pulse text-violet-500" />
              Analyzing route telemetry with AI...
            </div>
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive opacity-60" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={runAnalysis} className="mt-3">
              Retry
            </Button>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-[11px] text-muted-foreground mb-1">Risk Score</p>
                <p className={cn("text-2xl font-bold", riskColor(analysis.riskScore))}>
                  {analysis.riskScore}
                </p>
                <Progress
                  value={analysis.riskScore}
                  className="h-1.5 mt-1.5"
                />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-[11px] text-muted-foreground mb-1">Driving Score</p>
                <p className={cn("text-2xl font-bold", scoreColor(analysis.drivingScore))}>
                  {analysis.drivingScore}
                </p>
                <Progress
                  value={analysis.drivingScore}
                  className="h-1.5 mt-1.5"
                />
              </div>
            </div>

            {/* Summary */}
            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
              {analysis.summary}
            </p>

            {/* Anomalies */}
            {analysis.anomalies.length > 0 ? (
              <div>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-destructive" />
                  Detected Anomalies ({analysis.anomalies.length})
                </p>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {analysis.anomalies.map((a, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs",
                          a.severity === "critical" && "border-destructive/30 bg-destructive/5",
                          a.severity === "high" && "border-orange-500/30 bg-orange-500/5",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "p-1 rounded-md shrink-0 mt-0.5",
                            a.severity === "critical" && "bg-destructive/20 text-destructive",
                            a.severity === "high" && "bg-orange-500/20 text-orange-500",
                            a.severity === "medium" && "bg-warning/20 text-warning",
                            a.severity === "low" && "bg-muted text-muted-foreground",
                          )}>
                            <AnomalyTypeIcon type={a.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-medium">{a.title}</span>
                              <Badge className={cn("text-[9px] h-4", severityColors[a.severity])}>
                                {a.severity}
                              </Badge>
                              <span className="text-muted-foreground ml-auto">{a.confidence}%</span>
                            </div>
                            <p className="text-muted-foreground mb-1">{a.description}</p>
                            <p className="text-primary flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {a.recommendation}
                            </p>
                            {a.timeRange && (
                              <p className="text-muted-foreground mt-0.5">
                                <Clock className="h-3 w-3 inline mr-1" />{a.timeRange}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="p-2.5 rounded-full bg-green-500/10 w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm font-medium text-green-500">No Anomalies Detected</p>
              </div>
            )}

            {/* AI Insights */}
            {analysis.insights && analysis.insights.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  AI Insights
                </p>
                <div className="space-y-1.5">
                  {analysis.insights.map((insight, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="p-3 rounded-full bg-violet-500/10 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Brain className="h-6 w-6 text-violet-500" />
            </div>
            <p className="text-sm font-medium mb-1">AI Route Analysis</p>
            <p className="text-xs text-muted-foreground mb-4">
              Scan for route deviations, speed anomalies, fuel theft, GPS tampering & more
            </p>
            <Button variant="outline" size="sm" onClick={runAnalysis} className="gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Run AI Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
