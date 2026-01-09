import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Gauge, 
  Power, 
  AlertTriangle, 
  Settings2,
  Loader2,
  ShieldAlert,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SpeedCutoffSettingsProps {
  vehicleId: string;
  vehiclePlate: string;
  deviceId?: string | null;
  currentSettings: {
    speed_cutoff_enabled?: boolean;
    speed_cutoff_limit_kmh?: number;
    speed_cutoff_grace_seconds?: number;
  };
}

export function SpeedCutoffSettings({ 
  vehicleId, 
  vehiclePlate,
  deviceId,
  currentSettings 
}: SpeedCutoffSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [enabled, setEnabled] = useState(currentSettings.speed_cutoff_enabled ?? false);
  const [speedLimit, setSpeedLimit] = useState(currentSettings.speed_cutoff_limit_kmh ?? 100);
  const [graceSeconds, setGraceSeconds] = useState(currentSettings.speed_cutoff_grace_seconds ?? 10);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("vehicles")
        .update({
          speed_cutoff_enabled: enabled,
          speed_cutoff_limit_kmh: speedLimit,
          speed_cutoff_grace_seconds: graceSeconds,
        })
        .eq("id", vehicleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Settings Saved",
        description: enabled 
          ? `Speed cutoff enabled at ${speedLimit} km/h`
          : "Speed cutoff disabled",
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

  const hasDevice = !!deviceId;

  return (
    <Card className={cn(
      "border-2 transition-colors",
      enabled ? "border-orange-500/30 bg-orange-500/5" : ""
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5" />
              Speed Cutoff Protection
            </CardTitle>
            <CardDescription>
              Automatically disable engine when speeding
            </CardDescription>
          </div>
          {!hasDevice && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500">
              No Device
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasDevice ? (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700">No GPS Device Linked</p>
                <p className="text-sm text-muted-foreground">
                  Speed cutoff requires a compatible GPS device (TK103, GT06N, Teltonika) 
                  with relay support. Link a device first.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <Power className={cn(
                  "h-5 w-5",
                  enabled ? "text-orange-500" : "text-muted-foreground"
                )} />
                <div>
                  <Label htmlFor="cutoff_enabled" className="font-medium cursor-pointer">
                    Enable Speed Cutoff
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send engine disable command when speed limit exceeded
                  </p>
                </div>
              </div>
              <Switch
                id="cutoff_enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-6"
              >
                {/* Speed Limit Setting */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      Speed Limit
                    </Label>
                    <span className="text-2xl font-bold text-orange-600">
                      {speedLimit} km/h
                    </span>
                  </div>
                  <Slider
                    value={[speedLimit]}
                    onValueChange={([val]) => setSpeedLimit(val)}
                    min={20}
                    max={180}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20 km/h</span>
                    <span>180 km/h</span>
                  </div>
                </div>

                {/* Grace Period */}
                <div className="space-y-2">
                  <Label htmlFor="grace" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Grace Period (seconds)
                  </Label>
                  <Input
                    id="grace"
                    type="number"
                    value={graceSeconds}
                    onChange={(e) => setGraceSeconds(parseInt(e.target.value) || 0)}
                    min={0}
                    max={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait this long before triggering cutoff (allows for brief speed spikes)
                  </p>
                </div>

                {/* Warning */}
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-red-600">
                      <strong>Safety Warning:</strong> Engine cutoff while driving can be dangerous. 
                      This feature should only be used in controlled scenarios or with driver awareness.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Save Button */}
            <Button
              onClick={() => updateSettings.mutate()}
              disabled={updateSettings.isPending}
              className="w-full"
              variant={enabled ? "destructive" : "default"}
            >
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
