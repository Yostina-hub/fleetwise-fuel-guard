import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  LayoutDashboard, Plus, Trash2, Star, Save, Loader2,
  GripVertical, Eye, EyeOff, Copy, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  useDashboardLayout,
  DASHBOARD_WIDGET_CATALOG,
  type DashboardWidgetConfig,
} from "@/hooks/useDashboardLayout";
import { toast } from "sonner";

interface DashboardCustomizationTabProps {
  getVal: (category: string, key: string) => any;
  saveSetting: (category: string, key: string, value: any) => void;
}

const SECTION_LABELS: Record<string, string> = {
  executive: "Executive Dashboard",
  overview: "Overview Dashboard",
};

const DashboardCustomizationTab = ({ getVal, saveSetting }: DashboardCustomizationTabProps) => {
  const {
    layouts, activeLayout, isLoading,
    defaultWidgets, save, saving, setDefault, deleteLayout,
  } = useDashboardLayout();

  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);
  const [layoutName, setLayoutName] = useState("My Dashboard");
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  // Load active layout or defaults
  useEffect(() => {
    if (activeLayout && !hasChanges) {
      setWidgets(activeLayout.widgets as DashboardWidgetConfig[]);
      setLayoutName(activeLayout.name);
      setEditingLayoutId(activeLayout.id);
    } else if (!activeLayout && layouts.length === 0 && !hasChanges) {
      setWidgets(defaultWidgets);
      setLayoutName("Default Dashboard");
      setEditingLayoutId(null);
    }
  }, [activeLayout, layouts.length, defaultWidgets, hasChanges]);

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
    setHasChanges(true);
  }, []);

  const updateWidgetSize = useCallback((id: string, size: DashboardWidgetConfig["size"]) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
    setHasChanges(true);
  }, []);

  const moveWidget = useCallback((id: string, direction: "up" | "down") => {
    setWidgets(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return prev;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr.map((w, i) => ({ ...w, position: i }));
    });
    setHasChanges(true);
  }, []);

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
    setHasChanges(true);
  };

  const handleSave = () => {
    save({
      layoutId: editingLayoutId || undefined,
      name: layoutName,
      widgets,
    });
    setHasChanges(false);
  };

  const handleCreateNew = () => {
    if (!newName.trim()) return;
    setEditingLayoutId(null);
    setLayoutName(newName.trim());
    setWidgets(defaultWidgets.map(w => ({ ...w, id: `new-${w.type}-${Date.now()}` })));
    setHasChanges(true);
    setShowNewDialog(false);
    setNewName("");
  };

  const switchToLayout = (layout: any) => {
    setEditingLayoutId(layout.id);
    setLayoutName(layout.name);
    setWidgets(layout.widgets as DashboardWidgetConfig[]);
    setHasChanges(false);
  };

  const toggleAllInSection = (section: string, visible: boolean) => {
    setWidgets(prev => prev.map(w => {
      const cat = DASHBOARD_WIDGET_CATALOG.find(c => c.type === w.type);
      if (cat?.section === section) return { ...w, visible };
      return w;
    }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setWidgets(defaultWidgets.map(w => ({ ...w, id: `reset-${w.type}-${Date.now()}` })));
    setHasChanges(true);
    toast.info("Reset to default widget configuration");
  };

  const filteredWidgets = sectionFilter === "all"
    ? widgets
    : widgets.filter(w => {
        const cat = DASHBOARD_WIDGET_CATALOG.find(c => c.type === w.type);
        return cat?.section === sectionFilter;
      });

  const visibleCount = widgets.filter(w => w.visible).length;
  const totalCount = widgets.length;

  return (
    <div className="space-y-6">
      {/* Layout Manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" /> Dashboard Layouts
              </CardTitle>
              <CardDescription>Select a layout to edit or create a new one</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setNewName(""); setShowNewDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> New Layout
              </Button>
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                Reset Defaults
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading layouts...</p>
          ) : layouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved layouts. Configure widgets below and save.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {layouts.map((layout: any) => (
                <div key={layout.id} className="flex items-center gap-1">
                  <Button
                    variant={editingLayoutId === layout.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => switchToLayout(layout)}
                    className="gap-1.5"
                  >
                    {layout.is_default && <Star className="h-3 w-3 fill-current" />}
                    {layout.name}
                  </Button>
                  {editingLayoutId === layout.id && (
                    <>
                      {!layout.is_default && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDefault(layout.id)}>
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { deleteLayout(layout.id); setEditingLayoutId(null); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={layoutName}
              onChange={e => { setLayoutName(e.target.value); setHasChanges(true); }}
              className="max-w-xs font-semibold"
              placeholder="Layout name"
            />
            <Badge variant="secondary">{visibleCount}/{totalCount} visible</Badge>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="overview">Overview</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button onClick={handleSave} disabled={saving || !hasChanges} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save {hasChanges ? "*" : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section bulk toggles */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(SECTION_LABELS).map(([key, label]) => {
          const sectionWidgets = widgets.filter(w => DASHBOARD_WIDGET_CATALOG.find(c => c.type === w.type)?.section === key);
          const allVisible = sectionWidgets.every(w => w.visible);
          return (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => toggleAllInSection(key, !allVisible)}
              className="gap-2"
            >
              {allVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {allVisible ? `Hide All ${label}` : `Show All ${label}`}
            </Button>
          );
        })}
      </div>

      {/* Widget List */}
      <Card>
        <CardHeader>
          <CardTitle>Widgets</CardTitle>
          <CardDescription>
            Drag to reorder, toggle visibility, and set widget sizes. Changes apply to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredWidgets.map((widget, idx) => {
              const catalog = DASHBOARD_WIDGET_CATALOG.find(c => c.type === widget.type);
              return (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={() => handleDragStart(widget.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(widget.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    widget.visible ? "bg-card" : "bg-muted/50 opacity-60"
                  } ${dragId === widget.id ? "ring-2 ring-primary opacity-50" : ""}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />

                  <Switch
                    checked={widget.visible}
                    onCheckedChange={() => toggleWidget(widget.id)}
                    aria-label={`Toggle ${widget.title}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{widget.title}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {catalog?.section}
                      </Badge>
                    </div>
                    {catalog?.description && (
                      <p className="text-xs text-muted-foreground truncate">{catalog.description}</p>
                    )}
                  </div>

                  <Select value={widget.size} onValueChange={(v) => updateWidgetSize(widget.id, v as any)}>
                    <SelectTrigger className="h-8 w-[90px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6"
                      onClick={() => moveWidget(widget.id, "up")}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6"
                      onClick={() => moveWidget(widget.id, "down")}
                      disabled={idx === filteredWidgets.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Default Tab</Label>
            <Select
              value={getVal("dashboard", "default_view") || "executive"}
              onValueChange={v => saveSetting("dashboard", "default_view", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Compact Mode</Label>
              <p className="text-xs text-muted-foreground">Smaller widget padding</p>
            </div>
            <Switch
              checked={getVal("dashboard", "compact_mode") || false}
              onCheckedChange={v => saveSetting("dashboard", "compact_mode", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-refresh</Label>
              <p className="text-xs text-muted-foreground">Automatically update data</p>
            </div>
            <Switch
              checked={getVal("dashboard", "auto_refresh") ?? true}
              onCheckedChange={v => saveSetting("dashboard", "auto_refresh", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Refresh Interval</Label>
            <Select
              value={getVal("dashboard", "refresh_interval") || "30"}
              onValueChange={v => saveSetting("dashboard", "refresh_interval", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every minute</SelectItem>
                <SelectItem value="300">Every 5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* New Layout Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Layout</DialogTitle></DialogHeader>
          <Input
            placeholder="Dashboard name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateNew()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateNew} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardCustomizationTab;
