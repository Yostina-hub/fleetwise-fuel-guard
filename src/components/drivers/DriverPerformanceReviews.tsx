import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ClipboardCheck, Star, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  review_type: string;
  review_period_start: string;
  review_period_end: string;
  reviewer_name: string | null;
  overall_score: number | null;
  safety_score: number | null;
  efficiency_score: number | null;
  compliance_score: number | null;
  customer_score: number | null;
  status: string;
  strengths: string[] | null;
  improvement_areas: string[] | null;
  manager_comments: string | null;
  next_review_date: string | null;
  created_at: string;
}

interface DriverPerformanceReviewsProps {
  driverId: string;
  driverName: string;
}

export const DriverPerformanceReviews = ({ driverId, driverName }: DriverPerformanceReviewsProps) => {
  const { organizationId } = useOrganization();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !driverId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_performance_reviews")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .order("review_period_end", { ascending: false });
      setReviews((data as Review[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, organizationId]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      draft: "bg-muted text-muted-foreground",
      pending_review: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      pending_acknowledgement: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      disputed: "bg-red-500/10 text-red-400 border-red-500/30",
    };
    return map[status] || "";
  };

  const latestScore = reviews.find(r => r.overall_score)?.overall_score;
  const completedCount = reviews.filter(r => r.status === "completed").length;

  const ScoreBar = ({ label, score }: { label: string; score: number | null }) => {
    if (!score) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-20">{label}</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(score / 10) * 100}%` }} />
        </div>
        <span className="text-[10px] font-medium w-8 text-right">{score.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Star className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{latestScore?.toFixed(1) || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Latest Score</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <ClipboardCheck className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{completedCount}</p>
          <p className="text-[10px] text-muted-foreground">Completed Reviews</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{reviews.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Reviews</p>
        </CardContent></Card>
      </div>

      {reviews.length === 0 && !loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No performance reviews for {driverName}</p>
        </CardContent></Card>
      ) : (
        reviews.map(r => (
          <Card key={r.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm capitalize">{r.review_type} Review</CardTitle>
                <Badge variant="outline" className={`text-[10px] ${statusBadge(r.status)}`}>{r.status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(r.review_period_start), "MMM dd")} — {format(new Date(r.review_period_end), "MMM dd, yyyy")}
                {r.reviewer_name && ` · by ${r.reviewer_name}`}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.overall_score && (
                <div className="space-y-1.5">
                  <ScoreBar label="Safety" score={r.safety_score} />
                  <ScoreBar label="Efficiency" score={r.efficiency_score} />
                  <ScoreBar label="Compliance" score={r.compliance_score} />
                  <ScoreBar label="Customer" score={r.customer_score} />
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <span className="text-xs font-medium w-20">Overall</span>
                    <div className="flex-1" />
                    <span className="text-sm font-bold text-primary">{r.overall_score.toFixed(1)}/10</span>
                  </div>
                </div>
              )}
              {r.strengths && r.strengths.length > 0 && (
                <div><p className="text-[10px] font-medium text-emerald-400 mb-1">Strengths</p>
                  <div className="flex flex-wrap gap-1">{r.strengths.map((s, i) => <Badge key={i} variant="outline" className="text-[10px] bg-emerald-500/5">{s}</Badge>)}</div>
                </div>
              )}
              {r.improvement_areas && r.improvement_areas.length > 0 && (
                <div><p className="text-[10px] font-medium text-amber-400 mb-1">Areas for Improvement</p>
                  <div className="flex flex-wrap gap-1">{r.improvement_areas.map((s, i) => <Badge key={i} variant="outline" className="text-[10px] bg-amber-500/5">{s}</Badge>)}</div>
                </div>
              )}
              {r.manager_comments && <p className="text-xs text-muted-foreground italic">"{r.manager_comments}"</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
