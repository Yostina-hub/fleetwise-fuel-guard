import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BarChart3, TrendingUp, Target, Award, Shield, Clock, Fuel, AlertTriangle, Plus, Star, Search } from "lucide-react";
import { type Employee, EMPLOYEE_TYPE_LABELS, EMPLOYEE_TYPE_COLORS } from "@/hooks/useEmployees";
import { friendlyToastError } from "@/lib/errorMessages";

interface DriverPerformanceKPIsProps {
  driverId: string;
  driverName: string;
  employeeId?: string;
  employees?: Employee[];
}

interface KPI {
  id: string;
  driver_id: string;
  employee_id: string | null;
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
  driver_id: string;
  employee_id: string | null;
  review_period_start: string;
  review_period_end: string;
  reviewer_name: string | null;
  safety_score: number | null;
  compliance_score: number | null;
  customer_score: number | null;
  efficiency_score: number | null;
  overall_score: number | null;
  strengths: string[] | null;
  improvement_areas: string[] | null;
  improvement_plan: string | null;
  goals: any;
  status: string;
  created_at: string;
}

export const DriverPerformanceKPIs = ({ driverId, driverName, employeeId, employees = [] }: DriverPerformanceKPIsProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [reviewForm, setReviewForm] = useState({
    period_start: "", period_end: "", reviewer_name: "",
    safety: 75, compliance: 75, customer: 75, efficiency: 75,
    strengths: "", improvement_plan: "", goals: ""
  });

  const isAllMode = !employeeId && !driverId;

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      let kpiQuery = supabase.from("driver_performance_kpis").select("*").eq("organization_id", organizationId)
        .order("period", { ascending: false }).limit(isAllMode ? 200 : 12);
      let revQuery = supabase.from("driver_performance_reviews").select("*").eq("organization_id", organizationId)
        .order("created_at", { ascending: false }).limit(isAllMode ? 100 : 10);

      if (driverId) {
        kpiQuery = kpiQuery.eq("driver_id", driverId);
        revQuery = revQuery.eq("driver_id", driverId);
      }

      const [kpiRes, revRes] = await Promise.all([kpiQuery, revQuery]);
      setKpis((kpiRes.data as KPI[]) || []);
      setReviews((revRes.data as Review[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, employeeId, organizationId]);

  const getEmpName = (id: string) => {
    if (!isAllMode) return driverName;
    const emp = employees.find(e => e.id === id || e.driver_id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const getEmpType = (id: string) => {
    const emp = employees.find(e => e.id === id || e.driver_id === id);
    return emp?.employee_type || "other";
  };

  const filteredKpis = useMemo(() => {
    if (!search || !isAllMode) return kpis;
    const q = search.toLowerCase();
    return kpis.filter(k => getEmpName(k.employee_id || k.driver_id).toLowerCase().includes(q));
  }, [kpis, search, employees]);

  const filteredReviews = useMemo(() => {
    if (!search || !isAllMode) return reviews;
    const q = search.toLowerCase();
    return reviews.filter(r => getEmpName(r.employee_id || r.driver_id).toLowerCase().includes(q));
  }, [reviews, search, employees]);

  const latestKpi = !isAllMode ? kpis[0] : null;

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
    if (!organizationId || !driverId) return;
    const overall = Math.round((reviewForm.safety + reviewForm.compliance + reviewForm.customer + reviewForm.efficiency) / 4);
    const { error } = await supabase.from("driver_performance_reviews").insert({
      organization_id: organizationId,
      driver_id: driverId,
      review_period_start: reviewForm.period_start,
      review_period_end: reviewForm.period_end,
      reviewer_name: reviewForm.reviewer_name || null,
      safety_score: reviewForm.safety, compliance_score: reviewForm.compliance,
      customer_score: reviewForm.customer, efficiency_score: reviewForm.efficiency,
      overall_score: overall,
      strengths: reviewForm.strengths ? [reviewForm.strengths] : null,
      improvement_plan: reviewForm.improvement_plan || null,
      goals: reviewForm.goals ? [reviewForm.goals] : null,
      status: "submitted",
    });
    if (error) friendlyToastError(error);
    else {
      toast({ title: "Review submitted" });
      setShowReviewDialog(false);
      setReviewForm({ period_start: "", period_end: "", reviewer_name: "", safety: 75, compliance: 75, customer: 75, efficiency: 75, strengths: "", improvement_plan: "", goals: "" });
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

  // Aggregate view for all mode — show average scores per employee
  const employeeKpiSummary = useMemo(() => {
    if (!isAllMode) return [];
    const map: Record<string, { id: string; scores: number[]; count: number }> = {};
    kpis.forEach(k => {
      const key = k.employee_id || k.driver_id;
      if (!map[key]) map[key] = { id: key, scores: [], count: 0 };
      map[key].scores.push(k.composite_score);
      map[key].count++;
    });
    return Object.values(map)
      .map(v => ({ ...v, avg: v.scores.reduce((a, b) => a + b, 0) / v.scores.length }))
      .sort((a, b) => b.avg - a.avg);
  }, [kpis, isAllMode]);

  return (
    <div className="space-y-4">
      {/* Search for all mode */}
      {isAllMode && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
      )}

      {/* KPI Summary — single employee */}
      {!isAllMode && latestKpi && (
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
      )}

      {!isAllMode && !latestKpi && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          No KPI data available yet.
        </CardContent></Card>
      )}

      {/* All employees KPI ranking */}
      {isAllMode && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Employee Performance Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeKpiSummary.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-4">No KPI data</p>
            ) : (
              <div className="space-y-2">
                {employeeKpiSummary.filter(e => {
                  if (!search) return true;
                  return getEmpName(e.id).toLowerCase().includes(search.toLowerCase());
                }).map((e, i) => {
                  const empType = getEmpType(e.id);
                  return (
                    <div key={e.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-xs font-medium w-32 truncate">{getEmpName(e.id)}</span>
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[empType]}`}>
                        {EMPLOYEE_TYPE_LABELS[empType]}
                      </Badge>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreProgressColor(e.avg)}`} style={{ width: `${e.avg}%` }} />
                      </div>
                      <span className={`text-xs font-bold w-12 text-right ${scoreColor(e.avg)}`}>{e.avg.toFixed(0)}%</span>
                      <span className="text-[10px] text-muted-foreground w-16 text-right">{e.count} periods</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Trend (single employee) */}
      {!isAllMode && kpis.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {[...kpis].reverse().map((k) => (
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
        {!isAllMode && (
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
                  { key: "compliance", label: "Compliance", icon: Clock },
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
                <Textarea placeholder="Improvement plan..." value={reviewForm.improvement_plan} onChange={e => setReviewForm(f => ({ ...f, improvement_plan: e.target.value }))} rows={2} />
                <Textarea placeholder="Goals..." value={reviewForm.goals} onChange={e => setReviewForm(f => ({ ...f, goals: e.target.value }))} rows={2} />
                <Button className="w-full" onClick={handleCreateReview}>Submit Review</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {filteredReviews.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground text-xs">No reviews yet</CardContent></Card>
      ) : filteredReviews.map(r => (
        <Card key={r.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAllMode && (
                  <>
                    <span className="text-xs font-semibold">{getEmpName(r.employee_id || r.driver_id)}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[getEmpType(r.employee_id || r.driver_id)]}`}>
                      {EMPLOYEE_TYPE_LABELS[getEmpType(r.employee_id || r.driver_id)]}
                    </Badge>
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  {r.review_period_start && format(new Date(r.review_period_start), "MMM yyyy")} — {r.review_period_end && format(new Date(r.review_period_end), "MMM yyyy")}
                </span>
              </div>
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
                { label: "Compliance", score: r.compliance_score },
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
            {(r.strengths || r.improvement_plan || r.goals) && (
              <div className="text-[10px] space-y-1 pt-1 border-t">
                {r.strengths && <p><span className="font-medium text-emerald-400">Strengths:</span> {Array.isArray(r.strengths) ? r.strengths.join(", ") : r.strengths}</p>}
                {r.improvement_plan && <p><span className="font-medium text-amber-400">Improve:</span> {r.improvement_plan}</p>}
                {r.goals && <p><span className="font-medium text-blue-400">Goals:</span> {Array.isArray(r.goals) ? r.goals.join(", ") : String(r.goals)}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
