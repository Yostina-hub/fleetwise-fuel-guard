/**
 * BatchSpeedCommandDialog
 * -----------------------
 * Sends a `set_speed_limit` command to multiple vehicles in one shot.
 * Standardized validation: Zod + `useFieldValidation`, Sonner toasts,
 * error-summary banner, inline errors with destructive borders.
 *
 * Guards:
 *   - Speed limit constrained to 20–180 km/h (governor firmware range).
 *   - Vehicle batch capped at MAX_BATCH (50) to prevent runaway dispatches
 *     and edge-function timeouts.
 *   - Form + selection state reset on dialog close.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";
import {
  Gauge,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useFieldValidation } from "@/hooks/useFieldValidation";

interface Vehicle {
  id: string;
  plate: string;
  maxSpeed: number;
  governorActive: boolean;
  hasConfig: boolean;
}

interface BatchSpeedCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
}

interface BatchResult {
  vehicleId: string;
  plate: string;
  success: boolean;
  commandId?: string;
  error?: string;
}

const MIN_SPEED = 20;
const MAX_SPEED = 180;
const MAX_BATCH = 50;

const buildSchema = () =>
  z.object({
    speedLimit: z
      .number({ invalid_type_error: "Enter a numeric speed" })
      .int("Speed must be a whole number")
      .min(MIN_SPEED, `Speed must be at least ${MIN_SPEED} km/h`)
      .max(MAX_SPEED, `Speed must be at most ${MAX_SPEED} km/h`),
    vehicleIds: z
      .array(z.string())
      .min(1, "Select at least one vehicle")
      .max(MAX_BATCH, `You can dispatch to at most ${MAX_BATCH} vehicles at a time`),
  });

export function BatchSpeedCommandDialog({
  open,
  onOpenChange,
  vehicles,
}: BatchSpeedCommandDialogProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [speedLimit, setSpeedLimit] = useState(80);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);

  const schema = useMemo(() => buildSchema(), []);
  const v = useFieldValidation(schema, () => ({
    speedLimit,
    vehicleIds: selectedVehicleIds,
  }));

  // Reset everything when dialog closes
  useEffect(() => {
    if (!open) {
      v.reset();
      setResults(null);
      setSelectedVehicleIds([]);
      setIsSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicleIds((prev) => {
      const next = prev.includes(vehicleId)
        ? prev.filter((id) => id !== vehicleId)
        : [...prev, vehicleId];
      v.handleChange("vehicleIds", next);
      return next;
    });
  };

  const selectAll = () => {
    const next =
      selectedVehicleIds.length === vehicles.length
        ? []
        : vehicles.slice(0, MAX_BATCH).map((veh) => veh.id);
    setSelectedVehicleIds(next);
    v.handleChange("vehicleIds", next);
    if (vehicles.length > MAX_BATCH && next.length > 0) {
      toast.message(`Selected first ${MAX_BATCH} of ${vehicles.length} vehicles`, {
        description: "Batch is capped to prevent dispatch overload.",
      });
    }
  };

  const errCls = (field: "speedLimit" | "vehicleIds") =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const handleSendBatch = async () => {
    if (!organizationId || !user) {
      toast.error("Missing organization context");
      return;
    }

    const result = v.validateAll({
      speedLimit,
      vehicleIds: selectedVehicleIds,
    });
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(
        `Please fix ${count} field${count > 1 ? "s" : ""} before sending`,
      );
      return;
    }

    setIsSending(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-governor-command",
        {
          body: {
            vehicleIds: selectedVehicleIds,
            commandType: "set_speed_limit",
            speedLimit,
            organizationId,
            userId: user.id,
            isBatch: true,
          },
        },
      );

      if (error) throw error;

      const batchResults = (data?.results ?? []) as BatchResult[];
      setResults(batchResults);

      const successCount = batchResults.filter((r) => r.success).length;
      if (successCount === batchResults.length) {
        toast.success(
          `Batch command sent to ${successCount}/${batchResults.length} vehicles`,
        );
      } else {
        toast.warning(
          `Batch sent to ${successCount}/${batchResults.length} vehicles — some failed`,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["governor-command-logs"] });
      queryClient.invalidateQueries({ queryKey: ["speed-governor-configs"] });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send batch command";
      console.error("Error sending batch command:", err);
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  const errorCount = Object.keys(v.errors).filter(
    (k) => (v.touched as any)[k],
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Batch Speed Limit Command
          </DialogTitle>
          <DialogDescription>
            Set the same speed limit for multiple vehicles at once (max{" "}
            {MAX_BATCH} per batch)
          </DialogDescription>
        </DialogHeader>

        {!results && errorCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Please fix {errorCount} issue{errorCount > 1 ? "s" : ""} below
              before sending.
            </span>
          </div>
        )}

        {results ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {results.filter((r) => r.success).length} / {results.length}{" "}
                Successful
              </Badge>
            </div>
            <ScrollArea className="h-[300px] border rounded-lg p-3">
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.vehicleId}
                    className={`flex items-center justify-between p-2 rounded ${
                      result.success
                        ? "bg-green-50 dark:bg-green-950"
                        : "bg-red-50 dark:bg-red-950"
                    }`}
                  >
                    <span className="font-medium text-sm">{result.plate}</span>
                    {result.success ? (
                      <Badge variant="default" className="bg-green-600 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {result.error || "Failed"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch-speed">Speed Limit (km/h)</Label>
              <Input
                id="batch-speed"
                type="number"
                min={MIN_SPEED}
                max={MAX_SPEED}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Select Vehicles ({selectedVehicleIds.length} / {MAX_BATCH}{" "}
                  selected)
                </Label>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedVehicleIds.length === vehicles.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <ScrollArea
                className={`h-[250px] border rounded-lg p-3 ${errCls("vehicleIds")}`}
              >
                <div className="space-y-2">
                  {vehicles.map((vehicle) => {
                    const isSelected = selectedVehicleIds.includes(vehicle.id);
                    const atCap =
                      !isSelected && selectedVehicleIds.length >= MAX_BATCH;
                    return (
                      <div
                        key={vehicle.id}
                        className={`flex items-center gap-3 p-2 rounded hover:bg-muted ${
                          atCap ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        onClick={() => {
                          if (atCap) {
                            toast.warning(
                              `Batch capped at ${MAX_BATCH} vehicles`,
                            );
                            return;
                          }
                          toggleVehicle(vehicle.id);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={atCap}
                          onCheckedChange={() => {
                            if (atCap) return;
                            toggleVehicle(vehicle.id);
                          }}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{vehicle.plate}</span>
                          {vehicle.hasConfig && (
                            <span className="text-xs text-muted-foreground ml-2">
                              Current: {vehicle.maxSpeed} km/h
                            </span>
                          )}
                        </div>
                        {vehicle.governorActive && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              {v.getError("vehicleIds") && (
                <p className="text-sm text-destructive">
                  {v.getError("vehicleIds")}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button
              onClick={handleSendBatch}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                `Send to ${selectedVehicleIds.length} Vehicle${selectedVehicleIds.length === 1 ? "" : "s"}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
