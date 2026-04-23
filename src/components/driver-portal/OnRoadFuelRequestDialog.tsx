/**
 * OnRoadFuelRequestDialog
 * -----------------------
 * Lightweight, focused refuel request used by the driver while a trip is
 * already in progress (i.e. they are on the road and need an additional
 * fuel top-up before they can complete the trip).
 *
 * Design intent
 *   - Re-use the existing `fuel_requests` table — DO NOT touch the main
 *     FuelRequestFormDialog used by office staff.
 *   - Auto-fill driver, vehicle, route and trip context from the active
 *     vehicle_request so the driver only has to enter the bare minimum
 *     while on the road (current location, odometer, fuel level, liters,
 *     reason).
 *   - Mark the request with `fuel_request_type = "on_road_refuel"` and
 *     `trigger_source = "driver_portal"` so finance / dispatch can
 *     prioritise these in the inbox.
 *   - On success, invalidate the driver-portal submissions / fuel-requests
 *     query keys so the new row shows up immediately under
 *     "My Submissions → Fuel" (history).
 */
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fuel, MapPin, Gauge, Loader2, AlertTriangle, Route } from "lucide-react";
import ConfirmActionDialog from "@/components/users/ConfirmActionDialog";

interface ActiveRequestLike {
  id: string;
  request_number?: string | null;
  destination?: string | null;
  departure_place?: string | null;
  purpose?: string | null;
  assigned_vehicle_id?: string | null;
  assigned_vehicle?: {
    id: string;
    plate_number?: string | null;
    make?: string | null;
    model?: string | null;
    fuel_type?: string | null;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Active vehicle_request the driver is currently on. */
  request: ActiveRequestLike | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  /** Last known odometer (used as default current odometer). */
  lastOdometerKm?: number | null;
}

const URGENCY_OPTIONS = [
  { value: "low",      label: "Low — can wait an hour" },
  { value: "medium",   label: "Medium — need within 30 min" },
  { value: "high",     label: "High — running low" },
  { value: "critical", label: "Critical — almost empty" },
] as const;

const REASON_OPTIONS = [
  { value: "extended_trip",      label: "Trip extended beyond planned distance" },
  { value: "detour",             label: "Unexpected detour / route change" },
  { value: "underestimated",     label: "Initial fuel was underestimated" },
  { value: "no_station_planned", label: "No approved station along route" },
  { value: "high_consumption",   label: "Higher consumption than expected" },
  { value: "other",              label: "Other" },
] as const;

const schema = z.object({
  current_location: z
    .string()
    .trim()
    .min(3, "Tell us where you are (e.g. closest landmark / town)")
    .max(200, "Location must be under 200 characters"),
  current_odometer: z
    .number({ invalid_type_error: "Odometer must be a number" })
    .min(0, "Odometer cannot be negative")
    .max(10_000_000, "Odometer reading is too large"),
  current_fuel_percent: z
    .number({ invalid_type_error: "Fuel level must be a number" })
    .min(0, "Min 0%")
    .max(100, "Max 100%")
    .optional(),
  liters_requested: z
    .number({ invalid_type_error: "Liters must be a number" })
    .positive("Enter the liters needed")
    .max(2000, "Liters value seems too large"),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  reason: z.enum([
    "extended_trip",
    "detour",
    "underestimated",
    "no_station_planned",
    "high_consumption",
    "other",
  ]),
  remaining_distance_km: z
    .number({ invalid_type_error: "Distance must be a number" })
    .min(0)
    .max(10_000)
    .optional(),
  notes: z.string().trim().max(500, "Notes must be under 500 characters").optional(),
});

type FormState = {
  current_location: string;
  current_odometer: string;
  current_fuel_percent: string;
  liters_requested: string;
  urgency: typeof URGENCY_OPTIONS[number]["value"];
  reason: typeof REASON_OPTIONS[number]["value"];
  remaining_distance_km: string;
  notes: string;
};

const initialState = (lastOdometer?: number | null): FormState => ({
  current_location: "",
  current_odometer: lastOdometer != null ? String(lastOdometer) : "",
  current_fuel_percent: "",
  liters_requested: "",
  urgency: "high",
  reason: "extended_trip",
  remaining_distance_km: "",
  notes: "",
});

export const OnRoadFuelRequestDialog = ({
  open,
  onOpenChange,
  request,
  driverId,
  driverName,
  driverPhone,
  lastOdometerKm,
}: Props) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() => initialState(lastOdometerKm));
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset every time the dialog re-opens so a fresh refuel can be filed.
  useEffect(() => {
    if (open) setForm(initialState(lastOdometerKm));
  }, [open, lastOdometerKm]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const vehicle = request?.assigned_vehicle;
  const vehicleId = vehicle?.id ?? request?.assigned_vehicle_id ?? null;
  const vehicleLabel = useMemo(() => {
    if (!vehicle) return "—";
    return [
      vehicle.plate_number,
      [vehicle.make, vehicle.model].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(" · ");
  }, [vehicle]);

  const routeLine = useMemo(() => {
    const from = request?.departure_place?.trim();
    const to = request?.destination?.trim();
    if (from && to) return `${from} → ${to}`;
    return to || from || "—";
  }, [request?.departure_place, request?.destination]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization context");
      if (!request?.id) throw new Error("No active trip — open this from a trip in progress");
      if (!vehicleId) throw new Error("Active trip has no assigned vehicle");

      const parsed = schema.parse({
        current_location: form.current_location,
        current_odometer: Number(form.current_odometer),
        current_fuel_percent:
          form.current_fuel_percent.trim() === "" ? undefined : Number(form.current_fuel_percent),
        liters_requested: Number(form.liters_requested),
        urgency: form.urgency,
        reason: form.reason,
        remaining_distance_km:
          form.remaining_distance_km.trim() === ""
            ? undefined
            : Number(form.remaining_distance_km),
        notes: form.notes.trim() || undefined,
      });

      const reasonLabel =
        REASON_OPTIONS.find((r) => r.value === parsed.reason)?.label ?? parsed.reason;
      const urgencyLabel =
        URGENCY_OPTIONS.find((u) => u.value === parsed.urgency)?.label ?? parsed.urgency;

      const reqNum = `FR-OR-${Date.now().toString(36).toUpperCase()}`;
      const { data: userResp } = await supabase.auth.getUser();

      // Compose a verbose remark/description so reviewers immediately see
      // it is an on-road refuel and the trip context.
      const description = [
        `On-road refuel during trip ${request.request_number || request.id.slice(0, 8)}`,
        `Reason: ${reasonLabel}`,
        `Urgency: ${urgencyLabel}`,
        parsed.current_fuel_percent != null
          ? `Current fuel level: ~${parsed.current_fuel_percent}%`
          : null,
        parsed.remaining_distance_km != null
          ? `Estimated remaining distance: ${parsed.remaining_distance_km} km`
          : null,
        parsed.notes ? `Notes: ${parsed.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const insertData: any = {
        organization_id: organizationId,
        request_type: "vehicle",
        vehicle_id: vehicleId,
        driver_id: driverId || null,
        requested_by: userResp.user?.id,
        request_number: reqNum,
        fuel_type: vehicle?.fuel_type || "diesel",
        liters_requested: parsed.liters_requested,
        purpose: `On-road refuel — ${reasonLabel}`,
        current_odometer: parsed.current_odometer,
        notes: parsed.notes || null,
        additional_description: description,
        remark: `Trip ${request.request_number ?? ""} · ${parsed.current_location}`.trim(),
        route: routeLine !== "—" ? routeLine : parsed.current_location,
        // Reuse existing free-text fields to encode the on-road context
        // without requiring a schema change.
        fuel_request_type: "on_road_refuel",
        context_value: `On-road refuel @ ${parsed.current_location}`,
        priority:
          parsed.urgency === "critical"
            ? "urgent"
            : parsed.urgency === "high"
              ? "high"
              : parsed.urgency === "medium"
                ? "medium"
                : "low",
        driver_name: driverName || null,
        driver_phone: driverPhone || null,
        phone_number: driverPhone || null,
        status: "pending",
        clearance_status: "pending",
        trigger_source: "driver_portal",
        notify_user: true,
        contact_preference: "phone",
      };

      const { data: inserted, error } = await supabase
        .from("fuel_requests")
        .insert(insertData)
        .select("id")
        .single();
      if (error) throw error;

      // Route through the standard approval RPC so the on-road request
      // hits the same approver inbox as a normal fuel request.
      if (inserted?.id) {
        await supabase.rpc("route_fuel_request_approval", {
          p_fuel_request_id: inserted.id,
        });
      }
      return inserted?.id as string | undefined;
    },
    onSuccess: () => {
      toast.success("On-road refuel request submitted", {
        description: "The dispatcher has been notified. Track status in History.",
      });
      // Surface in submissions/history immediately.
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to submit refuel request";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate up-front so we surface friendly errors before the confirm step.
    try {
      schema.parse({
        current_location: form.current_location,
        current_odometer: Number(form.current_odometer),
        current_fuel_percent:
          form.current_fuel_percent.trim() === "" ? undefined : Number(form.current_fuel_percent),
        liters_requested: Number(form.liters_requested),
        urgency: form.urgency,
        reason: form.reason,
        remaining_distance_km:
          form.remaining_distance_km.trim() === ""
            ? undefined
            : Number(form.remaining_distance_km),
        notes: form.notes.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Please fix the highlighted fields");
        return;
      }
      throw err;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-primary" aria-hidden="true" />
              On-Road Refuel Request
            </DialogTitle>
            <DialogDescription>
              You are mid-trip and need an additional refuel. Tell dispatch where you
              are and how much fuel you need — they will arrange the nearest
              clearance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Trip context (read-only) */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" aria-hidden="true" /> Active Trip
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Trip #: </span>
                  <span className="font-mono">
                    {request?.request_number || request?.id?.slice(0, 8) || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle: </span>
                  <span className="font-medium">{vehicleLabel}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Route: </span>
                  <span>{routeLine}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Driver: </span>
                  <span>{driverName || "—"}</span>
                  {driverPhone && (
                    <span className="text-muted-foreground"> · {driverPhone}</span>
                  )}
                </div>
              </div>
              {!vehicleId && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  This trip has no assigned vehicle — refuel cannot be filed.
                </div>
              )}
            </div>

            <Separator />

            {/* Where you are */}
            <div className="space-y-2">
              <Label
                htmlFor="onroad-location"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Current location *
              </Label>
              <Input
                id="onroad-location"
                value={form.current_location}
                onChange={(e) => set("current_location", e.target.value)}
                placeholder="Closest town, landmark or KM marker"
                maxLength={200}
                required
              />
            </div>

            {/* Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="onroad-odometer" className="text-sm font-medium flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" aria-hidden="true" /> Current odometer (km) *
                </Label>
                <Input
                  id="onroad-odometer"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  value={form.current_odometer}
                  onChange={(e) => set("current_odometer", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onroad-fuel-pct" className="text-sm font-medium">
                  Fuel level (%)
                </Label>
                <Input
                  id="onroad-fuel-pct"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step="1"
                  value={form.current_fuel_percent}
                  onChange={(e) => set("current_fuel_percent", e.target.value)}
                  placeholder="0–100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onroad-distance" className="text-sm font-medium">
                  Distance left (km)
                </Label>
                <Input
                  id="onroad-distance"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  value={form.remaining_distance_km}
                  onChange={(e) => set("remaining_distance_km", e.target.value)}
                  placeholder="Estimated km to destination"
                />
              </div>
            </div>

            {/* Liters + urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="onroad-liters" className="text-sm font-medium flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5" aria-hidden="true" /> Liters needed *
                </Label>
                <Input
                  id="onroad-liters"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="0.5"
                  value={form.liters_requested}
                  onChange={(e) => set("liters_requested", e.target.value)}
                  placeholder="e.g. 25"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Urgency *</Label>
                <Select
                  value={form.urgency}
                  onValueChange={(v) => set("urgency", v as FormState["urgency"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Why is an additional refuel needed? *</Label>
              <Select
                value={form.reason}
                onValueChange={(v) => set("reason", v as FormState["reason"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="onroad-notes" className="text-sm font-medium">
                Additional notes
              </Label>
              <Textarea
                id="onroad-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything else dispatch should know (preferred station, payment method, etc.)"
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.notes.length}/500
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                Filed from driver portal
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                On-road refuel
              </Badge>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submit.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submit.isPending || !vehicleId}>
                {submit.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                )}
                Submit refuel request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit on-road refuel request?"
        description={
          `This will notify dispatch that you need ${form.liters_requested || "—"} L ` +
          `at ${form.current_location || "your current location"}. ` +
          `You can track the status in History → Fuel.`
        }
        confirmLabel="Yes, submit"
        variant="default"
        loading={submit.isPending}
        onConfirm={() => submit.mutate()}
      />
    </>
  );
};

export default OnRoadFuelRequestDialog;
