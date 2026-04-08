import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ShieldAlert, TrendingDown, TrendingUp, Eye, AlertTriangle, Activity } from "lucide-react";

interface RiskScore {
  id: string;
  driver_id: string;
  score_date: string;
  composite_score: number;
  behavior_component: number;
  mvr_component: number;
  incident_component: number;
  compliance_component: number;
  fatigue_component: number;
  accident_probability: number | null;
  risk_tier: string;
  on_watchlist: boolean;
  watchlist_reason: string | null;
  risk_factors: any;
  recommended_interventions: any;
  trend: string;
  previous_score: number | null;
}

export const DriverPredictiveRiskScoring = () => {
  const { organizationId } = useOrganization();
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      // Get latest score per driver
      const { data } = await supabase
        .from("driver_risk_scores")
        .select("*")
        .eq("organization_id", organizationId)
        .order("score_date", { ascending: false })
        .limit(500);
      setScores((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [organizationId]);

  // Dedupe to latest per driver
  const latestByDriver = new Map<string, RiskScore>();
  scores.forEach(s => { if (!latestByDriver.has(s.driver_id)) latestByDriver.set(s.driver_id, s); });
  const latest = Array.from(latestByDriver.values());

  const watchlistCount = latest.filter(s => s.on_watchlist).length;
  const highRiskCount = latest.filter(s => s.risk_tier === "high" || s.risk_tier === "critical").length;
  const avgScore = latest.length > 0 ? latest.reduce((sum, s) => sum + s.composite_score, 0) / latest.length : 0;
  const decliningCount = latest.filter(s => s.trend === "declining" || s.trend === "rapid_decline").length;

  const tierColor = (tier: string) => {
    switch (tier) {
      case "critical": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "elevated": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "moderate": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default: return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
  };

  const trendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (trend === "declining" || trend === "rapid_decline") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const ScoreBar = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${value > 70 ? "bg-red-400" : value > 40 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-[10px] w-8 text-right">{value.toFixed(0)}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Predictive Risk Scoring</h3>
        <p className="text-sm text-muted-foreground">Composite risk assessment with accident probability and watchlist management</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <ShieldAlert className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{latest.length}</p>
          <p className="text-[10px] text-muted-foreground">Drivers Scored</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Eye className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <p className="text-2xl font-bold">{watchlistCount}</p>
          <p className="text-[10px] text-muted-foreground">On Watchlist</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-orange-400" />
          <p className="text-2xl font-bold">{highRiskCount}</p>
          <p className="text-[10px] text-muted-foreground">High/Critical</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingDown className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{decliningCount}</p>
          <p className="text-[10px] text-muted-foreground">Declining</p>
        </CardContent></Card>
      </div>

      {/* Watchlist section */}
      {watchlistCount > 0 && (
        <Card className="border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <Eye className="w-4 h-4" /> Watchlist ({watchlistCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {latest.filter(s => s.on_watchlist).map(s => (
              <div key={s.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${tierColor(s.risk_tier)}`}>{s.risk_tier}</Badge>
                    <span className="text-sm font-bold">{s.composite_score.toFixed(0)}</span>
                    {trendIcon(s.trend)}
                  </div>
                  {s.accident_probability && <span className="text-xs text-red-400">{s.accident_probability}% accident prob.</span>}
                </div>
                {s.watchlist_reason && <p className="text-xs text-muted-foreground">{s.watchlist_reason}</p>}
                <div className="space-y-1">
                  <ScoreBar label="Behavior" value={s.behavior_component} />
                  <ScoreBar label="MVR" value={s.mvr_component} />
                  <ScoreBar label="Incidents" value={s.incident_component} />
                  <ScoreBar label="Compliance" value={s.compliance_component} />
                  <ScoreBar label="Fatigue" value={s.fatigue_component} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All scored drivers */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">All Drivers — Risk Overview</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : latest.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No risk scores generated yet</p>
              <p className="text-xs mt-1">Risk scores are calculated from behavior, MVR, incident, and compliance data</p>
            </div>
          ) : (
            latest.sort((a, b) => b.composite_score - a.composite_score).slice(0, 30).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                {trendIcon(s.trend)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{s.composite_score.toFixed(0)}</span>
                    {s.previous_score && (
                      <span className={`text-[10px] ${s.composite_score > s.previous_score ? "text-red-400" : "text-emerald-400"}`}>
                        {s.composite_score > s.previous_score ? "↑" : "↓"}{Math.abs(s.composite_score - s.previous_score).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{s.score_date}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.accident_probability && <span className="text-[10px] text-muted-foreground">{s.accident_probability}% prob.</span>}
                  {s.on_watchlist && <Badge variant="destructive" className="text-[10px]">Watchlist</Badge>}
                  <Badge variant="outline" className={`text-[10px] ${tierColor(s.risk_tier)}`}>{s.risk_tier}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
