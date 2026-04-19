import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

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
    }
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
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setGpsLoading(false); toast.success("Location captured"); },
      () => { setGpsLoading(false); toast.error("Could not get location"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      if (!vehicleId) throw new Error("Vehicle is required");
      const requestNumber = `RSA-${Date.now().toString(36).toUpperCase()}`;
      const payload: any = {
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: driverId || null,
        request_number: requestNumber,
        status: "requested",
        breakdown_type: breakdownType,
        priority,
        description: description || null,
        location_name: locationName || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        service_provider: serviceProvider || null,
        provider_phone: providerPhone || null,
        provider_eta_minutes: eta ? parseInt(eta) : null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        tow_required: towRequired,
      };
      const { data, error } = await supabase.from("roadside_assistance_requests").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      toast.success("Roadside assistance request created");
      qc.invalidateQueries({ queryKey: ["roadside-assistance"] });
      onSubmitted?.(row);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create request"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Roadside Assistance Request</DialogTitle>
          <DialogDescription>Log a breakdown or emergency assistance request.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Breakdown Type *</Label>
            <Select value={breakdownType} onValueChange={setBreakdownType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BREAKDOWN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue..." rows={2} />
          </div>
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Location</Label>
              <Button type="button" variant="outline" size="sm" onClick={useGps} disabled={gpsLoading}>
                {gpsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                Use my GPS
              </Button>
            </div>
            <Input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Location description (e.g. KM 45 Bole road)" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" />
              <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Service Provider</Label>
            <Input value={serviceProvider} onChange={e => setServiceProvider(e.target.value)} placeholder="Provider name" />
          </div>
          <div className="space-y-2">
            <Label>Provider Phone</Label>
            <Input value={providerPhone} onChange={e => setProviderPhone(e.target.value)} placeholder="+251..." />
          </div>
          <div className="space-y-2">
            <Label>ETA (minutes)</Label>
            <Input type="number" value={eta} onChange={e => setEta(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estimated Cost (ETB)</Label>
            <Input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-3 pt-2">
            <Switch checked={towRequired} onCheckedChange={setTowRequired} id="tow" />
            <Label htmlFor="tow" className="cursor-pointer">Tow service required</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !vehicleId}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
