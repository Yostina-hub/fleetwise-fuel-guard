import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, User, FileText, Shield, Settings, MapPin, Paperclip, LayoutPanelTop, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ROUTE_TYPES, VEHICLE_CATEGORIES, TEMPERATURE_CONTROLS,
  VEHICLE_STATUSES, OWNER_TYPES, OWNER_STATUSES, ASSIGNED_LOCATIONS,
} from "./formConstants";
import { AssignedLocationPicker } from "./AssignedLocationPicker";
import { DatePickerField } from "./DatePickerField";
import FileUploadField from "./FileUploadField";
import { uploadFleetFile } from "./uploadFleetFile";
import BasicInfoTabs, { BASIC_FIELD_TO_SUBTAB, type BasicSubTabId } from "./BasicInfoTabs";
import { useVehicleValidation } from "./useVehicleValidation";
import { FIELD_TO_SECTION, type VehicleFieldName } from "./vehicleValidation";
import { useFormDraft, loadDraft, clearDraft } from "./useFormDraft";
import {
  sanitizeWhileTyping, sanitizeEmail, sanitizePhone, sanitizeNumeric,
} from "./formSanitizers";
import { CheckCircle2 } from "lucide-react";
import { friendlyToastError } from "@/lib/errorMessages";

const DRAFT_KEY = "create-vehicle";

interface CreateVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sectionTabs = [
  { value: "basic", label: "Basic Info", icon: LayoutPanelTop },
  { value: "compliance", label: "Compliance", icon: Shield },
  { value: "operations", label: "Operations", icon: Settings },
  { value: "attachments", label: "Attachments", icon: Paperclip },
  { value: "driver", label: "Driver", icon: User },
  { value: "owner", label: "Owner", icon: MapPin },
  { value: "notes", label: "Notes", icon: FileText },
] as const;

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
  purpose_for: "", specific_pool: "", specific_location: "", assigned_location: "",
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
  const [activeSection, setActiveSection] = useState<(typeof sectionTabs)[number]["value"]>("basic");
  const [activeBasicTab, setActiveBasicTab] = useState<BasicSubTabId>("identity");
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft when dialog opens (once per open cycle)
  useEffect(() => {
    if (!open || draftRestored) return;
    const draft = loadDraft<typeof initialForm>(DRAFT_KEY, organizationId);
    if (draft) {
      setFormData({ ...initialForm, ...draft });
      toast({ title: "Draft restored", description: "We brought back your unsaved changes." });
    }
    setDraftRestored(true);
  }, [open, draftRestored, organizationId, toast]);

  // Reset the restore flag when dialog closes so next open re-checks
  useEffect(() => {
    if (!open) setDraftRestored(false);
  }, [open]);

  // Persist form data while dialog is open. Only persist if user actually
  // typed something (avoids saving an empty initial form).
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialForm);
  useFormDraft(DRAFT_KEY, formData, { scope: organizationId, enabled: open && isDirty });

  const [ownerCertFile, setOwnerCertFile] = useState<File | null>(null);
  const [insuranceCertFile, setInsuranceCertFile] = useState<File | null>(null);
  const [taxClearanceFile, setTaxClearanceFile] = useState<File | null>(null);
  const [photoFrontFile, setPhotoFrontFile] = useState<File | null>(null);
  const [photoBackFile, setPhotoBackFile] = useState<File | null>(null);
  const [photoLeftFile, setPhotoLeftFile] = useState<File | null>(null);
  const [photoRightFile, setPhotoRightFile] = useState<File | null>(null);

  const fieldValidation = useVehicleValidation();
  const set = (field: string, value: string | number) => setFormData(prev => ({ ...prev, [field]: value }));
  const activeDrivers = drivers.filter(d => d.status === "active");
  const plateNumber = `${formData.plate_code}-${formData.plate_region}-${formData.plate_number_part}`;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!canSubmit()) throw new Error("Please wait before submitting again");
      if (!organizationId) throw new Error("Organization required");

      const { data: existing } = await supabase.from("vehicles")
        .select("id").eq("organization_id", organizationId).eq("plate_number", data.plate_number).maybeSingle();
      if (existing) throw new Error(`Vehicle with plate ${data.plate_number} already exists`);

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
      fieldValidation.reset();
      setActiveSection("basic");
      clearDraft(DRAFT_KEY, organizationId);
      onOpenChange(false);
    },
    onError: (error: any) => {
      friendlyToastError(error, { fallback: "Failed to add vehicle" });
    },
  });

  const handleSubmit = () => {
    // Run full validation on the raw formData; errors are keyed by field name.
    const result = fieldValidation.validateAll(formData as Record<string, unknown>);
    if (!result.ok) {
      // Jump to the first tab containing an error so the user can see it.
      if (result.firstError) {
        const targetTab = FIELD_TO_SECTION[result.firstError.field];
        if (targetTab) setActiveSection(targetTab as typeof activeSection);
        // If error is in Basic Info, also switch to the right sub-tab.
        const subTab = BASIC_FIELD_TO_SUBTAB[result.firstError.field];
        if (subTab) setActiveBasicTab(subTab);
        // Scroll the errored field into view + try to focus its first input.
        const fieldName = result.firstError.field;
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(`[data-field="${fieldName}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusable = el.querySelector<HTMLElement>("input, button, [role='combobox'], textarea");
            focusable?.focus();
          }
        }, 80);
      }
      toast({
        title: "Please fix the highlighted fields",
        description: result.firstError?.message ?? "Some fields need your attention.",
        variant: "destructive",
      });
      return;
    }

    // Build the sanitized payload only after validation passes.
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
      vin: formData.vin.trim().toUpperCase() || null,
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
      purpose_for: formData.purpose_for || null,
      specific_pool: formData.specific_pool || null,
      specific_location: formData.specific_location?.trim() || null,
      assigned_location: formData.assigned_location || null,
      transmission_type: formData.transmission_type || null,
      model_code: formData.model_code?.trim() || null,
      engine_number: formData.engine_number?.trim() || null,
      mfg_date: formData.mfg_date || null,
      year_of_ownership: formData.year_of_ownership ? parseInt(formData.year_of_ownership) : null,
      seating_capacity: formData.seating_capacity ? parseInt(formData.seating_capacity) : null,
      loading_capacity_quintal: formData.loading_capacity_quintal ? parseFloat(formData.loading_capacity_quintal) : null,
      engine_cc: formData.engine_cc ? parseInt(formData.engine_cc) : null,
      purchasing_price: formData.purchasing_price ? parseFloat(formData.purchasing_price) : null,
      current_market_price: formData.current_market_price ? parseFloat(formData.current_market_price) : null,
      current_condition: formData.current_condition || null,
      fuel_standard_km_per_liter: formData.fuel_standard_km_per_liter ? parseFloat(formData.fuel_standard_km_per_liter) : null,
      safety_comfort_category: formData.safety_comfort_category || null,
    };

    createMutation.mutate(cleanData);
  };

  // Closing the dialog: keep the draft so reopening restores it.
  // The user can explicitly Discard via the footer button.
  const handleOpenChange = (next: boolean) => {
    if (!next && createMutation.isPending) return; // don't close mid-submit
    onOpenChange(next);
  };

  const handleDiscardDraft = () => {
    clearDraft(DRAFT_KEY, organizationId);
    setFormData({ ...initialForm });
    fieldValidation.reset();
    setActiveSection("basic");
    onOpenChange(false);
    toast({ title: "Draft discarded" });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Register New Vehicle
          </DialogTitle>
          <DialogDescription>
            Changes auto-save as a draft — close anytime and resume where you left off.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as typeof activeSection)} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-4 md:px-6 py-3 bg-card/60 backdrop-blur">
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl bg-muted/40 p-1">
              {sectionTabs.map((tab) => {
                const Icon = tab.icon;
                // Count touched-and-errored fields belonging to this tab.
                const tabErrorCount = (Object.keys(fieldValidation.errors) as VehicleFieldName[])
                  .filter((k) => fieldValidation.touched[k] && FIELD_TO_SECTION[k] === tab.value)
                  .length;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="min-w-fit rounded-xl px-3 py-2 text-xs md:text-sm relative"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tabErrorCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                          {tabErrorCount}
                        </span>
                      )}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <ScrollArea className="max-h-[calc(95vh-240px)]">
            <div className="p-6">
              <TabsContent value="basic" className="mt-0">
                <Section title="Basic Vehicle Information" icon={<LayoutPanelTop className="w-5 h-5 text-primary" />}>
                  <BasicInfoTabs
                    formData={formData}
                    set={set}
                    plateNumber={plateNumber}
                    activeSubTab={activeBasicTab}
                    onSubTabChange={setActiveBasicTab}
                    onBlur={(field, value) => fieldValidation.handleBlur(field as VehicleFieldName, value)}
                    onChange={(field, value) => fieldValidation.handleChange(field as VehicleFieldName, value)}
                    getError={(field) => fieldValidation.getError(field as VehicleFieldName)}
                    getStatus={(field, value) => fieldValidation.getStatus(field as VehicleFieldName, value)}
                  />
                </Section>
              </TabsContent>

              <TabsContent value="compliance" className="mt-0">
                <Section icon={<Shield className="w-5 h-5 text-primary" />} title="Legal & Compliance">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 items-start">
                    <Field label="Registration Certificate No" error={fieldValidation.getError("registration_cert_no")} status={fieldValidation.getStatus("registration_cert_no", formData.registration_cert_no)}>
                      <Input value={formData.registration_cert_no} onChange={e => { const v = sanitizeWhileTyping(e.target.value).slice(0,100); set("registration_cert_no", v); fieldValidation.handleChange("registration_cert_no", v); }} onBlur={() => fieldValidation.handleBlur("registration_cert_no", formData.registration_cert_no)} maxLength={100} />
                    </Field>
                    <Field label="Registration Expiry *" error={fieldValidation.getError("registration_expiry")}>
                      <DatePickerField value={formData.registration_expiry} onChange={v => { set("registration_expiry", v); fieldValidation.handleChange("registration_expiry", v); }} onBlur={() => fieldValidation.handleBlur("registration_expiry", formData.registration_expiry)} />
                    </Field>
                    <Field label="Insurance Policy No" error={fieldValidation.getError("insurance_policy_no")} status={fieldValidation.getStatus("insurance_policy_no", formData.insurance_policy_no)}>
                      <Input value={formData.insurance_policy_no} onChange={e => { const v = sanitizeWhileTyping(e.target.value).slice(0,100); set("insurance_policy_no", v); fieldValidation.handleChange("insurance_policy_no", v); }} onBlur={() => fieldValidation.handleBlur("insurance_policy_no", formData.insurance_policy_no)} maxLength={100} />
                    </Field>
                    <Field label="Insurance Expiry *" error={fieldValidation.getError("insurance_expiry")}>
                      <DatePickerField value={formData.insurance_expiry} onChange={v => { set("insurance_expiry", v); fieldValidation.handleChange("insurance_expiry", v); }} onBlur={() => fieldValidation.handleBlur("insurance_expiry", formData.insurance_expiry)} />
                    </Field>
                    <Field label="Commercial Permit">
                      <Select value={formData.commercial_permit} onValueChange={v => set("commercial_permit", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Permit Expiry *" error={fieldValidation.getError("permit_expiry")}>
                      <DatePickerField value={formData.permit_expiry} onChange={v => { set("permit_expiry", v); fieldValidation.handleChange("permit_expiry", v); }} onBlur={() => fieldValidation.handleBlur("permit_expiry", formData.permit_expiry)} />
                    </Field>
                  </div>
                </Section>
              </TabsContent>

              <TabsContent value="operations" className="mt-0">
                <Section icon={<Settings className="w-5 h-5 text-primary" />} title="Operational Details">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 items-start">
                    <Field label="Vehicle Category">
                      <Select value={formData.vehicle_category} onValueChange={v => set("vehicle_category", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {VEHICLE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
                    <Field label="Load Capacity (kg)" error={fieldValidation.getError("capacity_kg")} status={fieldValidation.getStatus("capacity_kg", formData.capacity_kg)}>
                      <Input inputMode="decimal" value={formData.capacity_kg} onChange={e => { const v = sanitizeNumeric(e.target.value); set("capacity_kg", v); fieldValidation.handleChange("capacity_kg", v); }} onBlur={() => fieldValidation.handleBlur("capacity_kg", formData.capacity_kg)} />
                    </Field>
                    <Field label="Cargo Volume (m³)" error={fieldValidation.getError("capacity_volume")} status={fieldValidation.getStatus("capacity_volume", formData.capacity_volume)}>
                      <Input inputMode="decimal" value={formData.capacity_volume} onChange={e => { const v = sanitizeNumeric(e.target.value); set("capacity_volume", v); fieldValidation.handleChange("capacity_volume", v); }} onBlur={() => fieldValidation.handleBlur("capacity_volume", formData.capacity_volume)} />
                    </Field>
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
                    <Field label="GPS Device ID" error={fieldValidation.getError("gps_device_id")} status={fieldValidation.getStatus("gps_device_id", formData.gps_device_id)}>
                      <Input value={formData.gps_device_id} onChange={e => { const v = sanitizeWhileTyping(e.target.value).slice(0,100); set("gps_device_id", v); fieldValidation.handleChange("gps_device_id", v); }} onBlur={() => fieldValidation.handleBlur("gps_device_id", formData.gps_device_id)} disabled={formData.gps_installed !== "true"} maxLength={100} />
                    </Field>
                    <Field label="Odometer (km)" error={fieldValidation.getError("odometer_km")} status={fieldValidation.getStatus("odometer_km", formData.odometer_km)}>
                      <Input inputMode="decimal" value={formData.odometer_km} onChange={e => { const v = sanitizeNumeric(e.target.value); set("odometer_km", v); fieldValidation.handleChange("odometer_km", v); }} onBlur={() => fieldValidation.handleBlur("odometer_km", formData.odometer_km)} />
                    </Field>
                    <Field label="Tank Capacity (L)" error={fieldValidation.getError("tank_capacity_liters")} status={fieldValidation.getStatus("tank_capacity_liters", formData.tank_capacity_liters)}>
                      <Input inputMode="decimal" value={formData.tank_capacity_liters} onChange={e => { const v = sanitizeNumeric(e.target.value); set("tank_capacity_liters", v); fieldValidation.handleChange("tank_capacity_liters", v); }} onBlur={() => fieldValidation.handleBlur("tank_capacity_liters", formData.tank_capacity_liters)} />
                    </Field>
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
              </TabsContent>

              <TabsContent value="attachments" className="mt-0">
                <Section icon={<Paperclip className="w-5 h-5 text-primary" />} title="Vehicle Attachments">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-start">
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
              </TabsContent>

              <TabsContent value="driver" className="mt-0">
                <Section icon={<User className="w-5 h-5 text-primary" />} title="Driver Assignment">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-start">
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
              </TabsContent>

              <TabsContent value="owner" className="mt-0">
                <Section icon={<MapPin className="w-5 h-5 text-primary" />} title="Vehicle Owner Information">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 items-start">
                    <Field label="Owner Type *">
                      <Select value={formData.owner_type} onValueChange={v => set("owner_type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OWNER_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Full Name / Company Name" error={fieldValidation.getError("owner_full_name")} status={fieldValidation.getStatus("owner_full_name", formData.owner_full_name)}>
                      <Input value={formData.owner_full_name} onChange={e => { const v = sanitizeWhileTyping(e.target.value).slice(0,200); set("owner_full_name", v); fieldValidation.handleChange("owner_full_name", v); }} onBlur={() => fieldValidation.handleBlur("owner_full_name", formData.owner_full_name)} maxLength={200} />
                    </Field>
                    <Field label="Assigned Location *">
                      <AssignedLocationPicker
                        value={formData.owner_department}
                        onChange={(v) => set("owner_department", v)}
                      />
                    </Field>
                    <Field label="Contact Person" error={fieldValidation.getError("owner_contact_person")} status={fieldValidation.getStatus("owner_contact_person", formData.owner_contact_person)}>
                      <Input value={formData.owner_contact_person} onChange={e => { const v = sanitizeWhileTyping(e.target.value).slice(0,150); set("owner_contact_person", v); fieldValidation.handleChange("owner_contact_person", v); }} onBlur={() => fieldValidation.handleBlur("owner_contact_person", formData.owner_contact_person)} maxLength={150} />
                    </Field>
                    <Field label="Phone" error={fieldValidation.getError("owner_phone")} status={fieldValidation.getStatus("owner_phone", formData.owner_phone)}>
                      <Input value={formData.owner_phone} onChange={e => { const v = sanitizePhone(e.target.value); set("owner_phone", v); fieldValidation.handleChange("owner_phone", v); }} onBlur={() => fieldValidation.handleBlur("owner_phone", formData.owner_phone)} placeholder="+251 9XX XXX XXX" />
                    </Field>
                    <Field label="Email" error={fieldValidation.getError("owner_email")} status={fieldValidation.getStatus("owner_email", formData.owner_email)}>
                      <Input type="email" value={formData.owner_email} onChange={e => { const v = sanitizeEmail(e.target.value); set("owner_email", v); fieldValidation.handleChange("owner_email", v); }} onBlur={() => fieldValidation.handleBlur("owner_email", formData.owner_email)} placeholder="name@example.com" />
                    </Field>
                    <CascadingLocationSelector
                      region={formData.owner_region}
                      zone={formData.owner_zone}
                      woreda={formData.owner_woreda}
                      onRegionChange={v => set("owner_region", v)}
                      onZoneChange={v => set("owner_zone", v)}
                      onWoredaChange={v => set("owner_woreda", v)}
                    />
                    <Field label="Gov't ID / Business Reg No" error={fieldValidation.getError("owner_govt_id")}>
                      <Input value={formData.owner_govt_id} onChange={e => set("owner_govt_id", e.target.value)} onBlur={() => fieldValidation.handleBlur("owner_govt_id", formData.owner_govt_id)} maxLength={100} />
                    </Field>
                    <Field label="Tax ID / VAT Number" error={fieldValidation.getError("owner_tax_id")}>
                      <Input value={formData.owner_tax_id} onChange={e => set("owner_tax_id", e.target.value)} onBlur={() => fieldValidation.handleBlur("owner_tax_id", formData.owner_tax_id)} maxLength={50} />
                    </Field>
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
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <Section icon={<FileText className="w-5 h-5 text-primary" />} title="Additional Information">
                  <div className="space-y-1.5">
                    <Textarea
                      value={formData.notes}
                      onChange={e => set("notes", e.target.value)}
                      onBlur={() => fieldValidation.handleBlur("notes", formData.notes)}
                      placeholder="Additional information..."
                      rows={6}
                      maxLength={2000}
                      className={fieldValidation.getError("notes") ? "border-destructive" : ""}
                    />
                    {fieldValidation.getError("notes") ? (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldValidation.getError("notes")}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-right">
                        {formData.notes.length}/2000 characters
                      </p>
                    )}
                  </div>
                </Section>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-2">
          {isDirty && (
            <Button variant="ghost" onClick={handleDiscardDraft} className="text-destructive hover:text-destructive">
              Discard draft
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isDirty ? "Close & keep draft" : "Cancel"}
          </Button>
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

function Field({
  label, children, error, status = "neutral",
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  status?: "neutral" | "success" | "error";
}) {
  const isError = status === "error" || !!error;
  const isSuccess = status === "success" && !error;
  return (
    <div className="flex flex-col gap-1.5">
      {/* Fixed-height label row so all fields in a grid align to the same baseline */}
      <Label
        title={label}
        className={`text-xs font-medium leading-none truncate ${
          isError ? "text-destructive" : "text-foreground/80"
        }`}
      >
        {label}
      </Label>
      {/* Control row — every input / select / datepicker normalises to h-10 */}
      <div
        className={`relative [&_input]:h-10 [&_button[role=combobox]]:h-10 [&>button]:h-10 ${
          isError
            ? "[&_input]:border-destructive [&_button]:border-destructive [&_input]:focus-visible:ring-destructive/30"
            : isSuccess
              ? "[&_input]:border-success/60 [&_button]:border-success/60 [&_input]:focus-visible:ring-success/30"
              : ""
        }`}
      >
        {children}
        {isSuccess && (
          <CheckCircle2
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-success"
          />
        )}
      </div>
      {/* Reserve a fixed message row so error appearance doesn't shift adjacent cards */}
      <div className="min-h-[16px]">
        {error && (
          <p role="alert" className="text-[11px] font-medium text-destructive flex items-center gap-1 leading-tight">
            <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
