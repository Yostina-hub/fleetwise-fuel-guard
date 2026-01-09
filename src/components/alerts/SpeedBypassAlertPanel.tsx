import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Gauge, 
  ShieldAlert, 
  AlertTriangle,
  Settings2,
  Loader2,
  Power,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SpeedBypassAlertPanelProps {
  vehicleId: string;
  vehiclePlate: string;
}

interface GovernorEvent {
  id: string;
  event_type: string;
  event_time: string;
  speed_at_event: number | null;
  speed_limit_set: number | null;
  location_name: string | null;
  acknowledged_at: string | null;
}

export function SpeedBypassAlertPanel({ vehicleId, vehiclePlate }: SpeedBypassAlertPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [bypassAlertEnabled, setBypassAlertEnabled] = useState(true);

  // Fetch vehicle settings
  const { data: vehicleSettings } = useQuery({
    queryKey: ["vehicle-bypass-settings", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("speed_governor_bypass_alert")
        .eq("id", vehicleId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent governor events
  const { data: recentEvents = [] } = useQuery({
    queryKey: ["governor-events", vehicleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("speed_governor_events")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("event_time", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as GovernorEvent[];
    },
  });

  useEffect(() => {
    if (vehicleSettings) {
      setBypassAlertEnabled(vehicleSettings.speed_governor_bypass_alert ?? true);
    }
  }, [vehicleSettings]);

  const updateSettings = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ speed_governor_bypass_alert: enabled })
        .eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-bypass-settings"] });
      toast({
        title: "Settings Updated",
        description: bypassAlertEnabled 
          ? "Bypass alerts enabled" 
          : "Bypass alerts disabled",
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

  const handleToggle = (checked: boolean) => {
    setBypassAlertEnabled(checked);
    updateSettings.mutate(checked);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "bypass_detected":
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case "governor_disabled":
        return <Power className="h-4 w-4 text-orange-500" />;
      case "limit_exceeded":
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case "governor_restored":
        return <Gauge className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "bypass_detected":
        return <Badge variant="destructive">Bypass Detected</Badge>;
      case "governor_disabled":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">Disabled</Badge>;
      case "limit_exceeded":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Limit Exceeded</Badge>;
      case "governor_restored":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Restored</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const bypassEvents = recentEvents.filter(e => 
    e.event_type === "bypass_detected" || e.event_type === "governor_disabled"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Speed Bypass Alerts
        </CardTitle>
        <CardDescription>
          Alert when speed governor is bypassed or tampered with
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <Label className="font-medium">Enable Bypass Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Notify when governor tampering is detected
              </p>
            </div>
          </div>
          <Switch
            checked={bypassAlertEnabled}
            onCheckedChange={handleToggle}
            disabled={updateSettings.isPending}
          />
        </div>

        {/* Bypass Warning */}
        {bypassEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-600">
                  {bypassEvents.length} Bypass Event{bypassEvents.length > 1 ? "s" : ""} Detected
                </p>
                <p className="text-sm text-muted-foreground">
                  Recent tampering or bypass attempts on {vehiclePlate}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recent Events</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-muted/30 border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.event_type)}
                    <div>
                      {getEventBadge(event.event_type)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.event_time), "PPp")}
                      </p>
                    </div>
                  </div>
                  {event.speed_at_event && (
                    <div className="text-right">
                      <p className="font-mono text-sm">{event.speed_at_event} km/h</p>
                      {event.speed_limit_set && (
                        <p className="text-xs text-muted-foreground">
                          Limit: {event.speed_limit_set} km/h
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {recentEvents.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Gauge className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No governor events recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
