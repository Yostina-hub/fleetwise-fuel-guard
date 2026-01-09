import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Fuel, 
  AlertTriangle, 
  Droplets,
  TrendingDown,
  Settings2,
  Loader2,
  Bell
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

interface FuelAlertSettingsProps {
  vehicleId?: string; // Optional - if not provided, shows org-wide defaults
}

export function FuelAlertSettings({ vehicleId }: FuelAlertSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const [settings, setSettings] = useState({
    low_fuel_threshold_percent: 20,
    low_fuel_alert_enabled: true,
    fuel_theft_threshold_liters: 10,
    fuel_theft_alert_enabled: true,
    consumption_variance_percent: 30,
    consumption_alert_enabled: true,
    refueling_alert_enabled: true,
  });

  // Fetch existing settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["fuel-alert-settings", organizationId, vehicleId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      let query = (supabase as any)
        .from("fuel_alert_settings")
        .select("*")
        .eq("organization_id", organizationId);

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      } else {
        query = query.is("vehicle_id", null);
      }

      const { data, error } = await query.maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        low_fuel_threshold_percent: existingSettings.low_fuel_threshold_percent ?? 20,
        low_fuel_alert_enabled: existingSettings.low_fuel_alert_enabled ?? true,
        fuel_theft_threshold_liters: existingSettings.fuel_theft_threshold_liters ?? 10,
        fuel_theft_alert_enabled: existingSettings.fuel_theft_alert_enabled ?? true,
        consumption_variance_percent: existingSettings.consumption_variance_percent ?? 30,
        consumption_alert_enabled: existingSettings.consumption_alert_enabled ?? true,
        refueling_alert_enabled: existingSettings.refueling_alert_enabled ?? true,
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");

      const payload = {
        organization_id: organizationId,
        vehicle_id: vehicleId || null,
        ...settings,
      };

      if (existingSettings) {
        const { error } = await (supabase as any)
          .from("fuel_alert_settings")
          .update(payload)
          .eq("id", existingSettings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("fuel_alert_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-alert-settings"] });
      toast({
        title: "Settings Saved",
        description: "Fuel alert settings updated successfully",
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
          <Fuel className="h-5 w-5 text-primary" />
          Fuel Alerts
        </CardTitle>
        <CardDescription>
          Configure alerts for fuel-related events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Low Fuel Alert */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-orange-500" />
              <div>
                <Label className="font-medium">Low Fuel Alert</Label>
                <p className="text-xs text-muted-foreground">
                  Alert when fuel drops below threshold
                </p>
              </div>
            </div>
            <Switch
              checked={settings.low_fuel_alert_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, low_fuel_alert_enabled: checked })
              }
            />
          </div>
          {settings.low_fuel_alert_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pt-3"
            >
              <Label htmlFor="low_fuel_threshold">Threshold (%)</Label>
              <Input
                id="low_fuel_threshold"
                type="number"
                value={settings.low_fuel_threshold_percent}
                onChange={(e) => 
                  setSettings({ ...settings, low_fuel_threshold_percent: parseInt(e.target.value) || 0 })
                }
                min={5}
                max={50}
                className="mt-1"
              />
            </motion.div>
          )}
        </div>

        {/* Fuel Theft Alert */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <Label className="font-medium">Fuel Theft Detection</Label>
                <p className="text-xs text-muted-foreground">
                  Alert on sudden fuel drop (possible theft)
                </p>
              </div>
            </div>
            <Switch
              checked={settings.fuel_theft_alert_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, fuel_theft_alert_enabled: checked })
              }
            />
          </div>
          {settings.fuel_theft_alert_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pt-3"
            >
              <Label htmlFor="theft_threshold">Minimum Drop (liters)</Label>
              <Input
                id="theft_threshold"
                type="number"
                value={settings.fuel_theft_threshold_liters}
                onChange={(e) => 
                  setSettings({ ...settings, fuel_theft_threshold_liters: parseFloat(e.target.value) || 0 })
                }
                min={1}
                max={100}
                step={0.5}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alert if fuel drops by this amount within 5 minutes
              </p>
            </motion.div>
          )}
        </div>

        {/* Unusual Consumption Alert */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-yellow-500" />
              <div>
                <Label className="font-medium">Unusual Consumption</Label>
                <p className="text-xs text-muted-foreground">
                  Alert when consumption deviates from normal
                </p>
              </div>
            </div>
            <Switch
              checked={settings.consumption_alert_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, consumption_alert_enabled: checked })
              }
            />
          </div>
          {settings.consumption_alert_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pt-3"
            >
              <Label htmlFor="variance_threshold">Variance Threshold (%)</Label>
              <Input
                id="variance_threshold"
                type="number"
                value={settings.consumption_variance_percent}
                onChange={(e) => 
                  setSettings({ ...settings, consumption_variance_percent: parseInt(e.target.value) || 0 })
                }
                min={10}
                max={100}
                className="mt-1"
              />
            </motion.div>
          )}
        </div>

        {/* Refueling Alert */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-green-500" />
              <div>
                <Label className="font-medium">Refueling Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Notify when vehicle is refueled
                </p>
              </div>
            </div>
            <Switch
              checked={settings.refueling_alert_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, refueling_alert_enabled: checked })
              }
            />
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
              Save Fuel Alert Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
