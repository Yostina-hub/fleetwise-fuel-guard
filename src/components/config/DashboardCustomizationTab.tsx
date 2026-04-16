import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DashboardCustomizationTabProps {
  getVal: (category: string, key: string) => any;
  saveSetting: (category: string, key: string, value: any) => void;
}

const AVAILABLE_WIDGETS = [
  { id: "fleet-status", label: "Fleet Status Overview" },
  { id: "active-alerts", label: "Active Alerts" },
  { id: "fuel-consumption", label: "Fuel Consumption" },
  { id: "driver-scores", label: "Driver Safety Scores" },
  { id: "maintenance-due", label: "Maintenance Due" },
  { id: "trip-summary", label: "Trip Summary" },
  { id: "geofence-activity", label: "Geofence Activity" },
  { id: "live-map", label: "Live Map Preview" },
  { id: "carbon-emissions", label: "Carbon Emissions" },
  { id: "cost-overview", label: "Cost Overview" },
];

const DashboardCustomizationTab = ({ getVal, saveSetting }: DashboardCustomizationTabProps) => {
  const { organizationId } = useOrganization();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: layouts = [] } = useQuery({
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
      return data || [];
    },
    enabled: !!organizationId && !!user,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" /> Dashboard Appearance
          </CardTitle>
          <CardDescription>Customize your dashboard layout and widgets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Default Dashboard View</Label>
            <Select
              value={getVal("dashboard", "default_view") || "overview"}
              onValueChange={v => saveSetting("dashboard", "default_view", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="map">Live Map</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="fleet">Fleet Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Compact Mode</Label>
              <p className="text-xs text-muted-foreground">Show more data with smaller widgets</p>
            </div>
            <Switch
              checked={getVal("dashboard", "compact_mode") || false}
              onCheckedChange={v => saveSetting("dashboard", "compact_mode", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-refresh Dashboard</Label>
              <p className="text-xs text-muted-foreground">Automatically update dashboard data</p>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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

      <Card>
        <CardHeader>
          <CardTitle>Saved Layouts</CardTitle>
          <CardDescription>Manage your custom dashboard layouts</CardDescription>
        </CardHeader>
        <CardContent>
          {layouts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No custom layouts yet. Use the Dashboard Builder to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {layouts.map((layout: any) => (
                <div key={layout.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-sm">{layout.name}</span>
                      {layout.is_default && (
                        <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!layout.is_default && (
                      <Button variant="ghost" size="sm" onClick={() => setDefaultMutation.mutate(layout.id)}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(layout.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Widgets</CardTitle>
          <CardDescription>Widgets you can add to your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {AVAILABLE_WIDGETS.map(widget => (
              <div key={widget.id} className="p-3 rounded-lg border text-sm text-center">
                {widget.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCustomizationTab;
