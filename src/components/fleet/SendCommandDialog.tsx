import { useState } from "react";
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
import { toast } from "sonner";
import { 
  Power, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Volume2,
  Zap,
  RotateCcw
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
  const [selectedCommand, setSelectedCommand] = useState<string>("lock");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendCommand = async () => {
    if (!vehicle || !selectedCommand) return;

    setSending(true);
    
    // Simulate API call - in production this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const command = COMMANDS.find(c => c.value === selectedCommand);
    toast.success(`Command sent: ${command?.label}`, {
      description: `${vehicle.plate} - ${vehicle.make} ${vehicle.model}`,
    });
    
    setSending(false);
    setNotes("");
    onOpenChange(false);
  };

  const selectedCommandData = COMMANDS.find(c => c.value === selectedCommand);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Power className="w-5 h-5 text-primary" />
            Send Command
          </DialogTitle>
          <DialogDescription>
            {vehicle && (
              <>
                Send a remote command to <strong>{vehicle.plate}</strong> ({vehicle.make} {vehicle.model})
              </>
            )}
          </DialogDescription>
        </DialogHeader>

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