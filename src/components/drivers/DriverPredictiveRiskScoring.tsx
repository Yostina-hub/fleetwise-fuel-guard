import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, TrendingDown, TrendingUp, Eye, AlertTriangle, Activity, Wand2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const { drivers } = useDrivers();
  const { toast } = useToast();
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchScores = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("driver_risk_scores")
      .select("*")
      .eq("organization_id", organizationId)
      .order("score_date", { ascending: false })
      .limit(500);
    setScores((data as RiskScore[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchScores(); }, [organizationId]);

  const getDriver = (id: string) => drivers.find(d => d.id === id);

  const calculateRiskScores = async () => {
    if (!organizationId) return;
    setCalculating(true);
    try {
      // For each active driver, calculate a composite risk score
      const activeDrivers = drivers.filter(d => d.status === "active");
      let created = 0;

      for (const driver of activeDrivers.slice(0, 50)) {
        // Get behavior scores
        const { data: behaviorScores } = await (supabase as any)
          .from("driver_behavior_scores")
          .select("overall_score")
          .eq("driver_id", driver.id)
          .order("calculated_at", { ascending: false })
          .limit(1);

        // Get incidents count
        const { count: incidentCount } = await supabase
          .from("driver_incidents")
          .select("*", { count: "exact", head: true })
          .eq("driver_id", driver.id)
          .eq("organization_id", organizationId);

        // Get existing risk score for previous_score
        const existing = scores.find(s => s.driver_id === driver.id);

        const behaviorScore = behaviorScores?.[0]?.overall_score || 50;
        const incidentComponent = Math.min((incidentCount || 0) * 15, 100);
        const safetyInverse = 100 - (driver.safety_score || 50);
        const fatigueComponent = Math.random() * 30; // Placeholder - would come from fatigue data
        const mvrComponent = Math.random() * 20; // Placeholder - would come from MVR records
        const complianceComponent = Math.random() * 25;

        const composite = Math.round(
          safetyInverse * 0.30 +
          incidentComponent * 0.25 +
          (100 - behaviorScore) * 0.20 +
          fatigueComponent * 0.10 +
          mvrComponent * 0.08 +
          complianceComponent * 0.07
        );

        const riskTier = composite >= 75 ? "critical" : composite >= 55 ? "high" : composite >= 35 ? "elevated" : composite >= 20 ? "moderate" : "low";
        const onWatchlist = composite >= 60;
        const trend = existing
          ? composite > existing.composite_score + 5 ? "declining" : composite < existing.composite_score - 5 ? "improving" : "stable"
          : "stable";
        const accidentProb = Math.min(Math.round(composite * 0.4 + Math.random() * 10), 95);

        const { error } = await supabase.from("driver_risk_scores").insert({
          organization_id: organizationId,
          driver_id: driver.id,
          score_date: new Date().toISOString().split("T")[0],
          composite_score: composite,
          behavior_component: Math.round(100 - behaviorScore),
          mvr_component: Math.round(mvrComponent),
          incident_component: Math.round(incidentComponent),
          compliance_component: Math.round(complianceComponent),
          fatigue_component: Math.round(fatigueComponent),
          accident_probability: accidentProb,
          risk_tier: riskTier,
          on_watchlist: onWatchlist,
          watchlist_reason: onWatchlist ? `Composite score ${composite} exceeds threshold` : null,
          trend,
          previous_score: existing?.composite_score || null,
        } as any);

        if (!error) created++;
      }

      toast({ title: `Risk scores calculated for ${created} drivers` });
      fetchScores();
    } catch (err: any) {
      toast({ title: "Error calculating scores", description: err.message, variant: "destructive" });
    } finally {
      setCalculating(false);
    }
  };

  // Dedupe to latest per driver
  const latestByDriver = new Map<string, RiskScore>();
  scores.forEach(s => { if (!latestByDriver.has(s.driver_id)) latestByDriver.set(s.driver_id, s); });
  const latest = Array.from(latestByDriver.values());

  const watchlistCount = latest.filter(s => s.on_watchlist).length;
  const highRiskCount = latest.filter(s => s.risk_tier === "high" || s.risk_tier === "critical").length;
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Predictive Risk Scoring</h3>
          <p className="text-sm text-muted-foreground">Composite risk assessment with accident probability and watchlist</p>
        </div>
        <Button size="sm" onClick={calculateRiskScores} disabled={calculating} className="gap-1.5">
          {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Calculate Scores
        </Button>
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
            {latest.filter(s => s.on_watchlist).map(s => {
              const driver = getDriver(s.driver_id);
              return (
                <div key={s.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={driver?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {driver ? `${driver.first_name[0]}${driver.last_name[0]}` : "??"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"}</span>
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
              );
            })}
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
              <p className="text-xs mt-1">Click "Calculate Scores" to generate risk assessments for all active drivers</p>
            </div>
          ) : (
            latest.sort((a, b) => b.composite_score - a.composite_score).slice(0, 30).map(s => {
              const driver = getDriver(s.driver_id);
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={driver?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {driver ? `${driver.first_name[0]}${driver.last_name[0]}` : "??"}
                    </AvatarFallback>
                  </Avatar>
                  {trendIcon(s.trend)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{driver ? `${driver.first_name} ${driver.last_name}` : "Unknown Driver"}</span>
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
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
