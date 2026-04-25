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
  const [borrowDialog, setBorrowDialog] = useState<null | {
    sourcePool: string;
    targetPool: string;
    vehicleId: string;
    vehiclePlate: string;
    requestId?: string;
  }>(null);
  const [borrowReason, setBorrowReason] = useState("");
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

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
      // route lines source
      map.addSource("ops-routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "ops-routes-line",
        type: "line",
        source: "ops-routes",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "hsl(220 80% 55%)"],
          "line-width": ["case", ["==", ["get", "merged"], true], 5, 3],
          "line-opacity": 0.85,
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
        features.push({
          type: "Feature",
          properties: { color, merged: merged || isParent, id: r.id, pool: r.pool_name || "Unassigned" },
          geometry: {
            type: "LineString",
            coordinates: [
              [r.departure_lng, r.departure_lat],
              [r.destination_lng, r.destination_lat],
            ],
          },
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
        el.style.cssText = `display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${color};color:#fff;font:700 10px system-ui;border:2px solid hsl(var(--background));box-shadow:0 2px 6px rgba(0,0,0,.3);`;
        el.textContent = "🚚";
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div style="font:500 12px system-ui;padding:4px;">
                 <div style="font-weight:700">${v.plate_number}</div>
                 <div style="font-size:11px;">${v.make} ${v.model}</div>
                 <div style="font-size:11px;color:hsl(var(--muted-foreground));">Pool: ${pool}</div>
                 <div style="margin-top:4px;font-size:10px;color:hsl(142 71% 45%);font-weight:600;">● IDLE</div>
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m);
        bounds.extend([loc.lng, loc.lat]);
        hasBounds = true;
      });
    }

    const src = map.getSource("ops-routes") as maplibregl.GeoJSONSource;
    src?.setData({ type: "FeatureCollection", features });

    if (hasBounds) {
      try {
        map.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 13 });
      } catch {
        /* ignore */
      }
    }
  }, [ready, visibleRequests, available, allVehicles, showRoutes, showVehicles, mergeGroupColorByRequestId]);

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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
      {/* MAP */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Operations Map
            <Badge variant="outline" className="text-[10px]">
              {totalDemand} routes · {totalIdle} idle
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
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
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={refetchAll}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
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
          </div>
        </CardContent>
      </Card>

      {/* SIDE PANEL */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Pool Demand & Supply
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
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
