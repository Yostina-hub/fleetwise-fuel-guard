/**
 * MergedTripStopsPanel
 * --------------------
 * Compact summary of a *consolidated parent trip* (`is_consolidated_parent = true`).
 *
 * Layout:
 *   - Always-visible 1-line summary (count, pax, time window, pool).
 *   - Expand → clean numbered stop list + an OPTIONAL route map.
 *   - The map is lazy-mounted and routes are fetched through the backend
 *     routing proxy so the dispatcher sees real road geometry, not browser-
 *     blocked public routing calls or straight-line placeholders.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitMerge,
  Users,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Map as MapIcon,
  EyeOff,
  Route as RouteIcon,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getPreviewSafeMapStyle } from "@/lib/lemat";

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
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
}

type RoutePoint = {
  coord: [number, number];
  label: string;
};

type RouteCandidate = {
  label: string;
  strategy: string;
  points: RoutePoint[];
};

const pointKey = (points: RoutePoint[]) =>
  points.map((p) => `${p.coord[0].toFixed(5)},${p.coord[1].toFixed(5)}`).join("|");

const distanceSq = (a: [number, number], b: [number, number]) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

const buildPairedRoute = (stops: Child[], order: number[], label: string, strategy: string): RouteCandidate => ({
  label,
  strategy,
  points: order.flatMap((idx) => {
    const c = stops[idx];
    return [
      { coord: [c.departure_lng!, c.departure_lat!] as [number, number], label: `P${idx + 1}` },
      { coord: [c.destination_lng!, c.destination_lat!] as [number, number], label: `D${idx + 1}` },
    ];
  }),
});

const buildNearestPairRoute = (stops: Child[]): RouteCandidate => {
  const remaining = stops.map((_, idx) => idx);
  const order: number[] = [];
  let current: [number, number] = [stops[0].departure_lng!, stops[0].departure_lat!];

  while (remaining.length > 0) {
    remaining.sort((a, b) =>
      distanceSq(current, [stops[a].departure_lng!, stops[a].departure_lat!]) -
      distanceSq(current, [stops[b].departure_lng!, stops[b].departure_lat!]),
    );
    const next = remaining.shift()!;
    order.push(next);
    current = [stops[next].destination_lng!, stops[next].destination_lat!];
  }

  return buildPairedRoute(stops, order, "Route B", "Nearest request order");
};

const buildSharedRideRoute = (stops: Child[]): RouteCandidate => {
  const pickupOrder: number[] = [];
  const remainingPickups = stops.map((_, idx) => idx);
  let current: [number, number] = [stops[0].departure_lng!, stops[0].departure_lat!];

  while (remainingPickups.length > 0) {
    remainingPickups.sort((a, b) =>
      distanceSq(current, [stops[a].departure_lng!, stops[a].departure_lat!]) -
      distanceSq(current, [stops[b].departure_lng!, stops[b].departure_lat!]),
    );
    const next = remainingPickups.shift()!;
    pickupOrder.push(next);
    current = [stops[next].departure_lng!, stops[next].departure_lat!];
  }

  const dropOrder: number[] = [];
  const remainingDrops = [...pickupOrder];
  while (remainingDrops.length > 0) {
    remainingDrops.sort((a, b) =>
      distanceSq(current, [stops[a].destination_lng!, stops[a].destination_lat!]) -
      distanceSq(current, [stops[b].destination_lng!, stops[b].destination_lat!]),
    );
    const next = remainingDrops.shift()!;
    dropOrder.push(next);
    current = [stops[next].destination_lng!, stops[next].destination_lat!];
  }

  return {
    label: "Route C",
    strategy: "Pickup-first shared ride",
    points: [
      ...pickupOrder.map((idx) => ({
        coord: [stops[idx].departure_lng!, stops[idx].departure_lat!] as [number, number],
        label: `P${idx + 1}`,
      })),
      ...dropOrder.map((idx) => ({
        coord: [stops[idx].destination_lng!, stops[idx].destination_lat!] as [number, number],
        label: `D${idx + 1}`,
      })),
    ],
  };
};

const buildRouteCandidates = (stops: Child[]): RouteCandidate[] => {
  const order = stops.map((_, idx) => idx);
  const candidates = [
    buildPairedRoute(stops, order, "Route A", "Time order"),
    buildNearestPairRoute(stops),
    buildSharedRideRoute(stops),
    buildPairedRoute(stops, [...order].reverse(), "Route D", "Reverse time order"),
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = pointKey(candidate.points);
    if (seen.has(key)) return false;
    seen.add(key);
    return candidate.points.length >= 2;
  }).slice(0, 3);
};

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
  // Map auto-shows when the panel is expanded and stops have coordinates.
  // Dispatchers asked to see optimized routes immediately without an extra click.
  const [showMap, setShowMap] = useState(true);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["merged-children", parentRequestId],
    enabled: !!parentRequestId && !!organizationId && open,
    staleTime: 30_000,
    queryFn: async (): Promise<Child[]> => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, requester_name, passengers, needed_from, needed_until, departure_place, destination, pool_name, departure_lat, departure_lng, destination_lat, destination_lng",
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

  const stopsWithCoords = useMemo(
    () =>
      children.filter(
        (c) =>
          c.departure_lat != null &&
          c.departure_lng != null &&
          c.destination_lat != null &&
          c.destination_lng != null,
      ),
    [children],
  );

  // ── Lazy-mounted map + backend-proxied optimized route options ────
  // The browser no longer calls the public routing service directly. Each
  // candidate stop order is sent through the backend route proxy, which avoids
  // preview CORS failures and returns real road geometry for rendering.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [routesInfo, setRoutesInfo] = useState<
    Array<{ label: string; strategy: string; distanceKm: number; durationMin: number; isBest: boolean; color: string }>
  >([]);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  /** Index of the route alternative the user has clicked to focus on the map. */
  const [focusedRouteIdx, setFocusedRouteIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!showMap || !open) return;
    if (!containerRef.current || mapRef.current) return;
    if (stopsWithCoords.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getPreviewSafeMapStyle("streets") as any,
      center: [stopsWithCoords[0].departure_lng!, stopsWithCoords[0].departure_lat!],
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", async () => {
      const bounds = new maplibregl.LngLatBounds();

      // ── Markers (numbered pickups + drops) ─────────────────────────
      stopsWithCoords.forEach((c, idx) => {
        const pickupEl = document.createElement("div");
        pickupEl.style.cssText = `
          width:26px;height:26px;border-radius:9999px;
          background:hsl(217 91% 60%);color:white;
          font:700 12px system-ui;display:flex;align-items:center;justify-content:center;
          border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);
          cursor:pointer;
        `;
        pickupEl.textContent = `P${idx + 1}`;
        const m1 = new maplibregl.Marker({ element: pickupEl })
          .setLngLat([c.departure_lng!, c.departure_lat!])
          .setPopup(
            new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
              `<div style="font:500 11px system-ui;padding:2px;min-width:160px;">
                 <div style="font-weight:700">Pickup ${idx + 1} · ${c.requester_name || c.request_number}</div>
                 <div style="color:#666;margin-top:2px;">📍 ${c.departure_place || "Pickup"}</div>
                 <div style="margin-top:3px;font-size:10px;">${c.passengers ?? 0} pax · ${format(new Date(c.needed_from), "HH:mm")}</div>
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m1);

        const dropEl = document.createElement("div");
        dropEl.style.cssText = `
          width:22px;height:22px;border-radius:4px;
          background:white;color:hsl(217 91% 50%);
          font:700 10px system-ui;display:flex;align-items:center;justify-content:center;
          border:2px solid hsl(217 91% 50%);box-shadow:0 2px 5px rgba(0,0,0,.25);
        `;
        dropEl.textContent = `D${idx + 1}`;
        const m2 = new maplibregl.Marker({ element: dropEl })
          .setLngLat([c.destination_lng!, c.destination_lat!])
          .setPopup(
            new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
              `<div style="font:500 11px system-ui;padding:2px;min-width:160px;">
                 <div style="font-weight:700">Drop ${idx + 1} · ${c.requester_name || c.request_number}</div>
                 <div style="color:#666;margin-top:2px;">🏁 ${c.destination || "Drop"}</div>
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m2);

        bounds.extend([c.departure_lng!, c.departure_lat!]);
        bounds.extend([c.destination_lng!, c.destination_lat!]);
      });

      try {
        map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 });
      } catch {
        /* noop */
      }

      const candidates = buildRouteCandidates(stopsWithCoords);
      if (candidates.length === 0) return;

      setRoutesLoading(true);
      setRoutesError(null);

      // Fallback colors for up to 3 alternatives. Best = primary blue.
      const palette = [
        { name: "Route A", color: "hsl(217 91% 55%)" },
        { name: "Route B", color: "hsl(38 92% 50%)" },
        { name: "Route C", color: "hsl(280 70% 60%)" },
      ];

      try {
        const resolved = await Promise.all(
          candidates.map(async (candidate) => {
            const { data, error } = await supabase.functions.invoke("route-directions", {
              body: { coordinates: candidate.points.map((p) => p.coord) },
            });
            if (error || !data?.ok || !Array.isArray(data?.geometry) || data.geometry.length < 2) {
              throw new Error(data?.error || error?.message || "Route service unavailable");
            }
            return {
              ...candidate,
              geometry: { type: "LineString" as const, coordinates: data.geometry as [number, number][] },
              distance: Number(data.distance_m) || 0,
              duration: Number(data.duration_s) || 0,
            };
          }).map((promise) => promise.catch(() => null)),
        );
        const results = resolved.filter((route): route is NonNullable<typeof route> => route !== null);
        if (results.length === 0) throw new Error("Route service unavailable");

        // Determine best by shortest duration
        const bestIdx = results.reduce(
          (best, r, i, arr) => (r.duration < arr[best].duration ? i : best),
          0,
        );

        // Render alternates first, then the best route on top so it visually wins.
        const renderOrder = [
          ...results.map((_, i) => i).filter((i) => i !== bestIdx),
          bestIdx,
        ];

        if (!mapRef.current) return;

        renderOrder.forEach((i) => {
          const r = results[i];
          const isBest = i === bestIdx;
          const meta = palette[i] ?? palette[0];
          const sourceId = `route-alt-${i}`;
          const layerId = `route-alt-layer-${i}`;
          map.addSource(sourceId, {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: r.geometry },
          });
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": isBest ? "hsl(217 91% 50%)" : meta.color,
              "line-width": isBest ? 6 : 3,
              "line-opacity": isBest ? 0.95 : 0.45,
              ...(isBest ? {} : { "line-dasharray": [1.5, 1] }),
            },
          });
        });

        // Fit bounds around the best route
        try {
          const coords: Array<[number, number]> = results[bestIdx].geometry.coordinates;
          const b = new maplibregl.LngLatBounds();
          coords.forEach((c) => b.extend(c as any));
          stopsWithCoords.forEach((s) => {
            b.extend([s.departure_lng!, s.departure_lat!]);
            b.extend([s.destination_lng!, s.destination_lat!]);
          });
          map.fitBounds(b, { padding: 50, maxZoom: 14, duration: 400 });
        } catch {
          /* noop */
        }

        setRoutesInfo(
          results.map((r, i) => ({
            label: palette[i]?.name ?? `Route ${i + 1}`,
            strategy: r.strategy,
            distanceKm: r.distance / 1000,
            durationMin: r.duration / 60,
            isBest: i === bestIdx,
            color: i === bestIdx ? "hsl(217 91% 50%)" : palette[i].color,
          })),
        );
      } catch (err: any) {
        setRoutesError(err?.message || "Could not load route alternatives");
        // Fallback: render straight dashed legs so the user still sees connectivity
        if (!mapRef.current) return;
        const features = stopsWithCoords.map((c) => ({
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [c.departure_lng!, c.departure_lat!],
              [c.destination_lng!, c.destination_lat!],
            ],
          },
        }));
        map.addSource("legs-fallback", {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });
        map.addLayer({
          id: "legs-fallback-line",
          type: "line",
          source: "legs-fallback",
          paint: {
            "line-color": "hsl(217 91% 60%)",
            "line-width": 2.5,
            "line-opacity": 0.6,
            "line-dasharray": [2, 1.5],
          },
        });
      } finally {
        setRoutesLoading(false);
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setRoutesInfo([]);
      setRoutesError(null);
      setRoutesLoading(false);
    };
  }, [showMap, open, stopsWithCoords]);

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
              {poolName && <span className="ml-2 truncate">· {poolName}</span>}
            </div>
          )}
        </div>

        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          {open ? "Hide" : "View stops"}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* ── EXPANDED CONTENT ── */}
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
            <>
              {/* Map toggle bar */}
              {stopsWithCoords.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-b bg-background/40">
                  <span className="text-[11px] text-muted-foreground">
                    {stopsWithCoords.length} of {children.length} stops have coordinates
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowMap((v) => !v)}
                  >
                    {showMap ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1" />
                        Hide map
                      </>
                    ) : (
                      <>
                        <MapIcon className="w-3.5 h-3.5 mr-1" />
                        Show on map
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Map + alternative-routes legend (only when toggled) */}
              {showMap && stopsWithCoords.length > 0 && (
                <div className="relative">
                  <div
                    ref={containerRef}
                    className="w-full h-[360px] bg-muted"
                    aria-label="Consolidated trip map"
                  />
                  {/* Floating legend overlay */}
                  <div className="absolute top-2 left-2 bg-background/95 backdrop-blur rounded-md border shadow-sm px-2.5 py-2 max-w-[220px] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <RouteIcon className="w-3 h-3 text-primary" />
                      Route alternatives
                    </div>
                    {routesLoading && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Computing routes…
                      </div>
                    )}
                    {!routesLoading && routesError && (
                      <div className="text-[10px] text-destructive">
                        {routesError}. Showing straight-line fallback.
                      </div>
                    )}
                    {!routesLoading && routesInfo.length > 0 && (
                      <ul className="space-y-1">
                        {routesInfo.map((r, i) => (
                          <li
                            key={i}
                            className={`flex items-center gap-1.5 text-[10px] ${
                              r.isBest ? "font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            <span
                              className="inline-block w-3 h-1.5 rounded-sm shrink-0"
                              style={{ background: r.color, opacity: r.isBest ? 1 : 0.7 }}
                            />
                            <span className="truncate">{r.label}</span>
                            <span className="ml-auto font-mono">
                              {r.distanceKm.toFixed(1)}km · {Math.round(r.durationMin)}m
                            </span>
                            {r.isBest && (
                              <Trophy className="w-3 h-3 text-primary shrink-0" />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Numbered timeline */}
              <ScrollArea className="max-h-[260px]">
                <ol className="py-2">
                  {children.map((c, idx) => (
                    <li key={c.id} className="relative px-4 py-3 flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </div>
                        {idx < children.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>

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
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MergedTripStopsPanel;
