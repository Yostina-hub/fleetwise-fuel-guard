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
import { PageDateRangeProvider, usePageDateRange } from "@/contexts/PageDateRangeContext";
import PageDateRangeFilter from "@/components/common/PageDateRangeFilter";
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

type ScoreFilter = "driver" | "vehicle" | "punctuality" | "overall" | null;

export default function TripReviews() {
  return (
    <Layout>
      <PageDateRangeProvider>
        <TripReviewsInner />
      </PageDateRangeProvider>
    </Layout>
  );
}

function TripReviewsInner() {
  const { user } = useAuthContext();
  const { organizationId } = useOrganization();
  const { startISO, endISO } = usePageDateRange();
  const qc = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"all" | "disputes" | "positive" | "needs_attention">("all");
  const [scoreFilter, setScoreFilter] = React.useState<ScoreFilter>(null);
  const [active, setActive] = React.useState<EnrichedReview | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["fleet-trip-reviews", organizationId, startISO, endISO],
    enabled: !!organizationId,
    queryFn: async (): Promise<EnrichedReview[]> => {
      const { data: rows, error } = await (supabase as any)
        .from("vehicle_request_ratings")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
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
    const avgOf = (key: keyof EnrichedReview) => {
      const scored = reviews.filter((r) => typeof r[key] === "number" && (r[key] as number) > 0);
      if (!scored.length) return 0;
      return scored.reduce((a, r) => a + (r[key] as number), 0) / scored.length;
    };
    const avgDriver = avgOf("driver_score");
    const avgVehicle = avgOf("vehicle_score");
    const avgPunctuality = avgOf("punctuality_score");
    const avgOverall = avgOf("overall_score");
    const disputes = reviews.filter((r) => r.dispute_flagged && !r.dispute_resolved_at).length;
    const positive = reviews.filter((r) => (r.overall_score ?? 0) >= 4).length;
    const negative = reviews.filter((r) => r.overall_score && r.overall_score < 3).length;
    return { total, avgDriver, avgVehicle, avgPunctuality, avgOverall, disputes, positive, negative };
  }, [reviews]);

  const filtered = React.useMemo(() => {
    let list = reviews;
    if (tab === "disputes") list = list.filter((r) => r.dispute_flagged);
    if (tab === "positive") list = list.filter((r) => (r.overall_score ?? 0) >= 4);
    if (tab === "needs_attention")
      list = list.filter((r) => r.overall_score && r.overall_score < 3);

    // KPI card filter — show only reviews that have a rating for the selected
    // metric, sorted ascending so the lowest scores (the ones dragging the
    // average down) appear first. Clicking again toggles the filter off.
    if (scoreFilter) {
      const key =
        scoreFilter === "driver"
          ? "driver_score"
          : scoreFilter === "vehicle"
            ? "vehicle_score"
            : scoreFilter === "punctuality"
              ? "punctuality_score"
              : "overall_score";
      list = list
        .filter((r) => {
          const v = r[key as keyof EnrichedReview] as number | null;
          return typeof v === "number" && v > 0;
        })
        .slice()
        .sort((a, b) => {
          const av = (a[key as keyof EnrichedReview] as number) ?? 0;
          const bv = (b[key as keyof EnrichedReview] as number) ?? 0;
          return av - bv;
        });
    }

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
  }, [reviews, tab, search, scoreFilter]);

  const toggleScoreFilter = (key: Exclude<ScoreFilter, null>) =>
    setScoreFilter((curr) => (curr === key ? null : key));

  return (
    <>
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

        {/* Page-level date range filter — drives KPIs and table */}
        <PageDateRangeFilter hint="filters reviews, KPIs and disputes by submission date" />

        {/* KPI cards — averages (clickable to filter table to low-rated reviews) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AvgKpiCard
            label="Avg Driver"
            value={stats.avgDriver}
            icon={UserRound}
            tone="info"
            active={scoreFilter === "driver"}
            onClick={() => toggleScoreFilter("driver")}
          />
          <AvgKpiCard
            label="Avg Vehicle"
            value={stats.avgVehicle}
            icon={Car}
            tone="muted"
            active={scoreFilter === "vehicle"}
            onClick={() => toggleScoreFilter("vehicle")}
          />
          <AvgKpiCard
            label="Avg Punctuality"
            value={stats.avgPunctuality}
            icon={Clock}
            tone="success"
            active={scoreFilter === "punctuality"}
            onClick={() => toggleScoreFilter("punctuality")}
          />
          <AvgKpiCard
            label="Avg Overall"
            value={stats.avgOverall}
            icon={Star}
            tone="amber"
            active={scoreFilter === "overall"}
            onClick={() => toggleScoreFilter("overall")}
          />
        </div>

        {scoreFilter && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              Filtering by low {scoreFilter} ratings (&lt; 4★)
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setScoreFilter(null)}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Reviews</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.total} total · {stats.positive} positive · {stats.negative} needs attention · {stats.disputes} open disputes
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user, driver, vehicle, comment…"
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
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No reviews match your filter yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Trip</TableHead>
                    <TableHead className="font-semibold">Driver / Vehicle</TableHead>
                    <TableHead className="font-semibold text-center">Driver</TableHead>
                    <TableHead className="font-semibold text-center">Vehicle</TableHead>
                    <TableHead className="font-semibold text-center">Punctuality</TableHead>
                    <TableHead className="font-semibold text-center">Overall</TableHead>
                    <TableHead className="font-semibold">Comment</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <ReviewRowItem key={r.id} review={r} onOpen={() => setActive(r)} />
                  ))}
                </TableBody>
              </Table>
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
    </>
  );
}

// ─── sub-components ─────────────────────────────────────────────────────

function AvgKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "muted" | "amber" | "success" | "warning" | "destructive" | "info";
  active?: boolean;
  onClick?: () => void;
}) {
  const toneCls = {
    muted: "bg-muted/60 text-muted-foreground",
    amber: "bg-amber-400/15 text-amber-500",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-primary/10 text-primary",
  }[tone];
  const display = value > 0 ? value.toFixed(1) : "—";
  const pct = value > 0 ? Math.min(100, (value / 5) * 100) : 0;
  const clickable = !!onClick;
  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "overflow-hidden transition-all",
        clickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        active && "ring-2 ring-primary border-primary",
      )}
      aria-pressed={clickable ? active : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", toneCls)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tabular-nums">{display}</span>
          {value > 0 && <span className="text-xs text-muted-foreground">/ 5.0</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Stars value={Math.round(value)} size={12} />
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                value >= 4 ? "bg-success" : value >= 3 ? "bg-warning" : value > 0 ? "bg-destructive" : "bg-muted",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {clickable && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {active ? "Click to clear filter" : "Click to view low ratings"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ScorePill({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const tone =
    value >= 4
      ? "bg-success/15 text-success border-success/30"
      : value >= 3
        ? "bg-warning/15 text-warning border-warning/30"
        : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        tone,
      )}
    >
      <Star className="h-3 w-3 fill-current" />
      {value.toFixed(1)}
    </span>
  );
}

function ReviewRowItem({
  review,
  onOpen,
}: {
  review: EnrichedReview;
  onOpen: () => void;
}) {
  const isDispute = review.dispute_flagged && !review.dispute_resolved_at;
  const isResolved = !!review.dispute_resolved_at;
  return (
    <TableRow
      className={cn(
        "cursor-pointer",
        isDispute && "bg-destructive/5 hover:bg-destructive/10",
      )}
      onClick={onOpen}
    >
      <TableCell>
        <div className="flex items-center gap-2.5 min-w-[160px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold ring-1 ring-primary/20 shrink-0">
            {(review.rater_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{review.rater_name}</p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(review.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {review.request_number ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            {review.request_number}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="text-xs space-y-0.5 min-w-[140px]">
          {review.driver_name && (
            <div className="inline-flex items-center gap-1">
              <UserRound className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{review.driver_name}</span>
            </div>
          )}
          {review.vehicle_label && (
            <div className="inline-flex items-center gap-1 text-muted-foreground">
              <Car className="h-3 w-3" />
              <span className="truncate">{review.vehicle_label}</span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <ScorePill value={review.driver_score} />
      </TableCell>
      <TableCell className="text-center">
        <ScorePill value={review.vehicle_score} />
      </TableCell>
      <TableCell className="text-center">
        <ScorePill value={review.punctuality_score} />
      </TableCell>
      <TableCell className="text-center">
        <ScorePill value={review.overall_score} />
      </TableCell>
      <TableCell className="max-w-[260px]">
        {review.comment ? (
          <p className="text-xs text-foreground/80 italic line-clamp-2">"{review.comment}"</p>
        ) : (
          <span className="text-xs text-muted-foreground">No comment</span>
        )}
      </TableCell>
      <TableCell>
        {isDispute ? (
          <Badge className="bg-destructive text-destructive-foreground gap-1">
            <AlertTriangle className="h-3 w-3" />
            Dispute
          </Badge>
        ) : isResolved ? (
          <Badge className="bg-success/15 text-success border-success/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </Badge>
        ) : (
          sentimentBadge(review.overall_score) ?? (
            <span className="text-xs text-muted-foreground">—</span>
          )
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          View detail
        </Button>
      </TableCell>
    </TableRow>
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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            Review Detail
            {review.request_number && (
              <Badge variant="outline" className="font-mono text-[11px] ml-1">
                {review.request_number}
              </Badge>
            )}
            {alreadyResolved && (
              <Badge className="bg-success/15 text-success border-success/30 gap-1 ml-auto">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            )}
            {review.dispute_flagged && !alreadyResolved && (
              <Badge className="bg-destructive text-destructive-foreground gap-1 ml-auto">
                <AlertTriangle className="h-3 w-3" />
                Open dispute
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Trip review submitted by {review.rater_name}
          </DialogDescription>
        </DialogHeader>

        {/* Submitted by + meta */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5">
              Submitted by
            </p>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20 shrink-0">
                {(review.rater_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{review.rater_name}</p>
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(review.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5">
              Trip context
            </p>
            <div className="space-y-1 text-xs">
              {review.driver_name && (
                <div className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{review.driver_name}</span>
                </div>
              )}
              {review.vehicle_label && (
                <div className="inline-flex items-center gap-1.5">
                  <Car className="h-3 w-3 text-muted-foreground" />
                  <span>{review.vehicle_label}</span>
                </div>
              )}
              {review.purpose && (
                <p className="text-muted-foreground truncate">{review.purpose}</p>
              )}
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="rounded-lg border bg-gradient-to-br from-muted/40 to-muted/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Rating Breakdown</span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-primary tabular-nums">
                {review.overall_score?.toFixed(1) ?? "—"}
              </span>
              <div>
                <Stars value={review.overall_score} size={16} />
                <p className="text-[10px] text-muted-foreground text-right">Overall</p>
              </div>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Driver", value: review.driver_score, icon: UserRound },
              { label: "Vehicle", value: review.vehicle_score, icon: Car },
              { label: "Punctuality", value: review.punctuality_score, icon: Clock },
            ].map((row) => (
              <div key={row.label} className="rounded-md border bg-background p-2.5 text-center">
                <row.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] uppercase text-muted-foreground font-medium">
                  {row.label}
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5">
                  {row.value?.toFixed(1) ?? "—"}
                </p>
                <Stars value={row.value} size={11} />
              </div>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              User comment
            </p>
          </div>
          {review.comment ? (
            <p className="text-sm italic text-foreground/90 leading-relaxed">
              "{review.comment}"
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No comment was provided by the requester.
            </p>
          )}
        </div>

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
