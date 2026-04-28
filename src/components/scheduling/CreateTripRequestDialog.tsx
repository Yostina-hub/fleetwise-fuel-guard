import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTripRequests } from "@/hooks/useTripRequests";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  AlertCircle,
  ClipboardList,
  Users,
  Package,
  Weight,
  Boxes,
  FileText,
  Building2,
  User,
  StickyNote,
  Loader2,
  Car,
} from "lucide-react";
import { DateTimePicker, combineDateAndTime } from "@/components/ui/date-time-picker";
import { ValidatedField } from "@/components/forms/ValidatedField";
import { toast } from "sonner";

/* ---------- helpers ---------- */
const sanitizeNumeric = (v: unknown) => String(v ?? "").replace(/[^\d]/g, "");
const sanitizeDecimal = (v: unknown) => {
  const s = String(v ?? "").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  return dot === -1 ? s : s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
};

/* ---------- schema ---------- */
const tripRequestSchema = z
  .object({
    purpose: z
      .string()
      .trim()
      .min(5, "Purpose must be at least 5 characters")
      .max(500, "Purpose must be under 500 characters"),
    pickup_date: z.date({ required_error: "Pickup date is required" }),
    pickup_time: z.string().min(1, "Pickup time is required"),
    return_date: z.date({ required_error: "Return date is required" }),
    return_time: z.string().min(1, "Return time is required"),
    pickup_geofence_id: z.string().optional().or(z.literal("")),
    drop_geofence_id: z.string().optional().or(z.literal("")),
    passengers: z.coerce
      .number({ invalid_type_error: "Passengers must be a number" })
      .int("Whole number only")
      .min(1, "At least 1 passenger")
      .max(50, "Maximum 50 passengers"),
    cargo_weight_kg: z.coerce
      .number()
      .min(0, "Cannot be negative")
      .max(50_000, "Max 50,000 kg")
      .optional(),
    cargo_volume_m3: z.coerce
      .number()
      .min(0, "Cannot be negative")
      .max(500, "Max 500 m³")
      .optional(),
    cargo_description: z.string().trim().max(300, "Max 300 chars").optional().or(z.literal("")),
    required_class: z.enum(["sedan", "suv", "van", "truck", "bus", "pickup"]).optional(),
    cost_center_id: z.string().optional().or(z.literal("")),
    preferred_driver_id: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(1000, "Max 1000 chars").optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const pickup = combineDateAndTime(data.pickup_date, data.pickup_time);
    const ret = combineDateAndTime(data.return_date, data.return_time);
    if (pickup && ret && new Date(ret).getTime() < new Date(pickup).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["return_date"],
        message: "Return must be after pickup",
      });
    }
    if (data.pickup_geofence_id && data.drop_geofence_id && data.pickup_geofence_id === data.drop_geofence_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["drop_geofence_id"],
        message: "Drop location must differ from pickup",
      });
    }
  });

type TripRequestFormData = z.infer<typeof tripRequestSchema>;

interface CreateTripRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTripRequestDialog = ({
  open,
  onOpenChange,
}: CreateTripRequestDialogProps) => {
  const { createRequest } = useTripRequests();
  const [loading, setLoading] = useState(false);

  const form = useForm<TripRequestFormData>({
    resolver: zodResolver(tripRequestSchema),
    mode: "onTouched",
    defaultValues: {
      passengers: 1,
      purpose: "",
      pickup_time: "09:00",
      return_time: "17:00",
    },
  });

  const { data: geofences } = useQuery({
    queryKey: ["geofences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofences")
        .select("id, name, category")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers" as any)
        .select("id, code, name")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data as any;
    },
  });

  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (data: TripRequestFormData) => {
    setLoading(true);
    try {
      const { pickup_date, pickup_time, return_date, return_time, ...rest } = data;
      await createRequest.mutateAsync({
        ...rest,
        pickup_at: combineDateAndTime(pickup_date, pickup_time)!,
        return_at: combineDateAndTime(return_date, return_time)!,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    const count = Object.keys(form.formState.errors).length;
    toast.error(`Please fix ${count} field${count === 1 ? "" : "s"} before submitting`);
  };

  const errors = form.formState.errors;
  const submitAttempted = form.formState.isSubmitted;
  const invalidCount = useMemo(() => Object.keys(errors).length, [errors]);
  const showSummary = submitAttempted && invalidCount > 0;
  const watched = form.watch();

  /** small helper to fish out an error message by field name */
  const errOf = (k: keyof TripRequestFormData) => (errors as any)?.[k]?.message as string | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Trip Request</DialogTitle>
          <DialogDescription>
            Reserve a vehicle and driver for an upcoming trip. Fields marked * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            {showSummary && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive animate-fade-in"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {invalidCount} field{invalidCount === 1 ? "" : "s"} need attention
                  </p>
                  <p className="text-xs opacity-90">Resolve the highlighted fields below to submit the request.</p>
                </div>
              </div>
            )}

            {/* Purpose */}
            <ValidatedField
              id="trip-purpose"
              label="Purpose"
              icon={ClipboardList}
              required
              error={errOf("purpose")}
              filled={!!watched.purpose?.trim()}
            >
              <Input
                id="trip-purpose"
                placeholder="e.g., Client site inspection"
                maxLength={500}
                {...form.register("purpose")}
              />
            </ValidatedField>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickup_date"
                render={({ field }) => (
                  <div className="space-y-2">
                    <DateTimePicker
                      label="Pickup Date & Time"
                      date={field.value}
                      time={form.watch("pickup_time")}
                      onDateChange={field.onChange}
                      onTimeChange={(t) => form.setValue("pickup_time", t, { shouldValidate: true })}
                      required
                      minDate={new Date()}
                    />
                    {(errOf("pickup_date") || errOf("pickup_time")) && (
                      <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {errOf("pickup_date") || errOf("pickup_time")}
                      </p>
                    )}
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="return_date"
                render={({ field }) => (
                  <div className="space-y-2">
                    <DateTimePicker
                      label="Return Date & Time"
                      date={field.value}
                      time={form.watch("return_time")}
                      onDateChange={field.onChange}
                      onTimeChange={(t) => form.setValue("return_time", t, { shouldValidate: true })}
                      required
                      minDate={form.watch("pickup_date") || new Date()}
                    />
                    {(errOf("return_date") || errOf("return_time")) && (
                      <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {errOf("return_date") || errOf("return_time")}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickup_geofence_id"
                render={({ field }) => (
                  <ValidatedField
                    id="trip-pickup-loc"
                    label="Pickup Location"
                    icon={MapPin}
                    error={errOf("pickup_geofence_id")}
                    filled={!!field.value}
                    hint="Optional"
                  >
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {geofences?.map((gf) => (
                          <SelectItem key={gf.id} value={gf.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {gf.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ValidatedField>
                )}
              />

              <FormField
                control={form.control}
                name="drop_geofence_id"
                render={({ field }) => (
                  <ValidatedField
                    id="trip-drop-loc"
                    label="Drop Location"
                    icon={MapPin}
                    error={errOf("drop_geofence_id")}
                    filled={!!field.value}
                    hint="Optional"
                  >
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {geofences?.map((gf) => (
                          <SelectItem key={gf.id} value={gf.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {gf.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ValidatedField>
                )}
              />
            </div>

            {/* Vehicle Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="required_class"
                render={({ field }) => (
                  <ValidatedField
                    id="trip-class"
                    label="Vehicle Class"
                    icon={Car}
                    error={errOf("required_class")}
                    filled={!!field.value}
                  >
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="bus">Bus</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                  </ValidatedField>
                )}
              />

              <ValidatedField
                id="trip-passengers"
                label="Number of Passengers"
                icon={Users}
                required
                error={errOf("passengers")}
                filled={!!watched.passengers}
              >
                <Input
                  id="trip-passengers"
                  type="text"
                  inputMode="numeric"
                  value={watched.passengers ?? ""}
                  onChange={(e) =>
                    form.setValue("passengers", Number(sanitizeNumeric(e.target.value)) || 0, { shouldValidate: true })
                  }
                  onBlur={() => form.trigger("passengers")}
                />
              </ValidatedField>
            </div>

            {/* Cargo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedField
                id="trip-cargo-weight"
                label="Cargo Weight (kg)"
                icon={Weight}
                error={errOf("cargo_weight_kg")}
                filled={!!watched.cargo_weight_kg}
                hint="Optional"
              >
                <Input
                  id="trip-cargo-weight"
                  type="text"
                  inputMode="decimal"
                  value={watched.cargo_weight_kg ?? ""}
                  onChange={(e) => {
                    const v = sanitizeDecimal(e.target.value);
                    form.setValue("cargo_weight_kg", v === "" ? undefined : (Number(v) as any), { shouldValidate: true });
                  }}
                  onBlur={() => form.trigger("cargo_weight_kg")}
                />
              </ValidatedField>

              <ValidatedField
                id="trip-cargo-volume"
                label="Cargo Volume (m³)"
                icon={Boxes}
                error={errOf("cargo_volume_m3")}
                filled={!!watched.cargo_volume_m3}
                hint="Optional"
              >
                <Input
                  id="trip-cargo-volume"
                  type="text"
                  inputMode="decimal"
                  value={watched.cargo_volume_m3 ?? ""}
                  onChange={(e) => {
                    const v = sanitizeDecimal(e.target.value);
                    form.setValue("cargo_volume_m3", v === "" ? undefined : (Number(v) as any), { shouldValidate: true });
                  }}
                  onBlur={() => form.trigger("cargo_volume_m3")}
                />
              </ValidatedField>
            </div>

            <ValidatedField
              id="trip-cargo-desc"
              label="Cargo Description"
              icon={Package}
              error={errOf("cargo_description")}
              filled={!!watched.cargo_description?.trim()}
              hint="Optional"
            >
              <Input
                id="trip-cargo-desc"
                placeholder="e.g., Office equipment"
                maxLength={300}
                {...form.register("cargo_description")}
              />
            </ValidatedField>

            {/* Cost Center & Driver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_center_id"
                render={({ field }) => (
                  <ValidatedField
                    id="trip-cost-center"
                    label="Cost Center"
                    icon={Building2}
                    error={errOf("cost_center_id")}
                    filled={!!field.value}
                    hint="Optional"
                  >
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost center" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters?.map((cc: any) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.code} - {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ValidatedField>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_driver_id"
                render={({ field }) => (
                  <ValidatedField
                    id="trip-pref-driver"
                    label="Preferred Driver"
                    icon={User}
                    error={errOf("preferred_driver_id")}
                    filled={!!field.value}
                    hint="Optional"
                  >
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers?.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.first_name} {driver.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ValidatedField>
                )}
              />
            </div>

            <ValidatedField
              id="trip-notes"
              label="Additional Notes"
              icon={StickyNote}
              error={errOf("notes")}
              filled={!!watched.notes?.trim()}
              hint="Optional"
            >
              <Textarea
                id="trip-notes"
                placeholder="Any special requirements or instructions"
                rows={3}
                maxLength={1000}
                {...form.register("notes")}
              />
            </ValidatedField>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-1.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTripRequestDialog;
