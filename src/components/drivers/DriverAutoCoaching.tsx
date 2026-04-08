import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Brain, Target, CheckCircle2, Clock, TrendingUp, Zap } from "lucide-react";
import { format } from "date-fns";

interface CoachingWorkflow {
  id: string;
  driver_id: string;
  trigger_type: string;
  coaching_type: string;
  status: string;
  assigned_coach_name: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  score_before: number | null;
  score_after: number | null;
  improvement_pct: number | null;
  session_notes: string | null;
  effectiveness_rating: number | null;
  created_at: string;
}

export const DriverAutoCoaching = () => {
  const { organizationId } = useOrganization();
  const [workflows, setWorkflows] = useState<CoachingWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_coaching_workflows")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);
      setWorkflows((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [organizationId]);

  const completedCount = workflows.filter(w => w.status === "completed").length;
  const pendingCount = workflows.filter(w => w.status === "pending" || w.status === "scheduled").length;
  const avgImprovement = (() => {
    const improved = workflows.filter(w => w.improvement_pct !== null && w.improvement_pct > 0);
    return improved.length > 0 ? improved.reduce((s, w) => s + (w.improvement_pct || 0), 0) / improved.length : 0;
  })();
  const avgRating = (() => {
    const rated = workflows.filter(w => w.effectiveness_rating);
    return rated.length > 0 ? rated.reduce((s, w) => s + (w.effectiveness_rating || 0), 0) / rated.length : 0;
  })();

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "in_progress": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "scheduled": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "escalated": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "cancelled": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  const triggerLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Auto-Coaching Workflows</h3>
        <p className="text-sm text-muted-foreground">Automated coaching triggers, sessions, and effectiveness tracking</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Brain className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{workflows.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Workflows</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending/Scheduled</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{avgImprovement.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Improvement</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-2xl font-bold">{avgRating.toFixed(1)}/5</p>
          <p className="text-[10px] text-muted-foreground">Effectiveness</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Coaching Sessions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No coaching workflows yet</p>
              <p className="text-xs mt-1">Workflows are auto-triggered when driver scores drop below thresholds</p>
            </div>
          ) : (
            workflows.slice(0, 30).map(w => (
              <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                {w.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Zap className="w-4 h-4 text-amber-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{w.coaching_type.replace(/_/g, " ")}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{triggerLabel(w.trigger_type)}</Badge>
                    {w.assigned_coach_name && <span className="text-[10px] text-muted-foreground">Coach: {w.assigned_coach_name}</span>}
                    <span className="text-[10px] text-muted-foreground">{format(new Date(w.created_at), "MMM dd, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {w.score_before && w.score_after && (
                    <span className="text-[10px] text-muted-foreground">
                      {w.score_before.toFixed(0)} → {w.score_after.toFixed(0)}
                      {w.improvement_pct !== null && <span className={w.improvement_pct > 0 ? " text-emerald-400" : " text-red-400"}> ({w.improvement_pct > 0 ? "+" : ""}{w.improvement_pct.toFixed(1)}%)</span>}
                    </span>
                  )}
                  <Badge variant="outline" className={`text-[10px] ${statusColor(w.status)}`}>{w.status.replace(/_/g, " ")}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
