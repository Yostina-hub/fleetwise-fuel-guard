/**
 * MergedTripsHistory
 * ------------------
 * Post-merge audit + dispatch view that lists every consolidated parent trip
 * for the current organization. Designed as a clean, fully responsive
 * master/detail layout:
 *
 *   ┌─────────────────────┬───────────────────────────────────────┐
 *   │ Merged trip list    │  Selected trip detail                  │
 *   │ (cards, searchable) │  (stops, route map, geofence rules)    │
 *   └─────────────────────┴───────────────────────────────────────┘
 *
 *   • The detail side is collapsible — dispatchers can hide it to maximize
 *     the list area on small screens or when triaging in bulk.
 *   • On mobile the layout stacks; the detail panel becomes a sticky drawer
 *     under the list.
 *   • Cards show inline merged-place chips so the dispatcher sees what was
 *     merged without expanding.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitMerge,
  Search,
  Users,
  MapPin,
  Clock,
  ChevronRight,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MergedTripStopsPanel } from "./MergedTripStopsPanel";

interface Props {
  organizationId: string;
}

interface ParentTrip {
  id: string;
  request_number: string;
  pool_name: string | null;
  needed_from: string;
  needed_until: string | null;
  passengers: number | null;
  status: string;
  consolidation_strategy: string | null;
  child_count: number;
  child_places: Array<{
    request_number: string;
    departure_place: string | null;
    destination: string | null;
  }>;
}

export const MergedTripsHistory = ({ organizationId }: Props) => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Minimizable detail panel — persists per session for the dispatcher.
  const [detailOpen, setDetailOpen] = useState(true);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["merged-trips-history", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<ParentTrip[]> => {
      // 1. Pull every consolidated-parent request for this org.
      const { data: parents, error: parentErr } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, pool_name, needed_from, needed_until, passengers, status, consolidated_request_count",
        )
        .eq("organization_id", organizationId)
        .eq("is_consolidated_parent", true)
        .order("needed_from", { ascending: false })
        .limit(200);
      if (parentErr) throw parentErr;
      const parentRows = (parents || []) as any[];
      if (parentRows.length === 0) return [];

      // 2. One query for all children to render inline place chips.
      const parentIds = parentRows.map((p) => p.id);
      const { data: kids, error: kidsErr } = await (supabase as any)
        .from("vehicle_requests")
        .select("id, request_number, departure_place, destination, merged_into_request_id")
        .in("merged_into_request_id", parentIds);
      if (kidsErr) throw kidsErr;

      const grouped = new Map<string, ParentTrip["child_places"]>();
      (kids || []).forEach((k: any) => {
        const arr = grouped.get(k.merged_into_request_id) || [];
        arr.push({
          request_number: k.request_number,
          departure_place: k.departure_place,
          destination: k.destination,
        });
        grouped.set(k.merged_into_request_id, arr);
      });

      return parentRows.map((p) => ({
        id: p.id,
        request_number: p.request_number,
        pool_name: p.pool_name,
        needed_from: p.needed_from,
        needed_until: p.needed_until,
        passengers: p.passengers,
        status: p.status,
        consolidation_strategy: null,
        child_count: grouped.get(p.id)?.length ?? 0,
        child_places: grouped.get(p.id) ?? [],
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter(
      (t) =>
        t.request_number.toLowerCase().includes(q) ||
        (t.pool_name || "").toLowerCase().includes(q) ||
        t.child_places.some(
          (c) =>
            c.request_number.toLowerCase().includes(q) ||
            (c.departure_place || "").toLowerCase().includes(q) ||
            (c.destination || "").toLowerCase().includes(q),
        ),
    );
  }, [trips, search]);

  // Auto-pick the first trip when none selected so the right panel isn't blank.
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && filtered.some((t) => t.id === selectedId)) return selectedId;
    return filtered[0]?.id ?? null;
  }, [selectedId, filtered]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === effectiveSelectedId) ?? null,
    [trips, effectiveSelectedId],
  );

  const statusTone = (status: string) => {
    if (status === "assigned") return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    if (status === "approved") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    if (status === "completed") return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    if (status === "cancelled" || status === "rejected")
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  };

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GitMerge className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="font-medium truncate">Merged Trips History</div>
              <div className="text-xs text-muted-foreground truncate">
                Every consolidated parent trip with the merged pickups, drops, and combined route.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {trips.length} merged
            </Badge>
            {/* Minimize / expand the side detail */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 hidden lg:inline-flex"
              onClick={() => setDetailOpen((v) => !v)}
              title={detailOpen ? "Hide detail panel" : "Show detail panel"}
            >
              {detailOpen ? (
                <>
                  <PanelRightClose className="w-3.5 h-3.5" />
                  Hide details
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  Show details
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MASTER / DETAIL */}
      <div
        className={cn(
          "grid gap-3",
          // Responsive layout:
          //   - mobile: single column (list, then detail underneath)
          //   - lg: 2 columns; detail width animates closed when minimized
          detailOpen
            ? "grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr]"
            : "grid-cols-1",
        )}
      >
        {/* === LIST === */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 space-y-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Merged trips
            </CardTitle>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by trip #, pool, place…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)] min-h-[360px]">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-md" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <GitMerge className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {trips.length === 0
                    ? "No merged trips yet. Use the Consolidate workspace to merge requests."
                    : "No merged trips match your search."}
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((t) => {
                    const isSelected = effectiveSelectedId === t.id;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(t.id);
                            if (!detailOpen) setDetailOpen(true);
                          }}
                          className={cn(
                            "w-full text-left p-3 hover:bg-muted/40 transition-colors",
                            "focus:outline-none focus:bg-muted/60",
                            isSelected && "bg-primary/10 hover:bg-primary/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold truncate">
                                  {t.request_number}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] h-4 px-1.5 border-0", statusTone(t.status))}
                                >
                                  {t.status}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                                  <GitMerge className="w-2.5 h-2.5" />
                                  {t.child_count} merged
                                </Badge>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                                <span className="inline-flex items-center gap-0.5">
                                  <Users className="w-3 h-3" />
                                  {t.passengers ?? 0} pax
                                </span>
                                <span className="inline-flex items-center gap-0.5">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(t.needed_from), "MMM d")}
                                </span>
                                <span className="inline-flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(t.needed_from), "h:mm a")}
                                </span>
                                {t.pool_name && (
                                  <span className="truncate max-w-[140px]">· {t.pool_name}</span>
                                )}
                              </div>

                              {/* Inline merged-places preview */}
                              {t.child_places.length > 0 && (
                                <div className="mt-2 text-[11px] leading-snug text-muted-foreground">
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-primary/70" />
                                    <span className="line-clamp-2">
                                      {t.child_places
                                        .slice(0, 3)
                                        .map((c) =>
                                          [c.departure_place, c.destination]
                                            .filter(Boolean)
                                            .join(" → "),
                                        )
                                        .filter(Boolean)
                                        .join(" · ")}
                                      {t.child_places.length > 3 && (
                                        <span className="text-foreground font-medium">
                                          {" "}
                                          +{t.child_places.length - 3} more
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <ChevronRight
                              className={cn(
                                "w-4 h-4 shrink-0 mt-0.5 text-muted-foreground transition-transform",
                                isSelected && "text-primary translate-x-0.5",
                              )}
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* === DETAIL === */}
        {detailOpen && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">
                  {selectedTrip
                    ? `${selectedTrip.request_number} · ${selectedTrip.child_count} merged trips`
                    : "Trip detail"}
                </span>
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 lg:inline-flex hidden"
                onClick={() => setDetailOpen(false)}
                title="Hide details"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-3">
              {!selectedTrip ? (
                <div className="text-xs text-muted-foreground p-4 text-center">
                  Select a merged trip from the list to see its stops and route.
                </div>
              ) : (
                <MergedTripStopsPanel
                  key={selectedTrip.id}
                  parentRequestId={selectedTrip.id}
                  organizationId={organizationId}
                  poolName={selectedTrip.pool_name}
                  totalPassengers={selectedTrip.passengers}
                  childCount={selectedTrip.child_count}
                  mergeStrategy={selectedTrip.consolidation_strategy}
                  neededFrom={selectedTrip.needed_from}
                  neededUntil={selectedTrip.needed_until}
                  defaultOpen
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating "show details" button when minimized on lg+ */}
      {!detailOpen && (
        <div className="hidden lg:flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setDetailOpen(true)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Show trip detail
          </Button>
        </div>
      )}
    </div>
  );
};

export default MergedTripsHistory;
