import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Edit, 
  Circle,
  Square,
  Bell,
  Settings,
  Save,
  History,
  List
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import GeofenceEventsTab from "@/components/geofencing/GeofenceEventsTab";
import ScheduleConfigSection from "@/components/geofencing/ScheduleConfigSection";
import ColorPicker from "@/components/geofencing/ColorPicker";
import GeofenceQuickStats from "@/components/geofencing/GeofenceQuickStats";
import GeofenceQuickActions from "@/components/geofencing/GeofenceQuickActions";
import GeofenceInsightsCard from "@/components/geofencing/GeofenceInsightsCard";
import GeofenceTrendChart from "@/components/geofencing/GeofenceTrendChart";
import { startOfDay, subDays } from "date-fns";

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
  
  useEffect(() => {
    const token = localStorage.getItem('mapbox_token') || envToken || '';
    setMapToken(token);
  }, [envToken]);

  // Initialize Mapbox Draw when map is ready
  const handleMapReady = (map: mapboxgl.Map) => {
    mapRef.current = map;
    
    // Initialize draw control
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      modes: {
        ...MapboxDraw.modes,
      }
    });
    
    drawRef.current = draw;
    map.addControl(draw);

    // Listen for draw events
    map.on('draw.create', (e: any) => {
      const feature = e.features[0];
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0].map((coord: number[]) => ({
          lng: coord[0],
          lat: coord[1]
        }));
        // Remove last point (duplicate of first)
        coords.pop();
        setFormData(prev => ({
          ...prev,
          polygon_points: coords,
          geometry_type: 'polygon'
        }));
        toast({
          title: "Polygon Drawn",
          description: `Captured ${coords.length} points. Open Create dialog to save.`
        });
      }
      draw.deleteAll();
    });
  };

  // Handle drawing mode changes
  useEffect(() => {
    if (!drawRef.current) return;

    // Clear any existing drawings
    drawRef.current.deleteAll();

    if (drawingMode === 'circle') {
      toast({
        title: "Circle Drawing",
        description: "Click on the map to set center, then manually enter radius in the form.",
      });
      
      // For circles, we'll let user click to set center
      const handleMapClick = (e: any) => {
        setFormData(prev => ({
          ...prev,
          center_lat: e.lngLat.lat,
          center_lng: e.lngLat.lng,
          geometry_type: 'circle'
        }));
        toast({
          title: "Center Point Set",
          description: `Lat: ${e.lngLat.lat.toFixed(6)}, Lng: ${e.lngLat.lng.toFixed(6)}`,
        });
        setDrawingMode(null);
        mapRef.current?.off('click', handleMapClick);
      };

      mapRef.current?.on('click', handleMapClick);
    } else if (drawingMode === 'polygon') {
      drawRef.current.changeMode('draw_polygon');
      toast({
        title: "Polygon Drawing",
        description: "Click points on the map. Double-click to finish.",
      });
    }
  }, [drawingMode]);
  
  // Main view tab
  const [activeTab, setActiveTab] = useState<"map" | "events">("map");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "customer_site",
    geometry_type: "circle",
    center_lat: null as number | null,
    center_lng: null as number | null,
    radius_meters: 500,
    polygon_points: [] as Array<{lat: number, lng: number}>,
    address: "",
    notes: "",
    speed_limit: null as number | null,
    enable_entry_alarm: true,
    enable_exit_alarm: true,
    enable_speed_alarm: false,
    color: "#3B82F6",
    description: "",
    max_dwell_minutes: null as number | null,
    schedule_enabled: false,
    active_days: [1, 2, 3, 4, 5] as number[],
    active_start_time: "08:00",
    active_end_time: "18:00",
  });

  const { data: geofences } = useQuery({
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

  // Render geofences on map when data changes
  useEffect(() => {
    if (!mapRef.current || !geofences) return;
    const map = mapRef.current;

    // Wait for map style to load
    const renderGeofences = () => {
      // Remove existing geofence layers
      geofenceLayersRef.current.forEach(layerId => {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(layerId)) map.removeSource(layerId);
      });
      geofenceLayersRef.current = [];

      geofences.forEach((fence: any) => {
        const sourceId = `geofence-${fence.id}`;
        const fillLayerId = `geofence-fill-${fence.id}`;
        const outlineLayerId = `geofence-outline-${fence.id}`;
        const color = fence.color || '#3B82F6';

        let geojsonData: GeoJSON.Feature;

        if (fence.geometry_type === 'circle' && fence.center_lat && fence.center_lng) {
          // Create circle polygon
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
          coords.push(coords[0]); // Close polygon
          geojsonData = {
            type: 'Feature',
            properties: { name: fence.name },
            geometry: { type: 'Polygon', coordinates: [coords] }
          };
        } else {
          return; // Skip invalid geofences
        }

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
      toast({
        title: "Geofence Created",
        description: "New geofence has been successfully created.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Geofence Updated",
        description: "Geofence has been successfully updated.",
      });
      setIsCreateDialogOpen(false);
      setIsEditMode(false);
      setEditingGeofenceId(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Geofence Deleted",
        description: "Geofence has been removed.",
      });
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
      address: "",
      notes: "",
      speed_limit: null,
      enable_entry_alarm: true,
      enable_exit_alarm: true,
      enable_speed_alarm: false,
      color: "#3B82F6",
      description: "",
      max_dwell_minutes: null,
      schedule_enabled: false,
      active_days: [1, 2, 3, 4, 5],
      active_start_time: "08:00",
      active_end_time: "18:00",
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
      address: fence.address || "",
      notes: fence.notes || "",
      speed_limit: fence.speed_limit,
      enable_entry_alarm: fence.enable_entry_alarm ?? true,
      enable_exit_alarm: fence.enable_exit_alarm ?? true,
      enable_speed_alarm: fence.enable_speed_alarm ?? false,
      color: fence.color || "#3B82F6",
      description: fence.description || "",
      max_dwell_minutes: fence.max_dwell_minutes,
      schedule_enabled: fence.schedule_enabled ?? false,
      active_days: fence.active_days || [1, 2, 3, 4, 5],
      active_start_time: fence.active_start_time || "08:00",
      active_end_time: fence.active_end_time || "18:00",
    });
    setEditingGeofenceId(fence.id);
    setIsEditMode(true);
    setIsCreateDialogOpen(true);
  };

  const handleAddCoordinate = () => {
    const lat = prompt("Enter Latitude:");
    const lng = prompt("Enter Longitude:");
    if (lat && lng) {
      setFormData({
        ...formData,
        polygon_points: [
          ...formData.polygon_points,
          { lat: parseFloat(lat), lng: parseFloat(lng) }
        ]
      });
    }
  };

  const handleRemoveCoordinate = (index: number) => {
    setFormData({
      ...formData,
      polygon_points: formData.polygon_points.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter a geofence name",
        variant: "destructive",
      });
      return;
    }

    if (formData.geometry_type === "circle" && (!formData.center_lat || !formData.center_lng)) {
      toast({
        title: "Validation Error",
        description: "Please enter center coordinates for circular geofence",
        variant: "destructive",
      });
      return;
    }

    if (formData.geometry_type === "polygon" && formData.polygon_points.length < 3) {
      toast({
        title: "Validation Error",
        description: "Polygon must have at least 3 points",
        variant: "destructive",
      });
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
      address: formData.address,
      notes: formData.notes,
      speed_limit: formData.speed_limit,
      enable_entry_alarm: formData.enable_entry_alarm,
      enable_exit_alarm: formData.enable_exit_alarm,
      enable_speed_alarm: formData.enable_speed_alarm,
      color: formData.color,
      description: formData.description,
      max_dwell_minutes: formData.max_dwell_minutes,
      schedule_enabled: formData.schedule_enabled,
      active_days: formData.active_days,
      active_start_time: formData.active_start_time,
      active_end_time: formData.active_end_time,
    };

    if (isEditMode && editingGeofenceId) {
      updateGeofenceMutation.mutate({ id: editingGeofenceId, data: geofenceData });
    } else {
      createGeofenceMutation.mutate(geofenceData);
    }
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Map View */}
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
                <div className="text-sm font-semibold">Add Mapbox public token</div>
                <Input
                  placeholder="pk.eyJ..."
                  value={mapToken}
                  onChange={(e) => setMapToken(e.target.value)}
                  aria-label="Mapbox public token"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { localStorage.setItem('mapbox_token', mapToken); window.location.reload(); }} aria-label="Save Mapbox token">Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">Get your token at mapbox.com → Tokens.</p>
              </Card>
            </div>
          )}
          
          {/* Drawing Tools */}
          <Card className="absolute top-4 left-4 bg-card/95 backdrop-blur z-10">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold mb-3">Drawing Tools</p>
                <Button
                  variant={drawingMode === 'circle' ? 'default' : 'outline'}
                  className="w-full justify-start gap-2"
                  onClick={() => setDrawingMode('circle')}
                  aria-label="Draw circular geofence"
                  aria-pressed={drawingMode === 'circle'}
                >
                  <Circle className="w-4 h-4" aria-hidden="true" />
                  Draw Circle
                </Button>
                <Button
                  variant={drawingMode === 'polygon' ? 'default' : 'outline'}
                  className="w-full justify-start gap-2"
                  onClick={() => setDrawingMode('polygon')}
                  aria-label="Draw polygon geofence"
                  aria-pressed={drawingMode === 'polygon'}
                >
                  <Square className="w-4 h-4" aria-hidden="true" />
                  Draw Polygon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="w-[500px] border-l border-border bg-card overflow-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Geofences</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage virtual boundaries and alerts
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <GeofenceQuickStats
              totalGeofences={geofenceStats.totalGeofences}
              activeGeofences={geofenceStats.activeGeofences}
              eventsToday={geofenceStats.eventsToday}
              entryEvents={geofenceStats.entryEvents}
              exitEvents={geofenceStats.exitEvents}
              dwellAlerts={geofenceStats.dwellAlerts}
            />

            {/* Quick Actions */}
            <GeofenceQuickActions
              onNewGeofence={() => setIsCreateDialogOpen(true)}
              onViewEvents={() => setActiveTab("events")}
              onConfigureAlerts={() => setIsCreateDialogOpen(true)}
              onViewMap={() => setActiveTab("map")}
            />

            {/* Trend Chart */}
            <GeofenceTrendChart />

            {/* Insights */}
            <GeofenceInsightsCard />

            {/* Create Button & Dialog */}
              <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2" aria-label="Create new geofence">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Geofence' : 'Create New Geofence'}</DialogTitle>
                    <DialogDescription>
                      Define a virtual boundary with custom alerts and speed limits
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="coordinates">Coordinates</TabsTrigger>
                      <TabsTrigger value="alerts">Alerts</TabsTrigger>
                      <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4">
                      <div>
                        <Label htmlFor="name">Fence Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Warehouse Zone"
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">Category</Label>
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

                      <div>
                        <Label htmlFor="geometry">Fence Type</Label>
                        <Select
                          value={formData.geometry_type}
                          onValueChange={(value: 'circle' | 'polygon') => 
                            setFormData({ ...formData, geometry_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="circle">Circular</SelectItem>
                            <SelectItem value="polygon">Polygon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <ColorPicker
                        value={formData.color}
                        onChange={(color) => setFormData({ ...formData, color })}
                      />

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Detailed description of this geofence"
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Address (Optional)</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Additional information"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="coordinates" className="space-y-4">
                      {formData.geometry_type === 'circle' ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="lat">Center Latitude *</Label>
                              <Input
                                id="lat"
                                type="number"
                                step="0.000001"
                                value={formData.center_lat || ""}
                                onChange={(e) => setFormData({ 
                                  ...formData, 
                                  center_lat: parseFloat(e.target.value) || null 
                                })}
                                placeholder="9.030000"
                              />
                            </div>
                            <div>
                              <Label htmlFor="lng">Center Longitude *</Label>
                              <Input
                                id="lng"
                                type="number"
                                step="0.000001"
                                value={formData.center_lng || ""}
                                onChange={(e) => setFormData({ 
                                  ...formData, 
                                  center_lng: parseFloat(e.target.value) || null 
                                })}
                                placeholder="38.740000"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="radius">Radius (meters)</Label>
                            <Input
                              id="radius"
                              type="number"
                              value={formData.radius_meters}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                radius_meters: parseInt(e.target.value) || 500 
                              })}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <Label>Polygon Points ({formData.polygon_points.length})</Label>
                            <Button variant="outline" size="sm" onClick={handleAddCoordinate} aria-label="Add polygon coordinate point">
                              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                              Add Point
                            </Button>
                          </div>

                          <div className="border rounded-lg max-h-64 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead>Latitude</TableHead>
                                  <TableHead>Longitude</TableHead>
                                  <TableHead className="w-12"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {formData.polygon_points.map((point, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono text-sm">
                                      {point.lat.toFixed(6)}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                      {point.lng.toFixed(6)}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveCoordinate(index)}
                                        aria-label={`Remove point ${index + 1}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="alerts" className="space-y-4">
                      <div>
                        <Label htmlFor="speed_limit">Speed Limit (km/h) - Optional</Label>
                        <Input
                          id="speed_limit"
                          type="number"
                          value={formData.speed_limit || ""}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            speed_limit: parseInt(e.target.value) || null 
                          })}
                          placeholder="e.g., 60"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Alert when vehicles exceed this speed inside the fence
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="max_dwell">Max Dwell Time (minutes) - Optional</Label>
                        <Input
                          id="max_dwell"
                          type="number"
                          value={formData.max_dwell_minutes || ""}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            max_dwell_minutes: parseInt(e.target.value) || null 
                          })}
                          placeholder="e.g., 30"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Alert when a vehicle stays longer than this duration
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="entry_alarm">Entry Alarm</Label>
                            <p className="text-xs text-muted-foreground">
                              Alert when vehicle enters this zone
                            </p>
                          </div>
                          <Switch
                            id="entry_alarm"
                            checked={formData.enable_entry_alarm}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, enable_entry_alarm: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="exit_alarm">Exit Alarm</Label>
                            <p className="text-xs text-muted-foreground">
                              Alert when vehicle exits this zone
                            </p>
                          </div>
                          <Switch
                            id="exit_alarm"
                            checked={formData.enable_exit_alarm}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, enable_exit_alarm: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="speed_alarm">Speed Limit Alarm</Label>
                            <p className="text-xs text-muted-foreground">
                              Alert when speed limit is exceeded
                            </p>
                          </div>
                          <Switch
                            id="speed_alarm"
                            checked={formData.enable_speed_alarm}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, enable_speed_alarm: checked })
                            }
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="schedule" className="space-y-4">
                      <ScheduleConfigSection
                        scheduleEnabled={formData.schedule_enabled}
                        activeDays={formData.active_days}
                        activeStartTime={formData.active_start_time}
                        activeEndTime={formData.active_end_time}
                        onScheduleEnabledChange={(enabled) => 
                          setFormData({ ...formData, schedule_enabled: enabled })
                        }
                        onActiveDaysChange={(days) => 
                          setFormData({ ...formData, active_days: days })
                        }
                        onActiveStartTimeChange={(time) => 
                          setFormData({ ...formData, active_start_time: time })
                        }
                        onActiveEndTimeChange={(time) => 
                          setFormData({ ...formData, active_end_time: time })
                        }
                      />
                    </TabsContent>
                  </Tabs>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={createGeofenceMutation.isPending || updateGeofenceMutation.isPending} 
                      aria-label={isEditMode ? "Update geofence" : "Create geofence"}
                    >
                      <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                      {isEditMode 
                        ? (updateGeofenceMutation.isPending ? "Updating..." : "Update Geofence")
                        : (createGeofenceMutation.isPending ? "Creating..." : "Create Geofence")
                      }
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            {/* Main Tabs for Geofences List and Events */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "map" | "events")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="map" className="gap-2">
                  <List className="h-4 w-4" aria-hidden="true" />
                  Geofences
                </TabsTrigger>
                <TabsTrigger value="events" className="gap-2">
                  <History className="h-4 w-4" aria-hidden="true" />
                  Events
                </TabsTrigger>
              </TabsList>

              <TabsContent value="map">
                {/* Geofences List */}
                <div className="space-y-3">
              {geofences && geofences.length > 0 ? (
                geofences.map((fence: any) => (
                  <Card key={fence.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg" aria-hidden="true">
                            {fence.geometry_type === 'circle' ? (
                              <Circle className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{fence.name}</h4>
                            <p className="text-xs text-muted-foreground capitalize">
                              {fence.category.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditGeofence(fence)}
                            aria-label={`Edit ${fence.name}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteGeofenceMutation.mutate(fence.id)}
                            aria-label={`Delete ${fence.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {fence.address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            <span className="text-xs">{fence.address}</span>
                          </div>
                        )}
                        {fence.geometry_type === 'circle' && (
                          <div className="text-xs text-muted-foreground">
                            Radius: {fence.radius_meters}m
                          </div>
                        )}
                        {fence.geometry_type === 'polygon' && fence.polygon_points && (
                          <div className="text-xs text-muted-foreground">
                            Points: {fence.polygon_points.length}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center" role="status" aria-label="No geofences available">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      No geofences created yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Create" to add your first geofence
                    </p>
                  </CardContent>
                </Card>
              )}
              </div>
            </TabsContent>

              <TabsContent value="events">
                <GeofenceEventsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Geofencing;
