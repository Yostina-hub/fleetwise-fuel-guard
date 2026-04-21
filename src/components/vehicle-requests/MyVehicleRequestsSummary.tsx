/**
 * MyVehicleRequestsSummary
 * =========================
 * Professional, glanceable summary of the *current user's* recent vehicle
 * requests. Surfaced in two places (per product decision):
 *   1. As a full card on the /vehicle-requests page (variant="full")
 *   2. As a compact strip inside the New Vehicle Request dialog so the
 *      requester can see the status of their last submissions before filing
 *      another one (variant="compact")
 *
 * Data source: `vehicle_requests` filtered by `requester_id = auth user`
 * Falls back gracefully when nothing exists (the compact variant returns
 * null so it doesn't add noise for first-time requesters).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Clock, CheckCircle2, Truck, XCircle,
  Sparkles, History, ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Variant = "full" | "compact";

interface Props {
  variant?: Variant;
  /** Limit how many recent rows to display in the list. Defaults: full=5, compact=3 */
  limit?: number;
  className?: string;
}

const STATUS_META: Record<
  string,
  { label: string; icon: any; tone: string; dot: string }
> = {
  pending:    { label: "Pending Approval", icon: Clock,         tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",       dot: "bg-amber-500" },
  approved:   { label: "Approved",         icon: CheckCircle2,  tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" },
  assigned:   { label: "Vehicle Assigned", icon: Truck,         tone: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",             dot: "bg-blue-500" },
  completed:  { label: "Completed",        icon: CheckCircle2,  tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30",     dot: "bg-violet-500" },
  rejected:   { label: "Rejected",         icon: XCircle,       tone: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",             dot: "bg-rose-500" },
  cancelled:  { label: "Cancelled",        icon: XCircle,       tone: "bg-muted text-muted-foreground border-border",                                   dot: "bg-muted-foreground" },
};

const fallbackMeta = STATUS_META.pending;

export const MyVehicleRequestsSummary = ({
  variant = "full",
  limit,
  className,
}: Props) => {
  const { user } = useAuthContext();
  const { organizationId } = useOrganization();
  const userId = user?.id ?? null;
  const cap = limit ?? (variant === "full" ? 5 : 3);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-vehicle-requests-summary", organizationId, userId],
    enabled: !!organizationId && !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, status, request_type, departure_place, destination, needed_from, created_at, assigned_vehicle:assigned_vehicle_id(plate_number)",
        )
        .eq("organization_id", organizationId!)
        .eq("requester_id", userId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const c = { total: rows.length, pending: 0, approved: 0, assigned: 0, completed: 0, rejected: 0 };
    for (const r of rows) {
      if (r.status === "pending")   c.pending++;
      else if (r.status === "approved")  c.approved++;
      else if (r.status === "assigned")  c.assigned++;
      else if (r.status === "completed") c.completed++;
      else if (r.status === "rejected")  c.rejected++;
    }
    return c;
  }, [rows]);

  const recent = rows.slice(0, cap);

  // ===== Compact variant (used inside the New Request dialog) =====
  if (variant === "compact") {
    if (isLoading) {
      return (
        <div className={cn("rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2", className)}>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }
    if (rows.length === 0) return null;

    return (
      <div
        className={cn(
          "rounded-lg border border-border/60 bg-gradient-to-br from-muted/40 to-muted/10 p-3 space-y-2.5",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <History className="h-3.5 w-3.5 text-primary" />
            Your recent requests
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {stats.pending > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
                <Clock className="h-2.5 w-2.5" />
                {stats.pending} pending
              </Badge>
            )}
            {stats.assigned > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-blue-500/40 text-blue-700 dark:text-blue-400">
                <Truck className="h-2.5 w-2.5" />
                {stats.assigned} assigned
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-1">
          {recent.map((r: any) => {
            const meta = STATUS_META[r.status] ?? fallbackMeta;
            const Icon = meta.icon;
            return (
              <div
                key={r.id}
                className="flex items-center gap-2 text-[11px] py-1 px-2 rounded-md bg-background/60 border border-border/40"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
                <span className="font-mono text-muted-foreground shrink-0">{r.request_number}</span>
                <span className="text-muted-foreground truncate flex-1">
                  {r.departure_place && r.destination
                    ? `${r.departure_place} → ${r.destination}`
                    : r.destination || r.departure_place || "—"}
                </span>
                <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px] gap-0.5 shrink-0", meta.tone)}>
                  <Icon className="h-2.5 w-2.5" />
                  {meta.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== Full variant (page card) =====
  return (
    <Card className={cn("overflow-hidden border-border/60 shadow-sm", className)}>
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-500/5 via-background to-violet-500/5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
              <ClipboardList className="h-3.5 w-3.5 text-white" />
            </div>
            My Request Summary
          </CardTitle>
          {rows.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Latest {recent.length} of {rows.length}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              You haven't filed any vehicle requests yet.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              When you submit one, you'll see its status update here in real time.
            </p>
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <SummaryTile label="Total"      value={stats.total}     tone="from-slate-500/15 to-transparent text-slate-700 dark:text-slate-300" icon={ClipboardList} />
              <SummaryTile label="Pending"    value={stats.pending}   tone="from-amber-500/15 to-transparent text-amber-700 dark:text-amber-400"   icon={Clock} />
              <SummaryTile label="Approved"   value={stats.approved}  tone="from-emerald-500/15 to-transparent text-emerald-700 dark:text-emerald-400" icon={CheckCircle2} />
              <SummaryTile label="Assigned"   value={stats.assigned}  tone="from-blue-500/15 to-transparent text-blue-700 dark:text-blue-400"      icon={Truck} />
              <SummaryTile label="Completed"  value={stats.completed} tone="from-violet-500/15 to-transparent text-violet-700 dark:text-violet-400" icon={CheckCircle2} />
            </div>

            {/* Recent list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Recent activity
                </span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground/60" />
              </div>
              <ScrollArea className="max-h-[260px]">
                <div className="space-y-1.5 pr-2">
                  {recent.map((r: any) => {
                    const meta = STATUS_META[r.status] ?? fallbackMeta;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", meta.tone)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold">{r.request_number}</span>
                            <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px]", meta.tone)}>
                              {meta.label}
                            </Badge>
                            {r.assigned_vehicle?.plate_number && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-1">
                                <Truck className="h-2.5 w-2.5" />
                                {r.assigned_vehicle.plate_number}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {r.departure_place && r.destination
                              ? `${r.departure_place} → ${r.destination}`
                              : r.destination || r.departure_place || "No route specified"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-muted-foreground">
                            {r.needed_from ? format(new Date(r.needed_from), "MMM dd") : "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground/70">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const SummaryTile = ({
  label, value, tone, icon: Icon,
}: { label: string; value: number; tone: string; icon: any }) => (
  <div className={cn("relative overflow-hidden rounded-lg border border-border/50 bg-gradient-to-br p-2.5", tone)}>
    <div className="flex items-center justify-between">
      <Icon className="h-3.5 w-3.5 opacity-70" />
      <span className="text-lg font-black leading-none">{value}</span>
    </div>
    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mt-1">{label}</div>
  </div>
);

export default MyVehicleRequestsSummary;
