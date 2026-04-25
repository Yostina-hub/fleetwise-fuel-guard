/**
 * PoolSharedRidesOverview
 * -----------------------
 * Manager-facing overview of all active shared rides grouped by pool. Shows
 * capacity utilisation, departure window, and live passenger count.
 *
 * Used on /pool-memberships next to PoolCorridorSettings so managers can
 * monitor and tune their pool's shared-ride activity in one place.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Share2, Clock, MapPin, Users, ArrowRight, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SharedRideRow {
  id: string;
  pool_code: string | null;
  origin_label: string;
  destination_label: string;
  departure_at: string;
  total_seats: number;
  available_seats: number;
  status: string;
  passenger_count: number;
}

const STATUS_COLOR: Record<string, string> = {
  planned:     "bg-secondary/15 text-secondary border-secondary/30",
  boarding:    "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
};

const PoolSharedRidesOverview = () => {
  const { organizationId } = useOrganization();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pool-shared-rides-overview", organizationId],
    enabled: !!organizationId,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<SharedRideRow[]> => {
      const { data, error } = await (supabase as any)
        .from("shared_rides")
        .select(
          `id, pool_code, origin_label, destination_label, departure_at,
           total_seats, available_seats, status,
           shared_ride_passengers!inner ( id, status )`,
        )
        .eq("organization_id", organizationId)
        .in("status", ["planned", "boarding", "in_progress"])
        .order("departure_at", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((r: any) => ({
        id: r.id,
        pool_code: r.pool_code,
        origin_label: r.origin_label,
        destination_label: r.destination_label,
        departure_at: r.departure_at,
        total_seats: r.total_seats ?? 0,
        available_seats: r.available_seats ?? 0,
        status: r.status,
        passenger_count: (r.shared_ride_passengers ?? []).filter(
          (p: any) => p.status !== "cancelled" && p.status !== "no_show",
        ).length,
      }));
    },
  });

  // Group by pool code; rides with no pool fall into "Unassigned".
  const grouped = useMemo(() => {
    const g: Record<string, SharedRideRow[]> = {};
    rows.forEach((r) => {
      const key = r.pool_code ?? "—";
      (g[key] ||= []).push(r);
    });
    return g;
  }, [rows]);

  const poolKeys = Object.keys(grouped).sort();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="w-4 h-4 text-primary" />
          Active Shared Rides by Pool
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading shared rides…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No active shared rides right now. New rides will appear here once
            requesters join a matched ride.
          </div>
        ) : (
          <div className="space-y-5">
            {poolKeys.map((poolCode) => {
              const list = grouped[poolCode];
              return (
                <div key={poolCode}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {poolCode}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {list.length} ride{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {list.map((r) => {
                      const occupied = Math.max(0, r.total_seats - r.available_seats);
                      const pct = r.total_seats > 0
                        ? Math.round((occupied / r.total_seats) * 100)
                        : 0;
                      const statusClass =
                        STATUS_COLOR[r.status] ?? "bg-muted text-muted-foreground border-border";
                      return (
                        <div
                          key={r.id}
                          className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-1.5 text-sm min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate">{r.origin_label}</span>
                              <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{r.destination_label}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-5 shrink-0 capitalize ${statusClass}`}
                            >
                              {r.status.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(r.departure_at), "MMM dd, HH:mm")}
                              <span className="opacity-70">
                                · {formatDistanceToNow(new Date(r.departure_at), { addSuffix: true })}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {r.passenger_count} passenger{r.passenger_count === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-[11px] tabular-nums text-muted-foreground w-16 text-right">
                              {occupied}/{r.total_seats} seats
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PoolSharedRidesOverview;
