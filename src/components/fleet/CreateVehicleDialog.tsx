import { useState } from "react";
import { CascadingLocationSelector } from "@/components/fleet/CascadingLocationSelector";
import { useSubmitThrottle } from "@/hooks/useSubmitThrottle";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
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
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, Truck, User, FileText, Shield, Settings, MapPin, Paperclip } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PLATE_CODES, PLATE_REGIONS, VEHICLE_TYPES_OPTIONS, VEHICLE_GROUPS, DRIVE_TYPES,
  ROUTE_TYPES, ENERGY_TYPES, ENERGY_SOURCES, VEHICLE_CATEGORIES, TEMPERATURE_CONTROLS,
  VEHICLE_STATUSES, OWNER_TYPES, OWNER_STATUSES, ASSIGNED_LOCATIONS,
  ADMIN_REGIONS,
} from "./formConstants";
import FileUploadField from "./FileUploadField";
import { uploadFleetFile } from "./uploadFleetFile";
import BasicInfoTabs from "./BasicInfoTabs";

const vehicleSchema = z.object({
  plate_number: z.string().trim().min(1, "Plate number is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  vehicle_group: z.string().min(1, "Group is required"),
  route_type: z.string().min(1, "Route type is required"),
  drive_type: z.string().min(1, "Drive type is required"),
  make: z.string().trim().min(1, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  year: z.number().min(1900).max(new Date().getFullYear() + 2),
});

interface CreateVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialForm = {
  plate_code: "3", plate_region: "AA", plate_number_part: "",
  vehicle_type: "", vehicle_group: "", route_type: "intracity", drive_type: "",
  make: "", model: "", year: new Date().getFullYear(), color: "", vin: "",
  fuel_type: "diesel", vehicle_category: "",
  registration_cert_no: "", registration_expiry: "",
  insurance_policy_no: "", insurance_expiry: "",
  commercial_permit: "false", permit_expiry: "",
  capacity_kg: "", capacity_volume: "", temperature_control: "none",
  gps_installed: "false", gps_device_id: "", odometer_km: "", status: "active",
  assigned_driver_id: "",
  notes: "",
  tank_capacity_liters: "",
  owner_type: "individual", owner_full_name: "", owner_department: "",
  owner_contact_person: "", owner_phone: "", owner_email: "",
  owner_region: "", owner_zone: "", owner_woreda: "",
  owner_govt_id: "", owner_tax_id: "", owner_status: "active",
  // Extended Basic Info (Excel spec)
  purpose_for: "", specific_pool: "", specific_location: "",
  transmission_type: "", model_code: "", engine_number: "",
  mfg_date: "", year_of_ownership: "",
  seating_capacity: "", loading_capacity_quintal: "", engine_cc: "",
  purchasing_price: "", current_market_price: "",
  current_condition: "", fuel_standard_km_per_liter: "",
  safety_comfort_category: "",
};

export default function CreateVehicleDialog({ open, onOpenChange }: CreateVehicleDialogProps) {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const canSubmit = useSubmitThrottle();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ ...initialForm });

  // File attachments
  const [ownerCertFile, setOwnerCertFile] = useState<File | null>(null);
  const [insuranceCertFile, setInsuranceCertFile] = useState<File | null>(null);
  const [taxClearanceFile, setTaxClearanceFile] = useState<File | null>(null);
  const [photoFrontFile, setPhotoFrontFile] = useState<File | null>(null);
  const [photoBackFile, setPhotoBackFile] = useState<File | null>(null);
  const [photoLeftFile, setPhotoLeftFile] = useState<File | null>(null);
  const [photoRightFile, setPhotoRightFile] = useState<File | null>(null);

  const set = (field: string, value: string | number) => setFormData(prev => ({ ...prev, [field]: value }));
  const activeDrivers = drivers.filter(d => d.status === 'active');

  const plateNumber = `${formData.plate_code}-${formData.plate_region}-${formData.plate_number_part}`;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!canSubmit()) throw new Error("Please wait before submitting again");
      if (!organizationId) throw new Error("Organization required");

      const { data: existing } = await supabase.from("vehicles")
        .select("id").eq("organization_id", organizationId).eq("plate_number", data.plate_number).maybeSingle();
      if (existing) throw new Error(`Vehicle with plate ${data.plate_number} already exists`);

      // Create owner first if needed
      let ownerId = null;
      if (formData.owner_full_name || formData.owner_type !== "individual") {
        const { data: owner, error: ownerErr } = await supabase.from("vehicle_owners").insert({
          organization_id: organizationId,
          owner_type: formData.owner_type,
          full_name: formData.owner_full_name || null,
          department: formData.owner_department || null,
          contact_person: formData.owner_contact_person || null,
          phone: formData.owner_phone || null,
          email: formData.owner_email || null,
          region: formData.owner_region || null,
          zone: formData.owner_zone || null,
          woreda: formData.owner_woreda || null,
          govt_id_business_reg: formData.owner_govt_id || null,
          tax_id_vat: formData.owner_tax_id || null,
          status: formData.owner_status,
        } as any).select("id").single();
        if (ownerErr) throw ownerErr;
        ownerId = owner?.id;
      }

      const { data: inserted, error } = await supabase.from("vehicles").insert({
        ...data,
        organization_id: organizationId,
        owner_id: ownerId,
      }).select("id").single();
      if (error) throw error;

      // Upload attachments
      const vehicleId = inserted.id;
      const updates: Record<string, string> = {};

      if (ownerCertFile) updates.owner_certificate_url = await uploadFleetFile("vehicle-attachments", vehicleId, "owner_cert", ownerCertFile);
      if (insuranceCertFile) updates.insurance_cert_url = await uploadFleetFile("vehicle-attachments", vehicleId, "insurance_cert", insuranceCertFile);
      if (taxClearanceFile) updates.tax_clearance_url = await uploadFleetFile("vehicle-attachments", vehicleId, "tax_clearance", taxClearanceFile);
      if (photoFrontFile) updates.photo_front_url = await uploadFleetFile("vehicle-attachments", vehicleId, "photo_front", photoFrontFile);
      if (photoBackFile) updates.photo_back_url = await uploadFleetFile("vehicle-attachments", vehicleId, "photo_back", photoBackFile);
      if (photoLeftFile) updates.photo_left_url = await uploadFleetFile("vehicle-attachments", vehicleId, "photo_left", photoLeftFile);
      if (photoRightFile) updates.photo_right_url = await uploadFleetFile("vehicle-attachments", vehicleId, "photo_right", photoRightFile);

      if (Object.keys(updates).length > 0) {
        await supabase.from("vehicles").update(updates).eq("id", vehicleId);
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Vehicle added successfully" });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setFormData({ ...initialForm });
      setOwnerCertFile(null); setInsuranceCertFile(null); setTaxClearanceFile(null);
      setPhotoFrontFile(null); setPhotoBackFile(null); setPhotoLeftFile(null); setPhotoRightFile(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add vehicle", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    const cleanData: any = {
      plate_number: plateNumber,
      vehicle_type: formData.vehicle_type || null,
      vehicle_group: formData.vehicle_group || null,
      route_type: formData.route_type,
      drive_type: formData.drive_type || null,
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: formData.year,
      color: formData.color.trim() || null,
      vin: formData.vin.trim() || null,
      fuel_type: formData.fuel_type || "diesel",
      vehicle_category: formData.vehicle_category || null,
      registration_cert_no: formData.registration_cert_no.trim() || null,
      registration_expiry: formData.registration_expiry || null,
      insurance_policy_no: formData.insurance_policy_no.trim() || null,
      insurance_expiry: formData.insurance_expiry || null,
      commercial_permit: formData.commercial_permit === "true",
      permit_expiry: formData.permit_expiry || null,
      capacity_kg: formData.capacity_kg ? parseFloat(formData.capacity_kg) : null,
      capacity_volume: formData.capacity_volume ? parseFloat(formData.capacity_volume) : null,
      temperature_control: formData.temperature_control,
      gps_installed: formData.gps_installed === "true",
      gps_device_id: formData.gps_device_id.trim() || null,
      odometer_km: formData.odometer_km ? parseFloat(formData.odometer_km) : null,
      status: formData.status,
      assigned_driver_id: formData.assigned_driver_id || null,
      tank_capacity_liters: formData.tank_capacity_liters ? parseFloat(formData.tank_capacity_liters) : null,
      notes: formData.notes.trim() || null,
      is_active: formData.status !== "out_of_service",
    };

    const validation = vehicleSchema.safeParse(cleanData);
    if (!validation.success) {
      toast({ title: "Validation Error", description: validation.error.errors[0].message, variant: "destructive" });
      return;
    }
    createMutation.mutate(cleanData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Register New Vehicle
          </DialogTitle>
          <DialogDescription>Enter vehicle details per the registration specification</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <div className="p-6 space-y-6">

            {/* 2.1 Basic Vehicle Information */}
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

                <Field label="Vehicle Type *">
                  <Select value={formData.vehicle_type} onValueChange={v => set("vehicle_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Group *">
                  <Select value={formData.vehicle_group} onValueChange={v => set("vehicle_group", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Route Type *">
                  <Select value={formData.route_type} onValueChange={v => set("route_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROUTE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Drive Type *">
                  <Select value={formData.drive_type} onValueChange={v => set("drive_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {DRIVE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Make *"><Input value={formData.make} onChange={e => set("make", e.target.value)} placeholder="e.g. Toyota" /></Field>
                <Field label="Model *"><Input value={formData.model} onChange={e => set("model", e.target.value)} placeholder="e.g. Hilux" /></Field>
                <Field label="Manufactured Year *">
                  <Input type="number" value={formData.year} onChange={e => set("year", parseInt(e.target.value) || new Date().getFullYear())} placeholder="YYYY" />
                </Field>
                <Field label="Color"><Input value={formData.color} onChange={e => set("color", e.target.value)} placeholder="e.g. White" /></Field>
                <Field label="Chassis Number (VIN)"><Input value={formData.vin} onChange={e => set("vin", e.target.value)} maxLength={17} /></Field>
                <Field label="Energy Type">
                  <Select value={formData.fuel_type} onValueChange={v => set("fuel_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENERGY_SOURCES.map(src => (
                        <SelectGroup key={src.value}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground">{src.label}</SelectLabel>
                          {ENERGY_TYPES.filter(e => e.source === src.value).map(e => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Vehicle Category">
                  <Select value={formData.vehicle_category} onValueChange={v => set("vehicle_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* 2.2 Legal & Compliance */}
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

            {/* 2.3 Operational Details */}
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

            {/* 2.4 Vehicle Attachments */}
            <Section icon={<Paperclip className="w-5 h-5 text-primary" />} title="Vehicle Attachments">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadField label="Owner Certificate" accept="image/*,.pdf" selectedFile={ownerCertFile} onFileSelect={setOwnerCertFile} />
                <FileUploadField label="Renewed 3rd Party Insurance Certificate" accept="image/*,.pdf" selectedFile={insuranceCertFile} onFileSelect={setInsuranceCertFile} />
                <FileUploadField label="Tax Clearance" accept="image/*,.pdf" selectedFile={taxClearanceFile} onFileSelect={setTaxClearanceFile} />
                <FileUploadField label="Vehicle Photo — Front" accept="image/*" selectedFile={photoFrontFile} onFileSelect={setPhotoFrontFile} />
                <FileUploadField label="Vehicle Photo — Back" accept="image/*" selectedFile={photoBackFile} onFileSelect={setPhotoBackFile} />
                <FileUploadField label="Vehicle Photo — Left Side" accept="image/*" selectedFile={photoLeftFile} onFileSelect={setPhotoLeftFile} />
                <FileUploadField label="Vehicle Photo — Right Side" accept="image/*" selectedFile={photoRightFile} onFileSelect={setPhotoRightFile} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Accepted: Images and PDF. Max size: 5MB per file.</p>
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

            {/* 2.5 Vehicle Owner Information */}
            <Section icon={<MapPin className="w-5 h-5 text-primary" />} title="Vehicle Owner Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Owner Type *">
                  <Select value={formData.owner_type} onValueChange={v => set("owner_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OWNER_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Full Name / Company Name"><Input value={formData.owner_full_name} onChange={e => set("owner_full_name", e.target.value)} /></Field>
                <Field label="Assigned Location *">
                  <Select value={formData.owner_department} onValueChange={v => set("owner_department", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {["Corporate", "Zone", "Region"].map(group => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {ASSIGNED_LOCATIONS.filter(l => l.group === group).map(l => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Contact Person"><Input value={formData.owner_contact_person} onChange={e => set("owner_contact_person", e.target.value)} /></Field>
                <Field label="Phone"><Input value={formData.owner_phone} onChange={e => set("owner_phone", e.target.value)} /></Field>
                <Field label="Email"><Input type="email" value={formData.owner_email} onChange={e => set("owner_email", e.target.value)} /></Field>
                <CascadingLocationSelector
                  region={formData.owner_region}
                  zone={formData.owner_zone}
                  woreda={formData.owner_woreda}
                  onRegionChange={v => set("owner_region", v)}
                  onZoneChange={v => set("owner_zone", v)}
                  onWoredaChange={v => set("owner_woreda", v)}
                />
                <Field label="Gov't ID / Business Reg No"><Input value={formData.owner_govt_id} onChange={e => set("owner_govt_id", e.target.value)} /></Field>
                <Field label="Tax ID / VAT Number"><Input value={formData.owner_tax_id} onChange={e => set("owner_tax_id", e.target.value)} /></Field>
                <Field label="Owner Status">
                  <Select value={formData.owner_status} onValueChange={v => set("owner_status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OWNER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* Notes */}
            <Section icon={<FileText className="w-5 h-5 text-primary" />} title="Additional Information">
              <Textarea value={formData.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional information..." rows={3} />
            </Section>

          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="min-w-[120px]">
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Register Vehicle
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
