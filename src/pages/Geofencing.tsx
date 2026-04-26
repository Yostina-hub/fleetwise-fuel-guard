import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Ban,
  BellRing,
  Building2,
  Check,
  Circle,
  Edit,
  Eye,
  EyeOff,
  Layers,
  ListChecks,
  MapPin,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  Route,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import maplibregl from "maplibre-gl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import GeofenceEventsTab from "@/components/geofencing/GeofenceEventsTab";
import { friendlyToastError } from "@/lib/errorMessages";

type DispatchPolicy = "prefer" | "avoid" | "neutral";
type GeometryType = "circle" | "polygon";

type GeofenceRecord = {
  id: string;
  name: string;
  category: string | null;
  geometry_type: GeometryType | string | null;
  center_lat: number | string | null;
  center_lng: number | string | null;
  radius_meters: number | string | null;
  polygon_points: unknown;
  enable_entry_alarm?: boolean | null;
  enable_exit_alarm?: boolean | null;
  is_active?: boolean | null;
  color?: string | null;
  dispatch_policy?: DispatchPolicy | string | null;
  dispatch_priority?: number | null;
};

type MapPalette = {
  primary: string;
  card: string;
  foreground: string;
  muted: string;
  success: string;
  warning: string;
  destructive: string;
};

const defaultPalette: MapPalette = {
  primary: "hsl(84 54% 56%)",
  card: "hsl(213 33% 15%)",
  foreground: "hsl(0 0% 95%)",
  muted: "hsl(213 33% 25%)",
  success: "hsl(145 65% 50%)",
  warning: "hsl(38 92% 55%)",
  destructive: "hsl(0 75% 55%)",
};

const readCssHsl = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
};

const readMapPalette = (): MapPalette => ({
  primary: readCssHsl("--primary", defaultPalette.primary),
  card: readCssHsl("--card", defaultPalette.card),
  foreground: readCssHsl("--foreground", defaultPalette.foreground),
  muted: readCssHsl("--muted", defaultPalette.muted),
  success: readCssHsl("--success", defaultPalette.success),
  warning: readCssHsl("--warning", defaultPalette.warning),
  destructive: readCssHsl("--destructive", defaultPalette.destructive),
});

const policyMeta: Record<DispatchPolicy, { label: string; shortLabel: string; icon: LucideIcon; className: string }> = {
  prefer: { label: "Prefer for dispatch", shortLabel: "Prefer", icon: ShieldCheck, className: "border-success/40 bg-success/10 text-success" },
  avoid: { label: "Avoid for dispatch", shortLabel: "Avoid", icon: Ban, className: "border-warning/40 bg-warning/10 text-warning" },
  neutral: { label: "No dispatch preference", shortLabel: "Neutral", icon: Route, className: "border-border bg-muted text-muted-foreground" },
};

const categoryDefaultPolicy: Record<string, DispatchPolicy> = {
  depot: "prefer",
  parking: "prefer",
  service_area: "prefer",
  no_go_zone: "avoid",
  speed_zone: "avoid",
  customer_site: "neutral",
};

const categoryLabels: Record<string, string> = {
  customer_site: "Customer",
  depot: "Depot",
  no_go_zone: "No-Go Zone",
  speed_zone: "Speed Zone",
  parking: "Parking",
  service_area: "Service",
};

const getCategoryDefaultPolicy = (category: string): DispatchPolicy => categoryDefaultPolicy[category] || "neutral";

const normalizePolicy = (policy: unknown): DispatchPolicy => {
  if (policy === "prefer" || policy === "avoid" || policy === "neutral") return policy;
  return "neutral";
};

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const buildFenceFeature = (fence: GeofenceRecord): GeoJSON.Feature<GeoJSON.Polygon> | null => {
  if (fence.geometry_type === "circle") {
    const centerLat = toFiniteNumber(fence.center_lat);
    const centerLng = toFiniteNumber(fence.center_lng);
    const radius = toFiniteNumber(fence.radius_meters) || 500;
    if (centerLat == null || centerLng == null) return null;

    const points = 112;
    const coords: number[][] = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);
      const lat = centerLat + dy / 111320;
      const lng = centerLng + dx / (111320 * Math.cos((centerLat * Math.PI) / 180));
      coords.push([lng, lat]);
    }

    return {
      type: "Feature",
      properties: { id: fence.id, name: fence.name },
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  }

  if (fence.geometry_type === "polygon" && Array.isArray(fence.polygon_points) && fence.polygon_points.length >= 3) {
    const coords = (fence.polygon_points as Array<{ lat: number | string; lng: number | string }>)
      .map((point) => [toFiniteNumber(point.lng), toFiniteNumber(point.lat)] as const)
      .filter((point): point is readonly [number, number] => point[0] != null && point[1] != null)
      .map(([lng, lat]) => [lng, lat]);

    if (coords.length < 3) return null;
    coords.push(coords[0]);

    return {
      type: "Feature",
      properties: { id: fence.id, name: fence.name },
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  }

  return null;
};

const getFenceBounds = (fence: GeofenceRecord): maplibregl.LngLatBounds | null => {
  const feature = buildFenceFeature(fence);
  const coords = feature?.geometry.coordinates[0];
  if (!coords?.length) return null;

  const bounds = new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]);
  coords.forEach((coord) => bounds.extend(coord as [number, number]));
  return bounds;
};

const getFenceCenter = (fence: GeofenceRecord): [number, number] | null => {
  const centerLat = toFiniteNumber(fence.center_lat);
  const centerLng = toFiniteNumber(fence.center_lng);
  if (centerLat != null && centerLng != null) return [centerLng, centerLat];

  if (Array.isArray(fence.polygon_points) && fence.polygon_points.length > 0) {
    const coords = (fence.polygon_points as Array<{ lat: number | string; lng: number | string }>)
      .map((point) => ({ lat: toFiniteNumber(point.lat), lng: toFiniteNumber(point.lng) }))
      .filter((point): point is { lat: number; lng: number } => point.lat != null && point.lng != null);

    if (!coords.length) return null;
    return [
      coords.reduce((sum, point) => sum + point.lng, 0) / coords.length,
      coords.reduce((sum, point) => sum + point.lat, 0) / coords.length,
    ];
  }

  return null;
};

const getFencePointCount = (fence: GeofenceRecord) => {
  if (!Array.isArray(fence.polygon_points)) return 0;
  return fence.polygon_points.length;
};

const geofenceSourceId = "geofence-management-source";
const geofenceFillLayerId = "geofence-management-fill";
const geofenceOutlineLayerId = "geofence-management-outline";
const geofenceLabelLayerId = "geofence-management-label";
const draftSourceId = "geofence-draft-source";
const draftFillLayerId = "geofence-draft-fill";
const draftLineLayerId = "geofence-draft-line";
const draftPointLayerId = "geofence-draft-points";

const Geofencing = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const mapRef = useRef<maplibregl.Map | null>(null);
  const geofenceMarkersRef = useRef<maplibregl.Marker[]>([]);
  const draftPolygonRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const hasInitialFitRef = useRef(false);

  const [mapToken, setMapToken] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [mapPalette, setMapPalette] = useState<MapPalette>(defaultPalette);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<GeometryType | null>(null);
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [activeTab, setActiveTab] = useState<"zones" | "events">("zones");
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "customer_site",
    geometry_type: "circle" as GeometryType,
    center_lat: null as number | null,
    center_lng: null as number | null,
    radius_meters: 500,
    polygon_points: [] as Array<{ lat: number; lng: number }>,
    enable_entry_alarm: true,
    enable_exit_alarm: true,
    color: defaultPalette.primary,
    dispatch_policy: "neutral" as DispatchPolicy,
  });

  useEffect(() => {
    setMapToken(sessionStorage.getItem("mapbox_token") || envToken || "");
  }, [envToken]);

  useEffect(() => {
    const updatePalette = () => setMapPalette(readMapPalette());
    updatePalette();

    const observer = new MutationObserver(updatePalette);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);

  const colorChoices = useMemo(
    () => [
      { label: "Primary", value: mapPalette.primary, className: "bg-primary" },
      { label: "Success", value: mapPalette.success, className: "bg-success" },
      { label: "Warning", value: mapPalette.warning, className: "bg-warning" },
      { label: "Secondary", value: readCssHsl("--secondary", "hsl(202 100% 37%)"), className: "bg-secondary" },
      { label: "Destructive", value: mapPalette.destructive, className: "bg-destructive" },
      { label: "Muted", value: mapPalette.muted, className: "bg-muted" },
    ],
    [mapPalette]
  );

  const { data: geofences, isLoading, error: geofencesError } = useQuery({
    queryKey: ["geofences", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofences")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: recentEvents } = useQuery({
    queryKey: ["geofence-events-stats", organizationId],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("geofence_events")
        .select("*")
        .eq("organization_id", organizationId!)
        .gte("event_time", today);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const visibleGeofences = useMemo(() => ((geofences || []) as unknown as GeofenceRecord[]), [geofences]);

  const filteredGeofences = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return visibleGeofences;
    return visibleGeofences.filter((fence) => {
      const category = categoryLabels[fence.category || ""] || fence.category || "";
      return `${fence.name} ${category} ${fence.geometry_type}`.toLowerCase().includes(term);
    });
  }, [searchTerm, visibleGeofences]);

  const selectedFence = visibleGeofences.find((fence) => fence.id === selectedGeofenceId) || null;

  const geofenceStats = useMemo(() => {
    const prefer = visibleGeofences.filter((fence) => normalizePolicy(fence.dispatch_policy) === "prefer").length;
    const avoid = visibleGeofences.filter((fence) => normalizePolicy(fence.dispatch_policy) === "avoid").length;
    return {
      total: visibleGeofences.length,
      active: visibleGeofences.filter((fence) => fence.is_active !== false).length,
      prefer,
      avoid,
      eventsToday: recentEvents?.length || 0,
      entryEvents: recentEvents?.filter((event) => event.event_type === "enter").length || 0,
      exitEvents: recentEvents?.filter((event) => event.event_type === "exit").length || 0,
    };
  }, [recentEvents, visibleGeofences]);

  const getFenceRenderColor = useCallback(
    (fence: GeofenceRecord) => {
      const policy = normalizePolicy(fence.dispatch_policy);
      if (policy === "prefer") return mapPalette.success;
      if (policy === "avoid") return mapPalette.warning;
      return fence.color || mapPalette.primary;
    },
    [mapPalette]
  );

  const clearDraftPolygon = useCallback(() => {
    draftPolygonRef.current = [];
    setDraftPolygonPoints([]);
    const map = mapRef.current;
    if (!map) return;

    [draftPointLayerId, draftLineLayerId, draftFillLayerId].forEach((id) => {
      try {
        if (map.getLayer(id)) map.removeLayer(id);
      } catch {}
    });

    try {
      if (map.getSource(draftSourceId)) map.removeSource(draftSourceId);
    } catch {}
  }, []);

  const updateDraftPolygon = useCallback((points: Array<{ lat: number; lng: number }>) => {
    const map = mapRef.current;
    if (!map) return;

    const lineCoords = points.map((point) => [point.lng, point.lat]);
    const polygonCoords = points.length >= 3 ? [[...lineCoords, lineCoords[0]]] : [];
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        ...(polygonCoords.length
          ? [{ type: "Feature" as const, properties: { kind: "fill" }, geometry: { type: "Polygon" as const, coordinates: polygonCoords } }]
          : []),
        ...(lineCoords.length >= 2
          ? [{ type: "Feature" as const, properties: { kind: "line" }, geometry: { type: "LineString" as const, coordinates: lineCoords } }]
          : []),
        ...lineCoords.map((coord, index) => ({
          type: "Feature" as const,
          properties: { kind: "point", index: index + 1 },
          geometry: { type: "Point" as const, coordinates: coord },
        })),
      ],
    };

    if (map.getSource(draftSourceId)) {
      (map.getSource(draftSourceId) as maplibregl.GeoJSONSource).setData(data);
      return;
    }

    map.addSource(draftSourceId, { type: "geojson", data });
    map.addLayer({
      id: draftFillLayerId,
      type: "fill",
      source: draftSourceId,
      filter: ["==", ["get", "kind"], "fill"],
      paint: { "fill-color": mapPalette.primary, "fill-opacity": 0.18 },
    } as any);
    map.addLayer({
      id: draftLineLayerId,
      type: "line",
      source: draftSourceId,
      filter: ["==", ["get", "kind"], "line"],
      paint: { "line-color": mapPalette.primary, "line-width": 3, "line-dasharray": [2, 1] },
    } as any);
    map.addLayer({
      id: draftPointLayerId,
      type: "circle",
      source: draftSourceId,
      filter: ["==", ["get", "kind"], "point"],
      paint: { "circle-color": mapPalette.primary, "circle-radius": 5, "circle-stroke-color": mapPalette.card, "circle-stroke-width": 2 },
    } as any);
  }, [mapPalette]);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    mapRef.current = map;
    setMapReady(true);
    setTimeout(() => {
      try {
        map.resize();
      } catch {}
    }, 100);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearDraftPolygon();
    map.getCanvas().style.cursor = drawingMode ? "crosshair" : "";

    if (drawingMode === "circle") {
      const handleMapClick = (event: maplibregl.MapMouseEvent) => {
        setFormData((prev) => ({
          ...prev,
          center_lat: event.lngLat.lat,
          center_lng: event.lngLat.lng,
          geometry_type: "circle",
        }));
        setIsCreateDialogOpen(true);
        setDrawingMode(null);
        map.off("click", handleMapClick);
      };

      map.on("click", handleMapClick);
      return () => {
        map.off("click", handleMapClick);
        map.getCanvas().style.cursor = "";
      };
    }

    if (drawingMode === "polygon") {
      const handleMapClick = (event: maplibregl.MapMouseEvent) => {
        const next = [...draftPolygonRef.current, { lat: event.lngLat.lat, lng: event.lngLat.lng }];
        draftPolygonRef.current = next;
        setDraftPolygonPoints(next);
        updateDraftPolygon(next);
      };

      const handleDoubleClick = (event: maplibregl.MapMouseEvent) => {
        event.preventDefault();
        const points = draftPolygonRef.current;
        if (points.length < 3) {
          toast({ title: "Add at least 3 points", variant: "destructive" });
          return;
        }
        setFormData((prev) => ({ ...prev, polygon_points: points, geometry_type: "polygon" }));
        setIsCreateDialogOpen(true);
        setDrawingMode(null);
      };

      map.doubleClickZoom.disable();
      map.on("click", handleMapClick);
      map.on("dblclick", handleDoubleClick);
      return () => {
        map.off("click", handleMapClick);
        map.off("dblclick", handleDoubleClick);
        map.doubleClickZoom.enable();
        map.getCanvas().style.cursor = "";
      };
    }
  }, [clearDraftPolygon, drawingMode, toast, updateDraftPolygon]);

  const focusFenceOnMap = useCallback((fence: GeofenceRecord, openPanel = true) => {
    const map = mapRef.current;
    if (!map) return;

    setSelectedGeofenceId(fence.id);
    if (openPanel) setPanelOpen(true);

    const bounds = getFenceBounds(fence);
    const center = getFenceCenter(fence);
    if (bounds) {
      map.fitBounds(bounds, { padding: 110, maxZoom: 17, duration: 650 });
      return;
    }
    if (center) map.flyTo({ center, zoom: 17, duration: 650 });
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;

    const cleanup = () => {
      geofenceMarkersRef.current.forEach((marker) => marker.remove());
      geofenceMarkersRef.current = [];

      [geofenceLabelLayerId, geofenceOutlineLayerId, geofenceFillLayerId].forEach((id) => {
        try {
          if (map.getLayer(id)) map.removeLayer(id);
        } catch {}
      });

      try {
        if (map.getSource(geofenceSourceId)) map.removeSource(geofenceSourceId);
      } catch {}
    };

    const renderGeofences = () => {
      if (cancelled || !map.isStyleLoaded()) return;
      cleanup();

      const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
      const allBounds = new maplibregl.LngLatBounds();
      let hasBounds = false;

      visibleGeofences.forEach((fence) => {
        const feature = buildFenceFeature(fence);
        const center = getFenceCenter(fence);
        const policy = normalizePolicy(fence.dispatch_policy);
        const color = getFenceRenderColor(fence);
        if (!feature) return;

        feature.properties = {
          id: fence.id,
          name: fence.name,
          policy,
          active: fence.is_active !== false,
          selected: fence.id === selectedGeofenceId,
          color,
        };
        features.push(feature);

        feature.geometry.coordinates[0].forEach((coord) => {
          allBounds.extend(coord as [number, number]);
          hasBounds = true;
        });

        if (center) {
          const PolicyIcon = policyMeta[policy].icon;
          const markerEl = document.createElement("button");
          markerEl.type = "button";
          markerEl.className = cn("geofence-map-marker", fence.id === selectedGeofenceId && "is-selected");
          markerEl.style.setProperty("--geofence-color", color);
          markerEl.innerHTML = `<span class="geofence-map-marker-dot"></span><span class="geofence-map-marker-label"></span>`;
          const labelEl = markerEl.querySelector(".geofence-map-marker-label");
          if (labelEl) labelEl.textContent = fence.name;
          markerEl.setAttribute("aria-label", `Focus ${fence.name}`);
          markerEl.addEventListener("click", (event) => {
            event.stopPropagation();
            focusFenceOnMap(fence);
          });
          markerEl.title = `${PolicyIcon.displayName || policyMeta[policy].shortLabel}: ${fence.name}`;
          geofenceMarkersRef.current.push(new maplibregl.Marker({ element: markerEl, anchor: "bottom" }).setLngLat(center).addTo(map));
        }
      });

      const collection: GeoJSON.FeatureCollection<GeoJSON.Polygon> = { type: "FeatureCollection", features };
      map.addSource(geofenceSourceId, { type: "geojson", data: collection });
      map.addLayer({
        id: geofenceFillLayerId,
        type: "fill",
        source: geofenceSourceId,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["==", ["get", "active"], false], 0.08, ["==", ["get", "selected"], true], 0.38, 0.22],
        },
      } as any);
      map.addLayer({
        id: geofenceOutlineLayerId,
        type: "line",
        source: geofenceSourceId,
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "selected"], true], 5, ["==", ["get", "policy"], "avoid"], 4, 3],
          "line-opacity": ["case", ["==", ["get", "active"], false], 0.45, 1],
        },
      } as any);
      map.addLayer({
        id: geofenceLabelLayerId,
        type: "symbol",
        source: geofenceSourceId,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 0.3],
          "text-anchor": "center",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": mapPalette.foreground,
          "text-halo-color": mapPalette.card,
          "text-halo-width": 2,
        },
      } as any);

      if (hasBounds && !allBounds.isEmpty() && !hasInitialFitRef.current) {
        hasInitialFitRef.current = true;
        map.fitBounds(allBounds, { padding: 90, maxZoom: 14, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) {
      renderGeofences();
    } else {
      map.once("style.load", renderGeofences);
    }

    return () => {
      cancelled = true;
      try {
        map.off("style.load", renderGeofences);
      } catch {}
      cleanup();
    };
  }, [focusFenceOnMap, getFenceRenderColor, mapPalette, mapReady, selectedGeofenceId, visibleGeofences]);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      category: "customer_site",
      geometry_type: "circle",
      center_lat: null,
      center_lng: null,
      radius_meters: 500,
      polygon_points: [],
      enable_entry_alarm: true,
      enable_exit_alarm: true,
      color: mapPalette.primary,
      dispatch_policy: "neutral",
    });
    setDrawingMode(null);
    setIsEditMode(false);
    setEditingGeofenceId(null);
    clearDraftPolygon();
  }, [clearDraftPolygon, mapPalette.primary]);

  const createGeofenceMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("geofences").insert({ organization_id: organizationId, ...data });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      toast({ title: "Geofence created" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => friendlyToastError(error),
  });

  const updateGeofenceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("geofences").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      toast({ title: "Geofence updated" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => friendlyToastError(error),
  });

  const deleteGeofenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("geofences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      setSelectedGeofenceId(null);
      toast({ title: "Geofence deleted" });
    },
    onError: (error: any) => friendlyToastError(error),
  });

  const toggleGeofenceActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("geofences").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["geofences"] }),
    onError: (error: any) => friendlyToastError(error),
  });

  const updateDispatchPolicy = useMutation({
    mutationFn: async ({ id, policy }: { id: string; policy: DispatchPolicy }) => {
      const { error } = await supabase.from("geofences").update({ dispatch_policy: policy }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      queryClient.invalidateQueries({ queryKey: ["merged-trip-geofences"] });
      toast({ title: "Dispatch policy updated" });
    },
    onError: (error: any) => friendlyToastError(error, { title: "Could not update policy" }),
  });

  const handleEditGeofence = (fence: GeofenceRecord) => {
    const category = fence.category || "customer_site";
    setFormData({
      name: fence.name || "",
      category,
      geometry_type: (fence.geometry_type as GeometryType) || "circle",
      center_lat: toFiniteNumber(fence.center_lat),
      center_lng: toFiniteNumber(fence.center_lng),
      radius_meters: toFiniteNumber(fence.radius_meters) || 500,
      polygon_points: Array.isArray(fence.polygon_points) ? (fence.polygon_points as Array<{ lat: number; lng: number }>) : [],
      enable_entry_alarm: fence.enable_entry_alarm ?? true,
      enable_exit_alarm: fence.enable_exit_alarm ?? true,
      color: fence.color || mapPalette.primary,
      dispatch_policy: normalizePolicy(fence.dispatch_policy) || getCategoryDefaultPolicy(category),
    });
    setEditingGeofenceId(fence.id);
    setIsEditMode(true);
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Please enter a geofence name", variant: "destructive" });
      return;
    }

    if (formData.geometry_type === "circle" && (formData.center_lat == null || formData.center_lng == null)) {
      toast({ title: "Click the map to set the circle center", variant: "destructive" });
      return;
    }

    if (formData.geometry_type === "polygon" && formData.polygon_points.length < 3) {
      toast({ title: "Draw at least 3 polygon points", variant: "destructive" });
      return;
    }

    const geofenceData = {
      name: formData.name.trim(),
      category: formData.category,
      geometry_type: formData.geometry_type,
      center_lat: formData.center_lat,
      center_lng: formData.center_lng,
      radius_meters: formData.geometry_type === "circle" ? formData.radius_meters : null,
      polygon_points: formData.geometry_type === "polygon" ? formData.polygon_points : null,
      enable_entry_alarm: formData.enable_entry_alarm,
      enable_exit_alarm: formData.enable_exit_alarm,
      color: formData.color,
      dispatch_policy: formData.dispatch_policy,
    };

    if (isEditMode && editingGeofenceId) {
      updateGeofenceMutation.mutate({ id: editingGeofenceId, data: geofenceData });
    } else {
      createGeofenceMutation.mutate(geofenceData);
    }
  };

  const startDrawing = (mode: GeometryType) => {
    setPanelOpen(false);
    setDrawingMode((current) => (current === mode ? null : mode));
  };

  const renderStat = (label: string, value: number, className?: string) => (
    <div className="min-w-0 rounded-md border border-border bg-card/80 px-3 py-2">
      <div className={cn("text-lg font-bold leading-none", className || "text-foreground")}>{value}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );

  const renderPolicyBadge = (policy: DispatchPolicy) => {
    const meta = policyMeta[policy];
    const Icon = meta.icon;
    return (
      <Badge variant="outline" className={cn("h-6 gap-1 px-2 text-[11px]", meta.className)}>
        <Icon className="h-3 w-3" />
        {meta.shortLabel}
      </Badge>
    );
  };

  const renderZoneCard = (fence: GeofenceRecord) => {
    const policy = normalizePolicy(fence.dispatch_policy);
    const isSelected = fence.id === selectedGeofenceId;
    const active = fence.is_active !== false;
    const category = categoryLabels[fence.category || ""] || fence.category || "Uncategorized";

    return (
      <div
        key={fence.id}
        className={cn(
          "overflow-hidden rounded-md border bg-card transition-colors",
          isSelected ? "border-primary shadow-elevated" : "border-border hover:bg-muted/30"
        )}
      >
        <button type="button" className="flex w-full items-start gap-3 p-3 text-left" onClick={() => focusFenceOnMap(fence)}>
          <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-card shadow-sm" style={{ backgroundColor: getFenceRenderColor(fence) }} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{fence.name}</span>
              {!active && <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">Off</Badge>}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{category}</span>
              <span>•</span>
              <span>{fence.geometry_type === "circle" ? `${Number(fence.radius_meters || 0).toLocaleString()} m radius` : `${getFencePointCount(fence)} point polygon`}</span>
            </span>
          </span>
          {renderPolicyBadge(policy)}
        </button>

        <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-[1fr_auto]">
          <Select value={policy} onValueChange={(value) => updateDispatchPolicy.mutate({ id: fence.id, policy: value as DispatchPolicy })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prefer">Prefer for dispatch</SelectItem>
              <SelectItem value="avoid">Avoid for dispatch</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => toggleGeofenceActive.mutate({ id: fence.id, isActive: !active })}
                >
                  {active ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{active ? "Disable geofence" : "Enable geofence"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleEditGeofence(fence)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("geofencing.editGeofence", "Edit geofence")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => deleteGeofenceMutation.mutate(fence.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("geofencing.deleteGeofence", "Delete geofence")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  const renderZonePanel = (mode: "aside" | "overlay") => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              Zone management
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Dispatch rules, alerts, and geofence visibility.</p>
          </div>
          {mode === "overlay" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {renderStat("Total", geofenceStats.total)}
          {renderStat("Active", geofenceStats.active, "text-primary")}
          {renderStat("Prefer", geofenceStats.prefer, "text-success")}
          {renderStat("Avoid", geofenceStats.avoid, "text-warning")}
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search zones"
            className="h-10 pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "zones" | "events")} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border px-4 pt-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="zones" className="gap-2"><ListChecks className="h-4 w-4" />Zones</TabsTrigger>
            <TabsTrigger value="events" className="gap-2"><BellRing className="h-4 w-4" />Events</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="zones" className="min-h-0 flex-1 overflow-auto p-4 data-[state=inactive]:hidden">
          {!organizationId ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning">Organization context is loading.</div>
          ) : geofencesError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Could not load geofences</div>
              <p className="mt-1 text-xs opacity-90">{(geofencesError as Error).message}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : filteredGeofences.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
              <div className="font-semibold text-foreground">No zones found</div>
              <p className="mt-1 text-sm text-muted-foreground">Create a circle or polygon from the map toolbar.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">{filteredGeofences.map(renderZoneCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="events" className="min-h-0 flex-1 overflow-auto p-4 data-[state=inactive]:hidden">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {renderStat("Today", geofenceStats.eventsToday)}
            {renderStat("Entry", geofenceStats.entryEvents, "text-success")}
            {renderStat("Exit", geofenceStats.exitEvents, "text-warning")}
          </div>
          <GeofenceEventsTab />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <Layout>
      <TooltipProvider>
        <div className="geofencing-shell flex h-[calc(100dvh-3.5rem)] min-h-[520px] flex-col overflow-hidden bg-background md:h-[calc(100dvh-3rem)]">
          <header className="shrink-0 border-b border-border bg-card/95 px-3 py-3 backdrop-blur md:px-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">{t("geofencing.title", "Geofences")}</h1>
                  <Badge variant="outline" className="gap-1"><Navigation className="h-3.5 w-3.5" />Map-first workspace</Badge>
                  {selectedFence && <Badge variant="secondary" className="max-w-[220px] truncate">Selected: {selectedFence.name}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Create zones, define dispatch policy, and monitor entry/exit activity.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="grid grid-cols-4 gap-2 text-left sm:flex">
                  {renderStat("Zones", geofenceStats.total)}
                  {renderStat("Active", geofenceStats.active, "text-primary")}
                  {renderStat("Prefer", geofenceStats.prefer, "text-success")}
                  {renderStat("Avoid", geofenceStats.avoid, "text-warning")}
                </div>

                <div className="flex rounded-md border border-border bg-muted/50 p-1">
                  <Button
                    variant={drawingMode === "circle" ? "default" : "ghost"}
                    size="sm"
                    className="h-9 gap-2"
                    onClick={() => startDrawing("circle")}
                  >
                    <Circle className="h-4 w-4" />
                    Circle
                  </Button>
                  <Button
                    variant={drawingMode === "polygon" ? "default" : "ghost"}
                    size="sm"
                    className="h-9 gap-2"
                    onClick={() => startDrawing("polygon")}
                  >
                    <Square className="h-4 w-4" />
                    Polygon
                  </Button>
                </div>

                <Button variant="outline" size="sm" className="h-10 gap-2" onClick={() => setPanelOpen((open) => !open)}>
                  {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  Zones
                </Button>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main className="relative min-w-0 flex-1 bg-muted/30">
              <LiveTrackingMap
                vehicles={[]}
                token={mapToken || envToken}
                onMapReady={handleMapReady}
                autoLocate={false}
                mapStyle="streets"
              />

              {(!envToken && !mapToken) && (
                <div className="absolute right-3 top-3 z-30 w-80 max-w-[calc(100%-1.5rem)] rounded-md border border-border bg-card/95 p-4 shadow-floating backdrop-blur">
                  <div className="text-sm font-semibold text-foreground">Add Mapbox token</div>
                  <Input className="mt-2" placeholder="pk.eyJ..." value={mapToken} onChange={(event) => setMapToken(event.target.value)} />
                  <Button size="sm" className="mt-2" onClick={() => { sessionStorage.setItem("mapbox_token", mapToken); window.location.reload(); }}>Save</Button>
                </div>
              )}

              {drawingMode && (
                <div className="absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-md border border-primary/40 bg-card/95 px-3 py-2 text-sm font-medium text-foreground shadow-floating backdrop-blur">
                  {drawingMode === "circle" ? <Circle className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-primary" />}
                  <span className="truncate">
                    {drawingMode === "circle"
                      ? "Click the map to place the circle center"
                      : `Click points, then double-click to finish${draftPolygonPoints.length ? ` • ${draftPolygonPoints.length} points` : ""}`}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDrawingMode(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-md border border-border bg-card/95 px-2.5 py-2 text-[11px] shadow-elevated backdrop-blur">
                <span className="font-semibold text-foreground">Policy</span>
                <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3 text-success" />Prefer</Badge>
                <Badge variant="outline" className="gap-1 text-[10px]"><Ban className="h-3 w-3 text-warning" />Avoid</Badge>
                <Badge variant="outline" className="gap-1 text-[10px]"><Route className="h-3 w-3" />Neutral</Badge>
              </div>

              {panelOpen && (
                <section className="absolute inset-x-3 bottom-14 z-20 flex max-h-[46%] min-h-[220px] flex-col overflow-hidden rounded-lg border border-border bg-card/95 shadow-floating backdrop-blur 2xl:hidden">
                  {renderZonePanel("overlay")}
                </section>
              )}
            </main>

            {panelOpen && (
              <aside className="hidden w-[390px] shrink-0 flex-col border-l border-border bg-card 2xl:flex">
                {renderZonePanel("aside")}
              </aside>
            )}
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? t("geofencing.editGeofence", "Edit geofence") : t("geofencing.addGeofence", "Add geofence")}</DialogTitle>
              <DialogDescription>
                {formData.geometry_type === "circle"
                  ? formData.center_lat != null && formData.center_lng != null
                    ? `Circle center: ${formData.center_lat.toFixed(5)}, ${formData.center_lng.toFixed(5)}`
                    : "Circle zone"
                  : `Polygon zone with ${formData.polygon_points.length} points`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">{t("common.name", "Name")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="e.g., Main Warehouse"
                    autoFocus
                  />
                </div>

                <div>
                  <Label>{t("common.category", "Category")}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value, dispatch_policy: getCategoryDefaultPolicy(value) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer_site">Customer Site</SelectItem>
                      <SelectItem value="depot">{t("geofencing.depot", "Depot")}</SelectItem>
                      <SelectItem value="no_go_zone">No-Go Zone</SelectItem>
                      <SelectItem value="speed_zone">Speed Zone</SelectItem>
                      <SelectItem value="parking">Parking Area</SelectItem>
                      <SelectItem value="service_area">Service Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dispatch rule</Label>
                  <Select value={formData.dispatch_policy} onValueChange={(value) => setFormData({ ...formData, dispatch_policy: value as DispatchPolicy })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prefer">Prefer routes through this zone</SelectItem>
                      <SelectItem value="avoid">Avoid routes through this zone</SelectItem>
                      <SelectItem value="neutral">No dispatch preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.geometry_type === "circle" && (
                <div>
                  <Label>Radius (meters)</Label>
                  <Input
                    type="number"
                    min={25}
                    value={formData.radius_meters}
                    onChange={(event) => setFormData({ ...formData, radius_meters: Math.max(25, parseInt(event.target.value, 10) || 500) })}
                  />
                </div>
              )}

              <div>
                <Label>{t("common.color", "Color")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorChoices.map((choice) => (
                    <button
                      key={choice.label}
                      type="button"
                      className={cn(
                        "h-9 w-9 rounded-full border-2 border-card ring-offset-background transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        choice.className,
                        formData.color === choice.value && "ring-2 ring-ring ring-offset-2"
                      )}
                      onClick={() => setFormData({ ...formData, color: choice.value })}
                      aria-label={choice.label}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="mb-3 text-sm font-semibold text-foreground">Monitoring</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">Entry alert</span>
                    <Switch checked={formData.enable_entry_alarm} onCheckedChange={(checked) => setFormData({ ...formData, enable_entry_alarm: checked })} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">Exit alert</span>
                    <Switch checked={formData.enable_exit_alarm} onCheckedChange={(checked) => setFormData({ ...formData, enable_exit_alarm: checked })} />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t("common.cancel", "Cancel")}</Button>
              <Button onClick={handleSubmit} disabled={createGeofenceMutation.isPending || updateGeofenceMutation.isPending}>
                <Check className="mr-1 h-4 w-4" />
                {isEditMode ? t("common.update", "Update") : t("common.create", "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </Layout>
  );
};

export default Geofencing;
