import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Save
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";

const Geofencing = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState<any>(null);
  const [drawingMode, setDrawingMode] = useState<'circle' | 'polygon' | null>(null);
  const [mapToken, setMapToken] = useState<string>("");
  
  useEffect(() => {
    const token = localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN || '';
    setMapToken(token);
  }, []);
  
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
    });
    setDrawingMode(null);
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

    createGeofenceMutation.mutate({
      name: formData.name,
      category: formData.category,
      geometry_type: formData.geometry_type,
      center_lat: formData.center_lat,
      center_lng: formData.center_lng,
      radius_meters: formData.radius_meters,
      polygon_points: formData.polygon_points.length > 0 ? formData.polygon_points : null,
      address: formData.address,
      notes: formData.notes,
    });
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Map View */}
        <div className="flex-1 relative">
          <LiveTrackingMap vehicles={[]} token={mapToken} />
          
          {/* Drawing Tools */}
          <Card className="absolute top-4 left-4 bg-card/95 backdrop-blur z-10">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold mb-3">Drawing Tools</p>
                <Button
                  variant={drawingMode === 'circle' ? 'default' : 'outline'}
                  className="w-full justify-start gap-2"
                  onClick={() => setDrawingMode('circle')}
                >
                  <Circle className="w-4 h-4" />
                  Draw Circle
                </Button>
                <Button
                  variant={drawingMode === 'polygon' ? 'default' : 'outline'}
                  className="w-full justify-start gap-2"
                  onClick={() => setDrawingMode('polygon')}
                >
                  <Square className="w-4 h-4" />
                  Draw Polygon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="w-[450px] border-l border-border bg-card overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Geofences</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage virtual boundaries and alerts
                </p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Geofence</DialogTitle>
                    <DialogDescription>
                      Define a virtual boundary with custom alerts and speed limits
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="coordinates">Coordinates</TabsTrigger>
                      <TabsTrigger value="alerts">Alerts</TabsTrigger>
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
                            <Button variant="outline" size="sm" onClick={handleAddCoordinate}>
                              <Plus className="h-4 w-4 mr-2" />
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
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
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
                  </Tabs>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createGeofenceMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {createGeofenceMutation.isPending ? "Creating..." : "Create Geofence"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Geofences List */}
            <div className="space-y-3">
              {geofences && geofences.length > 0 ? (
                geofences.map((fence: any) => (
                  <Card key={fence.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
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
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteGeofenceMutation.mutate(fence.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {fence.address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
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
                  <CardContent className="pt-12 pb-12 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Geofencing;
