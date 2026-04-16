import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type DashboardWidgetConfig = {
  id: string;
  type: string;
  title: string;
  size: "small" | "medium" | "large";
  position: number;
  visible: boolean;
};

export type DashboardLayoutData = {
  id: string;
  name: string;
  widgets: DashboardWidgetConfig[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// Master catalog of all available dashboard widgets mapped to actual components
export const DASHBOARD_WIDGET_CATALOG = [
  { type: "fleet_violations", title: "Fleet Violations", section: "executive", description: "Violation donut chart" },
  { type: "vehicle_misuse", title: "Vehicle Misuse", section: "executive", description: "Misuse analysis donut" },
  { type: "total_trips", title: "Total Trips", section: "executive", description: "Trip count card" },
  { type: "quick_metrics", title: "Quick Metrics Row", section: "executive", description: "Distance, avg, active trips, connection" },
  { type: "fleet_status_card", title: "Fleet Status", section: "executive", description: "Vehicle status breakdown" },
  { type: "distance_by_group", title: "Distance by Group", section: "executive", description: "Hourly distance chart" },
  { type: "idle_time", title: "Idle Time", section: "executive", description: "Idle time donut" },
  { type: "fleet_usage", title: "Fleet Usage Chart", section: "executive", description: "30-day trip trend" },
  { type: "driver_safety", title: "Driver Safety Scorecard", section: "executive", description: "Risk category breakdown" },
  { type: "risk_safety", title: "Risk & Safety Reports", section: "executive", description: "Safety event stacked chart" },
  { type: "fleet_savings", title: "Fleet Savings", section: "executive", description: "Actual vs potential savings" },
  { type: "fuel_trend", title: "Fuel Trend", section: "executive", description: "Fuel consumption & cost trend" },
  { type: "stops_analysis", title: "Stops Analysis", section: "executive", description: "Short/medium/long stops" },
  { type: "radar_performance", title: "Performance Radar", section: "executive", description: "Multi-axis performance" },
  { type: "financial_trend", title: "Financial Trend", section: "executive", description: "Monthly cost trends" },
  { type: "compliance_gauges", title: "Compliance Gauges", section: "executive", description: "Compliance metrics" },
  { type: "live_activity", title: "Live Activity Timeline", section: "executive", description: "Real-time events feed" },
  { type: "driver_performance", title: "Driver Performance", section: "executive", description: "Driver rankings table" },
  { type: "executive_kpis", title: "Executive KPIs", section: "executive", description: "KPI summary grid" },
  { type: "kpi_cards", title: "KPI Cards", section: "overview", description: "Active vehicles, utilization, TCO, alerts" },
  { type: "fleet_vehicle_summary", title: "Fleet Vehicle Summary", section: "overview", description: "Vehicle type breakdown" },
  { type: "vehicle_health", title: "Vehicle Health Status", section: "overview", description: "Health status overview" },
  { type: "geofence_categories", title: "Geofence Categories", section: "overview", description: "Geofence zone types" },
  { type: "vehicle_utilization", title: "Vehicle Utilization", section: "overview", description: "Utilization by vehicle" },
  { type: "metric_cards", title: "Analytics Metrics", section: "overview", description: "Utilization, TCO, carbon, safety" },
  { type: "fleet_status_pie", title: "Fleet Status Pie", section: "overview", description: "Status distribution chart" },
  { type: "fuel_consumption_trend", title: "Fuel Consumption Trend", section: "overview", description: "Weekly fuel line chart" },
  { type: "trips_bar_chart", title: "Trips by Hour", section: "overview", description: "Hourly trip bar chart" },
  { type: "vehicle_table", title: "Vehicle Table", section: "overview", description: "Top vehicles with status" },
  { type: "alerts_list", title: "Recent Alerts", section: "overview", description: "Latest alert notifications" },
  { type: "quick_actions", title: "Quick Actions", section: "overview", description: "Navigation shortcuts" },
] as const;

export type WidgetType = typeof DASHBOARD_WIDGET_CATALOG[number]["type"];

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = DASHBOARD_WIDGET_CATALOG.map((w, i) => ({
  id: `default-${w.type}`,
  type: w.type,
  title: w.title,
  size: "medium" as const,
  position: i,
  visible: true,
}));

export function useDashboardLayout() {
  const { organizationId } = useOrganization();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ["dashboard-layouts", organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user) return [];
      const { data, error } = await supabase
        .from("dashboard_layouts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DashboardLayoutData[];
    },
    enabled: !!organizationId && !!user,
  });

  const activeLayout = layouts.find(l => l.is_default) || layouts[0] || null;

  // Get visible widgets for a section, respecting saved layout
  const getVisibleWidgets = (section?: string): DashboardWidgetConfig[] => {
    const widgets = activeLayout?.widgets || DEFAULT_WIDGETS;
    return widgets
      .filter(w => w.visible !== false)
      .filter(w => {
        if (!section) return true;
        const catalogEntry = DASHBOARD_WIDGET_CATALOG.find(c => c.type === w.type);
        return catalogEntry?.section === section;
      })
      .sort((a, b) => a.position - b.position);
  };

  const isWidgetVisible = (type: string): boolean => {
    const widgets = activeLayout?.widgets || DEFAULT_WIDGETS;
    const widget = widgets.find(w => w.type === type);
    return widget ? widget.visible !== false : true;
  };

  const saveMutation = useMutation({
    mutationFn: async ({ layoutId, name, widgets }: { layoutId?: string; name: string; widgets: DashboardWidgetConfig[] }) => {
      if (!organizationId || !user) throw new Error("Not authenticated");
      if (layoutId) {
        const { error } = await supabase
          .from("dashboard_layouts")
          .update({ name, widgets: widgets as any, updated_at: new Date().toISOString() })
          .eq("id", layoutId);
        if (error) throw error;
      } else {
        // Set as default if first layout
        const { error } = await supabase
          .from("dashboard_layouts")
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            name,
            widgets: widgets as any,
            is_default: layouts.length === 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layouts"] });
      toast.success("Dashboard layout saved");
    },
    onError: (e: any) => toast.error(e.message),
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
      toast.success("Default layout updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_layouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layouts"] });
      toast.success("Layout deleted");
    },
  });

  return {
    layouts,
    activeLayout,
    isLoading,
    getVisibleWidgets,
    isWidgetVisible,
    defaultWidgets: DEFAULT_WIDGETS,
    save: saveMutation.mutate,
    saving: saveMutation.isPending,
    setDefault: setDefaultMutation.mutate,
    deleteLayout: deleteMutation.mutate,
  };
}
