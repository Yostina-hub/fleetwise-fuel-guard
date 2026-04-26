import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import maplibregl from 'maplibre-gl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Trash2, 
  Edit, 
  Circle,
  Square,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Route,
  Ban,
  Building2,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import GeofenceEventsTab from "@/components/geofencing/GeofenceEventsTab";
import { startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
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

const policyMeta: Record<DispatchPolicy, { label: string; icon: typeof ShieldCheck; className: string }> = {
  prefer: { label: "Prefer", icon: ShieldCheck, className: "border-success/40 bg-success/10 text-success" },
  avoid: { label: "Avoid", icon: Ban, className: "border-warning/40 bg-warning/10 text-warning" },
  neutral: { label: "Neutral", icon: Route, className: "border-border bg-muted text-muted-foreground" },
};

const categoryDefaultPolicy: Record<string, DispatchPolicy> = {
  depot: "prefer",
  parking: "prefer",
  service_area: "prefer",
  no_go_zone: "avoid",
  speed_zone: "avoid",
  customer_site: "neutral",
};

const getCategoryDefaultPolicy = (category: string): DispatchPolicy =>
  categoryDefaultPolicy[category] || "neutral";

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

    const points = 96;
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
      properties: { name: fence.name, policy: fence.dispatch_policy || "neutral" },
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  }

  if (fence.geometry_type === "polygon" && Array.isArray(fence.polygon_points) && fence.polygon_points.length >= 3) {
    const coords = (fence.polygon_points as Array<{ lat: number | string; lng: number | string }>)
      .map((p) => [toFiniteNumber(p.lng), toFiniteNumber(p.lat)] as const)
      .filter((p): p is readonly [number, number] => p[0] != null && p[1] != null)
      .map(([lng, lat]) => [lng, lat]);
    if (coords.length < 3) return null;
    coords.push(coords[0]);
    return {
      type: "Feature",
      properties: { name: fence.name, policy: fence.dispatch_policy || "neutral" },
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
      .map((p) => ({ lat: toFiniteNumber(p.lat), lng: toFiniteNumber(p.lng) }))
      .filter((p): p is { lat: number; lng: number } => p.lat != null && p.lng != null);
    if (coords.length === 0) return null;
    return [
      coords.reduce((sum, p) => sum + p.lng, 0) / coords.length,
      coords.reduce((sum, p) => sum + p.lat, 0) / coords.length,
    ];
  }

  return null;
};

const draftSourceId = "geofence-draft-source";
const draftFillLayerId = "geofence-draft-fill";
const draftLineLayerId = "geofence-draft-line";
const draftPointLayerId = "geofence-draft-points";

const Geofencing = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<'circle' | 'polygon' | null>(null);
  const [mapToken, setMapToken] = useState<string>("");
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geofenceLayersRef = useRef<string[]>([]);
  const geofenceMarkersRef = useRef<maplibregl.Marker[]>([]);
  const draftPolygonRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [mapReady, setMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"geofences" | "events">("geofences");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  
  useEffect(() => {
    const token = sessionStorage.getItem('mapbox_token') || envToken || '';
    setMapToken(token);
  }, [envToken]);

  // Simple form state - only essential fields
  const [formData, setFormData] = useState({
    name: "",
    category: "customer_site",
      geometry_type: "circle" as "circle" | "polygon",
    center_lat: null as number | null,
    center_lng: null as number | null,
    radius_meters: 500,
    polygon_points: [] as Array<{lat: number, lng: number}>,
    enable_entry_alarm: true,
    enable_exit_alarm: true,
      color: "#3B82F6",
    dispatch_policy: "neutral" as DispatchPolicy,
  });

  const { data: geofences, isLoading } = useQuery({
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

  // Fetch recent geofence events for stats
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

  // Calculate stats
  const geofenceStats = {
    totalGeofences: geofences?.length || 0,
    activeGeofences: geofences?.filter(g => g.is_active !== false).length || 0,
    eventsToday: recentEvents?.length || 0,
    entryEvents: recentEvents?.filter(e => e.event_type === 'enter').length || 0,
    exitEvents: recentEvents?.filter(e => e.event_type === 'exit').length || 0,
    dwellAlerts: recentEvents?.filter(e => e.event_type === 'dwell_exceeded').length || 0,
  };

  const clearDraftPolygon = useCallback(() => {
    draftPolygonRef.current = [];
    setDraftPolygonPoints([]);
    const map = mapRef.current;
    if (!map) return;
    [draftPointLayerId, draftLineLayerId, draftFillLayerId].forEach((id) => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
    });
    try { if (map.getSource(draftSourceId)) map.removeSource(draftSourceId); } catch {}
  }, []);

  const updateDraftPolygon = useCallback((points: Array<{ lat: number; lng: number }>) => {
    const map = mapRef.current;
    if (!map) return;
    const lineCoords = points.map((p) => [p.lng, p.lat]);
    const polygonCoords = points.length >= 3 ? [[...lineCoords, lineCoords[0]]] : [];
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        ...(polygonCoords.length ? [{ type: "Feature" as const, properties: { kind: "fill" }, geometry: { type: "Polygon" as const, coordinates: polygonCoords } }] : []),
        ...(lineCoords.length >= 2 ? [{ type: "Feature" as const, properties: { kind: "line" }, geometry: { type: "LineString" as const, coordinates: lineCoords } }] : []),
        ...lineCoords.map((coord, index) => ({ type: "Feature" as const, properties: { kind: "point", index: index + 1 }, geometry: { type: "Point" as const, coordinates: coord } })),
      ],
    };

    if (map.getSource(draftSourceId)) {
      (map.getSource(draftSourceId) as maplibregl.GeoJSONSource).setData(data);
      return;
    }

    map.addSource(draftSourceId, { type: "geojson", data });
    map.addLayer({ id: draftFillLayerId, type: "fill", source: draftSourceId, filter: ["==", ["get", "kind"], "fill"], paint: { "fill-color": "#8DC63F", "fill-opacity": 0.18 } });
    map.addLayer({ id: draftLineLayerId, type: "line", source: draftSourceId, filter: ["==", ["get", "kind"], "line"], paint: { "line-color": "#8DC63F", "line-width": 3, "line-dasharray": [2, 1] } });
    map.addLayer({ id: draftPointLayerId, type: "circle", source: draftSourceId, filter: ["==", ["get", "kind"], "point"], paint: { "circle-color": "#8DC63F", "circle-radius": 5, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
  }, []);

  // Initialize map hooks when ready
  const handleMapReady = (map: maplibregl.Map) => {
    mapRef.current = map;
    setMapReady(true);
  };

  // Handle drawing mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    clearDraftPolygon();
    map.getCanvas().style.cursor = drawingMode ? "crosshair" : "";

    if (drawingMode === 'circle') {
      const handleMapClick = (e: any) => {
        setFormData(prev => ({
          ...prev,
          center_lat: e.lngLat.lat,
          center_lng: e.lngLat.lng,
          geometry_type: 'circle'
        }));
        setIsCreateDialogOpen(true);
        toast({
          title: "✓ Location Selected",
          description: `Center point set at ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`,
        });
        setDrawingMode(null);
        map.off('click', handleMapClick);
      };

      map.on('click', handleMapClick);
      
      return () => {
        map.off('click', handleMapClick);
        map.getCanvas().style.cursor = "";
      };
    } else if (drawingMode === 'polygon') {
      const handleMapClick = (e: any) => {
        const next = [...draftPolygonRef.current, { lat: e.lngLat.lat, lng: e.lngLat.lng }];
        draftPolygonRef.current = next;
        setDraftPolygonPoints(next);
        updateDraftPolygon(next);
      };
      const handleDoubleClick = (e: any) => {
        e.preventDefault();
        const points = draftPolygonRef.current;
        if (points.length < 3) {
          toast({ title: "Add at least 3 points", variant: "destructive" });
          return;
        }
        setFormData((prev) => ({ ...prev, polygon_points: points, geometry_type: "polygon" }));
        setIsCreateDialogOpen(true);
        toast({ title: "✓ Area Selected", description: `Polygon with ${points.length} points captured.` });
        setDrawingMode(null);
      };
      map.doubleClickZoom.disable();
      map.on('click', handleMapClick);
      map.on('dblclick', handleDoubleClick);
      return () => {
        map.off('click', handleMapClick);
        map.off('dblclick', handleDoubleClick);
        map.doubleClickZoom.enable();
        map.getCanvas().style.cursor = "";
      };
    }
  }, [clearDraftPolygon, drawingMode, toast, updateDraftPolygon]);

  const focusFenceOnMap = useCallback((fence: GeofenceRecord) => {
    const bounds = getFenceBounds(fence);
    const center = getFenceCenter(fence);
    if (!mapRef.current) return;
    if (bounds) {
      mapRef.current.fitBounds(bounds, { padding: 130, maxZoom: 18, duration: 600 });
      return;
    }
    if (center) mapRef.current.flyTo({ center, zoom: 17, duration: 600 });
  }, []);

  // Render geofences on map
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geofences) return;
    const map = mapRef.current;

    const renderGeofences = () => {
      // Clean up existing layers first
      geofenceLayersRef.current
        .filter((id) => id.includes("-fill-") || id.includes("-outline-") || id.includes("-label-"))
        .forEach((layerId) => {
          try {
            if (map.getLayer(layerId)) map.removeLayer(layerId);
          } catch (e) { /* ignore */ }
        });
      geofenceLayersRef.current
        .filter((id) => id.startsWith("geofence-source-"))
        .forEach((sourceId) => {
          try {
            if (map.getSource(sourceId)) map.removeSource(sourceId);
          } catch (e) { /* ignore */ }
        });
      geofenceLayersRef.current = [];
      geofenceMarkersRef.current.forEach((marker) => marker.remove());
      geofenceMarkersRef.current = [];

      const allBounds = new maplibregl.LngLatBounds();
      let hasBounds = false;

      (geofences as GeofenceRecord[]).forEach((fence) => {
        const sourceId = `geofence-source-${fence.id}`;
        const fillLayerId = `geofence-fill-${fence.id}`;
        const outlineLayerId = `geofence-outline-${fence.id}`;
        const labelLayerId = `geofence-label-${fence.id}`;
        const color = fence.color || '#3B82F6';
        const geojsonData = buildFenceFeature(fence);
        const center = getFenceCenter(fence);
        if (!geojsonData) return;
        geojsonData.geometry.coordinates[0].forEach((coord) => {
          allBounds.extend(coord as [number, number]);
          hasBounds = true;
        });

        try {
          map.addSource(sourceId, { type: 'geojson', data: geojsonData });

          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': color,
              'fill-opacity': fence.is_active === false ? 0.08 : 0.28
            }
          });

          map.addLayer({
            id: outlineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': fence.dispatch_policy === 'avoid' ? 4 : 3,
              'line-opacity': fence.is_active === false ? 0.45 : 1
            }
          });

          map.addLayer({
            id: labelLayerId,
            type: 'symbol',
            source: sourceId,
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 12,
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': color,
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
            },
          });

          geofenceLayersRef.current.push(sourceId, fillLayerId, outlineLayerId, labelLayerId);
        } catch (e) {
          console.warn('Failed to add geofence layer:', sourceId, e);
        }

        if (center) {
          const markerEl = document.createElement("button");
          markerEl.type = "button";
          markerEl.className = "geofence-map-marker";
          markerEl.style.setProperty("--geofence-color", color);
          const dotEl = document.createElement("span");
          dotEl.className = "geofence-map-marker-dot";
          const labelEl = document.createElement("span");
          labelEl.className = "geofence-map-marker-label";
          labelEl.textContent = fence.name;
          markerEl.append(dotEl, labelEl);
          markerEl.addEventListener("click", (event) => {
            event.stopPropagation();
            focusFenceOnMap(fence);
          });
          geofenceMarkersRef.current.push(new maplibregl.Marker({ element: markerEl, anchor: "bottom" }).setLngLat(center).addTo(map));
        }
      });

      if (hasBounds && !allBounds.isEmpty()) {
        map.fitBounds(allBounds, { padding: 120, maxZoom: 15, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) {
      renderGeofences();
    } else {
      map.once('style.load', renderGeofences);
    }
  }, [focusFenceOnMap, geofences, mapReady]);

  const createGeofenceMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("geofences")
        .insert({
          organization_id: organizationId,
          ...data,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      toast({ title: "✓ Geofence Created" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      friendlyToastError(error);
    },
  });

  const updateGeofenceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("geofences")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      toast({ title: "✓ Geofence Updated" });
      setIsCreateDialogOpen(false);
      setIsEditMode(false);
      setEditingGeofenceId(null);
      resetForm();
    },
    onError: (error: any) => {
      friendlyToastError(error);
    },
  });

  const deleteGeofenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("geofences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      toast({ title: "✓ Geofence Deleted" });
    },
  });

  const toggleGeofenceActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("geofences")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
    },
  });

  // Per-zone dispatch policy used by the AI route recommender.
  // 'prefer' nudges routes through the zone, 'avoid' steers around it,
  // 'neutral' (default) leaves the AI to decide on duration/distance alone.
  const updateDispatchPolicy = useMutation({
    mutationFn: async ({ id, policy }: { id: string; policy: "prefer" | "avoid" | "neutral" }) => {
      const { error } = await supabase
        .from("geofences")
        .update({ dispatch_policy: policy })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      // Also invalidate the merged-trip cache so the panel re-fetches the
      // latest policy without a manual reload.
      queryClient.invalidateQueries({ queryKey: ["merged-trip-geofences"] });
      toast({ title: "Dispatch policy updated" });
    },
    onError: (e: any) => friendlyToastError(e, { title: "Could not update policy" }),
  });

  const resetForm = () => {
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
      color: "#3B82F6",
      dispatch_policy: "neutral",
    });
    setDrawingMode(null);
    setIsEditMode(false);
    setEditingGeofenceId(null);
  };

  const handleEditGeofence = (fence: any) => {
    setFormData({
      name: fence.name || "",
      category: fence.category || "customer_site",
      geometry_type: fence.geometry_type || "circle",
      center_lat: fence.center_lat,
      center_lng: fence.center_lng,
      radius_meters: fence.radius_meters || 500,
      polygon_points: fence.polygon_points || [],
      enable_entry_alarm: fence.enable_entry_alarm ?? true,
      enable_exit_alarm: fence.enable_exit_alarm ?? true,
      color: fence.color || "#3B82F6",
      dispatch_policy: (fence.dispatch_policy as DispatchPolicy) || getCategoryDefaultPolicy(fence.category || "customer_site"),
    });
    setEditingGeofenceId(fence.id);
    setIsEditMode(true);
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Please enter a name", variant: "destructive" });
      return;
    }

    if (formData.geometry_type === "circle" && (!formData.center_lat || !formData.center_lng)) {
      toast({ title: "Please click on the map to set location", variant: "destructive" });
      return;
    }

    if (formData.geometry_type === "polygon" && formData.polygon_points.length < 3) {
      toast({ title: "Draw at least 3 points on the map", variant: "destructive" });
      return;
    }

    const geofenceData = {
      name: formData.name,
      category: formData.category,
      geometry_type: formData.geometry_type,
      center_lat: formData.center_lat,
      center_lng: formData.center_lng,
      radius_meters: formData.radius_meters,
      polygon_points: formData.polygon_points.length > 0 ? formData.polygon_points : null,
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

  const categoryLabels: Record<string, string> = {
    customer_site: "Customer",
    depot: "Depot",
    no_go_zone: "No-Go Zone",
    speed_zone: "Speed Zone",
    parking: "Parking",
    service_area: "Service",
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  const visibleGeofences = (geofences || []) as unknown as GeofenceRecord[];
  const preferCount = visibleGeofences.filter((f) => f.dispatch_policy === "prefer").length;
  const avoidCount = visibleGeofences.filter((f) => f.dispatch_policy === "avoid").length;
  const sidebarContent = (
    <>
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{t('geofencing.title')}</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Operational zones for alerts & dispatch.</p>
          </div>
          <Badge variant="secondary" className="shrink-0">{geofenceStats.totalGeofences}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-muted/50 p-2.5">
            <div className="text-lg sm:text-xl font-bold text-primary">{geofenceStats.activeGeofences}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t('common.active')}</div>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/10 p-2.5">
            <div className="text-lg sm:text-xl font-bold text-success">{preferCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Preferred</div>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5">
            <div className="text-lg sm:text-xl font-bold text-warning">{avoidCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Avoided</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="geofences">Zones</TabsTrigger>
            <TabsTrigger value="events">{t('geofencing.events', 'Events')}</TabsTrigger>
          </TabsList>

          <TabsContent value="geofences" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : geofences?.length === 0 ? (
              <Card className="p-8 text-center">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t('geofencing.noGeofences', 'No geofences yet')}</p>
                <p className="text-sm text-muted-foreground/70">
                  {t('geofencing.useDrawingTools', 'Use the drawing tools to create one')}
                </p>
              </Card>
            ) : (
              visibleGeofences.map((fence) => {
                const policy = ((fence.dispatch_policy as DispatchPolicy) || "neutral") as DispatchPolicy;
                const PolicyIcon = policyMeta[policy].icon;
                return (
                <Card key={fence.id} className="overflow-hidden transition-colors hover:bg-muted/40">
                  <button type="button" className="flex w-full items-start gap-3 p-3 sm:p-4 text-left" onClick={() => { focusFenceOnMap(fence); setMobileSheetOpen(false); }}>
                    <span className="mt-1 h-4 w-4 shrink-0 rounded-full border border-border" style={{ backgroundColor: fence.color || '#3B82F6' }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-foreground text-sm sm:text-base">{fence.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]"><Building2 className="h-3 w-3" />{categoryLabels[fence.category || ""] || fence.category}</Badge>
                        <span>{fence.geometry_type === 'circle' ? `${Number(fence.radius_meters || 0).toLocaleString()} m` : 'Polygon'}</span>
                        {fence.is_active === false && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                      </span>
                    </span>
                    <Badge variant="outline" className={`gap-1 shrink-0 ${policyMeta[policy].className}`}>
                      <PolicyIcon className="h-3 w-3" />
                      <span className="hidden sm:inline">{policyMeta[policy].label}</span>
                    </Badge>
                  </button>
                  <div className="flex items-center gap-2 border-t border-border px-3 sm:px-4 py-2.5">
                    <Select
                      value={policy}
                      onValueChange={(v) =>
                        updateDispatchPolicy.mutate({ id: fence.id, policy: v as DispatchPolicy })
                      }
                    >
                      <SelectTrigger className="h-9 flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prefer">Prefer for dispatch</SelectItem>
                        <SelectItem value="avoid">Avoid for dispatch</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                    <TooltipProvider>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleGeofenceActive.mutate({ 
                                id: fence.id, 
                                isActive: !(fence.is_active ?? true) 
                              })}
                            >
                              {fence.is_active !== false ? (
                                <Eye className="h-4 w-4 text-success" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{fence.is_active !== false ? "Disable geofence" : "Enable geofence"}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditGeofence(fence)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('geofencing.editGeofence', 'Edit geofence')}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteGeofenceMutation.mutate(fence.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('geofencing.deleteGeofence', 'Delete geofence')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </Card>
              )})
            )}
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <GeofenceEventsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );

  return (
    <Layout>
      <div className="flex h-full min-h-0 bg-background">
        <div className="relative min-w-0 flex-1">
          <LiveTrackingMap 
            vehicles={[]} 
            token={mapToken || envToken}
            onMapReady={handleMapReady}
            autoLocate={false}
          />

          {(!envToken && !mapToken) && (
            <div className="absolute top-4 right-4 z-10">
              <Card className="p-4 bg-card/95 backdrop-blur space-y-2 w-72 max-w-[calc(100vw-2rem)]">
                <div className="text-sm font-semibold">Add Mapbox Token</div>
                <Input
                  placeholder="pk.eyJ..."
                  value={mapToken}
                  onChange={(e) => setMapToken(e.target.value)}
                />
                <Button size="sm" onClick={() => { sessionStorage.setItem('mapbox_token', mapToken); window.location.reload(); }}>
                  Save
                </Button>
              </Card>
            </div>
          )}

          {/* Compact floating toolbar — top center on mobile, top-left on desktop */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3 sm:justify-start sm:px-4">
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card/95 p-1.5 shadow-floating backdrop-blur">
              <Button
                variant={drawingMode === 'circle' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')}
                className="h-9 gap-1.5 rounded-full px-3"
              >
                <Circle className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{t('geofencing.circle')}</span>
              </Button>
              <Button
                variant={drawingMode === 'polygon' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDrawingMode(drawingMode === 'polygon' ? null : 'polygon')}
                className="h-9 gap-1.5 rounded-full px-3"
              >
                <Square className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{t('geofencing.polygon')}</span>
              </Button>
              {drawingMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground"
                  onClick={() => setDrawingMode(null)}
                  title="Cancel drawing"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {/* Mobile: open sidebar sheet */}
              <div className="mx-1 h-6 w-px bg-border lg:hidden" />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full lg:hidden"
                onClick={() => setMobileSheetOpen(true)}
                title="Open zones list"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
              {/* Desktop: collapse/expand sidebar */}
              <div className="mx-1 hidden h-6 w-px bg-border lg:block" />
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-9 w-9 rounded-full lg:inline-flex"
                onClick={() => setSidebarOpen((v) => !v)}
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Drawing helper hint */}
          {drawingMode && (
            <div className="pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary shadow-floating backdrop-blur">
              {drawingMode === "circle"
                ? "Click on the map to place center point"
                : `Click to add points • Double-click to finish${draftPolygonPoints.length ? ` (${draftPolygonPoints.length} added)` : ""}`}
            </div>
          )}

          {/* Legend — bottom left */}
          <div className="absolute bottom-4 left-3 sm:left-4 z-10 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-[11px] shadow-elevated backdrop-blur max-w-[calc(100vw-1.5rem)]">
            <span className="font-medium text-foreground hidden sm:inline">Zones:</span>
            <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3 text-success" /> prefer</Badge>
            <Badge variant="outline" className="gap-1 text-[10px]"><Ban className="h-3 w-3 text-warning" /> avoid</Badge>
            <Badge variant="outline" className="gap-1 text-[10px] hidden sm:inline-flex"><Navigation className="h-3 w-3" /> tap to focus</Badge>
          </div>
        </div>

        {/* Desktop sidebar — collapsible */}
        {sidebarOpen && (
          <aside className="hidden lg:flex w-[400px] xl:w-[440px] shrink-0 flex-col border-l border-border bg-card">
            {sidebarContent}
          </aside>
        )}

        {/* Mobile / tablet sidebar — sheet */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('geofencing.title')}</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Simplified Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? t('geofencing.editGeofence') : t('geofencing.addGeofence')}</DialogTitle>
            <DialogDescription>
              {formData.geometry_type === 'circle' 
                ? `Circle at ${formData.center_lat?.toFixed(4)}, ${formData.center_lng?.toFixed(4)}`
                : `Polygon with ${formData.polygon_points.length} points`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">{t('common.name', 'Name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Warehouse"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <Label>{t('common.category', 'Category')}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({
                  ...formData,
                  category: value,
                  dispatch_policy: getCategoryDefaultPolicy(value),
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_site">Customer Site</SelectItem>
                  <SelectItem value="depot">{t('geofencing.depot', 'Depot')}</SelectItem>
                  <SelectItem value="no_go_zone">No-Go Zone</SelectItem>
                  <SelectItem value="speed_zone">Speed Zone</SelectItem>
                  <SelectItem value="parking">Parking Area</SelectItem>
                  <SelectItem value="service_area">Service Area</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dispatch rule</Label>
              <Select
                value={formData.dispatch_policy}
                onValueChange={(value) => setFormData({ ...formData, dispatch_policy: value as DispatchPolicy })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefer">Prefer routes through this zone</SelectItem>
                  <SelectItem value="avoid">Avoid routes through this zone</SelectItem>
                  <SelectItem value="neutral">No dispatch preference</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Radius (only for circles) */}
            {formData.geometry_type === 'circle' && (
              <div>
                <Label>Radius (meters)</Label>
                <Input
                  type="number"
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) || 500 })}
                />
              </div>
            )}

            {/* Color */}
            <div>
              <Label>{t('common.color', 'Color')}</Label>
              <div className="flex gap-2 mt-1">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-muted-foreground">Alerts</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Entry alert</span>
                <Switch
                  checked={formData.enable_entry_alarm}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_entry_alarm: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Exit alert</span>
                <Switch
                  checked={formData.enable_exit_alarm}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_exit_alarm: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={createGeofenceMutation.isPending || updateGeofenceMutation.isPending}>
              <Check className="w-4 h-4 mr-1" />
              {isEditMode ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Geofencing;
