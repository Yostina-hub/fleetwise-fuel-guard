import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FuelDetectionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingConfig?: any;
}

export default function FuelDetectionConfigDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  existingConfig 
}: FuelDetectionConfigDialogProps) {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState({
    vehicle_id: existingConfig?.vehicle_id || "",
    refuel_threshold_percent: existingConfig?.refuel_threshold_percent || 5,
    theft_threshold_percent: existingConfig?.theft_threshold_percent || 3,
    use_kalman_filter: existingConfig?.use_kalman_filter ?? true,
    use_temperature_compensation: existingConfig?.use_temperature_compensation ?? false,
    min_event_duration_seconds: existingConfig?.min_event_duration_seconds || 60,
    is_active: existingConfig?.is_active ?? true,
  });

  const handleSubmit = async () => {
    if (!organizationId || !config.vehicle_id) {
      toast.error("Please select a vehicle");
      return;
    }

    setLoading(true);
    try {
      if (existingConfig?.id) {
        const { error } = await supabase
          .from("fuel_detection_configs")
          .update({
            refuel_threshold_percent: config.refuel_threshold_percent,
            theft_threshold_percent: config.theft_threshold_percent,
            use_kalman_filter: config.use_kalman_filter,
            use_temperature_compensation: config.use_temperature_compensation,
            min_event_duration_seconds: config.min_event_duration_seconds,
            is_active: config.is_active,
          })
          .eq("id", existingConfig.id);
        
        if (error) throw error;
        toast.success("Configuration updated");
      } else {
        const { error } = await supabase
          .from("fuel_detection_configs")
          .insert({
            organization_id: organizationId,
            vehicle_id: config.vehicle_id,
            refuel_threshold_percent: config.refuel_threshold_percent,
            theft_threshold_percent: config.theft_threshold_percent,
            use_kalman_filter: config.use_kalman_filter,
            use_temperature_compensation: config.use_temperature_compensation,
            min_event_duration_seconds: config.min_event_duration_seconds,
            is_active: config.is_active,
          });
        
        if (error) throw error;
        toast.success("Configuration created");
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingConfig ? "Edit" : "Configure"} Fuel Detection</DialogTitle>
          <DialogDescription>
            Set thresholds for detecting refuel and theft events automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="config-vehicle">Vehicle</Label>
            <Select 
              value={config.vehicle_id}
              onValueChange={v => setConfig({ ...config, vehicle_id: v })}
              disabled={!!existingConfig}
            >
              <SelectTrigger id="config-vehicle">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate_number} ({v.make} {v.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="refuel-threshold">Refuel Threshold (%)</Label>
              <Input
                id="refuel-threshold"
                type="number"
                min={1}
                max={50}
                value={config.refuel_threshold_percent}
                onChange={e => setConfig({ ...config, refuel_threshold_percent: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Min fuel increase to detect refuel
              </p>
            </div>
            <div>
              <Label htmlFor="theft-threshold">Theft Threshold (%)</Label>
              <Input
                id="theft-threshold"
                type="number"
                min={1}
                max={50}
                value={config.theft_threshold_percent}
                onChange={e => setConfig({ ...config, theft_threshold_percent: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Min fuel drop to detect theft
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="kalman-filter" className="cursor-pointer">Kalman Filter</Label>
                <p className="text-xs text-muted-foreground">Noise reduction</p>
              </div>
              <Switch
                id="kalman-filter"
                checked={config.use_kalman_filter}
                onCheckedChange={v => setConfig({ ...config, use_kalman_filter: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="temp-compensation" className="cursor-pointer">Temp Comp.</Label>
                <p className="text-xs text-muted-foreground">Temperature adjust</p>
              </div>
              <Switch
                id="temp-compensation"
                checked={config.use_temperature_compensation}
                onCheckedChange={v => setConfig({ ...config, use_temperature_compensation: v })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="min-duration">Min Event Duration (seconds)</Label>
            <Input
              id="min-duration"
              type="number"
              min={10}
              max={600}
              value={config.min_event_duration_seconds}
              onChange={e => setConfig({ ...config, min_event_duration_seconds: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ignore fluctuations shorter than this
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="is-active" className="cursor-pointer">Active</Label>
              <p className="text-xs text-muted-foreground">Enable detection for this vehicle</p>
            </div>
            <Switch
              id="is-active"
              checked={config.is_active}
              onCheckedChange={v => setConfig({ ...config, is_active: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !config.vehicle_id}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existingConfig ? "Update" : "Create"} Config
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
