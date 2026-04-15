import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useSubmitThrottle } from "@/hooks/useSubmitThrottle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Truck, User, Gauge, FileText, Shield, Settings, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PLATE_CODES, PLATE_REGIONS, VEHICLE_TYPES_OPTIONS, VEHICLE_GROUPS, DRIVE_TYPES,
  ROUTE_TYPES, ENERGY_TYPES, VEHICLE_CATEGORIES, TEMPERATURE_CONTROLS,
  VEHICLE_STATUSES, OWNER_TYPES, OWNER_STATUSES, ASSIGNED_LOCATIONS,
  ADMIN_REGIONS,
} from "./formConstants";

const vehicleSchema = z.object({
  plate_number: z.string().trim().min(1, "Plate number is required"),
  make: z.string().trim().min(1, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  year: z.number().min(1900).max(new Date().getFullYear() + 2),
});

interface EditVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
    year: number;
    status: string;
    vehicleType?: string;
    fuelType?: string;
  } | null;
}

const sanitize = (val: string) => val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();

export default function EditVehicleDialog({ open, onOpenChange, vehicle }: EditVehicleDialogProps) {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const canSubmit = useSubmitThrottle();
  const queryClient = useQueryClient();
  const activeDrivers = drivers.filter(d => d.status === 'active');

  const [fetchingData, setFetchingData] = useState(false);
  const [formData, setFormData] = useState({
    plate_code: "3", plate_region: "AA", plate_number_part: "",
    vehicle_type: "", vehicle_group: "", route_type: "intracity", drive_type: "",
    make: "", model: "", year: new Date().getFullYear(), color: "", vin: "",
    fuel_type: "diesel", vehicle_category: "",
    registration_cert_no: "", registration_expiry: "",
    insurance_policy_no: "", insurance_expiry: "",
    commercial_permit: "false", permit_expiry: "",
    capacity_kg: "", capacity_volume: "", temperature_control: "none",
    gps_installed: "false", gps_device_id: "", odometer_km: "", status: "active",
    assigned_driver_id: "", notes: "", tank_capacity_liters: "",
    ownership_type: "owned",
  });

  const set = (field: string, value: string | number) => setFormData(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (open && vehicle?.vehicleId) {
      setFetchingData(true);
      supabase.from("vehicles").select("*").eq("id", vehicle.vehicleId).single().then(({ data, error }) => {
        setFetchingData(false);
        if (error) { toast.error("Failed to load vehicle data"); return; }
        if (data) {
          // Parse composite plate number
          const plateParts = (data.plate_number || "").split("-");
          setFormData({
            plate_code: plateParts[0] || "3",
            plate_region: plateParts[1] || "AA",
            plate_number_part: plateParts[2] || data.plate_number || "",
            vehicle_type: data.vehicle_type || "",
            vehicle_group: (data as any).vehicle_group || "",
            route_type: (data as any).route_type || "intracity",
            drive_type: (data as any).drive_type || "",
            make: data.make || "",
            model: data.model || "",
            year: data.year || new Date().getFullYear(),
            color: data.color || "",
            vin: data.vin || "",
            fuel_type: data.fuel_type || "diesel",
            vehicle_category: (data as any).vehicle_category || "",
            registration_cert_no: (data as any).registration_cert_no || "",
            registration_expiry: (data as any).registration_expiry || "",
            insurance_policy_no: (data as any).insurance_policy_no || "",
            insurance_expiry: (data as any).insurance_expiry || "",
            commercial_permit: (data as any).commercial_permit ? "true" : "false",
            permit_expiry: (data as any).permit_expiry || "",
            capacity_kg: (data as any).capacity_kg?.toString() || "",
            capacity_volume: (data as any).capacity_volume?.toString() || "",
            temperature_control: (data as any).temperature_control || "none",
            gps_installed: (data as any).gps_installed ? "true" : "false",
            gps_device_id: (data as any).gps_device_id || "",
            odometer_km: data.odometer_km?.toString() || "",
            status: data.status || "active",
            assigned_driver_id: data.assigned_driver_id || "",
            notes: data.notes || "",
            tank_capacity_liters: data.tank_capacity_liters?.toString() || "",
            ownership_type: data.ownership_type || "owned",
          });
        }
      });
    }
  }, [open, vehicle?.vehicleId]);

  const plateNumber = `${formData.plate_code}-${formData.plate_region}-${formData.plate_number_part}`;

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!canSubmit()) throw new Error("Please wait before submitting again");
      if (!organizationId || !vehicle?.vehicleId) throw new Error("Missing context");

      const { data: existing } = await supabase.from("vehicles")
        .select("id").eq("organization_id", organizationId)
        .eq("plate_number", data.plate_number).neq("id", vehicle.vehicleId).maybeSingle();
      if (existing) throw new Error(`Plate "${data.plate_number}" already exists`);

      const { error } = await supabase.from("vehicles").update(data)
        .eq("id", vehicle.vehicleId).eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle updated successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update vehicle", { description: error.message });
    },
  });

  const handleSubmit = () => {
    const cleanData: any = {
      plate_number: sanitize(plateNumber),
      vehicle_type: formData.vehicle_type || null,
      vehicle_group: formData.vehicle_group || null,
      route_type: formData.route_type || null,
      drive_type: formData.drive_type || null,
      make: sanitize(formData.make),
      model: sanitize(formData.model),
      year: formData.year,
      color: formData.color ? sanitize(formData.color) : null,
      vin: formData.vin ? sanitize(formData.vin) : null,
      fuel_type: formData.fuel_type || "diesel",
      vehicle_category: formData.vehicle_category || null,
      registration_cert_no: formData.registration_cert_no ? sanitize(formData.registration_cert_no) : null,
      registration_expiry: formData.registration_expiry || null,
      insurance_policy_no: formData.insurance_policy_no ? sanitize(formData.insurance_policy_no) : null,
      insurance_expiry: formData.insurance_expiry || null,
      commercial_permit: formData.commercial_permit === "true",
      permit_expiry: formData.permit_expiry || null,
      capacity_kg: formData.capacity_kg ? parseFloat(formData.capacity_kg) : null,
      capacity_volume: formData.capacity_volume ? parseFloat(formData.capacity_volume) : null,
      temperature_control: formData.temperature_control || null,
      gps_installed: formData.gps_installed === "true",
      gps_device_id: formData.gps_device_id ? sanitize(formData.gps_device_id) : null,
      odometer_km: formData.odometer_km ? parseFloat(formData.odometer_km) : null,
      status: formData.status,
      assigned_driver_id: formData.assigned_driver_id || null,
      tank_capacity_liters: formData.tank_capacity_liters ? parseFloat(formData.tank_capacity_liters) : null,
      notes: formData.notes ? sanitize(formData.notes) : null,
      is_active: formData.status !== "out_of_service",
    };

    const validation = vehicleSchema.safeParse(cleanData);
    if (!validation.success) {
      toast.error("Validation Error", { description: validation.error.errors[0].message });
      return;
    }
    updateMutation.mutate(cleanData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Edit Vehicle
          </DialogTitle>
          <DialogDescription>Update vehicle details</DialogDescription>
        </DialogHeader>

        {fetchingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(95vh-180px)]">
            <div className="p-6 space-y-6">

              {/* Basic Vehicle Information */}
              <Section icon={<Truck className="w-5 h-5 text-primary" />} title="Basic Vehicle Information">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <Label className="text-sm">Plate Number *</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      <Select value={formData.plate_code} onValueChange={v => set("plate_code", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PLATE_CODES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={formData.plate_region} onValueChange={v => set("plate_region", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PLATE_REGIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input value={formData.plate_number_part} onChange={e => set("plate_number_part", e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="12345" maxLength={5} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Preview: {plateNumber}</p>
                  </div>
                  <Field label="Vehicle Type">
                    <Select value={formData.vehicle_type || "none"} onValueChange={v => set("vehicle_type", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {VEHICLE_TYPES_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Group">
                    <Select value={formData.vehicle_group || "none"} onValueChange={v => set("vehicle_group", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {VEHICLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Route Type">
                    <Select value={formData.route_type} onValueChange={v => set("route_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROUTE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Drive Type">
                    <Select value={formData.drive_type || "none"} onValueChange={v => set("drive_type", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {DRIVE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Make *"><Input value={formData.make} onChange={e => set("make", e.target.value)} /></Field>
                  <Field label="Model *"><Input value={formData.model} onChange={e => set("model", e.target.value)} /></Field>
                  <Field label="Year *"><Input type="number" value={formData.year} onChange={e => set("year", parseInt(e.target.value) || 0)} /></Field>
                  <Field label="Color"><Input value={formData.color} onChange={e => set("color", e.target.value)} /></Field>
                  <Field label="VIN"><Input value={formData.vin} onChange={e => set("vin", e.target.value)} maxLength={17} /></Field>
                  <Field label="Energy Type">
                    <Select value={formData.fuel_type} onValueChange={v => set("fuel_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENERGY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Vehicle Category">
                    <Select value={formData.vehicle_category || "none"} onValueChange={v => set("vehicle_category", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {VEHICLE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              {/* Legal & Compliance */}
              <Section icon={<Shield className="w-5 h-5 text-primary" />} title="Legal & Compliance">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Registration Certificate No"><Input value={formData.registration_cert_no} onChange={e => set("registration_cert_no", e.target.value)} /></Field>
                  <Field label="Registration Expiry"><Input type="date" value={formData.registration_expiry} onChange={e => set("registration_expiry", e.target.value)} /></Field>
                  <Field label="Insurance Policy No"><Input value={formData.insurance_policy_no} onChange={e => set("insurance_policy_no", e.target.value)} /></Field>
                  <Field label="Insurance Expiry"><Input type="date" value={formData.insurance_expiry} onChange={e => set("insurance_expiry", e.target.value)} /></Field>
                  <Field label="Commercial Permit">
                    <Select value={formData.commercial_permit} onValueChange={v => set("commercial_permit", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Permit Expiry"><Input type="date" value={formData.permit_expiry} onChange={e => set("permit_expiry", e.target.value)} /></Field>
                </div>
              </Section>

              {/* Operational Details */}
              <Section icon={<Settings className="w-5 h-5 text-primary" />} title="Operational Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Load Capacity (kg)"><Input type="number" min={0} value={formData.capacity_kg} onChange={e => set("capacity_kg", e.target.value)} /></Field>
                  <Field label="Cargo Volume (m³)"><Input type="number" min={0} step={0.1} value={formData.capacity_volume} onChange={e => set("capacity_volume", e.target.value)} /></Field>
                  <Field label="Temperature Control">
                    <Select value={formData.temperature_control} onValueChange={v => set("temperature_control", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEMPERATURE_CONTROLS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="GPS Installed">
                    <Select value={formData.gps_installed} onValueChange={v => set("gps_installed", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="GPS Device ID"><Input value={formData.gps_device_id} onChange={e => set("gps_device_id", e.target.value)} disabled={formData.gps_installed !== "true"} /></Field>
                  <Field label="Odometer (km)"><Input type="number" min={0} value={formData.odometer_km} onChange={e => set("odometer_km", e.target.value)} /></Field>
                  <Field label="Tank Capacity (L)"><Input type="number" min={0} value={formData.tank_capacity_liters} onChange={e => set("tank_capacity_liters", e.target.value)} /></Field>
                  <Field label="Vehicle Status">
                    <Select value={formData.status} onValueChange={v => set("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VEHICLE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              {/* Driver Assignment */}
              <Section icon={<User className="w-5 h-5 text-primary" />} title="Driver Assignment">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Assigned Driver">
                    <Select value={formData.assigned_driver_id || "none"} onValueChange={v => set("assigned_driver_id", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select driver..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No driver assigned</SelectItem>
                        {activeDrivers.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name} - {d.license_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              {/* Notes */}
              <Section icon={<FileText className="w-5 h-5 text-primary" />} title="Additional Information">
                <Textarea value={formData.notes} onChange={e => set("notes", e.target.value)} rows={3} />
              </Section>

            </div>
          </ScrollArea>
        )}

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending || fetchingData} className="min-w-[120px]">
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">{icon}{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
