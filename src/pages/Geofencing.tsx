import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import mapboxgl from 'mapbox-gl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Plus, 
  Trash2, 
  Edit, 
  Circle,
  Square,
  X,
  Check,
  Eye,
  EyeOff
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import GeofenceEventsTab from "@/components/geofencing/GeofenceEventsTab";
import GeofenceQuickStats from "@/components/geofencing/GeofenceQuickStats";
import { startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";

const Geofencing = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<'circle' | 'polygon' | null>(null);
  const [mapToken, setMapToken] = useState<string>("");
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const geofenceLayersRef = useRef<string[]>([]);
  const [activeTab, setActiveTab] = useState<"geofences" | "events">("geofences");
  
  useEffect(() => {
    const token = localStorage.getItem('mapbox_token') || envToken || '';
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
    entryEvents: recentEvents?.filter(e => e.event_type === 'entry').length || 0,
    exitEvents: recentEvents?.filter(e => e.event_type === 'exit').length || 0,
    dwellAlerts: recentEvents?.filter(e => e.event_type === 'dwell_exceeded').length || 0,
  };

  // Initialize Mapbox Draw when map is ready
  const handleMapReady = (map: mapboxgl.Map) => {
    mapRef.current = map;
    
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
    });
    
    drawRef.current = draw;
    map.addControl(draw);

    map.on('draw.create', (e: any) => {
      const feature = e.features[0];
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0].map((coord: number[]) => ({
          lng: coord[0],
          lat: coord[1]
        }));
        coords.pop();
        setFormData(prev => ({
          ...prev,
          polygon_points: coords,
          geometry_type: 'polygon'
        }));
        setIsCreateDialogOpen(true);
        toast({
          title: "✓ Area Selected",
          description: `Polygon with ${coords.length} points captured.`
        });
      }
      draw.deleteAll();
      setDrawingMode(null);
    });
  };

  // Handle drawing mode changes
  useEffect(() => {
    if (!drawRef.current || !mapRef.current) return;

    drawRef.current.deleteAll();

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
        mapRef.current?.off('click', handleMapClick);
      };

      mapRef.current.on('click', handleMapClick);
      
      return () => {
        mapRef.current?.off('click', handleMapClick);
      };
    } else if (drawingMode === 'polygon') {
      drawRef.current.changeMode('draw_polygon');
    }
  }, [drawingMode, toast]);

  // Render geofences on map
  useEffect(() => {
    if (!mapRef.current || !geofences) return;
    const map = mapRef.current;

    const renderGeofences = () => {
      // Clean up existing layers first
      geofenceLayersRef.current.forEach(layerId => {
        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        } catch (e) { /* ignore */ }
        try {
          if (map.getSource(layerId)) map.removeSource(layerId);
        } catch (e) { /* ignore */ }
      });
      geofenceLayersRef.current = [];

      geofences.forEach((fence: any) => {
        const sourceId = `geofence-${fence.id}`;
        const fillLayerId = `geofence-fill-${fence.id}`;
        const outlineLayerId = `geofence-outline-${fence.id}`;
        const color = fence.color || '#3B82F6';

        // Skip if source already exists
        if (map.getSource(sourceId)) return;

        let geojsonData: GeoJSON.Feature;

        if (fence.geometry_type === 'circle' && fence.center_lat && fence.center_lng) {
          const center = [fence.center_lng, fence.center_lat];
          const radius = fence.radius_meters || 500;
          const points = 64;
          const coords = [];
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const dx = radius * Math.cos(angle);
            const dy = radius * Math.sin(angle);
            const lat = fence.center_lat + (dy / 111320);
            const lng = fence.center_lng + (dx / (111320 * Math.cos(fence.center_lat * Math.PI / 180)));
            coords.push([lng, lat]);
          }
          geojsonData = {
            type: 'Feature',
            properties: { name: fence.name },
            geometry: { type: 'Polygon', coordinates: [coords] }
          };
        } else if (fence.geometry_type === 'polygon' && fence.polygon_points?.length >= 3) {
          const coords = fence.polygon_points.map((p: any) => [p.lng, p.lat]);
          coords.push(coords[0]);
          geojsonData = {
            type: 'Feature',
            properties: { name: fence.name },
            geometry: { type: 'Polygon', coordinates: [coords] }
          };
        } else {
          return;
        }

        try {
          map.addSource(sourceId, { type: 'geojson', data: geojsonData });

          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': color,
              'fill-opacity': 0.2
            }
          });

          map.addLayer({
            id: outlineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': 2
            }
          });

          geofenceLayersRef.current.push(sourceId, fillLayerId, outlineLayerId);
        } catch (e) {
          console.warn('Failed to add geofence layer:', sourceId, e);
        }
      });
    };

    if (map.isStyleLoaded()) {
      renderGeofences();
    } else {
      map.once('style.load', renderGeofences);
    }
  }, [geofences]);

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
                <Button size="sm" onClick={() => { localStorage.setItem('mapbox_token', mapToken); window.location.reload(); }}>
                  Save
                </Button>
              </Card>
            </div>
          )}
          
          {/* Simple Drawing Tools - Floating on map */}
          <Card className="absolute top-4 left-4 bg-card/95 backdrop-blur z-10 shadow-lg">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Create Geofence
              </p>
              <div className="flex gap-2">
                <Button
                  variant={drawingMode === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')}
                  className="gap-1.5"
                >
                  <Circle className="w-4 h-4" />
                  Circle
                </Button>
                <Button
                  variant={drawingMode === 'polygon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawingMode(drawingMode === 'polygon' ? null : 'polygon')}
                  className="gap-1.5"
                >
                  <Square className="w-4 h-4" />
                  Polygon
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
              <h2 className="text-xl font-bold">Geofences</h2>
              <Badge variant="secondary">{geofenceStats.totalGeofences}</Badge>
            </div>

            {/* Quick Stats - Compact */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-primary">{geofenceStats.activeGeofences}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{geofenceStats.entryEvents}</div>
                <div className="text-xs text-muted-foreground">Entries</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{geofenceStats.exitEvents}</div>
                <div className="text-xs text-muted-foreground">Exits</div>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="geofences">Geofences</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
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
                    <p className="text-muted-foreground">No geofences yet</p>
                    <p className="text-sm text-muted-foreground/70">
                      Use the drawing tools to create one
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
                                <p>Edit geofence</p>
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
                                <p>Delete geofence</p>
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
            <DialogTitle>{isEditMode ? 'Edit Geofence' : 'New Geofence'}</DialogTitle>
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
              <Label htmlFor="name">Name *</Label>
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
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_site">Customer Site</SelectItem>
                  <SelectItem value="depot">Depot</SelectItem>
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
              <Label>Color</Label>
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
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createGeofenceMutation.isPending || updateGeofenceMutation.isPending}>
              <Check className="w-4 h-4 mr-1" />
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Geofencing;
