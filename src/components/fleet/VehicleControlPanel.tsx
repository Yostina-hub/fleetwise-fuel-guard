import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  Power, 
  Zap,
  BellOff,
  ShieldCheck,
  DollarSign,
  Headphones,
  Gauge,
  ChevronRight,
  X
} from "lucide-react";

interface VehicleControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
    phoneNumber?: string;
  } | null;
  organizationId?: string;
}

type CommandType = 
  | "stop_engine" 
  | "restore" 
  | "stop_alarm" 
  | "silent_arm" 
  | "enquiry_fee" 
  | "listen" 
  | "overspeed";

type SubDialogType = CommandType | null;

const CONTROL_ITEMS = [
  { 
    value: "stop_engine" as CommandType, 
    label: "Stop engine", 
    icon: Power,
    hasSubOptions: true
  },
  { 
    value: "restore" as CommandType, 
    label: "Restoring gas and electricity", 
    icon: Zap,
    hasSubOptions: false,
    confirmMessage: "Whether to determine whether to restore the oil and power of the equipment?"
  },
  { 
    value: "stop_alarm" as CommandType, 
    label: "Stop alarm", 
    icon: BellOff,
    hasSubOptions: false,
    confirmMessage: "Are you sure to stop the alarm?"
  },
  { 
    value: "silent_arm" as CommandType, 
    label: "Silent Arm", 
    icon: ShieldCheck,
    hasSubOptions: false,
    confirmMessage: "Are you sure to deploy silent defense?"
  },
  { 
    value: "enquiry_fee" as CommandType, 
    label: "Enquiry fee", 
    icon: DollarSign,
    hasSubOptions: true
  },
  { 
    value: "listen" as CommandType, 
    label: "Listen", 
    icon: Headphones,
    hasSubOptions: true
  },
  { 
    value: "overspeed" as CommandType, 
    label: "Overspeed", 
    icon: Gauge,
    hasSubOptions: true,
    hasToggle: true
  },
];

export const VehicleControlPanel = ({ 
  open, 
  onOpenChange, 
  vehicle,
  organizationId: propOrganizationId
}: VehicleControlPanelProps) => {
  const { user } = useAuth();
  const { organizationId: hookOrganizationId } = useOrganization();
  const organizationId = propOrganizationId || hookOrganizationId;
  const [activeSubDialog, setActiveSubDialog] = useState<SubDialogType>(null);
  const [sending, setSending] = useState(false);
  
  // Stop Engine options
  const [oilCutMode, setOilCutMode] = useState<"immediate" | "delayed">("immediate");
  
  // Listen options
  const [listenMode, setListenMode] = useState<"listen" | "tracker">("tracker");
  
  // Overspeed options
  const [overspeedEnabled, setOverspeedEnabled] = useState(false);
  const [speedLimit, setSpeedLimit] = useState("80");
  
  // Enquiry fee options
  const [operatorNumber, setOperatorNumber] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [carrierNumber, setCarrierNumber] = useState("");

  const handleItemClick = (item: typeof CONTROL_ITEMS[0]) => {
    setActiveSubDialog(item.value);
  };

  const handleConfirm = async () => {
    if (!vehicle || !activeSubDialog) return;

    setSending(true);
    
    try {
      let commandData: Record<string, any> = {};
      let smsContent = "";
      
      switch (activeSubDialog) {
        case "stop_engine":
          commandData = { mode: oilCutMode };
          smsContent = oilCutMode === "immediate" 
            ? "stop123456" 
            : "stopdelay123456";
          break;
        case "restore":
          commandData = { action: "restore" };
          smsContent = "resume123456";
          break;
        case "stop_alarm":
          commandData = { action: "stop_alarm" };
          smsContent = "noalarm123456";
          break;
        case "silent_arm":
          commandData = { action: "silent_arm" };
          smsContent = "arm123456";
          break;
        case "listen":
          commandData = { mode: listenMode };
          smsContent = listenMode === "listen" 
            ? "monitor123456" 
            : "tracker123456";
          break;
        case "overspeed":
          commandData = { 
            enabled: overspeedEnabled, 
            speed_limit: parseInt(speedLimit) 
          };
          smsContent = overspeedEnabled 
            ? `speed123456 ${speedLimit}` 
            : "nospeed123456";
          break;
        case "enquiry_fee":
          commandData = { 
            operator_number: operatorNumber,
            message_content: messageContent,
            carrier_number: carrierNumber
          };
          smsContent = `balance123456 ${operatorNumber}`;
          break;
      }

      // Log command to governor_command_logs
      const { error } = await (supabase as any)
        .from("governor_command_logs")
        .insert({
          vehicle_id: vehicle.vehicleId,
          organization_id: organizationId,
          command_type: activeSubDialog,
          command_data: commandData,
          phone_number: vehicle.phoneNumber || null,
          sms_content: smsContent,
          status: "pending",
          created_by: user?.id || null,
        });

      if (error) throw error;

      // Optionally invoke edge function to send SMS
      if (vehicle.phoneNumber) {
        await supabase.functions.invoke("send-governor-command", {
          body: {
            vehicleId: vehicle.vehicleId,
            commandType: activeSubDialog,
            commandData,
            phoneNumber: vehicle.phoneNumber,
            organizationId,
            userId: user?.id,
          },
        });
      }

      const item = CONTROL_ITEMS.find(c => c.value === activeSubDialog);
      toast.success(`Command sent: ${item?.label}`, {
        description: `${vehicle.plate} - ${vehicle.make} ${vehicle.model}`,
      });
      
      setActiveSubDialog(null);
    } catch (error) {
      console.error("Error sending command:", error);
      toast.error("Failed to send command");
    } finally {
      setSending(false);
    }
  };

  const renderSubDialog = () => {
    if (!activeSubDialog) return null;
    
    const item = CONTROL_ITEMS.find(c => c.value === activeSubDialog);
    if (!item) return null;

    return (
      <Dialog open={!!activeSubDialog} onOpenChange={() => setActiveSubDialog(null)}>
        <DialogContent className="sm:max-w-[400px]" hideClose>
          <DialogHeader className="bg-foreground text-background -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <DialogTitle className="text-center">{item.label}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Stop Engine Options */}
            {activeSubDialog === "stop_engine" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Oil-Cut Mode Setting
                </p>
                <RadioGroup value={oilCutMode} onValueChange={(v) => setOilCutMode(v as "immediate" | "delayed")}>
                  <label
                    className={`flex items-center justify-center p-3 rounded-full cursor-pointer transition-all ${
                      oilCutMode === "immediate"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <RadioGroupItem value="immediate" className="sr-only" />
                    <span>Immediate oil cutoff</span>
                  </label>
                  <label
                    className={`flex items-center justify-center p-3 rounded-full cursor-pointer transition-all ${
                      oilCutMode === "delayed"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <RadioGroupItem value="delayed" className="sr-only" />
                    <span>Delayed oil cutoff</span>
                  </label>
                </RadioGroup>
              </div>
            )}

            {/* Simple Confirmation */}
            {(activeSubDialog === "restore" || 
              activeSubDialog === "stop_alarm" || 
              activeSubDialog === "silent_arm") && (
              <p className="text-center text-muted-foreground">
                {item.confirmMessage}
              </p>
            )}

            {/* Listen Options */}
            {activeSubDialog === "listen" && (
              <div className="space-y-3">
                <RadioGroup value={listenMode} onValueChange={(v) => setListenMode(v as "listen" | "tracker")}>
                  <label
                    className={`flex items-center justify-center p-3 rounded-full cursor-pointer transition-all ${
                      listenMode === "listen"
                        ? "bg-muted hover:bg-muted/80"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <RadioGroupItem value="listen" className="sr-only" />
                    <span>listen mode</span>
                  </label>
                  <label
                    className={`flex items-center justify-center p-3 rounded-full cursor-pointer transition-all ${
                      listenMode === "tracker"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <RadioGroupItem value="tracker" className="sr-only" />
                    <span>Tracker mode</span>
                  </label>
                </RadioGroup>
              </div>
            )}

            {/* Overspeed Options */}
            {activeSubDialog === "overspeed" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Overspeed Alert</Label>
                  <Switch
                    checked={overspeedEnabled}
                    onCheckedChange={setOverspeedEnabled}
                  />
                </div>
                {overspeedEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="speed-limit">Speed Limit (km/h)</Label>
                    <Input
                      id="speed-limit"
                      type="number"
                      value={speedLimit}
                      onChange={(e) => setSpeedLimit(e.target.value)}
                      min="20"
                      max="180"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Enquiry Fee Options */}
            {activeSubDialog === "enquiry_fee" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Method 1: The device sends an SMS command to the operator to query the phone charge
                  </p>
                  <Input
                    placeholder="Please enter operator number"
                    value={operatorNumber}
                    onChange={(e) => setOperatorNumber(e.target.value)}
                    className="mb-2"
                  />
                  <Input
                    placeholder="Please enter the message content"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Method 2: The device reports all messages sent by the carrier number to the platform
                  </p>
                  <Input
                    placeholder="Please enter operator number"
                    value={carrierNumber}
                    onChange={(e) => setCarrierNumber(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-between border-t pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setActiveSubDialog(null)}
              disabled={sending}
              className="flex-1"
            >
              Cancel
            </Button>
            <div className="w-px bg-border h-8" />
            <Button
              variant="ghost"
              onClick={handleConfirm}
              disabled={sending}
              className="flex-1 text-primary hover:text-primary"
            >
              {sending ? "Sending..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px] p-0" hideClose>
          <DialogHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-lg font-semibold">Control</DialogTitle>
              <div className="w-8" /> {/* Spacer for centering */}
            </div>
            {vehicle && (
              <p className="text-sm text-muted-foreground text-center">
                {vehicle.plate} - {vehicle.make} {vehicle.model}
              </p>
            )}
          </DialogHeader>

          <div className="divide-y">
            {CONTROL_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value === "overspeed" && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {overspeedEnabled ? `${speedLimit} km/h` : "0 km/h"}
                        </span>
                        <Switch
                          checked={overspeedEnabled}
                          onCheckedChange={(checked) => {
                            setOverspeedEnabled(checked);
                            if (!checked) {
                              // Send disable command
                              handleItemClick(item);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {renderSubDialog()}
    </>
  );
};
