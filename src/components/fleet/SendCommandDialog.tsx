import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  Power, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Volume2,
  Zap,
  RotateCcw,
  Loader2
} from "lucide-react";

interface SendCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
  } | null;
}

const COMMANDS = [
  { 
    value: "immobilize", 
    label: "Immobilize Vehicle", 
    icon: Power,
    description: "Disable the engine remotely",
    severity: "destructive" as const
  },
  { 
    value: "restore", 
    label: "Restore Vehicle", 
    icon: RotateCcw,
    description: "Re-enable the engine",
    severity: "default" as const
  },
  { 
    value: "lock", 
    label: "Lock Doors", 
    icon: Lock,
    description: "Lock all vehicle doors",
    severity: "default" as const
  },
  { 
    value: "unlock", 
    label: "Unlock Doors", 
    icon: Unlock,
    description: "Unlock all vehicle doors",
    severity: "default" as const
  },
  { 
    value: "horn", 
    label: "Sound Horn", 
    icon: Volume2,
    description: "Sound the horn for 5 seconds",
    severity: "default" as const
  },
  { 
    value: "flash", 
    label: "Flash Lights", 
    icon: Zap,
    description: "Flash headlights 5 times",
    severity: "default" as const
  },
];

export const SendCommandDialog = ({ 
  open, 
  onOpenChange, 
  vehicle 
}: SendCommandDialogProps) => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [selectedCommand, setSelectedCommand] = useState<string>("lock");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(false);

  // Fetch device associated with this vehicle
  useEffect(() => {
    const fetchDevice = async () => {
      if (!vehicle?.vehicleId || !organizationId) return;
      
      setLoadingDevice(true);
      try {
        const { data, error } = await supabase
          .from("devices")
          .select("id")
          .eq("vehicle_id", vehicle.vehicleId)
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .maybeSingle();

        if (!error && data) {
          setDeviceId(data.id);
        } else {
          setDeviceId(null);
        }
      } catch (err) {
        console.error("Error fetching device:", err);
        setDeviceId(null);
      } finally {
        setLoadingDevice(false);
      }
    };

    if (open) {
      fetchDevice();
    }
  }, [vehicle?.vehicleId, organizationId, open]);

  const handleSendCommand = async () => {
    if (!vehicle || !selectedCommand || !organizationId) return;

    if (!deviceId) {
      toast.error("No device assigned", {
        description: "This vehicle has no active GPS device.",
      });
      return;
    }

    setSending(true);
    
    try {
      const command = COMMANDS.find(c => c.value === selectedCommand);
      
      const { error } = await supabase
        .from("device_commands")
        .insert({
          device_id: deviceId,
          vehicle_id: vehicle.vehicleId,
          organization_id: organizationId,
          command_type: selectedCommand,
          command_payload: { notes },
          priority: command?.severity === "destructive" ? "critical" : "normal",
          status: "pending",
          created_by: user?.id || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      if (error) throw error;
      
      toast.success(`Command queued: ${command?.label}`, {
        description: `${vehicle.plate} - Will be sent to device`,
      });
      
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending command:", error);
      toast.error("Failed to queue command");
    } finally {
      setSending(false);
    }
  };

  const selectedCommandData = COMMANDS.find(c => c.value === selectedCommand);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Power className="w-5 h-5 text-primary" />
            Send Command
            {loadingDevice ? (
              <Loader2 className="h-4 w-4 animate-spin ml-auto" />
            ) : deviceId ? (
              <Badge variant="outline" className="ml-auto text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Device Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                No Device
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {vehicle && (
              <>
                Send a remote command to <strong>{vehicle.plate}</strong> ({vehicle.make} {vehicle.model})
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* No device warning */}
        {!loadingDevice && !deviceId && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">No GPS Device</p>
              <p className="text-muted-foreground">
                This vehicle has no active GPS device assigned.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Select Command</Label>
            <RadioGroup
              value={selectedCommand}
              onValueChange={setSelectedCommand}
              className="grid grid-cols-2 gap-3"
            >
              {COMMANDS.map((command) => {
                const Icon = command.icon;
                return (
                  <label
                    key={command.value}
                    htmlFor={command.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted ${
                      selectedCommand === command.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    } ${command.severity === "destructive" ? "hover:border-destructive/50" : ""}`}
                  >
                    <RadioGroupItem
                      value={command.value}
                      id={command.value}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${
                          command.severity === "destructive" 
                            ? "text-destructive" 
                            : "text-primary"
                        }`} />
                        <span className="font-medium text-sm">{command.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {command.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {selectedCommandData?.severity === "destructive" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Warning</p>
                <p className="text-muted-foreground">
                  This action will disable the vehicle. Make sure this is intentional.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes for this command..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendCommand}
            disabled={sending || !selectedCommand}
            variant={selectedCommandData?.severity === "destructive" ? "destructive" : "default"}
          >
            {sending ? "Sending..." : "Send Command"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};