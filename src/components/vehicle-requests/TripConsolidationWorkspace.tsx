/**
 * TripConsolidationWorkspace
 * --------------------------
 * Operations workspace that lets a pool supervisor merge multiple vehicle
 * requests into a single consolidated parent trip.
 *
 * Capabilities
 *  • Map of every active request (pickup → drop polylines, color-coded by pool)
 *  • Auto-suggested merge groups (exact route, dest + ±30min, geofence pair)
 *  • Manual multi-select via checkbox list OR by clicking pickup markers
 *  • Live merge preview: passenger total, route span, time window
 *  • One-click "Merge selected" → calls `consolidate_vehicle_requests` RPC,
 *    creates a parent request, marks children as `merged`
 *
 * Eligibility:
 *   active = status IN ('pending','approved','assigned')
 *   excluded once `merged_into_request_id` is set or `is_consolidated_parent`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPreviewSafeMapStyle } from "@/lib/lemat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Layers,
  MapPin,
  Route as RouteIcon,
  Users,
  Clock,
  Loader2,
  GitMerge,
  Sparkles,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  organizationId: string;
}

interface ActiveRequest {
  id: string;
  request_number: string;
  pool_name: string | null;
  pool_category: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_place: string | null;
  destination: string | null;
  needed_from: string;
  needed_until: string | null;
  status: string;
  passengers: number | null;
  num_vehicles: number | null;
  vehicle_type: string | null;
  requester_name: string | null;
}

const ADDIS_CENTER: [number, number] = [38.7525, 9.0192];

/** Stable color per pool. */
function poolColor(pool?: string | null): string {
  if (!pool) return "hsl(220 10% 60%)";
  let h = 0;
  for (let i = 0; i < pool.length; i++) h = (h * 31 + pool.charCodeAt(i)) % 360;
  return `hsl(${h} 75% 50%)`;
}

export const TripConsolidationWorkspace = ({ organizationId }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [poolFilter, setPoolFilter] = useState<string>("all");
  const [showRoutes, setShowRoutes] = useState(true);
  const [highlightSuggestions, setHighlightSuggestions] = useState(true);
  const [tab, setTab] = useState<"manual" | "suggested">("manual");

  // ---- Data ---------------------------------------------------------------
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["consolidation-active-requests", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, pool_name, pool_category, departure_lat, departure_lng, destination_lat, destination_lng, departure_place, destination, needed_from, needed_until, status, passengers, num_vehicles, vehicle_type, requester_name, merged_into_request_id, is_consolidated_parent",
        )
        .eq("organization_id", organizationId)
        .in("status", ["pending", "approved", "assigned"])
        .is("merged_into_request_id", null)
        .eq("is_consolidated_parent", false)
        .order("needed_from", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as ActiveRequest[];
    },
  });

  const { data: suggestionData, isLoading: loadingSuggestions } = useQuery({
    queryKey: ["consolidation-suggestions", organizationId],
    enabled: !!organizationId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("consolidate-requests", {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
  });

  // Build a lookup of request id → suggested group color
  const suggestedColorById = useMemo(() => {
    const m: Record<string, string> = {};
    if (!suggestionData?.groups) return m;
    const all = [
      ...(suggestionData.groups.exact_route || []),
      ...(suggestionData.groups.dest_window || []),
      ...(suggestionData.groups.geofence_pair || []),
    ];
    all.forEach((g: any, idx: number) => {
      const hue = (idx * 53) % 360;
      const color = `hsl(${hue} 80% 55%)`;
      g.requests?.forEach((r: any) => {
        m[r.id] = color;
      });
    });
    return m;
  }, [suggestionData]);

  // Pool filter options
  const pools = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => r.pool_name && set.add(r.pool_name));
    return Array.from(set).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) =>
      poolFilter === "all" ? true : (r.pool_name || "Unassigned") === poolFilter,
    );
  }, [requests, poolFilter]);

  // ---- Map lifecycle ------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getPreviewSafeMapStyle("streets"),
      center: ADDIS_CENTER,
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("consol-routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "consol-routes-line",
        type: "line",
        source: "consol-routes",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "hsl(220 80% 55%)"],
          "line-width": ["case", ["==", ["get", "selected"], true], 5, 2.5],
          "line-opacity": ["case", ["==", ["get", "selected"], true], 0.95, 0.65],
          "line-dasharray": [2, 1],
        },
      });
      map.resize();
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync features when data / selection / toggles change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const features: any[] = [];
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    filteredRequests.forEach((r) => {
      if (
        r.departure_lat == null ||
        r.departure_lng == null ||
        r.destination_lat == null ||
        r.destination_lng == null
      )
        return;

      const isSelected = selectedIds.has(r.id);
      const suggested = highlightSuggestions ? suggestedColorById[r.id] : undefined;
      const baseColor = suggested || poolColor(r.pool_name);

      if (showRoutes) {
        features.push({
          type: "Feature",
          properties: {
            color: baseColor,
            selected: isSelected,
            id: r.id,
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [r.departure_lng, r.departure_lat],
              [r.destination_lng, r.destination_lat],
            ],
          },
        });
      }

      // Pickup marker — clickable to toggle selection
      const pickupEl = document.createElement("div");
      pickupEl.style.cssText = `
        width:${isSelected ? 18 : 14}px;
        height:${isSelected ? 18 : 14}px;
        border-radius:9999px;
        background:${baseColor};
        border:${isSelected ? 3 : 2}px solid hsl(var(--background));
        box-shadow:0 0 0 2px ${isSelected ? "hsl(var(--primary))" : baseColor};
        cursor:pointer;
        transition:all .15s ease;
      `;
      pickupEl.title = `${r.request_number} — click to ${isSelected ? "deselect" : "select"}`;
      pickupEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSelect(r.id);
      });

      const m1 = new maplibregl.Marker({ element: pickupEl })
        .setLngLat([r.departure_lng, r.departure_lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14 }).setHTML(
            `<div style="font:500 12px system-ui;padding:4px;min-width:160px;">
               <div style="font-weight:700">${r.request_number}</div>
               <div style="color:hsl(var(--muted-foreground));font-size:11px;">${r.pool_name || "Unassigned"} · ${r.passengers ?? 0} pax</div>
               <div style="margin-top:4px;font-size:11px;">📍 ${r.departure_place || "Pickup"}</div>
               <div style="font-size:11px;">🏁 ${r.destination || "Drop"}</div>
               <div style="font-size:11px;color:hsl(var(--muted-foreground));margin-top:2px;">${format(new Date(r.needed_from), "MMM d h:mm a")}</div>
             </div>`,
          ),
        )
        .addTo(map);
      markersRef.current.push(m1);

      // Drop marker
      const dropEl = document.createElement("div");
      dropEl.style.cssText = `width:10px;height:10px;border-radius:2px;background:hsl(var(--background));border:2px solid ${baseColor};`;
      const m2 = new maplibregl.Marker({ element: dropEl })
        .setLngLat([r.destination_lng, r.destination_lat])
        .addTo(map);
      markersRef.current.push(m2);

      bounds.extend([r.departure_lng, r.departure_lat]);
      bounds.extend([r.destination_lng, r.destination_lat]);
      hasBounds = true;
    });

    const src = map.getSource("consol-routes") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features });

    if (hasBounds) {
      try {
        map.fitBounds(bounds, { padding: 50, duration: 500, maxZoom: 13 });
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, filteredRequests, selectedIds, suggestedColorById, showRoutes, highlightSuggestions]);

  // ---- Selection helpers --------------------------------------------------
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectGroup = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());

  const selectedRequests = useMemo(
    () => requests.filter((r) => selectedIds.has(r.id)),
    [requests, selectedIds],
  );

  // ---- Merge preview ------------------------------------------------------
  const preview = useMemo(() => {
    if (selectedRequests.length === 0) return null;
    const totalPax = selectedRequests.reduce((s, r) => s + (r.passengers || 0), 0);
    const pools = Array.from(new Set(selectedRequests.map((r) => r.pool_name || "Unassigned")));
    const earliest = selectedRequests
      .map((r) => new Date(r.needed_from).getTime())
      .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
    const latest = selectedRequests
      .map((r) => new Date(r.needed_until || r.needed_from).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    return {
      count: selectedRequests.length,
      totalPax,
      pools,
      earliest: new Date(earliest),
      latest: new Date(latest),
      multiPool: pools.length > 1,
    };
  }, [selectedRequests]);

  // ---- Merge mutation -----------------------------------------------------
  const mergeMut = useMutation({
    mutationFn: async (args: { ids: string[]; strategy: string }) => {
      const { data, error } = await (supabase as any).rpc(
        "consolidate_vehicle_requests",
        {
          _organization_id: organizationId,
          _request_ids: args.ids,
          _strategy: args.strategy,
          _notes: null,
        },
      );
      if (error) throw error;
      return data as string;
    },
    onSuccess: (newId) => {
      toast.success(`Consolidated ${selectedIds.size} requests into one trip.`, {
        description: `Parent request id: ${newId}`,
      });
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["consolidation-active-requests", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["consolidation-suggestions", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
    },
    onError: (e: any) => toast.error(e?.message || "Merge failed"),
  });

  const handleMerge = () => {
    if (selectedIds.size < 2) {
      toast.error("Pick at least 2 requests to merge");
      return;
    }
    mergeMut.mutate({ ids: Array.from(selectedIds), strategy: "manual" });
  };

  // ---- Render -------------------------------------------------------------
  const totalActive = requests.length;
  const withCoords = requests.filter(
    (r) => r.departure_lat != null && r.destination_lat != null,
  ).length;

  const suggestionGroups = [
    ...(suggestionData?.groups?.exact_route || []).map((g: any) => ({ ...g, label: "Exact route" })),
    ...(suggestionData?.groups?.dest_window || []).map((g: any) => ({ ...g, label: "Same dest · ±30 min" })),
    ...(suggestionData?.groups?.geofence_pair || []).map((g: any) => ({ ...g, label: "Geofence pair" })),
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <GitMerge className="w-4 h-4 text-primary shrink-0" />
            <div>
              <div className="font-medium">Trip Consolidation</div>
              <div className="text-xs text-muted-foreground">
                Merge active requests with overlapping routes & times into a single dispatched trip.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {totalActive} active · {withCoords} on map
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3">
        {/* MAP */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Active Requests Map
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch id="cw-routes" checked={showRoutes} onCheckedChange={setShowRoutes} />
                <Label htmlFor="cw-routes" className="text-xs cursor-pointer">
                  Routes
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="cw-sugg"
                  checked={highlightSuggestions}
                  onCheckedChange={setHighlightSuggestions}
                />
                <Label htmlFor="cw-sugg" className="text-xs cursor-pointer">
                  Highlight suggestions
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            <div ref={containerRef} className="w-full h-[560px]" />
            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur rounded-lg border p-2 text-[11px] space-y-1 shadow-md">
              <div className="font-semibold flex items-center gap-1 mb-1">
                <Layers className="w-3 h-3" /> Legend
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" /> Pickup (click to select)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-primary" /> Drop
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ boxShadow: "0 0 0 2px hsl(var(--primary))", background: "hsl(var(--primary))" }}
                />
                Selected
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SIDE PANEL */}
        <div className="space-y-3">
          {/* Merge preview */}
          <Card className={preview ? "border-primary/40" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Merge Preview
                {preview && (
                  <Badge variant="default" className="ml-1 h-5 text-[10px]">
                    {preview.count} selected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!preview ? (
                <div className="text-xs text-muted-foreground">
                  Pick requests from the list or by clicking pickup markers on the map.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border p-2">
                      <div className="text-muted-foreground">Passengers</div>
                      <div className="text-base font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {preview.totalPax}
                      </div>
                    </div>
                    <div className="rounded-md border p-2">
                      <div className="text-muted-foreground">Time window</div>
                      <div className="text-xs font-medium">
                        {format(preview.earliest, "MMM d h:mm a")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        → {format(preview.latest, "h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Pools: </span>
                    {preview.pools.map((p) => (
                      <Badge
                        key={p}
                        variant="outline"
                        className="mr-1 text-[10px]"
                        style={{
                          borderColor: poolColor(p === "Unassigned" ? null : p),
                        }}
                      >
                        {p}
                      </Badge>
                    ))}
                    {preview.multiPool && (
                      <span className="text-amber-500 ml-1">
                        ⚠ multi-pool merge
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={handleMerge}
                      disabled={mergeMut.isPending || selectedIds.size < 2}
                    >
                      {mergeMut.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <GitMerge className="w-3.5 h-3.5" />
                      )}
                      Merge {selectedIds.size}
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearSelection}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tabs: manual list OR auto-suggestions */}
          <Card>
            <CardHeader className="pb-2">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "manual" | "suggested")}>
                <TabsList className="grid grid-cols-2 w-full h-8">
                  <TabsTrigger value="manual" className="text-xs">
                    Manual ({filteredRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="suggested" className="text-xs">
                    Suggestions ({suggestionGroups.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {tab === "manual" ? (
                <>
                  {pools.length > 0 && (
                    <div className="px-3 pt-1 pb-2 flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                      <select
                        value={poolFilter}
                        onChange={(e) => setPoolFilter(e.target.value)}
                        className="text-xs h-7 rounded-md border bg-background px-2"
                      >
                        <option value="all">All pools</option>
                        {pools.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      {selectedIds.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 ml-auto text-xs"
                          onClick={clearSelection}
                        >
                          Clear ({selectedIds.size})
                        </Button>
                      )}
                    </div>
                  )}
                  <ScrollArea className="h-[360px]">
                    <div className="p-2 space-y-1">
                      {isLoading && (
                        <div className="text-center py-6 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                        </div>
                      )}
                      {!isLoading && filteredRequests.length === 0 && (
                        <div className="text-center py-6 text-xs text-muted-foreground">
                          No active requests for this filter.
                        </div>
                      )}
                      {filteredRequests.map((r) => {
                        const checked = selectedIds.has(r.id);
                        const sugg = suggestedColorById[r.id];
                        return (
                          <label
                            key={r.id}
                            className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
                              checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSelect(r.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: sugg || poolColor(r.pool_name) }}
                                />
                                <span className="text-xs font-semibold truncate">
                                  {r.request_number}
                                </span>
                                {sugg && (
                                  <Badge variant="secondary" className="h-4 text-[9px] px-1">
                                    suggested
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {r.departure_place || "—"} → {r.destination || "—"}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {format(new Date(r.needed_from), "MMM d h:mm a")}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Users className="w-2.5 h-2.5" />
                                  {r.passengers ?? 0}
                                </span>
                                {r.pool_name && (
                                  <span className="truncate">· {r.pool_name}</span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <ScrollArea className="h-[420px]">
                  <div className="p-2 space-y-2">
                    {loadingSuggestions && (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Scanning…
                      </div>
                    )}
                    {!loadingSuggestions && suggestionGroups.length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No mergeable groups detected right now.
                      </div>
                    )}
                    {suggestionGroups.map((g: any, idx: number) => {
                      const ids = g.requests.map((r: any) => r.id);
                      const allSelected = ids.every((id: string) => selectedIds.has(id));
                      const hue = (idx * 53) % 360;
                      const color = `hsl(${hue} 80% 55%)`;
                      return (
                        <div
                          key={g.key || idx}
                          className="rounded-md border p-2 space-y-1.5"
                          style={{ borderColor: allSelected ? color : undefined }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: color }}
                              />
                              <span className="text-xs font-semibold truncate">{g.label}</span>
                              <Badge variant="secondary" className="h-4 text-[9px] px-1">
                                {g.count}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant={allSelected ? "secondary" : "outline"}
                              className="h-6 text-[10px] px-2"
                              onClick={() => selectGroup(ids)}
                            >
                              {allSelected ? "Selected" : "Pick group"}
                            </Button>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {g.requests[0]?.departure_place || g.pickup_geofence || "—"} →{" "}
                            {g.requests[0]?.destination || g.drop_geofence || "—"}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {g.requests.map((r: any) => (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className="text-[9px] h-4 px-1"
                              >
                                {r.request_number}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TripConsolidationWorkspace;
