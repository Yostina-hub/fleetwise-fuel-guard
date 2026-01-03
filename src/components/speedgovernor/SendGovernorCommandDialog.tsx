import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";
import { Send, AlertTriangle, Gauge, Power, StopCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Vehicle {
  id: string;
  plate: string;
  maxSpeed: number;
  governorActive: boolean;
  hasConfig: boolean;
}

interface SendGovernorCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  selectedVehicleId?: string;
}

type CommandType = "set_speed_limit" | "enable_governor" | "disable_governor" | "emergency_stop";

const commandTypes: { value: CommandType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "set_speed_limit", 
    label: "Set Speed Limit", 
    icon: <Gauge className="h-4 w-4" />,
    description: "Send new speed limit to the governor device"
  },
  { 
    value: "enable_governor", 
    label: "Enable Governor", 
    icon: <Power className="h-4 w-4" />,
    description: "Activate speed limiting on the vehicle"
  },
  { 
    value: "disable_governor", 
    label: "Disable Governor", 
    icon: <Power className="h-4 w-4" />,
    description: "Deactivate speed limiting (use with caution)"
  },
  { 
    value: "emergency_stop", 
    label: "Emergency Stop", 
    icon: <StopCircle className="h-4 w-4" />,
    description: "Send emergency stop command to vehicle"
  },
];

export function SendGovernorCommandDialog({ 
  open, 
  onOpenChange, 
  vehicles,
  selectedVehicleId 
}: SendGovernorCommandDialogProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [vehicleId, setVehicleId] = useState(selectedVehicleId || "");
  const [commandType, setCommandType] = useState<CommandType>("set_speed_limit");
  const [speedLimit, setSpeedLimit] = useState(80);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmDangerous, setConfirmDangerous] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const isDangerousCommand = commandType === "disable_governor" || commandType === "emergency_stop";

  const handleSend = async () => {
    if (!vehicleId || !organizationId || !user) {
      toast({
        title: "Error",
        description: "Please select a vehicle",
        variant: "destructive",
      });
      return;
    }

    if (isDangerousCommand && !confirmDangerous) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm this dangerous command",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-governor-command", {
        body: {
          vehicleId,
          commandType,
          speedLimit: commandType === "set_speed_limit" ? speedLimit : undefined,
          phoneNumber: phoneNumber || undefined,
          organizationId,
          userId: user.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Command Sent",
        description: `${commandTypes.find(c => c.value === commandType)?.label} command sent to ${selectedVehicle?.plate}`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["governor-command-logs"] });
      queryClient.invalidateQueries({ queryKey: ["speed-governor-configs"] });

      // Reset and close
      setConfirmDangerous(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending command:", error);
      toast({
        title: "Command Failed",
        description: error.message || "Failed to send governor command",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Governor Command
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Target Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate} {v.hasConfig ? `(${v.maxSpeed} km/h)` : "(Not configured)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Command Type */}
          <div className="space-y-2">
            <Label htmlFor="command-type">Command Type</Label>
            <Select value={commandType} onValueChange={(v) => setCommandType(v as CommandType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {commandTypes.map((cmd) => (
                  <SelectItem key={cmd.value} value={cmd.value}>
                    <div className="flex items-center gap-2">
                      {cmd.icon}
                      <span>{cmd.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {commandTypes.find(c => c.value === commandType)?.description}
            </p>
          </div>

          {/* Speed Limit (conditional) */}
          {commandType === "set_speed_limit" && (
            <div className="space-y-2">
              <Label htmlFor="speed-limit">Speed Limit (km/h)</Label>
              <Input
                id="speed-limit"
                type="number"
                min={20}
                max={180}
                value={speedLimit}
                onChange={(e) => setSpeedLimit(Number(e.target.value))}
              />
            </div>
          )}

          {/* Optional Phone Number Override */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Override device phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to use device's registered phone number
            </p>
          </div>

          {/* Dangerous Command Warning */}
          {isDangerousCommand && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    {commandType === "emergency_stop" 
                      ? "This will send an emergency stop command to the vehicle!"
                      : "Disabling the governor removes speed limiting protection!"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="confirm-dangerous"
                      checked={confirmDangerous}
                      onCheckedChange={setConfirmDangerous}
                    />
                    <Label htmlFor="confirm-dangerous" className="text-sm">
                      I understand and confirm this action
                    </Label>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!vehicleId || isSending || (isDangerousCommand && !confirmDangerous)}
            variant={isDangerousCommand ? "destructive" : "default"}
          >
            {isSending ? "Sending..." : "Send Command"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
