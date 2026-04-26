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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GitMerge,
  Users,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Map as MapIcon,
  MapPin,
  EyeOff,
  Route as RouteIcon,
  Trophy,
  Sparkles,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getPreviewSafeMapStyle } from "@/lib/lemat";
import { friendlyToastError } from "@/lib/errorMessages";

interface SingleRequestShim {
  id: string;
  request_number?: string | null;
  requester_name?: string | null;
  passengers?: number | null;
  needed_from?: string | null;
  needed_until?: string | null;
  departure_place?: string | null;
  destination?: string | null;
  pool_name?: string | null;
  departure_lat?: number | null;
  departure_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
}

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
  /**
   * When provided, the panel renders for a single (non-consolidated) request
   * instead of querying merged children. This unifies the trip-route view so
   * dispatchers always see Route Alternatives + Use geofence rules / Mark all,
   * regardless of whether the request is consolidated.
   */
  singleRequest?: SingleRequestShim | null;
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

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeFencePoints = (points: unknown): Array<{ lat: number; lng: number }> => {
  const raw = typeof points === "string" ? (() => {
    try {
      return JSON.parse(points);
    } catch {
      return null;
    }
  })() : points;

  if (!Array.isArray(raw)) return [];
  return raw
    .map((point: any) => ({
      lat: toFiniteNumber(point?.lat ?? point?.[1]),
      lng: toFiniteNumber(point?.lng ?? point?.[0]),
    }))
    .filter((point): point is { lat: number; lng: number } => point.lat != null && point.lng != null);
};

const buildMergedTripFenceFeature = (fence: any): GeoJSON.Feature<GeoJSON.Polygon> | null => {
  if (fence.geometry_type === "circle") {
    const lat = toFiniteNumber(fence.center_lat);
    const lng = toFiniteNumber(fence.center_lng);
    const radius = toFiniteNumber(fence.radius_meters) || 500;
    if (lat == null || lng == null || radius <= 0) return null;
    const points = 112;
    const coords: number[][] = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);
      coords.push([
        lng + dx / (111320 * Math.cos((lat * Math.PI) / 180)),
        lat + dy / 111320,
      ]);
    }
    return { type: "Feature", properties: { name: fence.name }, geometry: { type: "Polygon", coordinates: [coords] } };
  }

  const polygonPoints = normalizeFencePoints(fence.polygon_points);
  if (fence.geometry_type === "polygon" && polygonPoints.length >= 3) {
    const coords = polygonPoints.map((point) => [point.lng, point.lat]);
    coords.push(coords[0]);
    return { type: "Feature", properties: { name: fence.name }, geometry: { type: "Polygon", coordinates: [coords] } };
  }

  return null;
};

const getMergedTripFenceCenter = (fence: any): [number, number] | null => {
  const centerLat = toFiniteNumber(fence.center_lat);
  const centerLng = toFiniteNumber(fence.center_lng);
  if (centerLat != null && centerLng != null) return [centerLng, centerLat];
  const points = normalizeFencePoints(fence.polygon_points);
  if (!points.length) return null;
  return [
    points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    points.reduce((sum, point) => sum + point.lat, 0) / points.length,
  ];
};

const getMergedTripFenceBounds = (fence: any): maplibregl.LngLatBounds | null => {
  const feature = buildMergedTripFenceFeature(fence);
  const coords = feature?.geometry.coordinates[0];
  if (!coords?.length) return null;
  const bounds = new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]);
  coords.forEach((coord) => bounds.extend(coord as [number, number]));
  return bounds;
};

const sameCoordinate = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) < 0.000001 && Math.abs(a[1] - b[1]) < 0.000001;

const GEOFENCE_CENTER_LAYER_IDS = ["mtsp-geofence-center-halo", "mtsp-geofence-center-dot"];

const liftMergedTripGeofenceSpots = (map: maplibregl.Map) => {
  GEOFENCE_CENTER_LAYER_IDS.forEach((id) => {
    try {
      if (map.getLayer(id)) map.moveLayer(id);
    } catch {
      /* layer may be mid-refresh */
    }
  });
};

const geofenceVisualColor = (fence: any) => {
  const raw = String(fence?.color || "").trim();
  const isMapColor = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(raw) && !raw.includes("var(");
  // Most seeded zones use the same primary blue as the trip route, which made
  // the zone spots blend into the route line. Keep custom colors, but use a
  // contrasting map color for the default-blue geofence set.
  return !isMapColor || raw.toLowerCase() === "#3b82f6" ? "hsl(160, 84%, 39%)" : raw;
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
  singleRequest = null,
}: Props) => {
  const isSingle = !!singleRequest;
  // Single-request mode mirrors the legacy RequestRouteMapCard: always open,
  // map visible by default, no "View stops" expand affordance needed.
  const [open, setOpen] = useState(isSingle ? true : defaultOpen);
  // Map auto-shows when the panel is expanded and stops have coordinates.
  // Dispatchers asked to see optimized routes immediately without an extra click.
  const [showMap, setShowMap] = useState(true);

  const { data: fetchedChildren = [], isLoading: isLoadingChildren } = useQuery({
    queryKey: ["merged-children", parentRequestId],
    // Only the consolidated-parent variant queries merged children. Single
    // requests synthesize a single Child from the request itself.
    enabled: !isSingle && !!parentRequestId && !!organizationId && open,
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

  // In single-request mode we synthesize a one-element children array from
  // the request itself so all downstream logic (markers, routing, AI, fit
  // bounds) keeps working unchanged.
  const children = useMemo<Child[]>(() => {
    if (!isSingle || !singleRequest) return fetchedChildren;
    return [
      {
        id: singleRequest.id,
        request_number: singleRequest.request_number ?? "",
        requester_name: singleRequest.requester_name ?? null,
        passengers: singleRequest.passengers ?? null,
        needed_from: singleRequest.needed_from ?? new Date().toISOString(),
        needed_until: singleRequest.needed_until ?? null,
        departure_place: singleRequest.departure_place ?? null,
        destination: singleRequest.destination ?? null,
        pool_name: singleRequest.pool_name ?? poolName ?? null,
        departure_lat: singleRequest.departure_lat ?? null,
        departure_lng: singleRequest.departure_lng ?? null,
        destination_lat: singleRequest.destination_lat ?? null,
        destination_lng: singleRequest.destination_lng ?? null,
      },
    ];
  }, [isSingle, singleRequest, fetchedChildren, poolName]);

  const isLoading = isSingle ? false : isLoadingChildren;

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
  const stopsKey = useMemo(
    () =>
      stopsWithCoords
        .map((c) => `${c.id}:${c.departure_lng},${c.departure_lat}->${c.destination_lng},${c.destination_lat}`)
        .join("|"),
    [stopsWithCoords],
  );

  // ── Geofences for this organization ──────────────────────────────
  // Dispatchers asked to see operational zones (depots, restricted areas,
  // service boundaries) overlaid on the trip map so they can judge whether
  // a route enters or leaves an authorised zone before assigning it.
  const { data: geofences = [] } = useQuery({
    queryKey: ["merged-trip-geofences", organizationId],
    enabled: !!organizationId && open && showMap,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofences")
        .select(
          "id,name,color,geometry_type,center_lat,center_lng,radius_meters,polygon_points,is_active,dispatch_policy,dispatch_priority",
        )
        .eq("organization_id", organizationId)
        .neq("is_active", false);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Per-request geofence override ─────────────────────────────────
  // Reads the parent vehicle_request row so the dispatcher can:
  //   • toggle geofence-aware dispatch off for THIS trip only
  //   • flag specific zones as "avoid" just for this trip (e.g. road closure)
  // Mutations write back to the same row and bust the AI cache.
  const queryClient = useQueryClient();
  const { data: requestSettings } = useQuery({
    queryKey: ["merged-trip-settings", parentRequestId],
    enabled: !!parentRequestId && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select("id, geofence_aware_dispatch, geofence_avoid_overrides")
        .eq("id", parentRequestId)
        .maybeSingle();
      if (error) throw error;
      return (data || {
        geofence_aware_dispatch: true,
        geofence_avoid_overrides: [] as string[],
      }) as {
        geofence_aware_dispatch: boolean;
        geofence_avoid_overrides: string[];
      };
    },
  });
  const geofenceAware = requestSettings?.geofence_aware_dispatch ?? true;
  const avoidOverrides: string[] = requestSettings?.geofence_avoid_overrides ?? [];
  const renderableGeofences = useMemo(
    () => (geofences as any[]).filter((fence) => buildMergedTripFenceFeature(fence)),
    [geofences],
  );

  const updateRequestSettings = useMutation({
    mutationFn: async (patch: {
      geofence_aware_dispatch?: boolean;
      geofence_avoid_overrides?: string[];
    }) => {
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(patch)
        .eq("id", parentRequestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merged-trip-settings", parentRequestId] });
      // Wipe any stale AI verdict so the dispatcher knows to re-run.
      setAiPick(null);
      setAiError(null);
    },
    onError: (e: any) =>
      friendlyToastError(e, { title: "Could not update geofence rule" }),
  });

  // ── Lazy-mounted map + backend-proxied optimized route options ────
  // The browser no longer calls the public routing service directly. Each
  // candidate stop order is sent through the backend route proxy, which avoids
  // preview CORS failures and returns real road geometry for rendering.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const geofenceFitAppliedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const stopBounds = useMemo(() => {
    if (stopsWithCoords.length === 0) return null;
    const bounds = new maplibregl.LngLatBounds();
    stopsWithCoords.forEach((s) => {
      bounds.extend([s.departure_lng!, s.departure_lat!]);
      bounds.extend([s.destination_lng!, s.destination_lat!]);
    });
    return bounds;
  }, [stopsWithCoords]);

  const [routesInfo, setRoutesInfo] = useState<
    Array<{
      label: string;
      strategy: string;
      distanceKm: number;
      durationMin: number;
      isBest: boolean;
      color: string;
      // Down-sampled geometry — fed to the AI recommender so it can reason
      // about *where* a route goes, not just totals.
      sampleCoords: [number, number][];
    }>
  >([]);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  /** Index of the route alternative the user has clicked to focus on the map. */
  const [focusedRouteIdx, setFocusedRouteIdx] = useState<number | null>(null);

  // ── AI route recommendation ─────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPick, setAiPick] = useState<
    { bestIdx: number; runnerUpIdx?: number; reasoning: string } | null
  >(null);

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

    const resizeMap = () => {
      requestAnimationFrame(() => mapRef.current?.resize());
    };
    const resizeObserver = typeof ResizeObserver !== "undefined" && containerRef.current
      ? new ResizeObserver(resizeMap)
      : null;
    if (containerRef.current) resizeObserver?.observe(containerRef.current);
    window.addEventListener("resize", resizeMap);
    map.once("idle", resizeMap);

    map.on("load", async () => {
      setMapReady(true);
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
        map.resize();
        const [sw, ne] = bounds.toArray() as [[number, number], [number, number]];
        if (sameCoordinate(sw, ne)) {
          map.jumpTo({ center: sw, zoom: 15 });
        } else {
          map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 });
        }
      } catch {
        /* noop */
      }

      // Build ONE canonical stop sequence (pickups then drops in time order)
      // and ask OSRM for *real* driving alternatives — different roads through
      // the same sequence — instead of synthesising fake "strategies" by
      // reordering stops, which produced misleading km/min figures.
      const orderedPoints: RoutePoint[] = [
        ...stopsWithCoords.map((c, idx) => ({
          coord: [c.departure_lng!, c.departure_lat!] as [number, number],
          label: `P${idx + 1}`,
        })),
        ...stopsWithCoords.map((c, idx) => ({
          coord: [c.destination_lng!, c.destination_lat!] as [number, number],
          label: `D${idx + 1}`,
        })),
      ];
      if (orderedPoints.length < 2) return;

      setRoutesLoading(true);
      setRoutesError(null);

      const uniqueOrderedPoints = orderedPoints.filter(
        (point, idx, arr) => idx === 0 || !sameCoordinate(point.coord, arr[idx - 1].coord),
      );

      if (uniqueOrderedPoints.length < 2) {
        setRoutesInfo([
          {
            label: "Single location",
            strategy: "Pickup and drop-off use the same coordinate",
            distanceKm: 0,
            durationMin: 0,
            isBest: true,
            color: "hsl(217 91% 50%)",
            sampleCoords: orderedPoints.map((p) => p.coord),
          },
        ]);
        setRoutesLoading(false);
        return;
      }

      // Professional palette — strong primary blue for the recommended route,
      // warm amber and muted violet for alternatives. Each route gets a darker
      // outline ("casing") drawn underneath for that map-app polish.
      const palette = [
        { name: "Recommended", color: "hsl(217 91% 50%)", casing: "hsl(217 91% 30%)" },
        { name: "Alternative 1", color: "hsl(32 95% 48%)", casing: "hsl(32 95% 28%)" },
        { name: "Alternative 2", color: "hsl(265 60% 55%)", casing: "hsl(265 60% 35%)" },
      ];

      try {
        // Try the routing service. The public OSRM demo backing this can be
        // flaky for large multi-stop requests, so retry once on transient
        // failure before falling back to straight lines.
        const callRouting = async () =>
          supabase.functions.invoke("route-directions", {
            body: {
              coordinates: uniqueOrderedPoints.map((p) => p.coord),
              alternatives: true,
            },
          });

        let { data, error } = await callRouting();
        if (error || !data?.ok) {
          // Single quick retry — OSRM demo throttling usually clears within ~1s.
          await new Promise((r) => setTimeout(r, 800));
          const retry = await callRouting();
          data = retry.data;
          error = retry.error;
        }
        if (error || !data?.ok) {
          throw new Error(
            data?.error || error?.message || "Route service unavailable",
          );
        }

        // Edge function returns `alternatives: [{geometry, distance_m, duration_s}, …]`
        // with the recommended route first. Fall back to the single primary
        // route if OSRM did not return alternatives for this geometry.
        const rawAlts: Array<{
          geometry: [number, number][];
          distance_m: number;
          duration_s: number;
        }> = Array.isArray(data.alternatives) && data.alternatives.length > 0
          ? data.alternatives
          : Array.isArray(data.geometry) && data.geometry.length >= 2
            ? [{
                geometry: data.geometry as [number, number][],
                distance_m: Number(data.distance_m) || 0,
                duration_s: Number(data.duration_s) || 0,
              }]
            : [];

        const uniqueAlts = rawAlts.filter((route, idx, arr) => {
          const signature = `${Math.round(Number(route.distance_m) || 0)}:${Math.round(Number(route.duration_s) || 0)}:${route.geometry?.length || 0}`;
          return arr.findIndex((other) => `${Math.round(Number(other.distance_m) || 0)}:${Math.round(Number(other.duration_s) || 0)}:${other.geometry?.length || 0}` === signature) === idx;
        });

        const results = uniqueAlts
          .filter((r) => Array.isArray(r.geometry) && r.geometry.length >= 2)
          .slice(0, 3)
          .map((r) => ({
            geometry: { type: "LineString" as const, coordinates: r.geometry },
            distance: r.distance_m,
            duration: r.duration_s,
          }));
        if (results.length === 0) throw new Error("Route service unavailable");

        // OSRM lists the recommended route first, but defend against any
        // alternative that happens to be marginally faster.
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
          const casingId = `route-alt-casing-${i}`;
          const layerId = `route-alt-layer-${i}`;
          map.addSource(sourceId, {
            type: "geojson",
            data: { type: "Feature", properties: { idx: i, isBest }, geometry: r.geometry },
          });
          map.addLayer({
            id: casingId,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": meta.casing,
              "line-width": isBest ? 9 : 5,
              "line-opacity": isBest ? 0.55 : 0.3,
            },
          });
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": meta.color,
              "line-width": isBest ? 6 : 3.5,
              "line-opacity": isBest ? 1 : 0.7,
              ...(isBest ? {} : { "line-dasharray": [2, 1.2] }),
            },
          });

          map.on("click", layerId, () => setFocusedRouteIdx(i));
          map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
          });
        });

        // Keep the initial stop viewport. The geofence overlay owns the final
        // combined fit so route rendering never zooms zones back out of view.

        setRoutesInfo(
          results.map((r, i) => {
            // Down-sample geometry to ≤8 points so the AI prompt stays compact.
            const coords = r.geometry.coordinates;
            const step = Math.max(1, Math.floor(coords.length / 8));
            const sampleCoords: [number, number][] = [];
            for (let k = 0; k < coords.length; k += step) {
              sampleCoords.push(coords[k] as [number, number]);
            }
            if (sampleCoords[sampleCoords.length - 1] !== coords[coords.length - 1]) {
              sampleCoords.push(coords[coords.length - 1] as [number, number]);
            }
            return {
              label: palette[i]?.name ?? `Route ${i + 1}`,
              // Honest, source-accurate descriptor — no synthesised "strategy".
              strategy: i === bestIdx ? "Fastest by OSRM road network" : "OSRM alternative road path",
              distanceKm: r.distance / 1000,
              durationMin: r.duration / 60,
              isBest: i === bestIdx,
              color: palette[i]?.color ?? palette[0].color,
              sampleCoords,
            };
          }),
        );
        // Reset any prior AI verdict — it referred to old routes.
        setAiPick(null);
        setAiError(null);
      } catch (err: any) {
        const raw = String(err?.message || "");
        // The supabase-js wrapper surfaces upstream 5xx as "non-2xx status
        // code", which means nothing to a dispatcher. Translate to plain text.
        const friendly = /non-2xx|5\d\d|upstream|unavailable/i.test(raw)
          ? "Routing service is busy — showing straight-line preview."
          : raw || "Could not load route alternatives.";
        setRoutesError(friendly);
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
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeMap);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
      geofenceFitAppliedRef.current = false;
      setRoutesInfo([]);
      setRoutesError(null);
      setRoutesLoading(false);
      setAiPick(null);
      setAiError(null);
      setAiLoading(false);
    };
  }, [showMap, open, stopsKey]);

  // ── Render geofences as filled polygons on the map ────────────────
  // Reacts to (a) the map being mounted via the route effect above and
  // (b) the geofences query resolving. Cleans up its own layers on each
  // run so toggling visibility never leaves orphan sources behind.
  useEffect(() => {
    if (!showMap || !open) return;
    const map = mapRef.current;
    if (!map || !mapReady || renderableGeofences.length === 0) return;

    const addedLayers: string[] = [];
    const addedSources: string[] = [];
    const addedMarkers: maplibregl.Marker[] = [];

    const renderGeofences = () => {
      const allBounds = new maplibregl.LngLatBounds();
      renderableGeofences.forEach((fence: any) => {
        const sourceId = `mtsp-geofence-${fence.id}`;
        const fillId = `${sourceId}-fill`;
        const lineId = `${sourceId}-line`;
        if (map.getSource(sourceId)) return;
        const color = geofenceVisualColor(fence);
        const feature = buildMergedTripFenceFeature(fence);
        if (!feature) return;
        feature.geometry.coordinates[0].forEach((coord) => allBounds.extend(coord as [number, number]));

        try {
          map.addSource(sourceId, { type: "geojson", data: feature });
          addedSources.push(sourceId);
          const beforeRouteLayer = map.getLayer("route-alt-casing-0")
            ? "route-alt-casing-0"
            : map.getLayer("legs-fallback-line")
              ? "legs-fallback-line"
              : undefined;
          map.addLayer({
            id: fillId,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": color, "fill-opacity": 0.42 },
          }, beforeRouteLayer);
          map.addLayer({
            id: lineId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": color,
              "line-width": 8,
              "line-opacity": 1,
            },
          });
          // HTML labels are used instead of symbol layers so labels remain
          // visible even when the base style has limited glyph/font support.
          const shortName = String(fence.name || "Zone").split(",")[0].slice(0, 28);
          addedLayers.push(fillId, lineId);

          const center = getMergedTripFenceCenter(fence);
          if (center) {
            const markerEl = document.createElement("div");
            markerEl.style.cssText = `
              display:flex;align-items:center;gap:5px;max-width:160px;
              padding:3px 7px;border-radius:9999px;background:hsl(var(--card));color:${color};
              font:700 11px system-ui;line-height:1.15;border:2px solid ${color};
              box-shadow:0 2px 10px hsl(var(--foreground) / .28);pointer-events:none;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            `;
            const dotEl = document.createElement("span");
            dotEl.style.cssText = `
              width:9px;height:9px;border-radius:9999px;background:${color};
              box-shadow:0 0 0 3px ${color}33;flex:0 0 auto;
            `;
            const labelEl = document.createElement("span");
            labelEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;min-width:0;";
            labelEl.textContent = shortName;
            markerEl.append(dotEl, labelEl);
            const marker = new maplibregl.Marker({ element: markerEl, anchor: "center" })
              .setLngLat(center)
              .addTo(map);
            addedMarkers.push(marker);
          }
        } catch {
          /* style not ready — load handler below will retry */
        }
      });

      const centerFeatures = renderableGeofences
        .map((fence: any) => {
          const center = getMergedTripFenceCenter(fence);
          if (!center) return null;
          return {
            type: "Feature" as const,
            properties: { name: fence.name || "Zone", color: geofenceVisualColor(fence) },
            geometry: { type: "Point" as const, coordinates: center },
          };
        })
        .filter((feature): feature is NonNullable<typeof feature> => feature !== null);

      const centerSource = map.getSource("mtsp-geofence-centers") as maplibregl.GeoJSONSource | undefined;
      if (centerSource) {
        centerSource.setData({ type: "FeatureCollection", features: centerFeatures });
      } else if (centerFeatures.length > 0) {
        try {
          map.addSource("mtsp-geofence-centers", {
            type: "geojson",
            data: { type: "FeatureCollection", features: centerFeatures },
          });
          addedSources.push("mtsp-geofence-centers");
          map.addLayer({
            id: "mtsp-geofence-center-halo",
            type: "circle",
            source: "mtsp-geofence-centers",
            paint: {
              "circle-radius": 12,
              "circle-color": "hsl(0, 0%, 100%)",
              "circle-opacity": 0.92,
              "circle-stroke-width": 3,
              "circle-stroke-color": ["get", "color"],
              "circle-stroke-opacity": 1,
            },
          });
          map.addLayer({
            id: "mtsp-geofence-center-dot",
            type: "circle",
            source: "mtsp-geofence-centers",
            paint: {
              "circle-radius": 5,
              "circle-color": ["get", "color"],
              "circle-opacity": 1,
            },
          });
          addedLayers.push("mtsp-geofence-center-halo", "mtsp-geofence-center-dot");
        } catch {
          /* noop */
        }
      }

      if (!allBounds.isEmpty() && !geofenceFitAppliedRef.current && !stopBounds) {
        try {
          map.fitBounds(allBounds, { padding: 72, maxZoom: 13, duration: 350 });
          geofenceFitAppliedRef.current = true;
        } catch {
          /* noop */
        }
      }
    };

    if (map.isStyleLoaded()) {
      renderGeofences();
    } else {
      map.once("style.load", renderGeofences);
    }

    return () => {
      const m = mapRef.current;
      if (!m) return;
      addedMarkers.forEach((marker) => marker.remove());
      addedLayers.forEach((id) => {
        try {
          if (m.getLayer(id)) m.removeLayer(id);
        } catch {
          /* noop */
        }
      });
      addedSources.forEach((id) => {
        try {
          if (m.getSource(id)) m.removeSource(id);
        } catch {
          /* noop */
        }
      });
    };
  }, [showMap, open, mapReady, renderableGeofences, routesInfo.length, stopBounds]);

  // Ask Lovable AI to recommend the best candidate route. The AI never
  // invents measurements — it weighs the OSRM-supplied numbers against the
  // trip context (passengers, time window, pool) AND any geofences each
  // route passes through, then returns a ranked pick plus a 1-2 sentence
  // justification.
  const requestAiRecommendation = async () => {
    if (routesInfo.length < 2 || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiPick(null);
    try {
      // ── Geofence intersection per route ───────────────────────────
      // For each candidate route we list which org geofences its sampled
      // geometry passes through, together with the *effective* policy:
      //   • the org-wide `dispatch_policy` (prefer / avoid / neutral), but
      //   • forced to "avoid" if the dispatcher flagged the zone as a
      //     per-trip override (e.g. one-off road closure).
      // The AI then knows e.g. "Route 0 crosses 'Restricted Zone A'
      // (avoid)" and can downrank it accordingly.
      type FenceHit = { name: string; policy: "prefer" | "avoid" | "neutral"; priority: number };
      const intersectFences = (coords: [number, number][]): FenceHit[] => {
        const hits = new Map<string, FenceHit>();
        for (const fence of geofences as any[]) {
          let crosses = false;
          if (fence.geometry_type === "circle") {
            const lat = Number(fence.center_lat);
            const lng = Number(fence.center_lng);
            const r = Number(fence.radius_meters) || 0;
            if (Number.isFinite(lat) && Number.isFinite(lng) && r > 0) {
              for (const [px, py] of coords) {
                // Equirectangular distance — fine at city scale.
                const dx = (px - lng) * 111320 * Math.cos((lat * Math.PI) / 180);
                const dy = (py - lat) * 111320;
                if (dx * dx + dy * dy <= r * r) {
                  crosses = true;
                  break;
                }
              }
            }
          } else if (
            fence.geometry_type === "polygon" &&
            Array.isArray(fence.polygon_points) &&
            fence.polygon_points.length >= 3
          ) {
            const poly = fence.polygon_points.map((p: any) => [Number(p.lng), Number(p.lat)]);
            const inside = (x: number, y: number) => {
              let isIn = false;
              for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1];
                const xj = poly[j][0], yj = poly[j][1];
                if (
                  ((yi > y) !== (yj > y)) &&
                  x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
                ) {
                  isIn = !isIn;
                }
              }
              return isIn;
            };
            for (const [px, py] of coords) {
              if (inside(px, py)) {
                crosses = true;
                break;
              }
            }
          }
          if (!crosses) continue;
          // Per-trip override always wins.
          const overridden = avoidOverrides.includes(fence.id);
          const policy: "prefer" | "avoid" | "neutral" = overridden
            ? "avoid"
            : (fence.dispatch_policy as any) || "neutral";
          hits.set(fence.id, {
            name: fence.name,
            policy,
            priority: Number(fence.dispatch_priority ?? 5),
          });
        }
        return Array.from(hits.values()).slice(0, 8);
      };

      const { data, error } = await supabase.functions.invoke("route-recommend", {
        body: {
          candidates: routesInfo.map((r) => ({
            label: r.label,
            distance_km: Number(r.distanceKm.toFixed(2)),
            duration_min: Number(r.durationMin.toFixed(1)),
            sample_coords: r.sampleCoords,
            geofences: intersectFences(r.sampleCoords),
          })),
          context: {
            pool_name: poolName ?? undefined,
            passengers: totalPax || undefined,
            stop_count: stopsWithCoords.length,
            needed_from: earliest?.toISOString(),
            needed_until: latest?.toISOString(),
            city: "Addis Ababa",
            // Lets the AI know whether to factor zone policy at all.
            // When false, it ignores all geofence inputs.
            geofence_aware: geofenceAware,
            // Surface the fact that geofences exist so the AI knows the
            // empty geofences[] case is meaningful (no zone crossed).
            known_geofences: (geofences as any[])
              .map((g) => ({
                name: g.name,
                policy: avoidOverrides.includes(g.id)
                  ? "avoid"
                  : g.dispatch_policy || "neutral",
              }))
              .filter((g) => g.name)
              .slice(0, 30),
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) {
        throw new Error(data?.message || data?.error || "AI could not pick a route");
      }
      setAiPick({
        bestIdx: Number(data.best_index),
        runnerUpIdx: typeof data.runner_up_index === "number" ? Number(data.runner_up_index) : undefined,
        reasoning: String(data.reasoning || ""),
      });
      setFocusedRouteIdx(Number(data.best_index));
    } catch (err: any) {
      setAiError(err?.message || "AI recommendation unavailable");
    } finally {
      setAiLoading(false);
    }
  };

  // Reset focus whenever a fresh batch of routes is loaded.
  useEffect(() => {
    setFocusedRouteIdx(null);
  }, [routesInfo.length]);

  // Apply focus styling — boost the focused route, dim the others.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routesInfo.length === 0) return;
    routesInfo.forEach((_, i) => {
      const layerId = `route-alt-layer-${i}`;
      const casingId = `route-alt-casing-${i}`;
      if (!map.getLayer(layerId)) return;
      const isFocused = focusedRouteIdx === i;
      const isBest = routesInfo[i].isBest;
      const dimmed = focusedRouteIdx != null && !isFocused;
      try {
        map.setPaintProperty(layerId, "line-opacity", dimmed ? 0.2 : isFocused || isBest ? 1 : 0.7);
        map.setPaintProperty(layerId, "line-width", isFocused ? 7 : isBest ? 6 : 3.5);
        if (map.getLayer(casingId)) {
          map.setPaintProperty(casingId, "line-opacity", dimmed ? 0.1 : isFocused ? 0.7 : isBest ? 0.55 : 0.3);
          map.setPaintProperty(casingId, "line-width", isFocused ? 10 : isBest ? 9 : 5);
        }
      } catch {
        /* layer may have been torn down */
      }
    });
  }, [focusedRouteIdx, routesInfo]);

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
          {isSingle ? <RouteIcon className="w-4 h-4" /> : <GitMerge className="w-4 h-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {isSingle ? "Trip route" : "Consolidated trip"}
            </span>
            <span className="text-xs text-muted-foreground">
              {isSingle
                ? `${totalPax} pax`
                : `${stopCount} stop${stopCount === 1 ? "" : "s"} · ${totalPax} pax`}
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
          {open ? "Hide" : isSingle ? "View route" : "View stops"}
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
              {isSingle
                ? "This request has no pickup or destination yet."
                : "No child requests linked to this consolidated trip."}
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
                  {/* Floating legend overlay — Google-Maps-style route picker */}
                  <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-md rounded-lg border border-border/60 shadow-lg overflow-hidden w-[260px] max-w-[calc(100%-1.5rem)] max-h-[calc(100%-1.5rem)] overflow-y-auto">
                    <div className="px-3 py-2 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                        <RouteIcon className="w-3.5 h-3.5 text-primary" />
                        Route alternatives
                      </div>
                      {!routesLoading && routesInfo.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {routesInfo.length} option{routesInfo.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    {routesLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-3">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Computing best route…
                      </div>
                    )}
                    {!routesLoading && routesError && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-2.5 leading-snug">
                        {routesError}
                      </div>
                    )}

                    {!routesLoading && routesInfo.length > 0 && (() => {
                      const bestDuration = routesInfo.find((r) => r.isBest)?.durationMin ?? 0;
                      return (
                        <ul className="divide-y divide-border/50 max-h-[260px] overflow-y-auto">
                          {routesInfo.map((r, i) => {
                            const isFocused = focusedRouteIdx === i;
                            const deltaMin = Math.round(r.durationMin - bestDuration);
                            return (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() => setFocusedRouteIdx(isFocused ? null : i)}
                                  className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors hover:bg-muted/60 ${
                                    isFocused ? "bg-muted/70" : ""
                                  }`}
                                  aria-pressed={isFocused}
                                >
                                  {/* Stroke swatch — mirrors line on the map */}
                                  <span
                                    className="mt-1 inline-block h-2.5 rounded-full shrink-0"
                                    style={{
                                      width: 22,
                                      background: r.color,
                                      boxShadow: r.isBest ? `0 0 0 2px ${r.color}33` : undefined,
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold truncate">
                                        {Math.round(r.durationMin)} min
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        · {r.distanceKm.toFixed(1)} km
                                      </span>
                                      {r.isBest && (
                                        <Badge
                                          variant="default"
                                          className="ml-auto h-4 px-1.5 text-[9px] uppercase tracking-wide gap-0.5"
                                        >
                                          <Trophy className="w-2.5 h-2.5" />
                                          Best
                                        </Badge>
                                      )}
                                      {!r.isBest && deltaMin > 0 && (
                                        <span className="ml-auto text-[10px] text-muted-foreground">
                                          +{deltaMin} min
                                        </span>
                                      )}
                                      {aiPick?.bestIdx === i && (
                                        <Badge
                                          variant="secondary"
                                          className="h-4 px-1.5 text-[9px] uppercase tracking-wide gap-0.5 border border-primary/40"
                                          title="AI recommended this route"
                                        >
                                          <Sparkles className="w-2.5 h-2.5" />
                                          AI pick
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                      {r.strategy}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    })()}

                    {/* AI recommend action + inline geofence controls */}
                    {!routesLoading && (routesInfo.length > 1 || renderableGeofences.length > 0) && (
                      <div className="px-3 py-2 border-t border-border/60 bg-muted/30 space-y-2">
                        {routesInfo.length > 1 ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant={aiPick ? "secondary" : "default"}
                              className="flex-1 h-7 text-[11px] gap-1.5"
                              onClick={requestAiRecommendation}
                              disabled={aiLoading}
                            >
                              {aiLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              {aiLoading
                                ? "Asking AI…"
                                : aiPick
                                  ? "Re-run AI recommendation"
                                  : "Recommend best with AI"}
                            </Button>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                              <Settings2 className="w-3 h-3" />
                              {renderableGeofences.length} zone{renderableGeofences.length === 1 ? "" : "s"}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                              <Settings2 className="w-3 h-3 text-primary" />
                              Geofence rules
                            </span>
                            <span>{renderableGeofences.length} zone{renderableGeofences.length === 1 ? "" : "s"}</span>
                          </div>
                        )}
                        <div className="rounded-md border bg-background/70 overflow-hidden">
                          <div className="px-2 py-1.5 flex items-center justify-between gap-2 border-b bg-muted/30">
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold">Use geofence rules</div>
                            </div>
                            <Switch
                              checked={geofenceAware}
                              onCheckedChange={(v) =>
                                updateRequestSettings.mutate({ geofence_aware_dispatch: v })
                              }
                            />
                          </div>
                          {renderableGeofences.length > 0 && (() => {
                            const allIds = renderableGeofences.map((g: any) => g.id);
                            const allChecked = allIds.every((id) => avoidOverrides.includes(id));
                            const someChecked = !allChecked && allIds.some((id) => avoidOverrides.includes(id));
                            return (
                              <div className="px-2 py-1 flex items-center justify-between gap-2 border-b bg-muted/10">
                                <label className="flex items-center gap-2 text-[11px] cursor-pointer min-w-0">
                                  <Checkbox
                                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                                    disabled={!geofenceAware}
                                    onCheckedChange={(c) => {
                                      const next = c === true ? allIds : [];
                                      updateRequestSettings.mutate({ geofence_avoid_overrides: next });
                                    }}
                                  />
                                  <span className="font-medium">
                                    {allChecked ? "Unmark all" : "Mark all"}
                                  </span>
                                </label>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {avoidOverrides.filter((id) => allIds.includes(id)).length}/{allIds.length} selected
                                </span>
                              </div>
                            );
                          })()}
                          <div className="max-h-28 overflow-y-auto overscroll-contain p-2 space-y-1.5">
                            {renderableGeofences.length === 0 && (
                              <div className="text-[10px] text-muted-foreground italic">
                                No active geofences with valid geometry.
                              </div>
                            )}
                            {renderableGeofences.map((g: any) => {
                              const checked = avoidOverrides.includes(g.id);
                              const orgPolicy = (g.dispatch_policy as string) || "neutral";
                              return (
                                <div key={g.id} className="flex items-start gap-2 text-[11px]">
                                  <label className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer">
                                    <Checkbox
                                      checked={checked}
                                      disabled={!geofenceAware}
                                      onCheckedChange={(c) => {
                                        const next = c === true
                                          ? Array.from(new Set([...avoidOverrides, g.id]))
                                          : avoidOverrides.filter((id) => id !== g.id);
                                        updateRequestSettings.mutate({ geofence_avoid_overrides: next });
                                      }}
                                      className="mt-0.5"
                                    />
                                    <span
                                      className="mt-1 h-2 w-2 rounded-full shrink-0 border border-border"
                                      style={{ background: geofenceVisualColor(g) }}
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-medium">
                                        {String(g.name || "Zone").split(",")[0]}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        Org: {orgPolicy}
                                      </span>
                                    </span>
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    title="Show this geofence on the map"
                                    onClick={() => {
                                      const bounds = getMergedTripFenceBounds(g);
                                      if (bounds && mapRef.current) {
                                        mapRef.current.fitBounds(bounds, { padding: 88, maxZoom: 16, duration: 350 });
                                      }
                                    }}
                                  >
                                    <MapPin className="w-3 h-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {aiError && (
                          <div className="text-[10px] text-destructive leading-snug">
                            {aiError}
                          </div>
                        )}
                        {aiPick && !aiError && (
                          <div className="text-[10px] leading-snug rounded-md bg-primary/5 border border-primary/20 p-2">
                            <div className="flex items-center gap-1 font-semibold text-primary mb-0.5">
                              <Sparkles className="w-3 h-3" />
                              AI rationale
                            </div>
                            <p className="text-foreground/80">{aiPick.reasoning}</p>
                            {typeof aiPick.runnerUpIdx === "number" && routesInfo[aiPick.runnerUpIdx] && (
                              <p className="text-muted-foreground mt-1">
                                Runner-up: {routesInfo[aiPick.runnerUpIdx].label} ·{" "}
                                {Math.round(routesInfo[aiPick.runnerUpIdx].durationMin)} min
                              </p>
                            )}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground">
                          Tap a route to highlight it on the map
                        </div>
                      </div>
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
