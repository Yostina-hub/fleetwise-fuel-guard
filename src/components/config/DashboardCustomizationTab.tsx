import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, Plus, Trash2, Star, Save, Loader2,
  GripVertical, Eye, EyeOff, Maximize2, Minimize2,
  Settings2, Palette, Monitor, Smartphone, RotateCcw,
  Columns3, Grid3X3, LayoutGrid, ChevronDown, ChevronUp,
  Sparkles, Lock, Unlock, MoveHorizontal, Info,
} from "lucide-react";
import {
  useDashboardLayout,
  DASHBOARD_WIDGET_CATALOG,
  type DashboardWidgetConfig,
} from "@/hooks/useDashboardLayout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DashboardCustomizationTabProps {
  getVal: (category: string, key: string) => any;
  saveSetting: (category: string, key: string, value: any) => void;
}

const SECTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  executive: { label: "Executive", color: "from-blue-500 to-indigo-600", icon: "📊" },
  overview: { label: "Overview", color: "from-emerald-500 to-teal-600", icon: "📈" },
};

const SIZE_COLS: Record<string, number> = { small: 1, medium: 2, large: 3 };
const SIZE_LABELS: Record<string, string> = { small: "1/3", medium: "2/3", large: "Full" };

const WIDGET_ICONS: Record<string, string> = {
  fleet_violations: "🚨", vehicle_misuse: "⚠️", total_trips: "🛣️",
  quick_metrics: "📊", fleet_status_card: "🚗", distance_by_group: "📏",
  idle_time: "⏱️", fleet_usage: "📈", driver_safety: "🛡️",
  risk_safety: "⚡", fleet_savings: "💰", fuel_trend: "⛽",
  stops_analysis: "📍", radar_performance: "🎯", financial_trend: "💹",
  compliance_gauges: "✅", live_activity: "🔴", driver_performance: "👤",
  executive_kpis: "🏆", kpi_cards: "📋", fleet_vehicle_summary: "🚛",
  vehicle_health: "🔧", geofence_categories: "🗺️", vehicle_utilization: "📉",
  metric_cards: "📐", fleet_status_pie: "🥧", fuel_consumption_trend: "🔥",
  trips_bar_chart: "📊", vehicle_table: "📋", alerts_list: "🔔",
  quick_actions: "⚡",
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
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

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

  const cycleWidgetSize = useCallback((id: string) => {
    const order: DashboardWidgetConfig["size"][] = ["small", "medium", "large"];
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      const next = order[(order.indexOf(w.size) + 1) % order.length];
      return { ...w, size: next };
    }));
    setHasChanges(true);
  }, []);

  const setWidgetSize = useCallback((id: string, size: DashboardWidgetConfig["size"]) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
    setHasChanges(true);
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };

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
    setDragOverId(null);
    setHasChanges(true);
  };

  const handleSave = () => {
    save({ layoutId: editingLayoutId || undefined, name: layoutName, widgets });
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
    setSelectedWidget(null);
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
    setSelectedWidget(null);
    toast.info("Reset to default widget configuration");
  };

  const visibleWidgets = widgets.filter(w => w.visible);
  const hiddenWidgets = widgets.filter(w => !w.visible);
  const filteredVisible = sectionFilter === "all"
    ? visibleWidgets
    : visibleWidgets.filter(w => {
        const cat = DASHBOARD_WIDGET_CATALOG.find(c => c.type === w.type);
        return cat?.section === sectionFilter;
      });

  const selectedWidgetData = selectedWidget ? widgets.find(w => w.id === selectedWidget) : null;
  const selectedCatalog = selectedWidgetData
    ? DASHBOARD_WIDGET_CATALOG.find(c => c.type === selectedWidgetData.type)
    : null;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Layout selector */}
            <div className="flex items-center gap-1 mr-2">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <Select
                value={editingLayoutId || "__new__"}
                onValueChange={v => {
                  if (v === "__new__") { setShowNewDialog(true); return; }
                  const l = layouts.find((l: any) => l.id === v);
                  if (l) switchToLayout(l);
                }}
              >
                <SelectTrigger className="h-8 w-[180px] text-sm font-medium">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  {layouts.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-1.5">
                        {l.is_default && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                        {l.name}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Plus className="h-3 w-3" /> New Layout
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Layout name input */}
            <Input
              value={layoutName}
              onChange={e => { setLayoutName(e.target.value); setHasChanges(true); }}
              className="h-8 w-[160px] text-sm"
              placeholder="Layout name"
            />

            {/* Section filter */}
            <div className="flex items-center rounded-md border bg-muted/50 p-0.5 gap-0.5">
              {["all", "executive", "overview"].map(s => (
                <Button
                  key={s}
                  variant={sectionFilter === s ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setSectionFilter(s)}
                >
                  {s === "all" ? "All" : SECTION_LABELS[s]?.icon + " " + SECTION_LABELS[s]?.label}
                </Button>
              ))}
            </div>

            {/* Preview mode */}
            <div className="flex items-center rounded-md border bg-muted/50 p-0.5 gap-0.5 ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={previewMode === "desktop" ? "default" : "ghost"}
                    size="sm" className="h-7 w-7 p-0"
                    onClick={() => setPreviewMode("desktop")}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desktop preview</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={previewMode === "mobile" ? "default" : "ghost"}
                    size="sm" className="h-7 w-7 p-0"
                    onClick={() => setPreviewMode("mobile")}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mobile preview</TooltipContent>
              </Tooltip>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {editingLayoutId && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDefault(editingLayoutId)}>
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Set as default</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { deleteLayout(editingLayoutId); setEditingLayoutId(null); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete layout</TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={resetToDefaults}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to defaults</TooltipContent>
              </Tooltip>
              <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm" className="h-8 gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save{hasChanges ? " *" : ""}
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {visibleWidgets.length} visible
            </span>
            <span className="flex items-center gap-1">
              <EyeOff className="h-3 w-3" /> {hiddenWidgets.length} hidden
            </span>
            <span>•</span>
            {Object.entries(SECTION_LABELS).map(([key, val]) => {
              const count = visibleWidgets.filter(w => DASHBOARD_WIDGET_CATALOG.find(c => c.type === w.type)?.section === key).length;
              return (
                <span key={key} className="flex items-center gap-1">
                  {val.icon} {count} {val.label}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* WYSIWYG Grid + Properties split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Visual Grid Preview */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Layout Preview
                <Badge variant="secondary" className="text-[10px]">{previewMode}</Badge>
              </CardTitle>
              {/* Section toggles */}
              <div className="flex gap-1">
                {Object.entries(SECTION_LABELS).map(([key, val]) => {
                  const sectionWidgets = widgets.filter(w => DASHBOARD_WIDGET_CATALOG.find(c => c.type === w.type)?.section === key);
                  const allVisible = sectionWidgets.every(w => w.visible);
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => toggleAllInSection(key, !allVisible)}
                        >
                          {allVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {val.icon}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{allVisible ? "Hide" : "Show"} all {val.label} widgets</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div
              ref={gridRef}
              className={cn(
                "grid gap-2 transition-all duration-300",
                previewMode === "desktop" ? "grid-cols-3" : "grid-cols-1 max-w-[360px] mx-auto"
              )}
            >
              {filteredVisible
                .sort((a, b) => a.position - b.position)
                .map((widget) => {
                  const catalog = DASHBOARD_WIDGET_CATALOG.find(c => c.type === widget.type);
                  const section = catalog?.section || "executive";
                  const isSelected = selectedWidget === widget.id;
                  const cols = previewMode === "desktop" ? SIZE_COLS[widget.size] : 1;

                  return (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, widget.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, widget.id)}
                      onDrop={() => handleDrop(widget.id)}
                      onClick={() => setSelectedWidget(isSelected ? null : widget.id)}
                      className={cn(
                        "group relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 select-none",
                        "hover:shadow-md hover:border-primary/40",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                          : "border-border/60 bg-card hover:bg-accent/30",
                        dragOverId === widget.id && dragId !== widget.id && "border-primary border-dashed bg-primary/10 scale-[1.02]",
                        dragId === widget.id && "opacity-40"
                      )}
                      style={{
                        gridColumn: previewMode === "desktop" ? `span ${cols}` : "span 1",
                      }}
                    >
                      {/* Drag handle */}
                      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab" />
                      </div>

                      {/* Size selector */}
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-background/90 backdrop-blur-sm rounded border border-border/50 p-0.5">
                        {(["small", "medium", "large"] as const).map(s => (
                          <Tooltip key={s}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); setWidgetSize(widget.id, s); }}
                                className={cn(
                                  "h-5 w-5 rounded flex items-center justify-center transition-colors text-[9px] font-bold",
                                  widget.size === s
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                )}
                              >
                                {s === "small" ? "S" : s === "medium" ? "M" : "L"}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{SIZE_LABELS[s]}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>

                      {/* Widget content preview */}
                      <div className="flex flex-col items-center gap-1.5 py-2">
                        <span className="text-xl">{WIDGET_ICONS[widget.type] || "📦"}</span>
                        <span className="text-[11px] font-medium text-center leading-tight">{widget.title}</span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1 py-0 h-4",
                              section === "executive" ? "border-blue-500/30 text-blue-400" : "border-emerald-500/30 text-emerald-400"
                            )}
                          >
                            {SECTION_LABELS[section]?.label}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            {SIZE_LABELS[widget.size]}
                          </Badge>
                        </div>
                      </div>

                      {/* Simulated chart area */}
                      <div className={cn(
                        "mt-1 rounded bg-muted/40 flex items-end gap-px p-1 overflow-hidden",
                        widget.size === "small" ? "h-8" : widget.size === "medium" ? "h-12" : "h-16"
                      )}>
                        {Array.from({ length: widget.size === "large" ? 16 : widget.size === "medium" ? 10 : 6 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 rounded-t-sm min-w-[3px]",
                              section === "executive" ? "bg-blue-500/30" : "bg-emerald-500/30"
                            )}
                            style={{ height: `${20 + Math.random() * 80}%` }}
                          />
                        ))}
                      </div>

                      {/* Hide button */}
                      <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleWidget(widget.id); }}
                              className="h-5 w-5 rounded bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                            >
                              <EyeOff className="h-3 w-3 text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Hide widget</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}

              {filteredVisible.length === 0 && (
                <div className="col-span-3 py-12 text-center text-muted-foreground">
                  <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No visible widgets</p>
                  <p className="text-xs">Toggle widgets from the hidden list or reset to defaults</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Properties / Hidden widgets */}
        <div className="space-y-4">
          {/* Widget Properties */}
          <Card className={cn("transition-all", selectedWidgetData ? "border-primary/30" : "")}>
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {selectedWidgetData ? "Widget Properties" : "Select a Widget"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {selectedWidgetData && selectedCatalog ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{WIDGET_ICONS[selectedWidgetData.type] || "📦"}</span>
                    <div>
                      <p className="font-medium text-sm">{selectedWidgetData.title}</p>
                      <p className="text-xs text-muted-foreground">{selectedCatalog.description}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Section</Label>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        selectedCatalog.section === "executive"
                          ? "border-blue-500/30 text-blue-400"
                          : "border-emerald-500/30 text-emerald-400"
                      )}
                    >
                      {SECTION_LABELS[selectedCatalog.section]?.icon} {SECTION_LABELS[selectedCatalog.section]?.label}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Size</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["small", "medium", "large"] as const).map(s => (
                        <Button
                          key={s}
                          variant={selectedWidgetData.size === s ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setWidgetSize(selectedWidgetData.id, s)}
                        >
                          {s === "small" ? <Columns3 className="h-3 w-3 mr-1" /> :
                           s === "medium" ? <LayoutGrid className="h-3 w-3 mr-1" /> :
                           <Maximize2 className="h-3 w-3 mr-1" />}
                          {SIZE_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Position</Label>
                    <p className="text-sm font-mono text-muted-foreground">#{selectedWidgetData.position + 1}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Label className="text-xs">Visible</Label>
                    <Switch
                      checked={selectedWidgetData.visible}
                      onCheckedChange={() => toggleWidget(selectedWidgetData.id)}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Info className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Click a widget in the grid to view and edit its properties</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hidden Widgets */}
          <Card>
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <button
                onClick={() => setShowHidden(!showHidden)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-sm flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Hidden ({hiddenWidgets.length})
                </CardTitle>
                {showHidden ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardHeader>
            {showHidden && (
              <CardContent className="p-2">
                {hiddenWidgets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">All widgets are visible</p>
                ) : (
                  <div className="space-y-1">
                    {hiddenWidgets.map(widget => {
                      const catalog = DASHBOARD_WIDGET_CATALOG.find(c => c.type === widget.type);
                      return (
                        <div
                          key={widget.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-accent/30 transition-colors cursor-pointer group"
                          onClick={() => toggleWidget(widget.id)}
                        >
                          <span className="text-sm">{WIDGET_ICONS[widget.type] || "📦"}</span>
                          <span className="text-xs flex-1 truncate">{widget.title}</span>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Appearance Quick Settings */}
          <Card>
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Tab</Label>
                <Select
                  value={getVal("dashboard", "default_view") || "executive"}
                  onValueChange={v => saveSetting("dashboard", "default_view", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Compact Mode</Label>
                <Switch
                  checked={getVal("dashboard", "compact_mode") || false}
                  onCheckedChange={v => saveSetting("dashboard", "compact_mode", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto-refresh</Label>
                <Switch
                  checked={getVal("dashboard", "auto_refresh") ?? true}
                  onCheckedChange={v => saveSetting("dashboard", "auto_refresh", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Refresh Interval</Label>
                <Select
                  value={getVal("dashboard", "refresh_interval") || "30"}
                  onValueChange={v => saveSetting("dashboard", "refresh_interval", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Layout Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create New Layout
            </DialogTitle>
          </DialogHeader>
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
