/**
 * MergedTripStopsPanel
 * --------------------
 * Compact, scannable summary of a *consolidated parent trip*
 * (`is_consolidated_parent = true`).
 *
 * Design goals (per UX feedback):
 *   - Single, calm layout. No mini-map, no badge clutter.
 *   - Collapsed by default — one summary row tells the operator everything
 *     they need at a glance (count, pax, time window).
 *   - Expanded view = a clean timeline of stops. Each stop is one block
 *     with pickup → drop, requester and pax. Generous spacing.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitMerge,
  Users,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  parentRequestId: string;
  organizationId: string;
  poolName?: string | null;
  totalPassengers?: number | null;
  childCount?: number | null;
  mergeStrategy?: string | null;
  neededFrom?: string | null;
  neededUntil?: string | null;
  defaultOpen?: boolean;
}

interface Child {
  id: string;
  request_number: string;
  requester_name: string | null;
  passengers: number | null;
  needed_from: string;
  needed_until: string | null;
  departure_place: string | null;
  destination: string | null;
  pool_name: string | null;
}

export const MergedTripStopsPanel = ({
  parentRequestId,
  organizationId,
  poolName,
  totalPassengers,
  childCount,
  neededFrom,
  neededUntil,
  defaultOpen = false,
}: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["merged-children", parentRequestId],
    enabled: !!parentRequestId && !!organizationId && open,
    staleTime: 30_000,
    queryFn: async (): Promise<Child[]> => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, requester_name, passengers, needed_from, needed_until, departure_place, destination, pool_name",
        )
        .eq("organization_id", organizationId)
        .eq("merged_into_request_id", parentRequestId)
        .order("needed_from", { ascending: true });
      if (error) throw error;
      return (data || []) as Child[];
    },
  });

  // ── Derived totals (fall back to props when query is still loading) ─────
  const totalPax = useMemo(
    () =>
      children.length > 0
        ? children.reduce((s, c) => s + (c.passengers || 0), 0)
        : totalPassengers ?? 0,
    [children, totalPassengers],
  );
  const stopCount = children.length || childCount || 0;
  const earliest = useMemo(() => {
    if (children.length === 0) return neededFrom ? new Date(neededFrom) : null;
    return new Date(
      children
        .map((c) => new Date(c.needed_from).getTime())
        .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY),
    );
  }, [children, neededFrom]);
  const latest = useMemo(() => {
    if (children.length === 0) return neededUntil ? new Date(neededUntil) : null;
    return new Date(
      children
        .map((c) => new Date(c.needed_until || c.needed_from).getTime())
        .reduce((a, b) => Math.max(a, b), 0),
    );
  }, [children, neededUntil]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* ── COMPACT SUMMARY ROW (always visible) ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <GitMerge className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold">Consolidated trip</span>
            <span className="text-xs text-muted-foreground">
              {stopCount} stop{stopCount === 1 ? "" : "s"} · {totalPax} pax
            </span>
          </div>
          {earliest && (
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(earliest, "EEE MMM d · HH:mm")}
              {latest && (
                <>
                  <ArrowRight className="w-3 h-3 mx-0.5" />
                  {format(latest, "HH:mm")}
                </>
              )}
              {poolName && (
                <span className="ml-2 truncate">· {poolName}</span>
              )}
            </div>
          )}
        </div>

        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          {open ? "Hide" : "View stops"}
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>

      {/* ── EXPANDED TIMELINE ── */}
      {open && (
        <div className="border-t bg-muted/20">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 inline animate-spin mr-1.5" />
              Loading stops…
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No child requests linked to this consolidated trip.
            </div>
          ) : (
            <ScrollArea className="max-h-[260px]">
              <ol className="py-2">
                {children.map((c, idx) => (
                  <li
                    key={c.id}
                    className="relative px-4 py-3 flex gap-3"
                  >
                    {/* Timeline rail */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
                        {idx + 1}
                      </div>
                      {idx < children.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>

                    {/* Stop content */}
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium truncate">
                          {c.requester_name || c.request_number}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1 gap-0.5 font-normal"
                        >
                          <Users className="w-2.5 h-2.5" />
                          {c.passengers ?? 0}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                          {format(new Date(c.needed_from), "MMM d · HH:mm")}
                        </span>
                      </div>

                      <div className="mt-1.5 text-[11px] text-foreground leading-relaxed">
                        <div className="truncate">
                          <span className="text-muted-foreground">From </span>
                          {c.departure_place || "—"}
                        </div>
                        <div className="truncate">
                          <span className="text-muted-foreground">To </span>
                          {c.destination || "—"}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};

export default MergedTripStopsPanel;
