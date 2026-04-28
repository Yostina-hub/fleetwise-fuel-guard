import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { ValidatedField } from "@/components/fleet/ValidatedField";
import { useRoadsideRequestValidation } from "./useRoadsideRequestValidation";
import {
  sanitizeNumeric,
  sanitizePhone,
  type RSFormValues,
} from "./roadsideRequestValidation";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional values prefilled from the workflow run context (vehicle_id, driver_id, etc.) */
  prefill?: {
    vehicle_id?: string;
    driver_id?: string;
    breakdown_type?: string;
    priority?: string;
    description?: string;
    location_name?: string;
    lat?: number;
    lng?: number;
  };
  /** Called after successful insert; receives the created row. */
  onSubmitted?: (row: any) => void;
}

const BREAKDOWN_TYPES = [
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "tire", label: "Flat tire" },
  { value: "fuel", label: "Out of fuel" },
  { value: "battery", label: "Dead battery" },
  { value: "accident", label: "Accident" },
  { value: "lockout", label: "Lockout" },
  { value: "other", label: "Other" },
];

// Allow signed decimals (and a trailing minus while typing) for lat/lng inputs.
const sanitizeCoord = (v: unknown): string => {
  if (v == null) return "";
  let s = String(v).trim();
  // Strip everything except digits, dot, leading minus
  const negative = s.startsWith("-");
  s = s.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return negative ? `-${s}` : s;
};

export const NewRoadsideRequestDialog = ({ open, onOpenChange, prefill, onSubmitted }: Props) => {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [breakdownType, setBreakdownType] = useState("mechanical");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [providerPhone, setProviderPhone] = useState("");
  const [eta, setEta] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState<string>("");
  const [towRequired, setTowRequired] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const validation = useRoadsideRequestValidation();
  const buildValues = (): RSFormValues => ({
    vehicle_id: vehicleId,
    driver_id: driverId,
    breakdown_type: breakdownType,
    priority,
    description,
    location_name: locationName,
    lat,
    lng,
    service_provider: serviceProvider,
    provider_phone: providerPhone,
    eta_minutes: eta,
    estimated_cost: estimatedCost,
  });

  // Apply prefill when the dialog opens; reset when it closes.
  useEffect(() => {
    if (open) {
      if (prefill?.vehicle_id) setVehicleId(prefill.vehicle_id);
      if (prefill?.driver_id) setDriverId(prefill.driver_id);
      if (prefill?.breakdown_type) setBreakdownType(prefill.breakdown_type);
      if (prefill?.priority) setPriority(prefill.priority);
      if (prefill?.description) setDescription(prefill.description);
      if (prefill?.location_name) setLocationName(prefill.location_name);
      if (prefill?.lat != null) setLat(String(prefill.lat));
      if (prefill?.lng != null) setLng(String(prefill.lng));
    } else {
      setVehicleId(""); setDriverId(""); setBreakdownType("mechanical"); setPriority("medium");
      setDescription(""); setLocationName(""); setLat(""); setLng("");
      setServiceProvider(""); setProviderPhone(""); setEta(""); setEstimatedCost(""); setTowRequired(false);
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles").select("id, plate_number, make, model")
        .eq("organization_id", organizationId!).order("plate_number").limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers").select("id, first_name, last_name")
        .eq("organization_id", organizationId!).order("first_name").limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const useGps = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude.toFixed(6);
        const newLng = pos.coords.longitude.toFixed(6);
        setLat(newLat); setLng(newLng); setGpsLoading(false);
        validation.validateField("lat", newLat, { ...buildValues(), lat: newLat, lng: newLng });
        validation.validateField("lng", newLng, { ...buildValues(), lat: newLat, lng: newLng });
        toast.success("Location captured");
      },
      () => { setGpsLoading(false); toast.error("Could not get location"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Helpers to compute field status (success / error / neutral)
  const fieldStatus = (name: Parameters<typeof validation.getError>[0], value: string) => {
    const err = validation.getError(name);
    if (err) return "error" as const;
    if (value && value.length > 0) return "success" as const;
    return "neutral" as const;
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const result = validation.validateAll(buildValues());
      if (!result.ok) {
        const first = Object.values(result.errors)[0];
        throw new Error(first || "Please fix the highlighted fields before submitting.");
      }
      const sanitized = result.sanitized;
      const requestNumber = `RSA-${Date.now().toString(36).toUpperCase()}`;
      const payload: any = {
        organization_id: organizationId,
        vehicle_id: sanitized.vehicle_id,
        driver_id: sanitized.driver_id || null,
        request_number: requestNumber,
        status: "requested",
        breakdown_type: sanitized.breakdown_type,
        priority: sanitized.priority,
        description: sanitized.description || null,
        location_name: sanitized.location_name || null,
        lat: sanitized.lat ? parseFloat(sanitized.lat) : null,
        lng: sanitized.lng ? parseFloat(sanitized.lng) : null,
        service_provider: sanitized.service_provider || null,
        provider_phone: sanitized.provider_phone || null,
        provider_eta_minutes: sanitized.eta_minutes ? parseInt(sanitized.eta_minutes) : null,
        estimated_cost: sanitized.estimated_cost ? parseFloat(sanitized.estimated_cost) : null,
        tow_required: towRequired,
      };
      const { data, error } = await supabase.from("roadside_assistance_requests").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      toast.success("Roadside assistance request created");
      qc.invalidateQueries({ queryKey: ["roadside-assistance"] });
      validation.reset();
      onSubmitted?.(row);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create request"),
  });

  const submitDisabled = useMemo(
    () => create.isPending || !vehicleId,
    [create.isPending, vehicleId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Roadside Assistance Request</DialogTitle>
          <DialogDescription>Log a breakdown or emergency assistance request.</DialogDescription>
        </DialogHeader>

        {validation.showAllErrors && validation.errorCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">
                Please fix {validation.errorCount} field{validation.errorCount === 1 ? "" : "s"} before submitting.
              </p>
              <p className="text-xs opacity-80">Highlighted in red below.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <ValidatedField
            id="rsa-vehicle"
            label="Vehicle"
            required
            error={validation.getError("vehicle_id")}
            status={fieldStatus("vehicle_id", vehicleId)}
          >
            <Select
              value={vehicleId}
              onValueChange={(v) => {
                setVehicleId(v);
                validation.validateField("vehicle_id", v, buildValues());
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField id="rsa-driver" label="Driver">
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField
            id="rsa-breakdown"
            label="Breakdown Type"
            required
            error={validation.getError("breakdown_type")}
            status={fieldStatus("breakdown_type", breakdownType)}
          >
            <Select
              value={breakdownType}
              onValueChange={(v) => {
                setBreakdownType(v);
                validation.validateField("breakdown_type", v, buildValues());
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BREAKDOWN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField
            id="rsa-priority"
            label="Priority"
            error={validation.getError("priority")}
            status={fieldStatus("priority", priority)}
          >
            <Select
              value={priority}
              onValueChange={(v) => {
                setPriority(v);
                validation.validateField("priority", v, buildValues());
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </ValidatedField>

          <div className="col-span-2">
            <ValidatedField
              id="rsa-description"
              label="Description"
              error={validation.getError("description")}
              status={fieldStatus("description", description)}
            >
              <Textarea
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  validation.validateField("description", e.target.value, buildValues());
                }}
                onBlur={e => validation.handleBlur("description", e.target.value, buildValues())}
                placeholder="Describe the issue..."
                rows={2}
                maxLength={2000}
              />
            </ValidatedField>
          </div>

          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Location</Label>
              <Button type="button" variant="outline" size="sm" onClick={useGps} disabled={gpsLoading}>
                {gpsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                Use my GPS
              </Button>
            </div>
            <ValidatedField
              id="rsa-location-name"
              label=""
              error={validation.getError("location_name")}
              status={fieldStatus("location_name", locationName)}
            >
              <Input
                value={locationName}
                onChange={e => {
                  setLocationName(e.target.value);
                  validation.validateField("location_name", e.target.value, buildValues());
                }}
                onBlur={e => validation.handleBlur("location_name", e.target.value, buildValues())}
                placeholder="Location description (e.g. KM 45 Bole road)"
                maxLength={200}
              />
            </ValidatedField>
            <div className="grid grid-cols-2 gap-2">
              <ValidatedField
                id="rsa-lat"
                label=""
                error={validation.getError("lat")}
                status={fieldStatus("lat", lat)}
              >
                <Input
                  value={lat}
                  onChange={e => {
                    const v = sanitizeCoord(e.target.value);
                    setLat(v);
                    validation.validateField("lat", v, { ...buildValues(), lat: v });
                    // Lng's "required if lat" rule depends on this:
                    validation.validateField("lng", lng, { ...buildValues(), lat: v });
                  }}
                  onBlur={e => validation.handleBlur("lat", e.target.value, buildValues())}
                  placeholder="Latitude (e.g. 9.0157)"
                  inputMode="decimal"
                />
              </ValidatedField>
              <ValidatedField
                id="rsa-lng"
                label=""
                error={validation.getError("lng")}
                status={fieldStatus("lng", lng)}
              >
                <Input
                  value={lng}
                  onChange={e => {
                    const v = sanitizeCoord(e.target.value);
                    setLng(v);
                    validation.validateField("lng", v, { ...buildValues(), lng: v });
                    validation.validateField("lat", lat, { ...buildValues(), lng: v });
                  }}
                  onBlur={e => validation.handleBlur("lng", e.target.value, buildValues())}
                  placeholder="Longitude (e.g. 38.7468)"
                  inputMode="decimal"
                />
              </ValidatedField>
            </div>
          </div>

          <ValidatedField
            id="rsa-provider"
            label="Service Provider"
            error={validation.getError("service_provider")}
            status={fieldStatus("service_provider", serviceProvider)}
          >
            <Input
              value={serviceProvider}
              onChange={e => {
                setServiceProvider(e.target.value);
                validation.validateField("service_provider", e.target.value, buildValues());
              }}
              onBlur={e => validation.handleBlur("service_provider", e.target.value, buildValues())}
              placeholder="Provider name"
              maxLength={120}
            />
          </ValidatedField>

          <ValidatedField
            id="rsa-provider-phone"
            label="Provider Phone"
            error={validation.getError("provider_phone")}
            status={fieldStatus("provider_phone", providerPhone)}
          >
            <Input
              value={providerPhone}
              onChange={e => {
                const v = sanitizePhone(e.target.value);
                setProviderPhone(v);
                validation.validateField("provider_phone", v, buildValues());
              }}
              onBlur={e => validation.handleBlur("provider_phone", e.target.value, buildValues())}
              placeholder="0911234567 or +251911234567"
              inputMode="tel"
            />
          </ValidatedField>

          <ValidatedField
            id="rsa-eta"
            label="ETA (minutes)"
            error={validation.getError("eta_minutes")}
            status={fieldStatus("eta_minutes", eta)}
          >
            <Input
              value={eta}
              onChange={e => {
                const v = sanitizeNumeric(e.target.value, { integer: true });
                setEta(v);
                validation.validateField("eta_minutes", v, buildValues());
              }}
              onBlur={e => validation.handleBlur("eta_minutes", e.target.value, buildValues())}
              inputMode="numeric"
              placeholder="e.g. 30"
            />
          </ValidatedField>

          <ValidatedField
            id="rsa-cost"
            label="Estimated Cost (ETB)"
            error={validation.getError("estimated_cost")}
            status={fieldStatus("estimated_cost", estimatedCost)}
          >
            <Input
              value={estimatedCost}
              onChange={e => {
                const v = sanitizeNumeric(e.target.value);
                setEstimatedCost(v);
                validation.validateField("estimated_cost", v, buildValues());
              }}
              onBlur={e => validation.handleBlur("estimated_cost", e.target.value, buildValues())}
              inputMode="decimal"
              placeholder="e.g. 1500"
            />
          </ValidatedField>

          <div className="col-span-2 flex items-center gap-3 pt-2">
            <Switch checked={towRequired} onCheckedChange={setTowRequired} id="tow" />
            <Label htmlFor="tow" className="cursor-pointer">Tow service required</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={submitDisabled}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
