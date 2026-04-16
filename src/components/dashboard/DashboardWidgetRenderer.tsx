import { ReactNode, useMemo } from "react";
import { useDashboardLayout, type DashboardWidgetConfig } from "@/hooks/useDashboardLayout";
import { cn } from "@/lib/utils";

interface WidgetRendererProps {
  section: "executive" | "overview";
  widgetMap: Record<string, () => ReactNode>;
  className?: string;
}

/**
 * Dynamically renders dashboard widgets in the order and sizes
 * defined by the user's saved layout configuration.
 */
const DashboardWidgetRenderer = ({ section, widgetMap, className }: WidgetRendererProps) => {
  const { getVisibleWidgets } = useDashboardLayout();

  const widgets = useMemo(() => getVisibleWidgets(section), [getVisibleWidgets, section]);

  if (widgets.length === 0) return null;

  const sizeToColSpan = (size: DashboardWidgetConfig["size"]): string => {
    switch (size) {
      case "large": return "sm:col-span-2 lg:col-span-3";
      case "medium": return "sm:col-span-2 lg:col-span-2";
      case "small":
      default: return "sm:col-span-1 lg:col-span-1";
    }
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6", className)}>
      {widgets.map((widget) => {
        const renderer = widgetMap[widget.type];
        if (!renderer) return null;
        const content = renderer();
        if (!content) return null;

        return (
          <div key={widget.id || widget.type} className={cn("min-w-0", sizeToColSpan(widget.size))}>
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default DashboardWidgetRenderer;
