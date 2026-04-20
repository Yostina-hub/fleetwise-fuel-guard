import { ReactNode, useMemo, useState, useCallback, useRef } from "react";
import { useDashboardLayout, type DashboardWidgetConfig } from "@/hooks/useDashboardLayout";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

interface WidgetRendererProps {
  section: "executive" | "overview";
  widgetMap: Record<string, () => ReactNode>;
  className?: string;
}

const DashboardWidgetRenderer = ({ section, widgetMap, className }: WidgetRendererProps) => {
  const { getVisibleWidgets, reorderWidgets, activeLayout } = useDashboardLayout();

  const widgets = useMemo(() => getVisibleWidgets(section), [getVisibleWidgets, section]);

  const [draggedType, setDraggedType] = useState<string | null>(null);
  const [dragOverType, setDragOverType] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    setDraggedType(type);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", type);
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedType(null);
    setDragOverType(null);
    dragCounter.current = 0;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    dragCounter.current++;
    if (type !== draggedType) {
      setDragOverType(type);
    }
  }, [draggedType]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setDragOverType(null);
      dragCounter.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetType: string) => {
    e.preventDefault();
    const sourceType = e.dataTransfer.getData("text/plain");
    if (sourceType && sourceType !== targetType && activeLayout) {
      reorderWidgets(sourceType, targetType, section);
    }
    setDraggedType(null);
    setDragOverType(null);
    dragCounter.current = 0;
  }, [reorderWidgets, section, activeLayout]);

  if (widgets.length === 0) return null;

  const sizeToColSpan = (size: DashboardWidgetConfig["size"]): string => {
    switch (size) {
      case "large": return "sm:col-span-2 lg:col-span-3";
      case "medium": return "sm:col-span-2 lg:col-span-2";
      case "small":
      default: return "sm:col-span-1 lg:col-span-1";
    }
  };

  const canDrag = !!activeLayout;

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full", className)}>
      {widgets.map((widget) => {
        const renderer = widgetMap[widget.type];
        if (!renderer) return null;
        const content = renderer();
        if (!content) return null;

        const isDragging = draggedType === widget.type;
        const isDragOver = dragOverType === widget.type && draggedType !== widget.type;

        return (
          <div
            key={widget.id || widget.type}
            className={cn(
              "min-w-0 group/drag relative transition-all duration-200",
              sizeToColSpan(widget.size),
              isDragOver && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-lg scale-[1.01]",
              isDragging && "opacity-50 scale-[0.98]",
            )}
            draggable={canDrag}
            onDragStart={(e) => handleDragStart(e, widget.type)}
            onDragEnd={handleDragEnd}
            onDragEnter={(e) => handleDragEnter(e, widget.type)}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, widget.type)}
          >
            {/* Drag handle - only shown when layout is saved */}
            {canDrag && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/drag:opacity-100 transition-opacity duration-200">
                <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-md p-0.5 shadow-sm cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default DashboardWidgetRenderer;
