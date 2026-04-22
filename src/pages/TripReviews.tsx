/**
 * TripReviews
 * -----------
 * Fleet-Operations workspace for trip ratings & reviews submitted by
 * requesters after a trip is completed. Shows headline KPIs (avg score,
 * counts, dispute backlog), a filterable list of reviews, and lets
 * managers resolve flagged disputes inline.
 *
 * Reads from: vehicle_request_ratings, joined with vehicle_requests,
 * profiles, drivers and vehicles for context.
 */
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  Star,
  ThumbsUp,
  UserRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";

// ─── helpers ────────────────────────────────────────────────────────────

const Stars = ({ value, size = 14 }: { value: number | null; size?: number }) => {
  const v = value ?? 0;
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            "transition-colors",
            i <= v ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
};

const sentimentBadge = (score: number | null) => {
  if (!score) return null;
  if (score >= 4)
    return (
      <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">
        Positive
      </Badge>
    );
  if (score >= 3)
    return (
      <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">
        Neutral
      </Badge>
    );
  return (
    <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">
      Needs attention
    </Badge>
  );
};

interface ReviewRow {
  id: string;
  vehicle_request_id: string;
  rated_by: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  driver_score: number | null;
  vehicle_score: number | null;
  punctuality_score: number | null;
  overall_score: number | null;
  comment: string | null;
  dispute_flagged: boolean | null;
  dispute_reason: string | null;
  dispute_resolved_at: string | null;
  dispute_resolved_by: string | null;
  dispute_resolution_notes: string | null;
  created_at: string;
}

type EnrichedReview = ReviewRow & {
  request_number?: string;
  purpose?: string;
  destination?: string;
  rater_name?: string;
  driver_name?: string;
  vehicle_label?: string;
};

// ─── page ───────────────────────────────────────────────────────────────

export default function TripReviews() {
  const { user } = useAuthContext();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"all" | "disputes" | "positive" | "needs_attention">("all");
  const [active, setActive] = React.useState<EnrichedReview | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["fleet-trip-reviews", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<EnrichedReview[]> => {
      const { data: rows, error } = await (supabase as any)
        .from("vehicle_request_ratings")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const list = (rows ?? []) as ReviewRow[];
      if (!list.length) return [];

      const reqIds = [...new Set(list.map((r) => r.vehicle_request_id).filter(Boolean))];
      const raterIds = [...new Set(list.map((r) => r.rated_by).filter(Boolean) as string[])];
      const driverIds = [...new Set(list.map((r) => r.driver_id).filter(Boolean) as string[])];
      const vehIds = [...new Set(list.map((r) => r.vehicle_id).filter(Boolean) as string[])];

      const [reqs, raters, drvs, vehs] = await Promise.all([
        reqIds.length
          ? (supabase as any)
              .from("vehicle_requests")
              .select("id, request_number, purpose, destination")
              .in("id", reqIds)
          : Promise.resolve({ data: [] }),
        raterIds.length
          ? (supabase as any)
              .from("profiles")
              .select("id, full_name, email")
              .in("id", raterIds)
          : Promise.resolve({ data: [] }),
        driverIds.length
          ? (supabase as any)
              .from("drivers")
              .select("id, first_name, last_name")
              .in("id", driverIds)
          : Promise.resolve({ data: [] }),
        vehIds.length
          ? (supabase as any)
              .from("vehicles")
              .select("id, plate_number, make, model")
              .in("id", vehIds)
          : Promise.resolve({ data: [] }),
      ]);

      const reqMap = new Map<string, any>((reqs.data ?? []).map((r: any) => [r.id, r]));
      const raterMap = new Map<string, any>((raters.data ?? []).map((r: any) => [r.id, r]));
      const drvMap = new Map<string, any>((drvs.data ?? []).map((r: any) => [r.id, r]));
      const vehMap = new Map<string, any>((vehs.data ?? []).map((r: any) => [r.id, r]));

      return list.map((r) => {
        const req = reqMap.get(r.vehicle_request_id);
        const rater = r.rated_by ? raterMap.get(r.rated_by) : null;
        const drv = r.driver_id ? drvMap.get(r.driver_id) : null;
        const veh = r.vehicle_id ? vehMap.get(r.vehicle_id) : null;
        return {
          ...r,
          request_number: req?.request_number,
          purpose: req?.purpose,
          destination: req?.destination,
          rater_name: rater?.full_name || rater?.email || "Requester",
          driver_name: drv ? `${drv.first_name ?? ""} ${drv.last_name ?? ""}`.trim() : undefined,
          vehicle_label: veh
            ? `${veh.plate_number}${veh.make ? ` · ${veh.make}` : ""}${veh.model ? ` ${veh.model}` : ""}`
            : undefined,
        };
      });
    },
  });

  const reviews = data ?? [];

  const stats = React.useMemo(() => {
    const total = reviews.length;
    const scored = reviews.filter((r) => r.overall_score);
    const avg = scored.length
      ? scored.reduce((a, r) => a + (r.overall_score ?? 0), 0) / scored.length
      : 0;
    const disputes = reviews.filter((r) => r.dispute_flagged && !r.dispute_resolved_at).length;
    const positive = reviews.filter((r) => (r.overall_score ?? 0) >= 4).length;
    const negative = reviews.filter((r) => r.overall_score && r.overall_score < 3).length;
    return { total, avg, disputes, positive, negative };
  }, [reviews]);

  const filtered = React.useMemo(() => {
    let list = reviews;
    if (tab === "disputes") list = list.filter((r) => r.dispute_flagged);
    if (tab === "positive") list = list.filter((r) => (r.overall_score ?? 0) >= 4);
    if (tab === "needs_attention")
      list = list.filter((r) => r.overall_score && r.overall_score < 3);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.request_number?.toLowerCase().includes(q) ||
          r.rater_name?.toLowerCase().includes(q) ||
          r.driver_name?.toLowerCase().includes(q) ||
          r.vehicle_label?.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q) ||
          r.dispute_reason?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [reviews, tab, search]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
              Trip Reviews
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Feedback submitted by requesters after their trips were completed.
            </p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard
            label="Total reviews"
            value={stats.total}
            icon={MessageSquare}
            tone="muted"
          />
          <KpiCard
            label="Avg rating"
            value={stats.avg ? stats.avg.toFixed(1) : "—"}
            suffix={stats.avg ? "/ 5" : undefined}
            icon={Star}
            tone="amber"
          />
          <KpiCard
            label="Positive (4-5★)"
            value={stats.positive}
            icon={ThumbsUp}
            tone="success"
          />
          <KpiCard
            label="Needs attention"
            value={stats.negative}
            icon={AlertTriangle}
            tone={stats.negative > 0 ? "warning" : "muted"}
          />
          <KpiCard
            label="Open disputes"
            value={stats.disputes}
            icon={AlertTriangle}
            tone={stats.disputes > 0 ? "destructive" : "muted"}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-base">Reviews</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search request, driver, vehicle, comment…"
                  className="pl-8"
                />
              </div>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-3">
              <TabsList>
                <TabsTrigger value="all">All ({reviews.length})</TabsTrigger>
                <TabsTrigger value="disputes">
                  Disputes ({reviews.filter((r) => r.dispute_flagged).length})
                </TabsTrigger>
                <TabsTrigger value="positive">Positive ({stats.positive})</TabsTrigger>
                <TabsTrigger value="needs_attention">
                  Needs attention ({stats.negative})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No reviews match your filter yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((r) => (
                  <ReviewItem key={r.id} review={r} onOpen={() => setActive(r)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DisputeReviewDialog
        review={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        currentUserId={user?.id}
        onResolved={() => qc.invalidateQueries({ queryKey: ["fleet-trip-reviews"] })}
      />
    </Layout>
  );
}

// ─── sub-components ─────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "muted" | "amber" | "success" | "warning" | "destructive";
}) {
  const toneCls = {
    muted: "bg-muted/50 text-muted-foreground",
    amber: "bg-amber-400/15 text-amber-500",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", toneCls)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewItem({
  review,
  onOpen,
}: {
  review: EnrichedReview;
  onOpen: () => void;
}) {
  const isDispute = review.dispute_flagged && !review.dispute_resolved_at;
  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer",
        isDispute && "border-destructive/40 bg-destructive/5",
      )}
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20 shrink-0">
          {(review.rater_name ?? "?").slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold truncate">{review.rater_name}</span>
            {review.request_number && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {review.request_number}
              </Badge>
            )}
            {sentimentBadge(review.overall_score)}
            {isDispute && (
              <Badge className="bg-destructive text-destructive-foreground gap-1">
                <AlertTriangle className="h-3 w-3" />
                Dispute
              </Badge>
            )}
            {review.dispute_resolved_at && (
              <Badge className="bg-success/15 text-success border-success/30 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {review.driver_name && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                {review.driver_name}
              </span>
            )}
            {review.vehicle_label && (
              <span className="inline-flex items-center gap-1">
                <Car className="h-3 w-3" />
                {review.vehicle_label}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(review.created_at), "MMM d, yyyy h:mm a")}
            </span>
          </div>

          {/* per-axis scores */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
            <ScoreLine label="Driver" value={review.driver_score} />
            <ScoreLine label="Vehicle" value={review.vehicle_score} />
            <ScoreLine label="Punctuality" value={review.punctuality_score} />
            {review.overall_score && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-foreground">
                <span className="text-base font-bold text-primary">{review.overall_score}</span>
                <Stars value={review.overall_score} size={12} />
              </span>
            )}
          </div>

          {review.comment && (
            <p className="mt-2 text-sm text-foreground/80 italic line-clamp-2">
              "{review.comment}"
            </p>
          )}
          {isDispute && review.dispute_reason && (
            <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              <span className="font-medium">Reported issue:</span> {review.dispute_reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span>{label}</span>
      <Stars value={value} size={11} />
    </span>
  );
}

// ─── dispute resolution dialog ──────────────────────────────────────────

function DisputeReviewDialog({
  review,
  open,
  onOpenChange,
  currentUserId,
  onResolved,
}: {
  review: EnrichedReview | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentUserId?: string;
  onResolved: () => void;
}) {
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setNotes(review?.dispute_resolution_notes ?? "");
  }, [open, review]);

  if (!review) return null;
  const alreadyResolved = !!review.dispute_resolved_at;

  const handleResolve = async () => {
    if (!review || !currentUserId) return;
    if (notes.trim().length < 3) {
      toast.error("Please add a short resolution note.");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("vehicle_request_ratings")
      .update({
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolved_by: currentUserId,
        dispute_resolution_notes: notes.trim(),
      })
      .eq("id", review.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save", { description: error.message });
      return;
    }
    toast.success("Dispute marked as resolved.");
    onResolved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            Review · {review.request_number ?? "Trip"}
          </DialogTitle>
          <DialogDescription>
            Submitted by {review.rater_name} on{" "}
            {format(new Date(review.created_at), "MMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>

        {/* Score summary */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                {review.overall_score ?? "—"}
              </span>
              <Stars value={review.overall_score} size={16} />
            </div>
          </div>
          {[
            { label: "Driver", value: review.driver_score, icon: UserRound },
            { label: "Vehicle", value: review.vehicle_score, icon: Car },
            { label: "Punctuality", value: review.punctuality_score, icon: Clock },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <row.icon className="h-3.5 w-3.5" />
                {row.label}
              </span>
              <Stars value={row.value} size={13} />
            </div>
          ))}
        </div>

        {review.comment && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Requester comment</p>
            <p className="text-sm italic">"{review.comment}"</p>
          </div>
        )}

        {review.dispute_flagged && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Reported issue
            </div>
            <p className="text-sm text-foreground/90">
              {review.dispute_reason || "No details provided."}
            </p>
          </div>
        )}

        {review.dispute_flagged && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Resolution notes
              {alreadyResolved && (
                <span className="ml-2 text-xs text-success font-normal">
                  Resolved on {format(new Date(review.dispute_resolved_at!), "MMM d, yyyy")}
                </span>
              )}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              disabled={alreadyResolved}
              placeholder="Describe the action taken (driver coached, vehicle inspected, refund issued, etc.)"
              className="resize-none"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {review.dispute_flagged && !alreadyResolved && (
            <Button onClick={handleResolve} disabled={saving} className="min-w-[140px]">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark resolved
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
