import { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Plus, X, Save, LayoutGrid, BarChart3, Truck, Fuel, Gauge, AlertTriangle, Users, Thermometer, Battery, MapPin } from "lucide-react";

type Widget = {
  id: string;
  type: string;
  title: string;
  size: "small" | "medium" | "large";
  position: number;
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
  const [dashboardName, setDashboardName] = useState("My Custom Dashboard");
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "1", type: "fleet_status", title: "Fleet Status Overview", size: "large", position: 0 },
    { id: "2", type: "active_alerts", title: "Active Alerts", size: "medium", position: 1 },
    { id: "3", type: "fuel_consumption", title: "Fuel Consumption", size: "medium", position: 2 },
  ]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const addWidget = (catalogItem: typeof WIDGET_CATALOG[0]) => {
    setWidgets(prev => [...prev, {
      id: Date.now().toString(),
      type: catalogItem.type,
      title: catalogItem.title,
      size: "medium",
      position: prev.length,
    }]);
    setShowCatalog(false);
  };

  const removeWidget = (id: string) => setWidgets(prev => prev.filter(w => w.id !== id));

  const updateWidgetSize = (id: string, size: Widget["size"]) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
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
  };

  const sizeClass = (s: Widget["size"]) => s === "large" ? "md:col-span-2" : s === "small" ? "md:col-span-1" : "md:col-span-1";

  const getIcon = (type: string) => {
    const item = WIDGET_CATALOG.find(c => c.type === type);
    return item ? item.icon : LayoutGrid;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Builder</h1>
            <p className="text-muted-foreground">Drag-and-drop customizable KPI dashboard layout</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCatalog(!showCatalog)}>
              <Plus className="h-4 w-4 mr-2" /> Add Widget
            </Button>
            <Button><Save className="h-4 w-4 mr-2" /> Save Layout</Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input value={dashboardName} onChange={e => setDashboardName(e.target.value)} className="max-w-xs font-semibold" />
          <Badge variant="secondary">{widgets.length} widgets</Badge>
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
                      <p className="text-xs opacity-60">Live data will render here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardBuilder;
