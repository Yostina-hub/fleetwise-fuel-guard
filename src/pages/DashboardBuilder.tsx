import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GripVertical, Plus, X, Save, LayoutGrid, BarChart3, Truck, Fuel, Gauge, AlertTriangle, Users, Thermometer, Battery, MapPin, Loader2, Star, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Widget = {
  id: string;
  type: string;
  title: string;
  size: "small" | "medium" | "large";
  position: number;
};

type DashboardLayout = {
  id: string;
  name: string;
  widgets: Widget[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

const WIDGET_CATALOG = [
  { type: "fleet_status", title: "Fleet Status Overview", icon: Truck, description: "Vehicle online/offline counts" },
  { type: "fuel_consumption", title: "Fuel Consumption", icon: Fuel, description: "Daily/weekly fuel usage chart" },
  { type: "driver_scores", title: "Driver Scores", icon: Users, description: "Top/bottom driver rankings" },
  { type: "speed_violations", title: "Speed Violations", icon: Gauge, description: "Speeding event counts and trends" },
  { type: "active_alerts", title: "Active Alerts", icon: AlertTriangle, description: "Unresolved alert summary" },
  { type: "cold_chain", title: "Cold Chain Status", icon: Thermometer, description: "Temperature compliance gauge" },
  { type: "ev_battery", title: "EV Battery Health", icon: Battery, description: "SoC distribution across EV fleet" },
  { type: "geofence_activity", title: "Geofence Activity", icon: MapPin, description: "Entry/exit events today" },
  { type: "maintenance_due", title: "Maintenance Due", icon: BarChart3, description: "Upcoming service schedule" },
  { type: "trip_summary", title: "Trip Summary", icon: LayoutGrid, description: "Active trips and completion rates" },
];

const DashboardBuilder = () => {
  const { organizationId } = useOrganization();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("My Custom Dashboard");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ["dashboard-layouts", organizationId],
    queryFn: async () => {
      if (!organizationId || !user) return [];
      const { data, error } = await supabase
        .from("dashboard_layouts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data || []) as DashboardLayout[];
    },
    enabled: !!organizationId && !!user,
  });

  // Load selected layout or default
  useEffect(() => {
    if (layouts.length > 0 && !selectedLayoutId) {
      const defaultLayout = layouts.find(l => l.is_default) || layouts[0];
      setSelectedLayoutId(defaultLayout.id);
      setDashboardName(defaultLayout.name);
      setWidgets(defaultLayout.widgets as Widget[]);
    }
  }, [layouts, selectedLayoutId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Not authenticated");
      if (selectedLayoutId) {
        const { error } = await supabase
          .from("dashboard_layouts")
          .update({ name: dashboardName, widgets: widgets as any })
          .eq("id", selectedLayoutId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("dashboard_layouts")
          .insert({ organization_id: organizationId, user_id: user.id, name: dashboardName, widgets: widgets as any, is_default: layouts.length === 0 })
          .select()
          .single();
        if (error) throw error;
        setSelectedLayoutId(data.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layouts"] });
      setHasUnsavedChanges(false);
      toast.success("Dashboard layout saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_layouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layouts"] });
      setSelectedLayoutId(null);
      setWidgets([]);
      setDashboardName("My Custom Dashboard");
      toast.success("Layout deleted");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId || !user) return;
      await supabase.from("dashboard_layouts").update({ is_default: false }).eq("user_id", user.id).eq("organization_id", organizationId);
      const { error } = await supabase.from("dashboard_layouts").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layouts"] });
      toast.success("Default dashboard set");
    },
  });

  const createNewLayout = () => {
    if (!newName.trim()) return;
    setSelectedLayoutId(null);
    setDashboardName(newName.trim());
    setWidgets([{ id: Date.now().toString(), type: "fleet_status", title: "Fleet Status Overview", size: "large", position: 0 }]);
    setHasUnsavedChanges(true);
    setShowNewDialog(false);
    setNewName("");
  };

  const switchLayout = (layout: DashboardLayout) => {
    setSelectedLayoutId(layout.id);
    setDashboardName(layout.name);
    setWidgets(layout.widgets as Widget[]);
    setHasUnsavedChanges(false);
  };

  const addWidget = (catalogItem: typeof WIDGET_CATALOG[0]) => {
    setWidgets(prev => [...prev, { id: Date.now().toString(), type: catalogItem.type, title: catalogItem.title, size: "medium", position: prev.length }]);
    setShowCatalog(false);
    setHasUnsavedChanges(true);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateWidgetSize = (id: string, size: Widget["size"]) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
    setHasUnsavedChanges(true);
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setWidgets(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(w => w.id === dragId);
      const toIdx = arr.findIndex(w => w.id === targetId);
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr.map((w, i) => ({ ...w, position: i }));
    });
    setDragId(null);
    setHasUnsavedChanges(true);
  };

  const sizeClass = (s: Widget["size"]) => s === "large" ? "md:col-span-2" : "md:col-span-1";
  const getIcon = (type: string) => WIDGET_CATALOG.find(c => c.type === type)?.icon || LayoutGrid;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Builder</h1>
            <p className="text-muted-foreground">Create and manage custom KPI dashboard layouts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCatalog(!showCatalog)}><Plus className="h-4 w-4 mr-2" /> Add Widget</Button>
            <Button variant="outline" onClick={() => { setNewName(""); setShowNewDialog(true); }}><Copy className="h-4 w-4 mr-2" /> New Layout</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save{hasUnsavedChanges ? " *" : ""}
            </Button>
          </div>
        </div>

        {/* Layout selector */}
        <div className="flex items-center gap-3 flex-wrap">
          {layouts.map(l => (
            <Button key={l.id} variant={selectedLayoutId === l.id ? "default" : "outline"} size="sm" onClick={() => switchLayout(l)} className="gap-1.5">
              {l.is_default && <Star className="h-3 w-3" />}
              {l.name}
            </Button>
          ))}
          {layouts.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">No saved layouts. Create one to get started.</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Input value={dashboardName} onChange={e => { setDashboardName(e.target.value); setHasUnsavedChanges(true); }} className="max-w-xs font-semibold" />
          <Badge variant="secondary">{widgets.length} widgets</Badge>
          {selectedLayoutId && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDefaultMutation.mutate(selectedLayoutId)}><Star className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(selectedLayoutId)}><Trash2 className="h-4 w-4" /></Button>
            </>
          )}
        </div>

        {showCatalog && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Widget Catalog</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {WIDGET_CATALOG.map(item => {
                  const Icon = item.icon;
                  const alreadyAdded = widgets.some(w => w.type === item.type);
                  return (
                    <button key={item.type} onClick={() => !alreadyAdded && addWidget(item)}
                      className={`p-3 rounded-lg border text-left transition-colors ${alreadyAdded ? "opacity-50 cursor-not-allowed bg-muted" : "hover:border-primary hover:bg-accent cursor-pointer"}`}>
                      <Icon className="h-5 w-5 mb-1 text-primary" />
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map(widget => {
            const Icon = getIcon(widget.type);
            return (
              <Card key={widget.id} className={`${sizeClass(widget.size)} transition-all ${dragId === widget.id ? "opacity-50 ring-2 ring-primary" : ""}`}
                draggable onDragStart={() => handleDragStart(widget.id)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(widget.id)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{widget.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select value={widget.size} onValueChange={(v) => updateWidgetSize(widget.id, v as Widget["size"])}>
                        <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeWidget(widget.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                    <div className="text-center text-muted-foreground">
                      <Icon className="h-8 w-8 mx-auto mb-1" />
                      <p className="text-xs">{widget.title} Widget</p>
                      <p className="text-xs opacity-60">Live data renders on main dashboard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {widgets.length === 0 && (
            <Card className="md:col-span-2 flex items-center justify-center h-48">
              <div className="text-center text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Add widgets from the catalog to build your dashboard</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Layout</DialogTitle></DialogHeader>
          <Input placeholder="Dashboard name..." value={newName} onChange={e => setNewName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={createNewLayout} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DashboardBuilder;
