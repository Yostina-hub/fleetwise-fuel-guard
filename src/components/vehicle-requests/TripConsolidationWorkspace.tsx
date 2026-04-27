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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Sliders,
  Package,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
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

interface SmartRules {
  capacity: { enabled: boolean; max_utilization_pct: number; reference_capacity: number };
  proximity: { enabled: boolean; radius_km: number };
  time_window: { enabled: boolean; window_minutes: number };
  compatibility: { enabled: boolean };
}

const DEFAULT_RULES: SmartRules = {
  capacity: { enabled: true, max_utilization_pct: 80, reference_capacity: 14 },
  proximity: { enabled: true, radius_km: 5 },
  time_window: { enabled: true, window_minutes: 30 },
  compatibility: { enabled: true },
};

const RULES_STORAGE_KEY = "vr_consolidation_smart_rules";

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
  // Side-panel collapsible state — matches Live Map look & feel.
  const [sidePanelOpen, setSidePanelOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [rules, setRules] = useState<SmartRules>(() => {
    try {
      const raw = window.localStorage.getItem(RULES_STORAGE_KEY);
      if (raw) return { ...DEFAULT_RULES, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_RULES;
  });
  const saveRules = (next: SmartRules) => {
    setRules(next);
    try { window.localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

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
    queryKey: ["consolidation-suggestions", organizationId, rules],
    enabled: !!organizationId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("consolidate-requests", {
        body: { organization_id: organizationId, rules },
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

  // ---- Real driving routes (cached) --------------------------------------
  // Fetch actual road geometry per request via the route-directions edge
  // function. Cached by request id; falls back to a straight line if the
  // upstream router is unreachable so the UI never breaks.
  const [routeGeoms, setRouteGeoms] = useState<Record<string, [number, number][]>>({});
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const eligible = requests.filter(
      (r) =>
        r.departure_lat != null &&
        r.departure_lng != null &&
        r.destination_lat != null &&
        r.destination_lng != null &&
        !routeGeoms[r.id] &&
        !inflightRef.current.has(r.id),
    );
    if (eligible.length === 0) return;

    let cancelled = false;
    // Throttle: max 4 concurrent fetches so we don't hammer the edge function.
    const queue = [...eligible];
    const runOne = async () => {
      while (queue.length > 0 && !cancelled) {
        const r = queue.shift()!;
        inflightRef.current.add(r.id);
        try {
          const { data, error } = await supabase.functions.invoke("route-directions", {
            body: {
              coordinates: [
                [r.departure_lng, r.departure_lat],
                [r.destination_lng, r.destination_lat],
              ],
            },
          });
          if (!cancelled && !error && data?.ok && Array.isArray(data.geometry)) {
            setRouteGeoms((prev) => ({ ...prev, [r.id]: data.geometry as [number, number][] }));
          }
        } catch {
          /* swallow — fallback to straight line */
        } finally {
          inflightRef.current.delete(r.id);
        }
      }
    };
    // Spin up 4 workers
    Promise.all([runOne(), runOne(), runOne(), runOne()]);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

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
      // Soft halo behind selected/suggested routes for visibility.
      map.addLayer({
        id: "consol-routes-halo",
        type: "line",
        source: "consol-routes",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "hsl(220 80% 55%)"],
          "line-width": ["case", ["==", ["get", "selected"], true], 10, ["==", ["get", "suggested"], true], 7, 0],
          "line-opacity": 0.18,
          "line-blur": 1,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: "consol-routes-line",
        type: "line",
        source: "consol-routes",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "hsl(220 80% 55%)"],
          "line-width": ["case", ["==", ["get", "selected"], true], 5, 3],
          "line-opacity": ["case", ["==", ["get", "selected"], true], 0.95, 0.78],
          // Dash only for straight-line fallbacks — solid for real road geometry.
          "line-dasharray": ["case", ["==", ["get", "fallback"], true], ["literal", [2, 1.5]], ["literal", [1, 0]]],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // Combined merge route — single unified polyline through all stops.
      map.addSource("consol-combined", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      // White outline / casing.
      map.addLayer({
        id: "consol-combined-casing",
        type: "line",
        source: "consol-combined",
        paint: {
          "line-color": "hsl(var(--background))",
          "line-width": 11,
          "line-opacity": 0.9,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      // Bright primary stroke on top.
      map.addLayer({
        id: "consol-combined-line",
        type: "line",
        source: "consol-combined",
        paint: {
          "line-color": "hsl(var(--primary))",
          "line-width": 6,
          "line-opacity": 0.95,
          "line-dasharray": ["case", ["==", ["get", "fallback"], true], ["literal", [2, 1.5]], ["literal", [1, 0]]],
        },
        layout: { "line-cap": "round", "line-join": "round" },
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

  // Resize map when side panel collapses/expands or window changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.resize(), 220);
    return () => window.clearTimeout(id);
  }, [sidePanelOpen]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const selectedRequests = useMemo(
    () => requests.filter((r) => selectedIds.has(r.id)),
    [requests, selectedIds],
  );

  // ---- Combined merge route ----------------------------------------------
  // When 2+ requests are selected, build an optimized waypoint order
  // (nearest-neighbor starting from the earliest pickup), then fetch ONE
  // routed geometry through every pickup & drop. Shown as a thick highlighted
  // polyline with numbered stops so the dispatcher sees the actual unified
  // trip — not multiple overlapping straight lines.
  type Stop = {
    type: "pickup" | "drop";
    lng: number;
    lat: number;
    requestId: string;
    requestNumber: string;
    label: string;
  };

  const orderedStops = useMemo<Stop[]>(() => {
    if (selectedRequests.length < 2) return [];
    const reqs = selectedRequests.filter(
      (r) =>
        r.departure_lat != null &&
        r.departure_lng != null &&
        r.destination_lat != null &&
        r.destination_lng != null,
    );
    if (reqs.length < 2) return [];

    const sorted = [...reqs].sort(
      (a, b) => new Date(a.needed_from).getTime() - new Date(b.needed_from).getTime(),
    );
    const remaining = new Set(sorted.map((r) => r.id));
    const dropped = new Set<string>();
    const stops: Stop[] = [];

    const seed = sorted[0];
    stops.push({
      type: "pickup",
      lng: seed.departure_lng!,
      lat: seed.departure_lat!,
      requestId: seed.id,
      requestNumber: seed.request_number,
      label: seed.departure_place || "Pickup",
    });
    remaining.delete(seed.id);

    let cur: [number, number] = [seed.departure_lng!, seed.departure_lat!];

    const dist = (a: [number, number], b: [number, number]) => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      return dx * dx + dy * dy;
    };

    const pickedUp = new Set<string>([seed.id]);
    while (pickedUp.size > dropped.size) {
      let bestIdx: { kind: "pickup" | "drop"; req: typeof sorted[number] } | null = null;
      let bestDist = Number.POSITIVE_INFINITY;

      for (const r of sorted) {
        if (remaining.has(r.id)) {
          const d = dist(cur, [r.departure_lng!, r.departure_lat!]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = { kind: "pickup", req: r };
          }
        }
        if (pickedUp.has(r.id) && !dropped.has(r.id)) {
          const d = dist(cur, [r.destination_lng!, r.destination_lat!]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = { kind: "drop", req: r };
          }
        }
      }

      if (!bestIdx) break;
      const { kind, req } = bestIdx;
      if (kind === "pickup") {
        stops.push({
          type: "pickup",
          lng: req.departure_lng!,
          lat: req.departure_lat!,
          requestId: req.id,
          requestNumber: req.request_number,
          label: req.departure_place || "Pickup",
        });
        cur = [req.departure_lng!, req.departure_lat!];
        remaining.delete(req.id);
        pickedUp.add(req.id);
      } else {
        stops.push({
          type: "drop",
          lng: req.destination_lng!,
          lat: req.destination_lat!,
          requestId: req.id,
          requestNumber: req.request_number,
          label: req.destination || "Drop",
        });
        cur = [req.destination_lng!, req.destination_lat!];
        dropped.add(req.id);
      }
    }
    return stops;
  }, [selectedRequests]);

  const [combinedRoute, setCombinedRoute] = useState<{
    geometry: [number, number][];
    distance_m: number;
    duration_s: number;
    fallback: boolean;
  } | null>(null);
  const [combinedLoading, setCombinedLoading] = useState(false);

  useEffect(() => {
    if (orderedStops.length < 2) {
      setCombinedRoute(null);
      return;
    }
    const coords = orderedStops.map((s) => [s.lng, s.lat] as [number, number]);
    let cancelled = false;
    setCombinedLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("route-directions", {
          body: { coordinates: coords.slice(0, 25) },
        });
        if (cancelled) return;
        if (!error && data?.ok && Array.isArray(data.geometry) && data.geometry.length >= 2) {
          setCombinedRoute({
            geometry: data.geometry,
            distance_m: Number(data.distance_m) || 0,
            duration_s: Number(data.duration_s) || 0,
            fallback: false,
          });
        } else {
          setCombinedRoute({ geometry: coords, distance_m: 0, duration_s: 0, fallback: true });
        }
      } catch {
        if (!cancelled) {
          setCombinedRoute({ geometry: coords, distance_m: 0, duration_s: 0, fallback: true });
        }
      } finally {
        if (!cancelled) setCombinedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(orderedStops.map((s) => [s.requestId, s.type, s.lng, s.lat]))]);

  // Sync features when data / selection / toggles change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const features: any[] = [];
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    const hasCombined = !!combinedRoute && orderedStops.length >= 2;

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

      // When a combined route is shown for the merge, hide the per-request
      // straight/road lines for selected items so the map stays clean and the
      // unified trip is the focal point.
      const drawLine = showRoutes && !(hasCombined && isSelected);

      if (drawLine) {
        const cached = routeGeoms[r.id];
        const isFallback = !cached || cached.length < 2;
        const coords: [number, number][] = isFallback
          ? [
              [r.departure_lng, r.departure_lat],
              [r.destination_lng, r.destination_lat],
            ]
          : cached;
        features.push({
          type: "Feature",
          properties: {
            color: baseColor,
            selected: isSelected,
            suggested: !!suggested,
            fallback: isFallback,
            id: r.id,
          },
          geometry: { type: "LineString", coordinates: coords },
        });
      }

      // Skip the per-request markers for selected items when a combined route
      // is active — numbered stop markers below take over.
      if (hasCombined && isSelected) {
        bounds.extend([r.departure_lng, r.departure_lat]);
        bounds.extend([r.destination_lng, r.destination_lat]);
        hasBounds = true;
        return;
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

    // Combined merge route + numbered stop markers
    const combinedSrc = map.getSource("consol-combined") as maplibregl.GeoJSONSource | undefined;
    if (hasCombined) {
      combinedSrc?.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { fallback: combinedRoute!.fallback },
            geometry: { type: "LineString", coordinates: combinedRoute!.geometry },
          },
        ],
      });
      combinedRoute!.geometry.forEach((c) => bounds.extend(c as [number, number]));
      hasBounds = true;

      // Numbered sequential stop markers
      orderedStops.forEach((stop, idx) => {
        const isPickup = stop.type === "pickup";
        const el = document.createElement("div");
        el.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          width:26px;height:26px;border-radius:9999px;
          background:${isPickup ? "hsl(var(--primary))" : "hsl(var(--background))"};
          color:${isPickup ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))"};
          border:3px solid hsl(var(--primary));
          box-shadow:0 2px 6px rgba(0,0,0,.35);
          font:700 12px system-ui;
          cursor:pointer;
        `;
        el.textContent = String(idx + 1);
        el.title = `Stop ${idx + 1}: ${isPickup ? "Pickup" : "Drop"} · ${stop.requestNumber}`;
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 16 }).setHTML(
              `<div style="font:500 12px system-ui;padding:4px;min-width:170px;">
                 <div style="font-weight:700">Stop ${idx + 1} · ${isPickup ? "Pickup" : "Drop"}</div>
                 <div style="color:hsl(var(--muted-foreground));font-size:11px;">${stop.requestNumber}</div>
                 <div style="margin-top:4px;font-size:11px;">${isPickup ? "📍" : "🏁"} ${stop.label}</div>
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m);
      });
    } else {
      combinedSrc?.setData({ type: "FeatureCollection", features: [] });
    }

    if (hasBounds) {
      try {
        map.fitBounds(bounds, { padding: 60, duration: 500, maxZoom: 14 });
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, filteredRequests, selectedIds, suggestedColorById, showRoutes, highlightSuggestions, routeGeoms, combinedRoute, orderedStops]);

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
  const routeFetchedCount = requests.filter(
    (r) => routeGeoms[r.id] && routeGeoms[r.id].length >= 2,
  ).length;

  const suggestionGroups = [
    ...(suggestionData?.groups?.smart_rules || []).map((g: any) => ({ ...g, label: "Smart match" })),
    ...(suggestionData?.groups?.exact_route || []).map((g: any) => ({ ...g, label: "Exact route" })),
    ...(suggestionData?.groups?.dest_window || []).map((g: any) => ({ ...g, label: "Same dest · ±30 min" })),
    ...(suggestionData?.groups?.geofence_pair || []).map((g: any) => ({ ...g, label: "Geofence pair" })),
  ];

  const activeRulesCount =
    (rules.capacity.enabled ? 1 : 0) +
    (rules.proximity.enabled ? 1 : 0) +
    (rules.time_window.enabled ? 1 : 0) +
    (rules.compatibility.enabled ? 1 : 0);

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
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Rules
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {activeRulesCount}/4
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[340px] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                    <Sliders className="w-3.5 h-3.5" />
                    Smart consolidation rules
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => saveRules(DEFAULT_RULES)}
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </Button>
                </div>

                {/* Capacity */}
                <div className="rounded-md border p-2 space-y-1.5 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs font-semibold flex-1">Capacity utilization</Label>
                    <Switch
                      checked={rules.capacity.enabled}
                      onCheckedChange={(v) =>
                        saveRules({ ...rules, capacity: { ...rules.capacity, enabled: v } })
                      }
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Stay under % of vehicle capacity.</p>
                  {rules.capacity.enabled && (
                    <div className="flex gap-2 pt-1">
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground">Max %</Label>
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          className="h-7 text-xs"
                          value={rules.capacity.max_utilization_pct}
                          onChange={(e) =>
                            saveRules({
                              ...rules,
                              capacity: {
                                ...rules.capacity,
                                max_utilization_pct: Number(e.target.value) || 80,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground">Ref. seats</Label>
                        <Input
                          type="number"
                          min={1}
                          max={80}
                          className="h-7 text-xs"
                          value={rules.capacity.reference_capacity}
                          onChange={(e) =>
                            saveRules({
                              ...rules,
                              capacity: {
                                ...rules.capacity,
                                reference_capacity: Number(e.target.value) || 14,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Proximity */}
                <div className="rounded-md border p-2 space-y-1.5 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs font-semibold flex-1">Geographic proximity</Label>
                    <Switch
                      checked={rules.proximity.enabled}
                      onCheckedChange={(v) =>
                        saveRules({ ...rules, proximity: { ...rules.proximity, enabled: v } })
                      }
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Drop-offs within radius.</p>
                  {rules.proximity.enabled && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Radius (km)</Label>
                      <Input
                        type="number"
                        min={0.5}
                        max={100}
                        step={0.5}
                        className="h-7 text-xs w-24"
                        value={rules.proximity.radius_km}
                        onChange={(e) =>
                          saveRules({
                            ...rules,
                            proximity: {
                              ...rules.proximity,
                              radius_km: Number(e.target.value) || 5,
                            },
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Time window */}
                <div className="rounded-md border p-2 space-y-1.5 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs font-semibold flex-1">Time window</Label>
                    <Switch
                      checked={rules.time_window.enabled}
                      onCheckedChange={(v) =>
                        saveRules({ ...rules, time_window: { ...rules.time_window, enabled: v } })
                      }
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pickups within minutes of each other.</p>
                  {rules.time_window.enabled && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Window (min)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={240}
                        className="h-7 text-xs w-24"
                        value={rules.time_window.window_minutes}
                        onChange={(e) =>
                          saveRules({
                            ...rules,
                            time_window: {
                              ...rules.time_window,
                              window_minutes: Number(e.target.value) || 30,
                            },
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Compatibility */}
                <div className="rounded-md border p-2 space-y-1.5 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs font-semibold flex-1">Compatibility</Label>
                    <Switch
                      checked={rules.compatibility.enabled}
                      onCheckedChange={(v) =>
                        saveRules({ ...rules, compatibility: { enabled: v } })
                      }
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Never mix passengers with cargo, or cold-chain with dry cargo.
                  </p>
                  </div>


                <p className="text-[10px] text-muted-foreground pt-1">
                  Rules apply to the <strong>Suggestions</strong> tab and are saved on this device.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div
        className={`grid grid-cols-1 gap-3 transition-[grid-template-columns] duration-300 ${
          sidePanelOpen ? "lg:grid-cols-[minmax(0,1fr)_400px]" : "lg:grid-cols-[minmax(0,1fr)_44px]"
        }`}
      >
        {/* MAP */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>Live Routes Map</span>
              {routeFetchedCount < withCoords && (
                <Badge variant="secondary" className="h-5 text-[10px] gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Routing {routeFetchedCount}/{withCoords}
                </Badge>
              )}
              {withCoords > 0 && routeFetchedCount === withCoords && (
                <Badge variant="outline" className="h-5 text-[10px] gap-1">
                  <RouteIcon className="w-3 h-3" />
                  Real road geometry
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Switch id="cw-routes" checked={showRoutes} onCheckedChange={setShowRoutes} />
                <Label htmlFor="cw-routes" className="text-xs cursor-pointer">Routes</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="cw-sugg"
                  checked={highlightSuggestions}
                  onCheckedChange={setHighlightSuggestions}
                />
                <Label htmlFor="cw-sugg" className="text-xs cursor-pointer">Suggestions</Label>
              </div>
              {/* Side panel toggle — visible on lg+ */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 hidden lg:inline-flex"
                onClick={() => setSidePanelOpen((o) => !o)}
                title={sidePanelOpen ? "Hide side panel" : "Show side panel"}
              >
                {sidePanelOpen ? (
                  <PanelRightClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelRightOpen className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            <div ref={containerRef} className="w-full h-[60vh] min-h-[360px] sm:h-[520px] lg:h-[560px]" />
            {/* Legend (bottom-left) */}
            <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur rounded-lg border p-2 text-[11px] space-y-1 shadow-md hidden sm:block">
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
              <div className="flex items-center gap-2 pt-1 border-t border-border/50 mt-1">
                <div className="w-6 h-0.5 bg-primary rounded" /> Real road
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-0.5 rounded"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, hsl(var(--muted-foreground)) 0 3px, transparent 3px 6px)",
                  }}
                />
                Direct (fallback)
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

                  {/* Combined unified trip route */}
                  {orderedStops.length >= 2 && (
                    <div className="rounded-md border border-primary/40 bg-primary/5 p-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                        <span className="flex items-center gap-1">
                          <RouteIcon className="w-3.5 h-3.5" />
                          Unified trip route
                        </span>
                        {combinedLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <div className="text-muted-foreground">Stops</div>
                          <div className="font-semibold">{orderedStops.length}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Distance</div>
                          <div className="font-semibold">
                            {combinedRoute && combinedRoute.distance_m > 0
                              ? `${(combinedRoute.distance_m / 1000).toFixed(1)} km`
                              : combinedLoading ? "…" : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Drive time</div>
                          <div className="font-semibold">
                            {combinedRoute && combinedRoute.duration_s > 0
                              ? `${Math.round(combinedRoute.duration_s / 60)} min`
                              : combinedLoading ? "…" : "—"}
                          </div>
                        </div>
                      </div>
                      {combinedRoute?.fallback && (
                        <div className="text-[10px] text-amber-500">
                          Routing service unreachable — direct fallback path shown.
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground leading-snug">
                        {orderedStops.map((s, i) => (
                          <span key={`${s.requestId}-${s.type}-${i}`}>
                            <span className="font-semibold text-foreground">{i + 1}</span>{" "}
                            {s.type === "pickup" ? "📍" : "🏁"} {s.label}
                            {i < orderedStops.length - 1 && " → "}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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
