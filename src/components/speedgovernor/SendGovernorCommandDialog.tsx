/**
 * SendGovernorCommandDialog
 * -------------------------
 * Issues a remote command to a vehicle's speed governor (set limit, enable,
 * disable, or emergency stop). Validation follows the project standard:
 * Zod schema + `useFieldValidation`, Sonner toasts, error-summary banner,
 * inline messages with destructive borders, and a Loader2 spinner.
 *
 * Safety guards:
 *   - Speed limit constrained to 20–180 km/h (matches governor firmware).
 *   - Phone number normalized to digits + optional leading '+'.
 *   - Dangerous commands (`disable_governor`, `emergency_stop`) require an
 *     explicit confirm switch before submit.
 */
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Send,
  AlertTriangle,
  AlertCircle,
  Gauge,
  Power,
  StopCircle,
  Phone,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFieldValidation } from "@/hooks/useFieldValidation";

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

type CommandType =
  | "set_speed_limit"
  | "enable_governor"
  | "disable_governor"
  | "emergency_stop";

const MIN_SPEED_LIMIT = 20;
const MAX_SPEED_LIMIT = 180;
const PHONE_MAX = 13;

const commandTypes: {
  value: CommandType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "set_speed_limit",
    label: "Set Speed Limit",
    icon: <Gauge className="h-4 w-4" />,
    description: "Send new speed limit to the governor device",
  },
  {
    value: "enable_governor",
    label: "Enable Governor",
    icon: <Power className="h-4 w-4" />,
    description: "Activate speed limiting on the vehicle",
  },
  {
    value: "disable_governor",
    label: "Disable Governor",
    icon: <Power className="h-4 w-4" />,
    description: "Deactivate speed limiting (use with caution)",
  },
  {
    value: "emergency_stop",
    label: "Emergency Stop",
    icon: <StopCircle className="h-4 w-4" />,
    description: "Send emergency stop command to vehicle",
  },
];

// Schema is built once per render; cross-field rules guard the speed limit
// range only when the relevant command is active, and require a non-empty
// phone string that looks like a real MSISDN.
const buildSchema = () =>
  z
    .object({
      vehicleId: z.string().min(1, "Select a target vehicle"),
      commandType: z.enum([
        "set_speed_limit",
        "enable_governor",
        "disable_governor",
        "emergency_stop",
      ]),
      speedLimit: z.number().int(),
      phoneNumber: z
        .string()
        .trim()
        .max(PHONE_MAX, `Keep phone under ${PHONE_MAX} characters`)
        .optional()
        .or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      if (data.commandType === "set_speed_limit") {
        if (
          !Number.isFinite(data.speedLimit) ||
          data.speedLimit < MIN_SPEED_LIMIT ||
          data.speedLimit > MAX_SPEED_LIMIT
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["speedLimit"],
            message: `Speed must be between ${MIN_SPEED_LIMIT} and ${MAX_SPEED_LIMIT} km/h`,
          });
        }
      }
      if (data.phoneNumber && data.phoneNumber.trim() !== "") {
        // Accept either '+<digits>' or pure digits; min 7 to catch typos.
        const ok = /^\+?\d{7,12}$/.test(data.phoneNumber.trim());
        if (!ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["phoneNumber"],
            message: "Enter 7–12 digits, optional leading +",
          });
        }
      }
    });

export function SendGovernorCommandDialog({
  open,
  onOpenChange,
  vehicles,
  selectedVehicleId,
}: SendGovernorCommandDialogProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [vehicleId, setVehicleId] = useState(selectedVehicleId || "");
  const [commandType, setCommandType] =
    useState<CommandType>("set_speed_limit");
  const [speedLimit, setSpeedLimit] = useState(80);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmDangerous, setConfirmDangerous] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const schema = useMemo(() => buildSchema(), []);
  const v = useFieldValidation(schema, () => ({
    vehicleId,
    commandType,
    speedLimit,
    phoneNumber,
  }));

  // Fetch device info when vehicle is selected
  const { data: deviceInfo } = useQuery({
    queryKey: ["device-info", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase
        .from("devices")
        .select("sim_msisdn, imei")
        .eq("vehicle_id", vehicleId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!vehicleId,
  });

  // Pre-fill phone number when device info is loaded
  useEffect(() => {
    if (deviceInfo?.sim_msisdn && !phoneNumber) {
      setPhoneNumber(deviceInfo.sim_msisdn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceInfo?.sim_msisdn]);

  // Reset phone + validation when vehicle changes
  useEffect(() => {
    setPhoneNumber("");
  }, [vehicleId]);

  // Reset everything when dialog closes
  useEffect(() => {
    if (!open) {
      v.reset();
      setConfirmDangerous(false);
      setIsSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const isDangerousCommand =
    commandType === "disable_governor" || commandType === "emergency_stop";

  const errCls = (field: "vehicleId" | "speedLimit" | "phoneNumber") =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const handleSend = async () => {
    if (!organizationId || !user) {
      toast.error("Missing organization context");
      return;
    }

    const result = v.validateAll({
      vehicleId,
      commandType,
      speedLimit,
      phoneNumber,
    });
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(
        `Please fix ${count} field${count > 1 ? "s" : ""} before sending`,
      );
      return;
    }

    if (isDangerousCommand && !confirmDangerous) {
      toast.error("Please confirm this dangerous command");
      return;
    }

    setIsSending(true);

    try {
      const { error } = await supabase.functions.invoke(
        "send-governor-command",
        {
          body: {
            vehicleId,
            commandType,
            speedLimit:
              commandType === "set_speed_limit" ? speedLimit : undefined,
            phoneNumber: phoneNumber || undefined,
            organizationId,
            userId: user.id,
          },
        },
      );

      if (error) throw error;

      toast.success(
        `${commandTypes.find((c) => c.value === commandType)?.label} command sent to ${selectedVehicle?.plate ?? "vehicle"}`,
      );

      queryClient.invalidateQueries({ queryKey: ["governor-command-logs"] });
      queryClient.invalidateQueries({ queryKey: ["speed-governor-configs"] });

      setConfirmDangerous(false);
      setPhoneNumber("");
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send governor command";
      console.error("Error sending command:", error);
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const errorCount = Object.keys(v.errors).filter(
    (k) => (v.touched as any)[k],
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Governor Command
          </DialogTitle>
        </DialogHeader>

        {errorCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Please fix {errorCount} field{errorCount > 1 ? "s" : ""} below
              before sending.
            </span>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Target Vehicle</Label>
            <Select
              value={vehicleId}
              onValueChange={(val) => {
                setVehicleId(val);
                v.handleChange("vehicleId", val);
              }}
            >
              <SelectTrigger
                aria-invalid={!!v.getError("vehicleId")}
                className={errCls("vehicleId")}
                onBlur={() => v.handleBlur("vehicleId", vehicleId)}
              >
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((veh) => (
                  <SelectItem key={veh.id} value={veh.id}>
                    {veh.plate}{" "}
                    {veh.hasConfig
                      ? `(${veh.maxSpeed} km/h)`
                      : "(Not configured)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {v.getError("vehicleId") && (
              <p className="text-sm text-destructive">
                {v.getError("vehicleId")}
              </p>
            )}
          </div>

          {/* Command Type */}
          <div className="space-y-2">
            <Label htmlFor="command-type">Command Type</Label>
            <Select
              value={commandType}
              onValueChange={(val) => setCommandType(val as CommandType)}
            >
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
              {commandTypes.find((c) => c.value === commandType)?.description}
            </p>
          </div>

          {/* Speed Limit (conditional) */}
          {commandType === "set_speed_limit" && (
            <div className="space-y-2">
              <Label htmlFor="speed-limit">Speed Limit (km/h)</Label>
              <Input
                id="speed-limit"
                type="number"
                min={MIN_SPEED_LIMIT}
                max={MAX_SPEED_LIMIT}
                value={speedLimit}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSpeedLimit(n);
                  v.handleChange("speedLimit", n);
                }}
                onBlur={() => v.handleBlur("speedLimit", speedLimit)}
                aria-invalid={!!v.getError("speedLimit")}
                className={errCls("speedLimit")}
              />
              {v.getError("speedLimit") && (
                <p className="text-sm text-destructive">
                  {v.getError("speedLimit")}
                </p>
              )}
            </div>
          )}

          {/* Phone Number with pre-fill */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              maxLength={PHONE_MAX}
              placeholder={
                deviceInfo?.sim_msisdn
                  ? `Device: ${deviceInfo.sim_msisdn}`
                  : "No device phone registered"
              }
              value={phoneNumber}
              onChange={(e) => {
                // Live-strip everything except digits and a single leading +.
                const raw = e.target.value;
                const hasPlus = raw.trimStart().startsWith("+");
                const digits = raw.replace(/\D/g, "").slice(0, 12);
                const next = hasPlus ? `+${digits}` : digits;
                setPhoneNumber(next);
                v.handleChange("phoneNumber", next);
              }}
              onBlur={() => v.handleBlur("phoneNumber", phoneNumber)}
              aria-invalid={!!v.getError("phoneNumber")}
              className={errCls("phoneNumber")}
            />
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {deviceInfo?.sim_msisdn
                  ? `Pre-filled from device. Override if needed.`
                  : "No device phone found. Enter manually."}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {phoneNumber.length}/{PHONE_MAX}
              </span>
            </div>
            {v.getError("phoneNumber") && (
              <p className="text-sm text-destructive">
                {v.getError("phoneNumber")}
              </p>
            )}
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
            disabled={
              isSending || (isDangerousCommand && !confirmDangerous)
            }
            variant={isDangerousCommand ? "destructive" : "default"}
          >
            {isSending && (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            )}
            {isSending ? "Sending..." : "Send Command"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
