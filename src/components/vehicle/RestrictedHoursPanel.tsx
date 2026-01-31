import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Save, AlertTriangle, Shield, Calendar, Lock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface RestrictedHoursConfig {
  id?: string;
  is_enabled: boolean;
  allowed_start_time: string;
  allowed_end_time: string;
  active_days: number[];
  engine_lock_enabled: boolean;
  lock_delay_seconds: number;
  send_warning_first: boolean;
  warning_message: string;
  notes?: string;
}

interface RestrictedHoursPanelProps {
  vehicleId: string;
  vehiclePlate: string;
}

const DAYS_OF_WEEK = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

const RestrictedHoursPanel = ({ vehicleId, vehiclePlate }: RestrictedHoursPanelProps) => {
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<RestrictedHoursConfig>({
    is_enabled: false,
    allowed_start_time: "08:00:00",
    allowed_end_time: "18:00:00",
    active_days: [1, 2, 3, 4, 5], // Monday - Friday
    engine_lock_enabled: false,
    lock_delay_seconds: 30,
    send_warning_first: true,
    warning_message: "Vehicle operating outside allowed hours. Engine will be disabled.",
    notes: "",
  });

  useEffect(() => {
    if (vehicleId && organizationId) {
      fetchConfig();
    }
  }, [vehicleId, organizationId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_restricted_hours")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          is_enabled: data.is_enabled,
          allowed_start_time: data.allowed_start_time,
          allowed_end_time: data.allowed_end_time,
          active_days: data.active_days || [1, 2, 3, 4, 5],
          engine_lock_enabled: data.engine_lock_enabled ?? false,
          lock_delay_seconds: data.lock_delay_seconds ?? 30,
          send_warning_first: data.send_warning_first ?? true,
          warning_message: data.warning_message || "Vehicle operating outside allowed hours. Engine will be disabled.",
          notes: data.notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching restricted hours config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        vehicle_id: vehicleId,
        organization_id: organizationId,
        is_enabled: config.is_enabled,
        allowed_start_time: config.allowed_start_time,
        allowed_end_time: config.allowed_end_time,
        active_days: config.active_days,
        engine_lock_enabled: config.engine_lock_enabled,
        lock_delay_seconds: config.lock_delay_seconds,
        send_warning_first: config.send_warning_first,
        warning_message: config.warning_message || null,
        notes: config.notes || null,
      };

      if (config.id) {
        const { error } = await supabase
          .from("vehicle_restricted_hours")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("vehicle_restricted_hours")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setConfig((prev) => ({ ...prev, id: data.id }));
      }

      toast.success("Restricted hours configuration saved");
    } catch (error: any) {
      console.error("Error saving restricted hours:", error);
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayId: number) => {
    setConfig((prev) => ({
      ...prev,
      active_days: prev.active_days.includes(dayId)
        ? prev.active_days.filter((d) => d !== dayId)
        : [...prev.active_days, dayId].sort(),
    }));
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded w-full" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Restricted Hours</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Define allowed usage time for {vehiclePlate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, is_enabled: checked }))
              }
            />
            <Badge variant={config.is_enabled ? "default" : "secondary"}>
              {config.is_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert when enabled */}
        {config.is_enabled && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Monitoring Active
              </p>
              <p className="text-muted-foreground mt-0.5">
                Trips outside allowed hours will be logged as violations
              </p>
            </div>
          </div>
        )}

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Allowed From
            </Label>
            <Input
              type="time"
              value={config.allowed_start_time.slice(0, 5)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  allowed_start_time: e.target.value + ":00",
                }))
              }
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Allowed Until
            </Label>
            <Input
              type="time"
              value={config.allowed_end_time.slice(0, 5)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  allowed_end_time: e.target.value + ":00",
                }))
              }
              className="font-mono"
            />
          </div>
        </div>

        {/* Active Days */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Active Days
          </Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  config.active_days.includes(day.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Engine Lock Section */}
        {config.is_enabled && (
          <div className="space-y-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Lock className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">Engine Lock on Violation</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically disable engine outside allowed hours
                  </p>
                </div>
              </div>
              <Switch
                checked={config.engine_lock_enabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, engine_lock_enabled: checked }))
                }
              />
            </div>

            {config.engine_lock_enabled && (
              <div className="space-y-4 pt-2">
                {/* Warning First */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Send Warning First
                  </Label>
                  <Switch
                    checked={config.send_warning_first}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, send_warning_first: checked }))
                    }
                  />
                </div>

                {/* Lock Delay */}
                <div className="space-y-2">
                  <Label>Lock Delay (seconds after warning)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={config.lock_delay_seconds}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        lock_delay_seconds: parseInt(e.target.value) || 30,
                      }))
                    }
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before engine is disabled (10-300 seconds)
                  </p>
                </div>

                {/* Warning Message */}
                {config.send_warning_first && (
                  <div className="space-y-2">
                    <Label>Warning Message</Label>
                    <Input
                      value={config.warning_message}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, warning_message: e.target.value }))
                      }
                      placeholder="Message sent to driver before engine lock"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Input
            placeholder="e.g., Night shift vehicle, weekend only, etc."
            value={config.notes || ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RestrictedHoursPanel;
