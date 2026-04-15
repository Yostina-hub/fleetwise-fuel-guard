import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BarChart3, TrendingUp, Target, Award, Shield, Clock, Fuel, AlertTriangle, Plus, Star } from "lucide-react";

interface DriverPerformanceKPIsProps {
  driverId: string;
  driverName: string;
}

interface KPI {
  id: string;
  period: string;
  trips_completed: number;
  total_km: number;
  on_time_percentage: number;
  fuel_efficiency_score: number;
  incident_count: number;
  complaint_count: number;
  attendance_rate: number;
  composite_score: number;
}

interface Review {
  id: string;
  review_period_start: string;
  review_period_end: string;
  reviewer_name: string | null;
  safety_score: number | null;
  punctuality_score: number | null;
  customer_score: number | null;
  efficiency_score: number | null;
  overall_score: number | null;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  status: string;
  created_at: string;
}

export const DriverPerformanceKPIs = ({ driverId, driverName }: DriverPerformanceKPIsProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    period_start: "", period_end: "", reviewer_name: "",
    safety: 75, punctuality: 75, customer: 75, efficiency: 75,
    strengths: "", improvements: "", goals: ""
  });

  useEffect(() => {
    if (!organizationId || !driverId) return;
    const fetch = async () => {
      setLoading(true);
      const [kpiRes, revRes] = await Promise.all([
        supabase.from("driver_performance_kpis").select("*").eq("organization_id", organizationId)
          .eq("driver_id", driverId).order("period", { ascending: false }).limit(12),
        supabase.from("driver_performance_reviews").select("*").eq("organization_id", organizationId)
          .eq("driver_id", driverId).order("created_at", { ascending: false }).limit(10),
      ]);
      setKpis((kpiRes.data as any) || []);
      setReviews((revRes.data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, organizationId]);

  const latestKpi = kpis[0];

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const scoreProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const handleCreateReview = async () => {
    if (!organizationId) return;
    const overall = Math.round((reviewForm.safety + reviewForm.punctuality + reviewForm.customer + reviewForm.efficiency) / 4);

    const { error } = await supabase.from("driver_performance_reviews").insert({
      organization_id: organizationId,
      driver_id: driverId,
      review_period_start: reviewForm.period_start,
      review_period_end: reviewForm.period_end,
      reviewer_name: reviewForm.reviewer_name || null,
      safety_score: reviewForm.safety,
      punctuality_score: reviewForm.punctuality,
      customer_score: reviewForm.customer,
      efficiency_score: reviewForm.efficiency,
      overall_score: overall,
      strengths: reviewForm.strengths || null,
      improvements: reviewForm.improvements || null,
      goals: reviewForm.goals || null,
      status: "submitted",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review submitted" });
      setShowReviewDialog(false);
      setReviewForm({ period_start: "", period_end: "", reviewer_name: "", safety: 75, punctuality: 75, customer: 75, efficiency: 75, strengths: "", improvements: "", goals: "" });
    }
  };

  const kpiMetrics = latestKpi ? [
    { label: "Trips", value: latestKpi.trips_completed, icon: BarChart3, color: "text-primary" },
    { label: "Distance", value: `${latestKpi.total_km.toFixed(0)} km`, icon: TrendingUp, color: "text-blue-400" },
    { label: "On-Time", value: `${latestKpi.on_time_percentage}%`, icon: Clock, color: "text-emerald-400" },
    { label: "Fuel Eff.", value: `${latestKpi.fuel_efficiency_score}%`, icon: Fuel, color: "text-amber-400" },
    { label: "Incidents", value: latestKpi.incident_count, icon: AlertTriangle, color: "text-red-400" },
    { label: "Score", value: `${latestKpi.composite_score}%`, icon: Award, color: "text-purple-400" },
  ] : [];

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      {latestKpi ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              KPIs — {format(new Date(latestKpi.period), "MMMM yyyy")}
            </h3>
            <Badge variant="outline" className={`${scoreColor(latestKpi.composite_score)} text-xs`}>
              Composite: {latestKpi.composite_score}%
            </Badge>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {kpiMetrics.map((m, i) => (
              <Card key={i}><CardContent className="p-2.5 text-center">
                <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                <p className="text-lg font-bold">{m.value}</p>
                <p className="text-[9px] text-muted-foreground">{m.label}</p>
              </CardContent></Card>
            ))}
          </div>
        </>
      ) : (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          No KPI data available yet. KPIs are auto-calculated monthly from trip and attendance data.
        </CardContent></Card>
      )}

      {/* KPI Trend (simple bar representation) */}
      {kpis.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {[...kpis].reverse().map((k, i) => (
                <div key={k.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full rounded-t ${scoreProgressColor(k.composite_score)}`}
                    style={{ height: `${Math.max(4, k.composite_score)}%` }} />
                  <span className="text-[8px] text-muted-foreground">{format(new Date(k.period), "MMM")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Reviews */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" /> Performance Reviews
        </h3>
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> New Review</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Performance Review — {driverName}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Period Start</label>
                  <Input type="date" value={reviewForm.period_start} onChange={e => setReviewForm(f => ({ ...f, period_start: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">Period End</label>
                  <Input type="date" value={reviewForm.period_end} onChange={e => setReviewForm(f => ({ ...f, period_end: e.target.value }))} /></div>
              </div>
              <Input placeholder="Reviewer Name" value={reviewForm.reviewer_name} onChange={e => setReviewForm(f => ({ ...f, reviewer_name: e.target.value }))} />

              {[
                { key: "safety", label: "Safety", icon: Shield },
                { key: "punctuality", label: "Punctuality", icon: Clock },
                { key: "customer", label: "Customer Service", icon: Star },
                { key: "efficiency", label: "Efficiency", icon: TrendingUp },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</span>
                    <span className="font-bold">{(reviewForm as any)[key]}/100</span>
                  </div>
                  <Slider value={[(reviewForm as any)[key]]} onValueChange={([v]) => setReviewForm(f => ({ ...f, [key]: v }))} max={100} step={1} />
                </div>
              ))}

              <Textarea placeholder="Strengths..." value={reviewForm.strengths} onChange={e => setReviewForm(f => ({ ...f, strengths: e.target.value }))} rows={2} />
              <Textarea placeholder="Areas for improvement..." value={reviewForm.improvements} onChange={e => setReviewForm(f => ({ ...f, improvements: e.target.value }))} rows={2} />
              <Textarea placeholder="Goals & coaching plan..." value={reviewForm.goals} onChange={e => setReviewForm(f => ({ ...f, goals: e.target.value }))} rows={2} />
              <Button className="w-full" onClick={handleCreateReview}>Submit Review</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reviews.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground text-xs">No reviews yet</CardContent></Card>
      ) : reviews.map(r => (
        <Card key={r.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {r.review_period_start && format(new Date(r.review_period_start), "MMM yyyy")} — {r.review_period_end && format(new Date(r.review_period_end), "MMM yyyy")}
              </span>
              <div className="flex items-center gap-2">
                {r.reviewer_name && <span className="text-[10px] text-muted-foreground">by {r.reviewer_name}</span>}
                <Badge variant="outline" className={`text-[10px] capitalize ${r.overall_score && r.overall_score >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                  {r.overall_score}% Overall
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Safety", score: r.safety_score },
                { label: "Punctuality", score: r.punctuality_score },
                { label: "Customer", score: r.customer_score },
                { label: "Efficiency", score: r.efficiency_score },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="relative w-10 h-10 mx-auto mb-1">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                        className={scoreColor(s.score || 0)} strokeWidth="3"
                        strokeDasharray={`${(s.score || 0) * 0.88} 88`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{s.score}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {(r.strengths || r.improvements || r.goals) && (
              <div className="text-[10px] space-y-1 pt-1 border-t">
                {r.strengths && <p><span className="font-medium text-emerald-400">Strengths:</span> {r.strengths}</p>}
                {r.improvements && <p><span className="font-medium text-amber-400">Improve:</span> {r.improvements}</p>}
                {r.goals && <p><span className="font-medium text-blue-400">Goals:</span> {r.goals}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
