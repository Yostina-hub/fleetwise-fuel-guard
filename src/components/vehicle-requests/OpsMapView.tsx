/**
 * OpsMapView
 * ----------
 * Operations control-room map for Vehicle Requests.
 *
 * Features
 *  - Pending request routes drawn (pickup → drop) as colored polylines.
 *  - Idle/available vehicles plotted as markers, color-coded by pool.
 *  - Merge groups (from `consolidate-requests` edge function) highlighted in
 *    a shared color when the supervisor toggles "Show merge suggestions".
 *  - Pool demand panel: per-pool counts of pending requests vs idle vehicles.
 *    When demand > supply, an "Auto-suggest borrow" button surfaces idle
 *    vehicles from other pools and lets the supervisor send a borrow request
 *    for manual approval by the target pool's supervisor.
 *
 * Pure read + light-mutation. No business-logic changes outside borrow flow.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPreviewSafeMapStyle } from "@/lib/lemat";
import { useAvailableVehicles } from "@/hooks/useAvailableVehicles";
import {
  useCrossPoolBorrowRequests,
  useCreateBorrowRequest,
  useRespondBorrowRequest,
} from "@/hooks/useCrossPoolBorrow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VehicleVideoPlaybackDialog from "./VehicleVideoPlaybackDialog";
import {
  MapPin,
  Layers,
  Truck,
  Activity,
  AlertTriangle,
  Send,
  Check,
  X,
  RefreshCw,
  Route as RouteIcon,
  Users,
  TrendingUp,
  GitMerge,
  IdCard,
  Clock,
  Flame,
  CircleDot,
  ChevronRight,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
  ChevronUp,
  ChevronDown,
  Hexagon,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  organizationId: string;
}

interface PendingRequest {
  id: string;
  request_number: string;
  pool_name: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_place: string | null;
  destination: string | null;
  needed_from: string;
  status: string;
  priority: string | null;
  passengers: number | null;
  vehicle_type: string | null;
  is_consolidated_parent: boolean | null;
  consolidated_request_count: number | null;
}

// Stable color per pool (deterministic hash → HSL)
function poolColor(pool?: string | null): string {
  if (!pool) return "hsl(220 10% 60%)";
  let h = 0;
  for (let i = 0; i < pool.length; i++) h = (h * 31 + pool.charCodeAt(i)) % 360;
  return `hsl(${h} 75% 50%)`;
}

const ADDIS_CENTER: [number, number] = [38.7525, 9.0192];

export const OpsMapView = ({ organizationId }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showMerges, setShowMerges] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  // Top-of-map control panels can be minimized so the map gets full real estate.
  const [routeOptionsOpen, setRouteOptionsOpen] = useState(false);
  const [mapControlsOpen, setMapControlsOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [borrowDialog, setBorrowDialog] = useState<null | {
    sourcePool: string;
    targetPool: string;
    vehicleId: string;
    vehiclePlate: string;
    requestId?: string;
  }>(null);
  const [borrowReason, setBorrowReason] = useState("");
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [playbackVehicle, setPlaybackVehicle] = useState<null | {
    id: string;
    label: string;
  }>(null);
  // Side panel collapsible state — default open on lg+, collapsed on smaller.
  const [sidePanelOpen, setSidePanelOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  // Pool Demand & Supply minimizable state inside the side panel.
  const [poolDemandOpen, setPoolDemandOpen] = useState<boolean>(true);

  const { available, allVehicles } = useAvailableVehicles();
  const { data: borrowRows = [], refetch: refetchBorrow } = useCrossPoolBorrowRequests(organizationId);
  const createBorrow = useCreateBorrowRequest();
  const respondBorrow = useRespondBorrowRequest();

  // Pending vehicle requests with coordinates (also includes consolidated parents
  // and richer fields for KPI calculations)
  const { data: requests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["ops-map-requests", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, pool_name, departure_lat, departure_lng, destination_lat, destination_lng, departure_place, destination, needed_from, status, priority, passengers, vehicle_type, is_consolidated_parent, consolidated_request_count",
        )
        .eq("organization_id", organizationId)
        .in("status", ["pending", "approved"])
        .is("merged_into_request_id", null)
        .order("needed_from", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as PendingRequest[];
    },
  });

  // Idle (active, free) drivers per pool — used to surface driver supply alongside vehicles
  const { data: idleDrivers = [] } = useQuery({
    queryKey: ["ops-map-idle-drivers", organizationId],
    enabled: !!organizationId,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("drivers")
        .select("id, first_name, last_name, status, assigned_pool")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Merge groups from consolidation engine
  const { data: mergeData, refetch: refetchMerges } = useQuery({
    queryKey: ["ops-map-merges", organizationId],
    enabled: !!organizationId && showMerges,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("consolidate-requests", {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
  });

  // Active geofences (zones) so dispatchers can see depots, no-go areas, and
  // service zones overlaid on the operations map.
  const { data: geofences = [] } = useQuery({
    queryKey: ["ops-map-geofences", organizationId],
    enabled: !!organizationId && showGeofences,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofences")
        .select(
          "id, name, category, geometry_type, center_lat, center_lng, radius_meters, polygon_points, color",
        )
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .limit(200);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const mergeGroupColorByRequestId = useMemo(() => {
    const map: Record<string, string> = {};
    if (!showMerges || !mergeData?.groups) return map;
    const allGroups = [
      ...(mergeData.groups.exact_route || []),
      ...(mergeData.groups.dest_window || []),
      ...(mergeData.groups.geofence_pair || []),
    ];
    allGroups.forEach((g: any, idx: number) => {
      const hue = (idx * 47) % 360;
      const color = `hsl(${hue} 80% 55%)`;
      g.requests?.forEach((r: any) => {
        map[r.id] = color;
      });
    });
    return map;
  }, [mergeData, showMerges]);

  // Pool aggregations: demand vs idle supply (vehicles + drivers + passengers)
  const poolStats = useMemo(() => {
    const pools: Record<
      string,
      {
        demand: number;
        passengers: number;
        urgent: number;
        merged: number;
        idle: number;
        idleDrivers: number;
        vehicles: any[];
        topVehicleType: string | null;
      }
    > = {};
    const typeCount: Record<string, Record<string, number>> = {};
    requests.forEach((r) => {
      const k = r.pool_name || "Unassigned";
      pools[k] = pools[k] || {
        demand: 0,
        passengers: 0,
        urgent: 0,
        merged: 0,
        idle: 0,
        idleDrivers: 0,
        vehicles: [],
        topVehicleType: null,
      };
      pools[k].demand += 1;
      pools[k].passengers += r.passengers || 0;
      if (r.priority === "urgent" || r.priority === "high") pools[k].urgent += 1;
      if (r.is_consolidated_parent) pools[k].merged += 1;
      if (r.vehicle_type) {
        typeCount[k] = typeCount[k] || {};
        typeCount[k][r.vehicle_type] = (typeCount[k][r.vehicle_type] || 0) + 1;
      }
    });
    available.forEach((v: any) => {
      const fullV = allVehicles.find((x: any) => x.id === v.id);
      const pool = (fullV as any)?.specific_pool || "Unassigned";
      pools[pool] = pools[pool] || {
        demand: 0,
        passengers: 0,
        urgent: 0,
        merged: 0,
        idle: 0,
        idleDrivers: 0,
        vehicles: [],
        topVehicleType: null,
      };
      pools[pool].idle += 1;
      pools[pool].vehicles.push({ ...v, specific_pool: pool });
    });
    idleDrivers.forEach((d: any) => {
      const pool = d.assigned_pool || "Unassigned";
      pools[pool] = pools[pool] || {
        demand: 0,
        passengers: 0,
        urgent: 0,
        merged: 0,
        idle: 0,
        idleDrivers: 0,
        vehicles: [],
        topVehicleType: null,
      };
      pools[pool].idleDrivers += 1;
    });
    // Resolve top requested vehicle type per pool
    Object.entries(typeCount).forEach(([pool, counts]) => {
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (pools[pool] && top) pools[pool].topVehicleType = top[0];
    });
    return Object.entries(pools)
      .map(([name, s]) => ({ name, ...s, deficit: s.demand - s.idle }))
      .sort((a, b) => b.deficit - a.deficit || b.demand - a.demand);
  }, [requests, available, allVehicles, idleDrivers]);

  const poolsWithDeficit = poolStats.filter((p) => p.deficit > 0);
  const poolsWithSurplus = poolStats.filter((p) => p.idle > p.demand);

  // Map-visible requests (filtered by selected pool when set)
  const visibleRequests = useMemo(
    () =>
      selectedPool
        ? requests.filter((r) => (r.pool_name || "Unassigned") === selectedPool)
        : requests,
    [requests, selectedPool],
  );

  // KPI totals
  const kpis = useMemo(() => {
    const totalPax = requests.reduce((s, r) => s + (r.passengers || 0), 0);
    const urgent = requests.filter(
      (r) => r.priority === "urgent" || r.priority === "high",
    ).length;
    const consolidatedParents = requests.filter((r) => r.is_consolidated_parent).length;
    const mergeCandidates = Object.keys(mergeGroupColorByRequestId).length;
    const totalIdleVeh = available.length;
    const totalIdleDrv = idleDrivers.length;
    const deficitPools = poolStats.filter((p) => p.deficit > 0).length;
    return {
      totalRequests: requests.length,
      totalPax,
      urgent,
      consolidatedParents,
      mergeCandidates,
      totalIdleVeh,
      totalIdleDrv,
      deficitPools,
    };
  }, [requests, mergeGroupColorByRequestId, available, idleDrivers, poolStats]);

  // ---- Merged children for consolidated parents --------------------------
  // For every consolidated parent in view, pull its merged child requests so
  // we can render the FULL multi-stop route (parent pickup → child pickups →
  // child drops → parent drop) instead of a single straight pickup→drop leg.
  const parentIds = useMemo(
    () => requests.filter((r) => r.is_consolidated_parent).map((r) => r.id),
    [requests],
  );
  const { data: mergedChildren = [] } = useQuery({
    queryKey: ["ops-map-merged-children", organizationId, parentIds.join(",")],
    enabled: !!organizationId && parentIds.length > 0,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, merged_into_request_id, departure_lat, departure_lng, destination_lat, destination_lng, needed_from",
        )
        .eq("organization_id", organizationId)
        .in("merged_into_request_id", parentIds)
        .order("needed_from", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        merged_into_request_id: string;
        departure_lat: number | null;
        departure_lng: number | null;
        destination_lat: number | null;
        destination_lng: number | null;
        needed_from: string;
      }>;
    },
  });

  // Build the ordered coordinate sequence per parent: parent pickup, then
  // every child pickup (time-ordered), then every child drop (time-ordered),
  // then parent drop. Duplicate adjacent points are de-duplicated so the
  // routing engine doesn't reject the request.
  const parentStopSequence = useMemo(() => {
    const map: Record<string, [number, number][]> = {};
    requests
      .filter((r) => r.is_consolidated_parent)
      .forEach((p) => {
        if (
          p.departure_lat == null ||
          p.departure_lng == null ||
          p.destination_lat == null ||
          p.destination_lng == null
        )
          return;
        const kids = mergedChildren
          .filter((c) => c.merged_into_request_id === p.id)
          .filter(
            (c) =>
              c.departure_lat != null &&
              c.departure_lng != null &&
              c.destination_lat != null &&
              c.destination_lng != null,
          );
        const seq: [number, number][] = [
          [p.departure_lng, p.departure_lat],
          ...kids.map((c) => [c.departure_lng!, c.departure_lat!] as [number, number]),
          ...kids.map((c) => [c.destination_lng!, c.destination_lat!] as [number, number]),
          [p.destination_lng, p.destination_lat],
        ];
        // Drop adjacent duplicates
        const dedup = seq.filter(
          (pt, i) => i === 0 || pt[0] !== seq[i - 1][0] || pt[1] !== seq[i - 1][1],
        );
        if (dedup.length >= 2) map[p.id] = dedup;
      });
    return map;
  }, [requests, mergedChildren]);

  // ---- Real driving routes (cached) --------------------------------------
  // Fetch actual road geometry per request via the route-directions edge
  // function. Cached by request id; falls back to a straight line if the
  // upstream router is unreachable so the UI never breaks.
  // For consolidated parents we send the FULL multi-stop sequence so the
  // returned geometry traces every merged child stop in the correct order.
  const [routeGeoms, setRouteGeoms] = useState<Record<string, [number, number][]>>({});
  // Per-request list of OSRM-computed alternatives so dispatchers can pick a
  // different driving path between the same pickup/drop pair.
  type RouteAlt = { geometry: [number, number][]; distance_m: number; duration_s: number };
  const [routeAlts, setRouteAlts] = useState<Record<string, RouteAlt[]>>({});
  const [selectedAltIdx, setSelectedAltIdx] = useState<Record<string, number>>({});
  // Re-key cache by sequence signature so adding/removing children re-fetches.
  const routeCacheKeyRef = useRef<Record<string, string>>({});
  const inflightRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const eligible = requests.filter((r) => {
      if (
        r.departure_lat == null ||
        r.departure_lng == null ||
        r.destination_lat == null ||
        r.destination_lng == null
      )
        return false;
      const seq = parentStopSequence[r.id];
      const sig = seq
        ? seq.map((c) => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join("|")
        : `${r.departure_lng},${r.departure_lat}|${r.destination_lng},${r.destination_lat}`;
      const cached = routeCacheKeyRef.current[r.id];
      if (cached === sig) return false;
      if (inflightRef.current.has(r.id)) return false;
      return true;
    });
    if (eligible.length === 0) return;
    console.log("[OpsMap] route fetch eligible:", eligible.length, eligible.map((r) => r.request_number));
    let cancelled = false;
    const queue = [...eligible];
    const runOne = async () => {
      while (queue.length > 0 && !cancelled) {
        const r = queue.shift()!;
        const coordinates: [number, number][] =
          parentStopSequence[r.id] ?? [
            [r.departure_lng!, r.departure_lat!],
            [r.destination_lng!, r.destination_lat!],
          ];
        const sig = coordinates
          .map((c) => `${c[0].toFixed(5)},${c[1].toFixed(5)}`)
          .join("|");
        inflightRef.current.add(r.id);
        try {
          // Always ask for alternatives — backend has fallbacks (stitched +
          // via-points) so even single-leg routes get 2-3 genuine variants.
          const { data, error } = await supabase.functions.invoke("route-directions", {
            body: { coordinates, alternatives: true },
          });
          console.log("[OpsMap] route-directions", r.request_number, { error, ok: data?.ok, geomLen: data?.geometry?.length, alts: data?.alternatives?.length });
          if (!cancelled && !error && data?.ok && Array.isArray(data.geometry)) {
            routeCacheKeyRef.current[r.id] = sig;
            const alts: RouteAlt[] = Array.isArray(data.alternatives) && data.alternatives.length > 0
              ? data.alternatives.map((a: any) => ({
                  geometry: a.geometry as [number, number][],
                  distance_m: Number(a.distance_m) || 0,
                  duration_s: Number(a.duration_s) || 0,
                }))
              : [{
                  geometry: data.geometry as [number, number][],
                  distance_m: Number(data.distance_m) || 0,
                  duration_s: Number(data.duration_s) || 0,
                }];
            setRouteAlts((prev) => ({ ...prev, [r.id]: alts }));
            setRouteGeoms((prev) => ({ ...prev, [r.id]: alts[0].geometry }));
          } else if (error) {
            console.error("[OpsMap] route-directions error", r.request_number, error);
          }
        } catch (err) {
          console.error("[OpsMap] route-directions threw", r.request_number, err);
        } finally {
          inflightRef.current.delete(r.id);
        }
      }
    };
    // 6 parallel workers — public OSRM tolerates this fine and it nearly
    // halves total wall-clock time for typical 3-5 request batches.
    Promise.all([runOne(), runOne(), runOne(), runOne(), runOne(), runOne()]);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, parentStopSequence]);
  const routeFetchedCount = useMemo(
    () => requests.filter((r) => routeGeoms[r.id]).length,
    [requests, routeGeoms],
  );
  const withCoordsCount = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.departure_lat != null &&
          r.departure_lng != null &&
          r.destination_lat != null &&
          r.destination_lng != null,
      ).length,
    [requests],
  );


  // Init map
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
      // Geofence source — drawn first so routes/markers stay on top.
      map.addSource("ops-geofences", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "ops-geofences-fill",
        type: "fill",
        source: "ops-geofences",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "hsl(160 70% 45%)"],
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "ops-geofences-outline",
        type: "line",
        source: "ops-geofences",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "hsl(160 70% 45%)"],
          "line-width": 1.5,
          "line-opacity": 0.7,
          "line-dasharray": [2, 2],
        },
      });
      // Geofence labels (centroid name) so dispatchers can identify zones.
      map.addLayer({
        id: "ops-geofences-label",
        type: "symbol",
        source: "ops-geofences",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "text-offset": [0, 0.6],
          "text-anchor": "top",
        },
        paint: {
          "text-color": ["coalesce", ["get", "color"], "hsl(160 70% 35%)"],
          "text-halo-color": "hsla(0,0%,100%,0.85)",
          "text-halo-width": 1.2,
        },
      });
      // route lines source
      map.addSource("ops-routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      // Soft halo for selected/merged routes
      map.addLayer({
        id: "ops-routes-halo",
        type: "line",
        source: "ops-routes",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "hsl(220 80% 55%)"],
          "line-width": ["case", ["==", ["get", "merged"], true], 11, 7],
          "line-opacity": ["case", ["==", ["get", "merged"], true], 0.25, 0.12],
          "line-blur": 2,
        },
      });
      map.addLayer({
        id: "ops-routes-line",
        type: "line",
        source: "ops-routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["coalesce", ["get", "color"], "hsl(220 80% 55%)"],
          "line-width": ["case", ["==", ["get", "merged"], true], 5, 3.2],
          "line-opacity": 0.95,
          // Solid for real road geometry, dashed when we fall back to a straight line.
          "line-dasharray": [
            "case",
            ["==", ["get", "fallback"], true],
            ["literal", [2, 1.5]],
            ["literal", [1, 0]],
          ],
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

  // Resize map whenever the side panel collapses/expands or the window changes.
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

  // Sync route lines + markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // clear markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const features: any[] = [];
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    if (showRoutes) {
      visibleRequests.forEach((r) => {
        if (
          r.departure_lat == null ||
          r.departure_lng == null ||
          r.destination_lat == null ||
          r.destination_lng == null
        )
          return;
        const merged = !!mergeGroupColorByRequestId[r.id];
        const isParent = !!r.is_consolidated_parent;
        const color = merged ? mergeGroupColorByRequestId[r.id] : poolColor(r.pool_name);
        const alts = routeAlts[r.id];
        const altIdx = selectedAltIdx[r.id] ?? 0;
        const realGeom = alts && alts.length > 0
          ? alts[Math.min(altIdx, alts.length - 1)].geometry
          : routeGeoms[r.id];
        const usingFallback = !realGeom;
        const lineCoords: [number, number][] = realGeom ?? [
          [r.departure_lng, r.departure_lat],
          [r.destination_lng, r.destination_lat],
        ];
        features.push({
          type: "Feature",
          properties: {
            color,
            merged: merged || isParent,
            id: r.id,
            pool: r.pool_name || "Unassigned",
            fallback: usingFallback,
          },
          geometry: { type: "LineString", coordinates: lineCoords },
        });

        // pickup marker — consolidated parents get a "merge" badge ring
        const pickupEl = document.createElement("div");
        const isUrgent = r.priority === "urgent" || r.priority === "high";
        pickupEl.style.cssText = `
          position:relative;width:${isParent ? 18 : 14}px;height:${isParent ? 18 : 14}px;
          border-radius:9999px;background:${color};
          border:2px solid hsl(var(--background));
          box-shadow:0 0 0 ${isParent ? 3 : 1}px ${isParent ? "hsl(var(--primary))" : color}${isUrgent ? ", 0 0 0 5px hsl(0 84% 60% / .35)" : ""};
        `;
        if (isParent) {
          const tag = document.createElement("span");
          tag.textContent = String(r.consolidated_request_count ?? "·");
          tag.style.cssText = `
            position:absolute;top:-8px;right:-10px;min-width:14px;height:14px;
            padding:0 3px;border-radius:9999px;background:hsl(var(--primary));
            color:hsl(var(--primary-foreground));font:700 9px system-ui;
            display:flex;align-items:center;justify-content:center;border:1px solid hsl(var(--background));
          `;
          pickupEl.appendChild(tag);
        }
        const m1 = new maplibregl.Marker({ element: pickupEl })
          .setLngLat([r.departure_lng, r.departure_lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div style="font:500 12px system-ui;padding:4px;min-width:170px;">
                 <div style="font-weight:700">${r.request_number}${isParent ? " · 🔗 merged" : ""}</div>
                 <div style="color:hsl(var(--muted-foreground));font-size:11px;">${r.pool_name || "Unassigned"}${r.passengers ? ` · ${r.passengers} pax` : ""}</div>
                 <div style="margin-top:4px;font-size:11px;">📍 ${r.departure_place || "Pickup"}</div>
                 <div style="font-size:11px;">🏁 ${r.destination || "Drop"}</div>
                 ${isUrgent ? '<div style="margin-top:4px;color:hsl(0 84% 60%);font-weight:600;font-size:10px;">⚠ URGENT</div>' : ""}
                 ${merged ? '<div style="margin-top:4px;color:hsl(38 92% 50%);font-weight:600;font-size:10px;">⚡ Merge candidate</div>' : ""}
                 ${isParent ? `<div style="margin-top:4px;color:hsl(var(--primary));font-weight:600;font-size:10px;">🔗 Consolidated · ${r.consolidated_request_count ?? "?"} requests</div>` : ""}
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m1);

        // drop marker (smaller)
        const dropEl = document.createElement("div");
        dropEl.style.cssText = `width:10px;height:10px;border-radius:2px;background:hsl(var(--background));border:2px solid ${color};`;
        const m2 = new maplibregl.Marker({ element: dropEl })
          .setLngLat([r.destination_lng, r.destination_lat])
          .addTo(map);
        markersRef.current.push(m2);

        bounds.extend([r.departure_lng, r.departure_lat]);
        bounds.extend([r.destination_lng, r.destination_lat]);
        hasBounds = true;

        // Intermediate stop dots for consolidated parents — show every merged
        // child pickup and drop along the route so dispatchers see the actual
        // shape of the consolidated trip, not just the parent endpoints.
        if (isParent) {
          const seq = parentStopSequence[r.id];
          if (seq && seq.length > 2) {
            seq.slice(1, -1).forEach((coord, idx) => {
              const isPickup = idx < (seq.length - 2) / 2;
              const stopEl = document.createElement("div");
              stopEl.style.cssText = `
                width:10px;height:10px;border-radius:${isPickup ? "9999px" : "2px"};
                background:${isPickup ? color : "hsl(var(--background))"};
                border:2px solid ${color};
                box-shadow:0 0 0 1px hsl(var(--background));
              `;
              const sm = new maplibregl.Marker({ element: stopEl })
                .setLngLat(coord)
                .setPopup(
                  new maplibregl.Popup({ offset: 10 }).setHTML(
                    `<div style="font:500 11px system-ui;padding:3px;">
                       <div style="font-weight:700">${isPickup ? "Merged pickup" : "Merged drop"}</div>
                       <div style="color:hsl(var(--muted-foreground));font-size:10px;">${r.request_number} · stop ${idx + 1}</div>
                     </div>`,
                  ),
                )
                .addTo(map);
              markersRef.current.push(sm);
              bounds.extend(coord);
            });
          }
        }
      });
    }

    if (showVehicles) {
      available.forEach((v: any) => {
        const fullV = allVehicles.find((x: any) => x.id === v.id) as any;
        const loc = fullV?.current_location;
        if (!loc?.lat || !loc?.lng) return;
        const pool = fullV?.specific_pool || "Unassigned";
        const color = poolColor(pool);
        const el = document.createElement("div");
        el.style.cssText = `display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${color};color:#fff;font:700 10px system-ui;border:2px solid hsl(var(--background));box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer;`;
        el.textContent = "🚚";
        el.title = `${v.plate_number} — click for live position & video playback`;

        // Build popup as DOM so we can attach a "Video Playback" handler.
        const popupEl = document.createElement("div");
        popupEl.style.cssText = "font:500 12px system-ui;padding:4px;min-width:180px;";
        popupEl.innerHTML = `
          <div style="font-weight:700">${v.plate_number}</div>
          <div style="font-size:11px;">${v.make ?? ""} ${v.model ?? ""}</div>
          <div style="font-size:11px;color:hsl(var(--muted-foreground));">Pool: ${pool}</div>
          <div style="margin-top:4px;font-size:10px;color:hsl(142 71% 45%);font-weight:600;">● IDLE</div>
        `;
        const playBtn = document.createElement("button");
        playBtn.type = "button";
        playBtn.textContent = "▶ Video Playback";
        playBtn.style.cssText = `
          margin-top:8px;width:100%;padding:6px 10px;border-radius:6px;
          border:1px solid hsl(var(--primary));background:hsl(var(--primary));
          color:hsl(var(--primary-foreground));font:600 11px system-ui;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:6px;
        `;
        playBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          setPlaybackVehicle({
            id: v.id,
            label: `${v.plate_number}${v.make ? ` · ${v.make} ${v.model ?? ""}` : ""}`,
          });
        });
        popupEl.appendChild(playBtn);

        const m = new maplibregl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setDOMContent(popupEl))
          .addTo(map);
        markersRef.current.push(m);
        bounds.extend([loc.lng, loc.lat]);
        hasBounds = true;
      });
    }

    const src = map.getSource("ops-routes") as maplibregl.GeoJSONSource;
    src?.setData({ type: "FeatureCollection", features });
    // NOTE: fitBounds was moved to a dedicated effect below so it does NOT
    // re-fire every time a per-request route geometry arrives. Re-fitting on
    // every routeAlts/routeGeoms update was causing the map to pan/zoom
    // repeatedly during routing, which pushed geofences off-screen and made
    // them appear to "disappear" once routing finished.
  }, [ready, visibleRequests, available, allVehicles, showRoutes, showVehicles, mergeGroupColorByRequestId, routeGeoms, routeAlts, selectedAltIdx, parentStopSequence]);

  // Dedicated auto-fit pass — runs only when the *set* of requests / vehicles /
  // geofences changes (not when per-route geometry arrives). Bounds include
  // geofence centres + radius edges so zones stay visible after auto-zoom.
  const lastFitSigRef = useRef<string>("");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;
    if (showRoutes) {
      visibleRequests.forEach((r) => {
        if (r.departure_lat != null && r.departure_lng != null) {
          bounds.extend([r.departure_lng, r.departure_lat]);
          hasBounds = true;
        }
        if (r.destination_lat != null && r.destination_lng != null) {
          bounds.extend([r.destination_lng, r.destination_lat]);
          hasBounds = true;
        }
      });
    }
    if (showVehicles) {
      available.forEach((v: any) => {
        const fullV = allVehicles.find((x: any) => x.id === v.id) as any;
        const loc = fullV?.current_location;
        if (loc?.lat && loc?.lng) {
          bounds.extend([loc.lng, loc.lat]);
          hasBounds = true;
        }
      });
    }
    if (showGeofences) {
      (geofences as any[]).forEach((g) => {
        if (g.center_lat != null && g.center_lng != null) {
          bounds.extend([Number(g.center_lng), Number(g.center_lat)]);
          if (g.radius_meters) {
            // Approx degree offset for radius so the zone fits inside view.
            const dLat = Number(g.radius_meters) / 111000;
            const dLng = Number(g.radius_meters) / (111000 * Math.cos((Number(g.center_lat) * Math.PI) / 180));
            bounds.extend([Number(g.center_lng) + dLng, Number(g.center_lat) + dLat]);
            bounds.extend([Number(g.center_lng) - dLng, Number(g.center_lat) - dLat]);
          }
          hasBounds = true;
        } else if (Array.isArray(g.polygon_points)) {
          (g.polygon_points as any[]).forEach((p: any) => {
            const lng = Number(Array.isArray(p) ? p[0] : p?.lng ?? p?.longitude);
            const lat = Number(Array.isArray(p) ? p[1] : p?.lat ?? p?.latitude);
            if (Number.isFinite(lng) && Number.isFinite(lat)) {
              bounds.extend([lng, lat]);
              hasBounds = true;
            }
          });
        }
      });
    }
    if (!hasBounds) return;
    // Signature so we don't re-fit on identical set (prevents map jumps when
    // realtime updates arrive but the visible set is unchanged).
    const sig = [
      visibleRequests.map((r) => r.id).sort().join(","),
      available.map((v: any) => v.id).sort().join(","),
      (geofences as any[]).map((g) => g.id).sort().join(","),
      `${showRoutes}|${showVehicles}|${showGeofences}`,
    ].join("#");
    if (sig === lastFitSigRef.current) return;
    lastFitSigRef.current = sig;
    try {
      map.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 13 });
    } catch {
      /* ignore */
    }
  }, [ready, visibleRequests, available, allVehicles, geofences, showRoutes, showVehicles, showGeofences]);


  // Sync geofence overlay (circles + polygons) from the active geofences list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("ops-geofences") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    if (!showGeofences) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    // Build a polygon ring from a centre + radius (8 segments — cheap & smooth
    // enough at the zoom levels dispatchers use).
    const circleRing = (lat: number, lng: number, radiusM: number): [number, number][] => {
      const pts: [number, number][] = [];
      const earthR = 6378137;
      const segs = 48;
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs) * Math.PI * 2;
        const dx = (radiusM * Math.cos(t)) / (earthR * Math.cos((lat * Math.PI) / 180));
        const dy = (radiusM * Math.sin(t)) / earthR;
        pts.push([lng + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI]);
      }
      return pts;
    };
    const features = (geofences as any[])
      .map((g) => {
        const color = g.color || "hsl(160 70% 45%)";
        const props = { id: g.id, name: g.name, category: g.category, color };
        if (g.geometry_type === "polygon" && Array.isArray(g.polygon_points) && g.polygon_points.length >= 3) {
          const ring = (g.polygon_points as any[])
            .map((p: any) =>
              Array.isArray(p)
                ? [Number(p[0]), Number(p[1])]
                : [Number(p?.lng ?? p?.longitude), Number(p?.lat ?? p?.latitude)],
            )
            .filter((p: any) => Number.isFinite(p[0]) && Number.isFinite(p[1])) as [number, number][];
          if (ring.length < 3) return null;
          const closed = [...ring, ring[0]];
          return {
            type: "Feature" as const,
            properties: props,
            geometry: { type: "Polygon" as const, coordinates: [closed] },
          };
        }
        if (g.center_lat != null && g.center_lng != null && g.radius_meters) {
          const ring = circleRing(Number(g.center_lat), Number(g.center_lng), Number(g.radius_meters));
          return {
            type: "Feature" as const,
            properties: props,
            geometry: { type: "Polygon" as const, coordinates: [ring] },
          };
        }
        return null;
      })
      .filter(Boolean);
    src.setData({ type: "FeatureCollection", features: features as any });
  }, [ready, geofences, showGeofences]);

  const handleSubmitBorrow = async () => {
    if (!borrowDialog) return;
    await createBorrow.mutateAsync({
      organization_id: organizationId,
      source_pool: borrowDialog.sourcePool,
      target_pool: borrowDialog.targetPool,
      requested_vehicle_id: borrowDialog.vehicleId,
      vehicle_request_id: borrowDialog.requestId || null,
      reason: borrowReason || `Pool ${borrowDialog.sourcePool} needs additional capacity`,
    });
    setBorrowDialog(null);
    setBorrowReason("");
  };

  const refetchAll = () => {
    refetchRequests();
    refetchMerges();
    refetchBorrow();
  };

  const totalDemand = requests.length;
  const totalIdle = available.filter((v: any) => {
    const fv = allVehicles.find((x: any) => x.id === v.id) as any;
    return !!fv?.current_location?.lat;
  }).length;

  return (
    <div className="space-y-3">
      {/* ===================== TOP KPI STRIP ===================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <KpiTile icon={<RouteIcon className="w-3.5 h-3.5" />} label="Open requests" value={kpis.totalRequests} tone="primary" />
        <KpiTile icon={<Users className="w-3.5 h-3.5" />} label="Pax demand" value={kpis.totalPax} tone="default" />
        <KpiTile icon={<Flame className="w-3.5 h-3.5" />} label="Urgent" value={kpis.urgent} tone={kpis.urgent > 0 ? "danger" : "default"} />
        <KpiTile icon={<GitMerge className="w-3.5 h-3.5" />} label="Consolidated" value={kpis.consolidatedParents} tone="primary" />
        <KpiTile icon={<Layers className="w-3.5 h-3.5" />} label="Merge candidates" value={kpis.mergeCandidates} tone={kpis.mergeCandidates > 0 ? "warning" : "default"} />
        <KpiTile icon={<Truck className="w-3.5 h-3.5" />} label="Idle vehicles" value={kpis.totalIdleVeh} tone="success" />
        <KpiTile icon={<IdCard className="w-3.5 h-3.5" />} label="Idle drivers" value={kpis.totalIdleDrv} tone="success" />
        <KpiTile icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Deficit pools" value={kpis.deficitPools} tone={kpis.deficitPools > 0 ? "danger" : "default"} />
      </div>

      {selectedPool && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
          <CircleDot className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs">
            Filtering map by pool <span className="font-semibold text-primary">{selectedPool}</span>
            <span className="text-muted-foreground ml-1">({visibleRequests.length} of {requests.length} requests)</span>
          </span>
          <Button size="sm" variant="ghost" className="h-6 ml-auto text-[11px]" onClick={() => setSelectedPool(null)}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-3 transition-[grid-template-columns] duration-300 ${
          sidePanelOpen ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-[minmax(0,1fr)_44px]"
        }`}
      >
      {/* MAP */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <span>Operations Map</span>
            <Badge variant="outline" className="text-[10px]">
              {totalDemand} routes · {totalIdle} idle
            </Badge>
            {showRoutes && withCoordsCount > 0 && routeFetchedCount < withCoordsCount && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Routing {routeFetchedCount}/{withCoordsCount}
              </Badge>
            )}
            {showRoutes && withCoordsCount > 0 && routeFetchedCount === withCoordsCount && (
              <Badge variant="outline" className="h-5 text-[10px] gap-1">
                <RouteIcon className="w-3 h-3" />
                Real road geometry
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {mapControlsOpen ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Switch id="r" checked={showRoutes} onCheckedChange={setShowRoutes} />
                  <Label htmlFor="r" className="text-xs cursor-pointer">Routes</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="v" checked={showVehicles} onCheckedChange={setShowVehicles} />
                  <Label htmlFor="v" className="text-xs cursor-pointer">Vehicles</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="m" checked={showMerges} onCheckedChange={setShowMerges} />
                  <Label htmlFor="m" className="text-xs cursor-pointer">Merges</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="g" checked={showGeofences} onCheckedChange={setShowGeofences} />
                  <Label htmlFor="g" className="text-xs cursor-pointer">Zones</Label>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={refetchAll} title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setMapControlsOpen(false)}
                  title="Hide controls"
                  aria-label="Hide controls"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 gap-1.5 text-[11px]"
                onClick={() => setMapControlsOpen(true)}
                title="Show controls"
              >
                <Settings2 className="w-3 h-3" />
                Controls
                <ChevronDown className="w-3 h-3" />
              </Button>
            )}
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
          {/* Route alternatives picker — collapsed to a floating button; click to pop open */}
          {showRoutes && visibleRequests.some((r) => (routeAlts[r.id]?.length ?? 0) > 1) && (
            <div className="absolute top-3 left-3 z-10">
              {!routeOptionsOpen ? (
                <button
                  type="button"
                  onClick={() => setRouteOptionsOpen(true)}
                  className="h-8 px-2 inline-flex items-center gap-1 rounded-lg border bg-background/95 backdrop-blur shadow-md text-[11px] font-semibold hover:bg-muted"
                  title="Show route options"
                  aria-label="Show route options"
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Routes</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {visibleRequests.filter((r) => (routeAlts[r.id]?.length ?? 0) > 1).length}
                  </Badge>
                </button>
              ) : (
                <div className="bg-background/95 backdrop-blur rounded-lg border shadow-md text-[11px] max-w-[280px]">
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <div className="font-semibold flex items-center gap-1">
                      <RouteIcon className="w-3 h-3" /> Route options
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {visibleRequests.filter((r) => (routeAlts[r.id]?.length ?? 0) > 1).length}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRouteOptionsOpen(false)}
                      className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted"
                      title="Close"
                      aria-label="Close route options"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="border-t border-border/60 p-2 max-h-[240px] overflow-auto space-y-2">
                    {visibleRequests
                      .filter((r) => (routeAlts[r.id]?.length ?? 0) > 1)
                      .slice(0, 6)
                      .map((r) => {
                        const alts = routeAlts[r.id] ?? [];
                        const sel = selectedAltIdx[r.id] ?? 0;
                        return (
                          <div key={r.id} className="border-t border-border/50 pt-1.5 first:border-0 first:pt-0">
                            <div className="font-medium truncate" title={r.request_number}>
                              {r.request_number}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {alts.map((a, idx) => {
                                const km = (a.distance_m / 1000).toFixed(1);
                                const min = Math.round(a.duration_s / 60);
                                const active = idx === sel;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedAltIdx((p) => ({ ...p, [r.id]: idx }))
                                    }
                                    className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
                                      active
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background hover:bg-muted border-border"
                                    }`}
                                    title={`${km} km · ${min} min`}
                                  >
                                    #{idx + 1} · {km}km · {min}min
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Legend — collapsed to a floating button; click to pop open */}
          <div className="absolute bottom-3 left-3 z-10 hidden sm:block">
            {!legendOpen ? (
              <button
                type="button"
                onClick={() => setLegendOpen(true)}
                className="h-8 px-2 inline-flex items-center gap-1 rounded-lg border bg-background/95 backdrop-blur shadow-md text-[11px] font-semibold hover:bg-muted"
                title="Show legend"
                aria-label="Show legend"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Legend</span>
              </button>
            ) : (
              <div className="bg-background/95 backdrop-blur rounded-lg border shadow-md text-[11px]">
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <div className="font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Legend
                  </div>
                  <button
                    type="button"
                    onClick={() => setLegendOpen(false)}
                    className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted"
                    title="Close"
                    aria-label="Close legend"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="border-t border-border/60 p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" /> Pickup
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-primary" /> Drop
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-primary/80 flex items-center justify-center text-[8px]">🚚</div>
                    Idle vehicle
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-amber-500" /> Merge candidate
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
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50 mt-1">
                    <div className="w-3 h-3 rounded border border-emerald-500 bg-emerald-500/10" />
                    Geofence zone
                  </div>
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* SIDE PANEL — collapsed rail on lg, full panel otherwise */}
      {!sidePanelOpen ? (
        <div className="hidden lg:flex flex-col items-center pt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={() => setSidePanelOpen(true)}
            title="Show side panel"
          >
            <PanelRightOpen className="w-4 h-4" />
          </Button>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] rotate-180">
            Pool · Borrow
          </div>
        </div>
      ) : (
      <div className="space-y-3 min-w-0">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">Pool Demand & Supply</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{poolStats.length}</Badge>
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0"
              onClick={() => setPoolDemandOpen((o) => !o)}
              title={poolDemandOpen ? "Minimize" : "Expand"}
              aria-expanded={poolDemandOpen}
            >
              {poolDemandOpen ? (
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
              )}
            </Button>
          </CardHeader>
          {poolDemandOpen && (
          <CardContent className="p-0">
            <ScrollArea className="h-[260px] sm:h-[300px]">
              <div className="p-3 space-y-2">
                {poolStats.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">
                    No active pools.
                  </div>
                )}
                {poolStats.map((p) => {
                  const color = poolColor(p.name);
                  const deficit = p.deficit;
                  return (
                    <div
                      key={p.name}
                      className="rounded-lg border p-2.5 space-y-1.5 bg-card"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: color }}
                          />
                          <span className="text-xs font-semibold truncate">
                            {p.name}
                          </span>
                        </div>
                        {deficit > 0 ? (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            -{deficit}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            +{p.idle - p.demand}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <RouteIcon className="w-3 h-3" /> {p.demand} requests
                        </div>
                        <div className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {p.idle} idle
                        </div>
                      </div>
                      {/* Demand bar */}
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (p.demand / Math.max(1, p.demand + p.idle)) * 100)}%`,
                            background: deficit > 0 ? "hsl(0 84% 60%)" : color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
          )}
        </Card>

        {/* Borrow suggestions */}
        {poolsWithDeficit.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Borrow Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[260px]">
                <div className="p-3 space-y-2">
                  {poolsWithDeficit.map((deficitPool) => {
                    // Suggest from any pool with surplus
                    const suggestions = poolsWithSurplus
                      .flatMap((sp) =>
                        sp.vehicles.slice(0, Math.max(0, sp.idle - sp.demand)).map((v: any) => ({
                          fromPool: sp.name,
                          vehicle: v,
                        })),
                      )
                      .slice(0, 5);
                    return (
                      <div key={deficitPool.name} className="rounded-lg border bg-background p-2 space-y-2">
                        <div className="text-[11px] font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3" /> {deficitPool.name} needs {deficitPool.deficit} vehicle(s)
                        </div>
                        {suggestions.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground italic">
                            No idle vehicles available in surplus pools.
                          </div>
                        ) : (
                          suggestions.map((s) => (
                            <div
                              key={s.vehicle.id + deficitPool.name}
                              className="flex items-center justify-between gap-2 text-[11px] bg-muted/50 rounded p-1.5"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {s.vehicle.plate_number}
                                </div>
                                <div className="text-muted-foreground truncate">
                                  from {s.fromPool}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2"
                                onClick={() =>
                                  setBorrowDialog({
                                    sourcePool: deficitPool.name,
                                    targetPool: s.fromPool,
                                    vehicleId: s.vehicle.id,
                                    vehiclePlate: s.vehicle.plate_number,
                                  })
                                }
                              >
                                <Send className="w-3 h-3 mr-1" /> Borrow
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Pending borrow requests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Borrow Requests
              <Badge variant="outline" className="text-[10px]">
                {borrowRows.filter((b) => b.status === "pending").length} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="pending">
              <TabsList className="grid grid-cols-2 mx-3 h-8">
                <TabsTrigger value="pending" className="text-[11px]">Pending</TabsTrigger>
                <TabsTrigger value="all" className="text-[11px]">All</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="m-0">
                <ScrollArea className="h-[200px]">
                  <BorrowList
                    rows={borrowRows.filter((b) => b.status === "pending")}
                    onApprove={(id) =>
                      respondBorrow.mutate({ id, organization_id: organizationId, status: "approved" })
                    }
                    onReject={(id) =>
                      respondBorrow.mutate({ id, organization_id: organizationId, status: "rejected" })
                    }
                  />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="all" className="m-0">
                <ScrollArea className="h-[200px]">
                  <BorrowList rows={borrowRows} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Borrow dialog */}
      <Dialog open={!!borrowDialog} onOpenChange={(o) => !o && setBorrowDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Request Cross-Pool Vehicle
            </DialogTitle>
            <DialogDescription>
              Send a borrow request to <strong>{borrowDialog?.targetPool}</strong> for vehicle{" "}
              <strong>{borrowDialog?.vehiclePlate}</strong>. The receiving pool's supervisor must approve before
              the vehicle can be assigned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs">Reason / context</Label>
            <Textarea
              id="reason"
              rows={3}
              value={borrowReason}
              onChange={(e) => setBorrowReason(e.target.value)}
              placeholder={`Pool ${borrowDialog?.sourcePool} demand exceeds supply…`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrowDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitBorrow} disabled={createBorrow.isPending}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehicleVideoPlaybackDialog
        open={!!playbackVehicle}
        onOpenChange={(o) => !o && setPlaybackVehicle(null)}
        vehicleId={playbackVehicle?.id ?? null}
        vehicleLabel={playbackVehicle?.label}
      />
      </div>
    </div>
  );
};

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}
const KpiTile = ({ icon, label, value, tone = "default" }: KpiTileProps) => {
  const toneClass =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : tone === "warning"
      ? "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400"
      : tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
      : tone === "primary"
      ? "border-primary/40 bg-primary/5 text-primary"
      : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-80">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-bold leading-tight tabular-nums">{value}</div>
    </div>
  );
};


interface BorrowListProps {
  rows: any[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}
const BorrowList = ({ rows, onApprove, onReject }: BorrowListProps) => {
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-6">No requests.</div>;
  }
  return (
    <div className="p-3 space-y-2">
      {rows.map((b) => (
        <div key={b.id} className="rounded-lg border p-2 space-y-1 bg-card text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              {b.source_pool} ← {b.target_pool}
            </div>
            <Badge
              variant={
                b.status === "approved"
                  ? "default"
                  : b.status === "rejected"
                  ? "destructive"
                  : b.status === "cancelled"
                  ? "outline"
                  : "secondary"
              }
              className="text-[9px] h-4"
            >
              {b.status}
            </Badge>
          </div>
          {b.reason && <div className="text-muted-foreground line-clamp-2">{b.reason}</div>}
          <div className="text-[10px] text-muted-foreground">
            {format(new Date(b.created_at), "MMM d, h:mm a")}
          </div>
          {b.status === "pending" && onApprove && onReject && (
            <div className="flex gap-1.5 pt-1">
              <Button
                size="sm"
                className="h-6 text-[10px] px-2 flex-1"
                onClick={() => onApprove(b.id)}
              >
                <Check className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 flex-1"
                onClick={() => onReject(b.id)}
              >
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default OpsMapView;
