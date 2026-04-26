import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertTriangle,
  Route,
  Crosshair,
  Ban,
  Building2,
  Navigation,
  RotateCcw,
} from "lucide-react";
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
  const draftPolygonRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [mapReady, setMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"geofences" | "events">("geofences");
  
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
    if (!mapRef.current || !bounds) return;
    mapRef.current.fitBounds(bounds, { padding: 90, maxZoom: 16, duration: 600 });
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

      const allBounds = new maplibregl.LngLatBounds();
      let hasBounds = false;

      (geofences as GeofenceRecord[]).forEach((fence) => {
        const sourceId = `geofence-source-${fence.id}`;
        const fillLayerId = `geofence-fill-${fence.id}`;
        const outlineLayerId = `geofence-outline-${fence.id}`;
        const labelLayerId = `geofence-label-${fence.id}`;
        const color = fence.color || '#3B82F6';
        const geojsonData = buildFenceFeature(fence);
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
      });

      if (hasBounds && !allBounds.isEmpty()) {
        map.fitBounds(allBounds, { padding: 80, maxZoom: 13, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) {
      renderGeofences();
    } else {
      map.once('style.load', renderGeofences);
    }
  }, [geofences, mapReady]);

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

  return (
    <Layout>
      <div className="flex h-full">
        {/* Map View - Takes most of the space */}
        <div className="flex-1 relative">
          <LiveTrackingMap 
            vehicles={[]} 
            token={mapToken || envToken}
            onMapReady={handleMapReady}
          />

          {/* Token Prompt */}
          {(!envToken && !mapToken) && (
            <div className="absolute top-4 right-4 z-10">
              <Card className="p-4 bg-card/95 backdrop-blur space-y-2 w-80">
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
          
          {/* Simple Drawing Tools - Floating on map */}
          <Card className="absolute top-4 left-4 bg-card/95 backdrop-blur z-10 shadow-lg">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('geofencing.addGeofence')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant={drawingMode === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')}
                  className="gap-1.5"
                >
                  <Circle className="w-4 h-4" />
                  {t('geofencing.circle')}
                </Button>
                <Button
                  variant={drawingMode === 'polygon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawingMode(drawingMode === 'polygon' ? null : 'polygon')}
                  className="gap-1.5"
                >
                  <Square className="w-4 h-4" />
                  {t('geofencing.polygon')}
                </Button>
              </div>
              {drawingMode && (
                <p className="text-xs text-primary mt-2 animate-pulse">
                  {drawingMode === 'circle' 
                    ? '👆 Click on map to set center' 
                    : '👆 Click points, double-click to finish'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Simplified Side Panel */}
        <div className="w-[400px] border-l border-border bg-card overflow-auto">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t('geofencing.title')}</h2>
              <Badge variant="secondary">{geofenceStats.totalGeofences}</Badge>
            </div>

            {/* Quick Stats - Compact */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-primary">{geofenceStats.activeGeofences}</div>
                <div className="text-xs text-muted-foreground">{t('common.active')}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{geofenceStats.entryEvents}</div>
                <div className="text-xs text-muted-foreground">{t('geofencing.entryAlert')}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{geofenceStats.exitEvents}</div>
                <div className="text-xs text-muted-foreground">{t('geofencing.exitAlert')}</div>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="geofences">{t('geofencing.title')}</TabsTrigger>
                <TabsTrigger value="events">{t('geofencing.events', 'Events')}</TabsTrigger>
              </TabsList>

              <TabsContent value="geofences" className="mt-4 space-y-2">
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
                  geofences?.map((fence: any) => (
                    <Card key={fence.id} className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Color indicator */}
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: fence.color || '#3B82F6' }}
                        />
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{fence.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {categoryLabels[fence.category] || fence.category}
                            </Badge>
                            <span>{fence.geometry_type === 'circle' ? `${fence.radius_meters}m` : 'Polygon'}</span>
                          </div>
                        </div>

                        {/* Dispatch policy — feeds the AI route recommender */}
                        <div className="hidden sm:flex flex-col items-end gap-0.5">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Dispatch</span>
                          <Select
                            value={(fence.dispatch_policy as string) || "neutral"}
                            onValueChange={(v) =>
                              updateDispatchPolicy.mutate({
                                id: fence.id,
                                policy: v as "prefer" | "avoid" | "neutral",
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prefer">
                                <span className="text-emerald-600 font-medium">Prefer</span>
                              </SelectItem>
                              <SelectItem value="avoid">
                                <span className="text-amber-600 font-medium">Avoid</span>
                              </SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Actions */}
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
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
                                    <Eye className="h-4 w-4 text-green-500" />
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
                  ))
                )}
              </TabsContent>

              <TabsContent value="events" className="mt-4">
                <GeofenceEventsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
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
                onValueChange={(value) => setFormData({ ...formData, category: value })}
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
