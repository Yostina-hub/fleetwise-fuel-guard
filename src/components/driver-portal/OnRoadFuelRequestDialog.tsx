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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Fuel, MapPin, Gauge, Loader2, AlertTriangle, Route, Satellite, RefreshCw } from "lucide-react";
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
  /** Active vehicle_request the driver is currently on (optional). */
  request: ActiveRequestLike | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  /** Last known odometer (used as default current odometer). */
  lastOdometerKm?: number | null;
  /**
   * Fallback vehicle when there is no active trip (e.g. when the dialog is
   * opened from the driver portal "Additional Fuel Request" quick action).
   * Lets the driver still file a refuel request against their permanently
   * assigned vehicle without an active vehicle_request row.
   */
  fallbackVehicle?: {
    id: string;
    plate_number?: string | null;
    make?: string | null;
    model?: string | null;
    fuel_type?: string | null;
  } | null;
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
  fallbackVehicle,
}: Props) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() => initialState(lastOdometerKm));
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Resolve effective vehicle: prefer the active trip's assigned vehicle,
  // otherwise fall back to the driver's permanently assigned vehicle.
  const vehicle = request?.assigned_vehicle ?? fallbackVehicle ?? null;
  const vehicleId = vehicle?.id ?? request?.assigned_vehicle_id ?? null;

  // Auto-capture LIVE telemetry for the vehicle from the smart device.
  // Pulls position, odometer and fuel level from the latest_vehicle_telemetry
  // view so the driver does not have to type any of these manually — they
  // come straight off the on-board GPS / e-fuel sensor.
  const {
    data: liveTelemetry,
    isFetching: telemetryFetching,
    refetch: refetchTelemetry,
  } = useQuery({
    queryKey: ["onroad-live-telemetry", vehicleId],
    enabled: open && !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("latest_vehicle_telemetry" as any)
        .select(
          "latitude, longitude, fuel_level_percent, odometer_km, speed_kmh, last_communication_at, device_connected"
        )
        .eq("vehicle_id", vehicleId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      return {
        latitude: row.latitude == null ? null : Number(row.latitude),
        longitude: row.longitude == null ? null : Number(row.longitude),
        fuel_level_percent:
          row.fuel_level_percent == null ? null : Number(row.fuel_level_percent),
        odometer_km: row.odometer_km == null ? null : Number(row.odometer_km),
        speed_kmh: row.speed_kmh == null ? null : Number(row.speed_kmh),
        last_communication_at: row.last_communication_at as string | null,
        device_connected: !!row.device_connected,
      };
    },
    refetchInterval: open ? 15_000 : false,
    staleTime: 10_000,
  });

  // Reverse-geocode the device's GPS fix to a human-readable place so the
  // "Current location" field is also auto-captured.
  const { data: geocodedPlace } = useQuery({
    queryKey: [
      "onroad-reverse-geocode",
      liveTelemetry?.latitude,
      liveTelemetry?.longitude,
    ],
    enabled:
      open &&
      liveTelemetry?.latitude != null &&
      liveTelemetry?.longitude != null,
    queryFn: async () => {
      try {
        const lat = liveTelemetry!.latitude!;
        const lng = liveTelemetry!.longitude!;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return null;
        const j = await res.json();
        const a = j.address || {};
        const parts = [
          a.road || a.neighbourhood || a.suburb,
          a.city || a.town || a.village || a.county,
        ].filter(Boolean);
        return parts.length
          ? parts.join(", ")
          : (j.display_name as string | undefined) ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  // Reset every time the dialog re-opens, then prefill from telemetry once
  // the live telemetry + geocode resolve.
  useEffect(() => {
    if (open) setForm(initialState(lastOdometerKm));
  }, [open, lastOdometerKm]);

  // Always overwrite the four device-captured fields with the latest values
  // from the smart device whenever telemetry refreshes — these inputs are
  // read-only and reflect the current state of the vehicle.
  useEffect(() => {
    if (!open) return;
    setForm((f) => {
      const next = { ...f };
      if (liveTelemetry?.odometer_km != null && Number.isFinite(liveTelemetry.odometer_km)) {
        next.current_odometer = String(Math.round(liveTelemetry.odometer_km));
      }
      if (
        liveTelemetry?.fuel_level_percent != null &&
        Number.isFinite(liveTelemetry.fuel_level_percent)
      ) {
        const pct = Math.max(0, Math.min(100, Math.round(liveTelemetry.fuel_level_percent)));
        next.current_fuel_percent = String(pct);
      }
      // Geocoded place always wins over manual input — these fields are
      // device-driven now.
      if (geocodedPlace) {
        next.current_location = geocodedPlace;
      } else if (
        liveTelemetry?.latitude != null &&
        liveTelemetry?.longitude != null
      ) {
        next.current_location = `GPS ${liveTelemetry.latitude.toFixed(5)}, ${liveTelemetry.longitude.toFixed(5)}`;
      }
      // Estimate remaining distance from live fuel %. Heuristic: ~4 km per
      // percent of fuel (≈ 400 km on a full tank). Operators can refine via
      // org settings later; for now this gives dispatchers a useful signal
      // without asking the driver to guess.
      if (
        liveTelemetry?.fuel_level_percent != null &&
        Number.isFinite(liveTelemetry.fuel_level_percent)
      ) {
        const km = Math.max(
          0,
          Math.round(liveTelemetry.fuel_level_percent * 4)
        );
        next.remaining_distance_km = String(km);
      }
      return next;
    });
  }, [
    open,
    liveTelemetry?.odometer_km,
    liveTelemetry?.fuel_level_percent,
    liveTelemetry?.latitude,
    liveTelemetry?.longitude,
    geocodedPlace,
  ]);

  // Backwards-compat alias so the existing JSX (badge in the trip context
  // card) keeps working without further changes.
  const fuelSensor = liveTelemetry
    ? { last_fuel_reading: liveTelemetry.fuel_level_percent }
    : null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

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
      // Active trip is preferred but no longer required — drivers can also
      // file a refuel from quick actions when no trip row exists.
      if (!vehicleId) throw new Error("No vehicle assigned — cannot file a refuel request");

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
      // it is an on-road refuel and (when present) the trip context.
      const tripLabel = request?.request_number
        ? `trip ${request.request_number}`
        : request?.id
          ? `trip ${request.id.slice(0, 8)}`
          : "current shift (no active trip)";
      const description = [
        `Additional fuel request — ${tripLabel}`,
        `Reason: ${reasonLabel}`,
        `Urgency: ${urgencyLabel}`,
        parsed.current_fuel_percent != null
          ? `Current fuel level: ~${parsed.current_fuel_percent}% (auto from sensor when available)`
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
        purpose: `Additional fuel — ${reasonLabel}`,
        current_odometer: parsed.current_odometer,
        notes: parsed.notes || null,
        additional_description: description,
        remark: `${tripLabel} · ${parsed.current_location}`.trim(),
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
              Additional Fuel Request
            </DialogTitle>
            <DialogDescription>
              Need an extra refuel during a trip or shift. Vehicle, driver and
              live e-fuel telemetry are captured automatically — just tell
              dispatch where you are and how much you need.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Trip / shift context (read-only, auto-captured) */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" aria-hidden="true" />
                {request?.id ? "Active Trip" : "Current Shift"}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Trip #: </span>
                  <span className="font-mono">
                    {request?.request_number || request?.id?.slice(0, 8) || "— (no active trip)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle: </span>
                  <span className="font-medium">{vehicleLabel}</span>
                </div>
                {routeLine !== "—" && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Route: </span>
                    <span>{routeLine}</span>
                  </div>
                )}
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Driver: </span>
                  <span>{driverName || "—"}</span>
                  {driverPhone && (
                    <span className="text-muted-foreground"> · {driverPhone}</span>
                  )}
                </div>
                {fuelSensor?.last_fuel_reading != null && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">E-fuel sensor: </span>
                    <span className="font-medium">
                      {Math.round(fuelSensor.last_fuel_reading)}%
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-2 bg-success/10 text-success border-success/30 text-[10px]"
                    >
                      auto-captured
                    </Badge>
                  </div>
                )}
              </div>
              {!vehicleId && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  No vehicle assigned — refuel cannot be filed.
                </div>
              )}
            </div>

            <Separator />

            {/* ── Live device telemetry (read-only, auto-captured) ─────── */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Satellite className="w-3.5 h-3.5" aria-hidden="true" />
                  Live from smart device
                  {liveTelemetry?.device_connected ? (
                    <Badge
                      variant="outline"
                      className="ml-1 bg-success/10 text-success border-success/30 text-[10px]"
                    >
                      online
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="ml-1 bg-warning/10 text-warning border-warning/30 text-[10px]"
                    >
                      stale
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => refetchTelemetry()}
                  disabled={telemetryFetching || !vehicleId}
                >
                  <RefreshCw
                    className={`w-3 h-3 mr-1 ${telemetryFetching ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  Refresh
                </Button>
              </div>

              {/* Where you are — auto-captured from GPS */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="onroad-location"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Current location
                  <Badge variant="outline" className="text-[10px] ml-1">auto</Badge>
                </Label>
                <Input
                  id="onroad-location"
                  value={form.current_location}
                  readOnly
                  className="bg-muted/40 cursor-not-allowed"
                  placeholder={
                    vehicleId
                      ? "Waiting for GPS fix from device…"
                      : "No vehicle assigned"
                  }
                />
              </div>

              {/* Numbers — odometer / fuel% / distance left, all from device */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="onroad-odometer" className="text-sm font-medium flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" aria-hidden="true" /> Odometer (km)
                    <Badge variant="outline" className="text-[10px] ml-1">auto</Badge>
                  </Label>
                  <Input
                    id="onroad-odometer"
                    value={form.current_odometer}
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onroad-fuel-pct" className="text-sm font-medium">
                    Fuel level (%)
                    <Badge variant="outline" className="text-[10px] ml-1">auto</Badge>
                  </Label>
                  <Input
                    id="onroad-fuel-pct"
                    value={form.current_fuel_percent}
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onroad-distance" className="text-sm font-medium">
                    Distance left (km)
                    <Badge variant="outline" className="text-[10px] ml-1">auto</Badge>
                  </Label>
                  <Input
                    id="onroad-distance"
                    value={form.remaining_distance_km}
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                    placeholder="—"
                  />
                </div>
              </div>

              {liveTelemetry?.last_communication_at && (
                <p className="text-[11px] text-muted-foreground">
                  Last device update:{" "}
                  {new Date(liveTelemetry.last_communication_at).toLocaleString()}
                </p>
              )}
              {!liveTelemetry && vehicleId && (
                <p className="text-[11px] text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                  No telemetry received yet from this vehicle's device.
                </p>
              )}
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
