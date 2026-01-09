import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Wrench, 
  Calendar, 
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Settings2,
  Loader2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export function MaintenanceAlertSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const [settings, setSettings] = useState({
    days_before_alert: 7,
    upcoming_maintenance_enabled: true,
    overdue_maintenance_enabled: true,
    notify_email: true,
    notify_sms: false,
    notify_push: true,
  });

  // Fetch existing settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["maintenance-alert-settings", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await (supabase as any)
        .from("maintenance_alert_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        days_before_alert: existingSettings.days_before_alert ?? 7,
        upcoming_maintenance_enabled: existingSettings.upcoming_maintenance_enabled ?? true,
        overdue_maintenance_enabled: existingSettings.overdue_maintenance_enabled ?? true,
        notify_email: existingSettings.notify_email ?? true,
        notify_sms: existingSettings.notify_sms ?? false,
        notify_push: existingSettings.notify_push ?? true,
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");

      const payload = {
        organization_id: organizationId,
        ...settings,
      };

      if (existingSettings) {
        const { error } = await (supabase as any)
          .from("maintenance_alert_settings")
          .update(payload)
          .eq("id", existingSettings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("maintenance_alert_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-alert-settings"] });
      toast({
        title: "Settings Saved",
        description: "Maintenance alert settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Maintenance Alerts
        </CardTitle>
        <CardDescription>
          Configure alerts for upcoming and overdue maintenance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Advance Warning Days */}
        <div className="space-y-2">
          <Label htmlFor="days_before" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Alert Days Before Maintenance
          </Label>
          <Input
            id="days_before"
            type="number"
            value={settings.days_before_alert}
            onChange={(e) => 
              setSettings({ ...settings, days_before_alert: parseInt(e.target.value) || 1 })
            }
            min={1}
            max={30}
          />
          <p className="text-xs text-muted-foreground">
            Send alerts this many days before scheduled maintenance
          </p>
        </div>

        {/* Alert Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Alert Types</Label>
          
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="font-medium">Upcoming Maintenance</Label>
                  <p className="text-xs text-muted-foreground">
                    Alert before scheduled maintenance
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.upcoming_maintenance_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, upcoming_maintenance_enabled: checked })
                }
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <Label className="font-medium">Overdue Maintenance</Label>
                  <p className="text-xs text-muted-foreground">
                    Alert when maintenance is past due
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.overdue_maintenance_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, overdue_maintenance_enabled: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Notification Channels</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Email</Label>
                </div>
                <Switch
                  checked={settings.notify_email}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, notify_email: checked })
                  }
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">SMS</Label>
                </div>
                <Switch
                  checked={settings.notify_sms}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, notify_sms: checked })
                  }
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Push</Label>
                </div>
                <Switch
                  checked={settings.notify_push}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, notify_push: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings2 className="h-4 w-4 mr-2" />
              Save Maintenance Alert Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
