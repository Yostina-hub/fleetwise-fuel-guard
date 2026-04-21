import { useRef, useState } from "react";
import { CascadingLocationSelector } from "@/components/fleet/CascadingLocationSelector";
import { useSubmitThrottle } from "@/hooks/useSubmitThrottle";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
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
import { Loader2, User, CreditCard, FileText, AlertCircle, MapPin, Briefcase, Building2, Key, Copy, RefreshCw, Droplets, Paperclip, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DRIVER_TYPES, ID_TYPES, LICENSE_TYPES, EMPLOYMENT_STATUSES,
  DRIVER_STATUSES, ASSIGNED_POOLS, BLOOD_TYPES, GENDERS, ASSIGNED_LOCATIONS,
} from "./formConstants";
import { computeLicenseExpiry } from "./driverValidation";
import FileUploadField from "./FileUploadField";
import { uploadFleetFile } from "./uploadFleetFile";
import { useDriverValidation } from "./useDriverValidation";
import type { DriverFieldName } from "./driverValidation";
import { DatePickerField } from "@/components/shared/DatePickerField";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftStatus } from "@/components/inbox/DraftStatus";

/**
 * Driver-of-birth must be at least 18 years ago. We compute this once at
 * module-load time so the upper bound shifts naturally as time passes.
 */
const today = () => new Date().toISOString().split("T")[0];
const MAX_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split("T")[0];
})();

const generatePassword = () => {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const specials = "!@#$%^&*";
  const all = upper + lower + digits + specials;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(specials)];
  const rest = Array.from({ length: 12 }, () => pick(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join("");
};

const REQUIRED_FIELDS: Set<DriverFieldName> = new Set([
  "driver_type", "first_name", "middle_name", "last_name", "phone",
  "govt_id_type", "license_number", "status", "department",
  "emergency_contact_name", "emergency_contact_phone", "password",
]);
const isRequiredField = (f: DriverFieldName) => REQUIRED_FIELDS.has(f);

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
  prefill?: Record<string, any>;
  onSubmitted?: (result: { id: string }) => void;
}

const initialForm = {
  first_name: "", middle_name: "", last_name: "",
  gender: "", phone: "", email: "", date_of_birth: "",
  driver_type: "", // #15 — no default; user must explicitly pick
  address_region: "", address_zone: "", address_woreda: "", address_specific: "",
  govt_id_type: "", license_number: "", national_id: "",
  license_type: "", license_issue_date: "", license_expiry: "",
  employment_type: "regular", status: "active",
  contract_end_date: "", // #6 — required when employment_type === "contract"
  joining_date: "", department: "", experience_years: "",
  assigned_pool: "", // #5 — replaces route_type
  telebirr_account: "", // #8 — replaces bank fields
  emergency_contact_name: "", emergency_contact_phone: "", blood_type: "",
  password: "", notes: "",
  rfid_tag: "", ibutton_id: "", bluetooth_id: "",
  employee_id: "", medical_certificate_expiry: "",
};

export default function CreateDriverDialog({ open, onOpenChange, embedded, prefill, onSubmitted }: CreateDriverDialogProps) {
  const { organizationId } = useOrganization();
  const canSubmit = useSubmitThrottle();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Per-org draft autosave — restores any in-progress registration on re-open.
  // We disable persistence when the dialog is closed (key=null) so a closed
  // dialog never silently overwrites a fresher draft from another tab.
  const draftKey = open && organizationId ? `driver-registration:${organizationId}` : null;
  const {
    values: formData,
    setValues: setFormData,
    restoredAt: draftRestoredAt,
    savedAt: draftSavedAt,
    clear: clearDraft,
  } = useFormDraft<typeof initialForm>(draftKey, { ...initialForm, ...(prefill ?? {}) });

  const [showPassword, setShowPassword] = useState(false);
  const validation = useDriverValidation();
  const fieldRefs = useRef<Partial<Record<DriverFieldName, HTMLElement | null>>>({});

  // File attachments
  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  // ---- Wizard step definitions ----
  const STEPS: { id: string; label: string; icon: React.ComponentType<any>; fields: DriverFieldName[] }[] = [
    { id: "personal",    label: "Personal",    icon: User,         fields: ["driver_type", "first_name", "middle_name", "last_name", "phone", "email", "date_of_birth"] },
    { id: "address",     label: "Address",     icon: MapPin,       fields: ["address_specific"] },
    { id: "legal",       label: "Legal & ID",  icon: CreditCard,   fields: ["govt_id_type", "license_number", "national_id", "license_issue_date", "license_expiry"] },
    { id: "employment",  label: "Employment",  icon: Building2,    fields: ["status", "department", "joining_date", "experience_years"] },
    { id: "emergency",   label: "Emergency",   icon: AlertCircle,  fields: ["emergency_contact_name", "emergency_contact_phone"] },
    { id: "credentials", label: "Account",     icon: Key,          fields: ["password"] },
  ];
  const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);

  const stepHasErrors = (stepId: string) => {
    const step = STEPS.find((s) => s.id === stepId);
    return step?.fields.some((f) => validation.errors[f]) ?? false;
  };
  const stepIsComplete = (stepId: string) => {
    const step = STEPS.find((s) => s.id === stepId);
    if (!step) return false;
    return step.fields.every((f) => {
      const v = (formData as any)[f];
      const err = validation.errors[f];
      // "Complete" means: required+filled+no error, OR optional+no error
      return !err && (typeof v === "string" ? v.trim().length > 0 || !isRequiredField(f) : true);
    });
  };

  // Overall progress: % of total fields (across schemas) that pass
  const allTrackedFields = STEPS.flatMap((s) => s.fields);
  const completedFields = allTrackedFields.filter(
    (f) => !validation.errors[f] && !!(formData as any)[f]?.toString().trim(),
  ).length;
  const progressPct = Math.round((completedFields / allTrackedFields.length) * 100);

  /** Update value + live-revalidate the field if user has already touched it. */
  const set = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validation.touched[field as DriverFieldName]) {
      validation.validateField(field as DriverFieldName, value);
    }
  };

  const onBlur = (field: DriverFieldName) => {
    validation.handleBlur(field, formData[field as keyof typeof formData]);
  };

  const registerRef = (field: DriverFieldName) => (el: HTMLElement | null) => {
    fieldRefs.current[field] = el;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!canSubmit()) throw new Error("Please wait before submitting again");
      const { data: inserted, error } = await supabase.from("drivers").insert({
        ...data,
        organization_id: organizationId,
      }).select("id").single();
      if (error) throw error;

      const driverId = inserted.id;
      const updates: Record<string, string> = {};

      if (licenseFrontFile) updates.license_front_url = await uploadFleetFile("driver-documents", driverId, "license_front", licenseFrontFile);
      if (licenseBackFile) updates.license_back_url = await uploadFleetFile("driver-documents", driverId, "license_back", licenseBackFile);
      if (nationalIdFile) updates.national_id_url = await uploadFleetFile("driver-documents", driverId, "national_id", nationalIdFile);
      if (profilePhotoFile) updates.avatar_url = await uploadFleetFile("driver-documents", driverId, "profile_photo", profilePhotoFile);

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase.from("drivers").update(updates).eq("id", driverId);
        if (updateErr) console.error("Failed to update attachment URLs:", updateErr);
      }

      let portalProvisioned = false;
      if (data.email && formData.password) {
        try {
          const { data: cu, error: cuErr } = await supabase.functions.invoke("create-user", {
            body: {
              email: data.email,
              password: formData.password,
              fullName: `${data.first_name} ${data.last_name}`.trim(),
              role: "driver",
              organizationId,
            },
          });
          if (cuErr) throw new Error(cuErr.message || "create-user failed");
          const userId = (cu as any)?.user?.id;
          if (userId) {
            await supabase.from("drivers").update({ user_id: userId }).eq("id", driverId);
            portalProvisioned = true;
          }
        } catch (provErr: any) {
          console.error("Driver portal provisioning failed:", provErr);
          toast({
            title: "Driver saved, portal account failed",
            description: provErr?.message || "You can retry from the driver detail dialog.",
            variant: "destructive",
          });
        }
      }
      return { portalProvisioned, driverId };
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: result?.portalProvisioned
          ? "Driver registered and portal access provisioned"
          : "Driver registered successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      // Successful submit → wipe the persisted draft so the next "Add driver"
      // starts blank instead of restoring the just-submitted values.
      clearDraft();
      setFormData({ ...initialForm, ...(prefill ?? {}) });
      setLicenseFrontFile(null); setLicenseBackFile(null);
      setNationalIdFile(null); setProfilePhotoFile(null);
      validation.reset();
      onSubmitted?.({ id: result.driverId });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to register driver", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    const result = validation.validateAll(formData);
    if (!result.ok) {
      const count = Object.keys(result.errors).length;
      // Jump to the first step containing an error
      const targetStep = STEPS.find((s) => s.fields.some((f) => result.errors[f]));
      if (targetStep) setActiveStep(targetStep.id);
      toast({
        title: `Please fix ${count} ${count === 1 ? "error" : "errors"}`,
        description: result.firstError?.message,
        variant: "destructive",
      });
      // Scroll first errored field into view + focus it (defer past tab switch)
      if (result.firstError) {
        setTimeout(() => {
          const el = fieldRefs.current[result.firstError!.field];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusable = el.querySelector<HTMLElement>("input, button, textarea, [tabindex]") ?? el;
            (focusable as HTMLElement).focus?.();
          }
        }, 50);
      }
      return;
    }
    const cleanData: any = {
      first_name: formData.first_name.trim(),
      middle_name: formData.middle_name.trim() || null,
      last_name: formData.last_name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      driver_type: formData.driver_type,
      gender: formData.gender || null,
      date_of_birth: formData.date_of_birth || null,
      address_region: formData.address_region || null,
      address_zone: formData.address_zone || null,
      address_woreda: formData.address_woreda || null,
      address_specific: formData.address_specific.trim() || null,
      govt_id_type: formData.govt_id_type,
      license_number: formData.license_number.trim(),
      national_id: formData.national_id.trim() || null,
      license_type: formData.license_type || null,
      license_class: formData.license_type || null,
      license_issue_date: formData.license_issue_date || null,
      license_expiry: formData.license_expiry || null,
      employment_type: formData.employment_type || null,
      contract_end_date: formData.employment_type === "contract" ? (formData.contract_end_date || null) : null,
      status: formData.status,
      joining_date: formData.joining_date || null,
      department: formData.department || null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      assigned_pool: formData.assigned_pool || null,
      telebirr_account: formData.telebirr_account.trim() || null,
      emergency_contact_name: formData.emergency_contact_name.trim() || null,
      emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
      blood_type: formData.blood_type || null,
      notes: formData.notes.trim() || null,
      rfid_tag: formData.rfid_tag.trim() || null,
      ibutton_id: formData.ibutton_id.trim() || null,
      bluetooth_id: formData.bluetooth_id.trim() || null,
      employee_id: formData.employee_id.trim() || null,
      medical_certificate_expiry: formData.medical_certificate_expiry || null,
      hire_date: formData.joining_date || null,
      verification_status: "pending",
    };
    createMutation.mutate(cleanData);
  };

  const idLabel = formData.govt_id_type === "passport" ? "Passport Number" :
    formData.govt_id_type === "kebele_id" ? "Kebele ID Number" : "License Number";

  // Convenience: error-aware className for inputs / select triggers
  const errClass = (field: DriverFieldName) =>
    validation.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const errorCount = validation.errorCount;

  const currentStepIdx = STEPS.findIndex((s) => s.id === activeStep);
  const goPrev = () => currentStepIdx > 0 && setActiveStep(STEPS[currentStepIdx - 1].id);
  const goNext = () => {
    const step = STEPS[currentStepIdx];
    // Validate just this step's fields before advancing — descriptive feedback
    const res = validation.validateFields(step.fields, formData);
    if (!res.ok) {
      const count = Object.keys(res.errors).length;
      toast({
        title: `${count} ${count === 1 ? "field needs" : "fields need"} attention on this step`,
        description: Object.values(res.errors)[0],
        variant: "destructive",
      });
      return;
    }
    if (currentStepIdx < STEPS.length - 1) setActiveStep(STEPS[currentStepIdx + 1].id);
  };

  const body = (
    <div className="flex flex-col">
      {/* Sticky progress + stepper */}
      <div className="sticky top-0 z-10 -mx-2 px-2 pt-2 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              Step <span className="font-semibold text-foreground">{currentStepIdx + 1}</span> of {STEPS.length} ·{" "}
              <span className="font-semibold text-foreground">{STEPS[currentStepIdx]?.label}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" /> {errorCount} {errorCount === 1 ? "issue" : "issues"}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">{progressPct}% complete</span>
          </div>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Tabs value={activeStep} onValueChange={setActiveStep} className="mt-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1 h-auto bg-muted/40 p-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const hasErr = stepHasErrors(s.id);
            const done = stepIsComplete(s.id) && !hasErr;
            return (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className={cn(
                  "flex flex-col gap-1 py-2 px-2 h-auto text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all",
                  hasErr && "ring-1 ring-destructive/40",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                      hasErr
                        ? "bg-destructive text-destructive-foreground"
                        : done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {hasErr ? "!" : done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </span>
                  <Icon className="w-3.5 h-3.5 hidden md:inline" />
                </div>
                <span className="font-medium">{s.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Inline error summary banner — clickable to jump */}
        {errorCount > 0 && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-4 flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-destructive"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-sm flex-1">
              <span className="font-medium">
                {errorCount} {errorCount === 1 ? "field needs" : "fields need"} attention
              </span>
              <span className="text-destructive/80 ml-1">— click a step above with a red badge to fix.</span>
            </div>
          </div>
        )}

        {/* ============ STEP 1: PERSONAL ============ */}
        <TabsContent value="personal" className="mt-4 space-y-6 focus-visible:outline-none">
          <Section icon={<Briefcase className="w-5 h-5 text-primary" />} title="Employment Type">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Driver Type" required error={validation.getError("driver_type")} fieldRef={registerRef("driver_type")}>
                <Select value={formData.driver_type} onValueChange={v => { set("driver_type", v); validation.validateField("driver_type", v); }}>
                  <SelectTrigger className={errClass("driver_type")} onBlur={() => onBlur("driver_type")}><SelectValue placeholder="Select driver type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Ethio telecom</SelectLabel>
                      {DRIVER_TYPES.filter(d => d.group === "Ethio telecom").map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Other</SelectLabel>
                      {DRIVER_TYPES.filter(d => d.group === "Other").map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={<User className="w-5 h-5 text-primary" />} title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="First Name" required error={validation.getError("first_name")} success={!validation.getError("first_name") && !!formData.first_name && validation.touched.first_name} fieldRef={registerRef("first_name")}>
                <Input value={formData.first_name} onChange={e => set("first_name", e.target.value)} onBlur={() => onBlur("first_name")} placeholder="e.g. Abebe" maxLength={100} className={errClass("first_name")} aria-invalid={!!validation.getError("first_name")} />
              </Field>
              <Field label="Middle Name" required error={validation.getError("middle_name")} success={!validation.getError("middle_name") && !!formData.middle_name && validation.touched.middle_name} fieldRef={registerRef("middle_name")}>
                <Input value={formData.middle_name} onChange={e => set("middle_name", e.target.value)} onBlur={() => onBlur("middle_name")} placeholder="e.g. Kebede" maxLength={100} className={errClass("middle_name")} aria-invalid={!!validation.getError("middle_name")} />
              </Field>
              <Field label="Last Name" required error={validation.getError("last_name")} success={!validation.getError("last_name") && !!formData.last_name && validation.touched.last_name} fieldRef={registerRef("last_name")}>
                <Input value={formData.last_name} onChange={e => set("last_name", e.target.value)} onBlur={() => onBlur("last_name")} placeholder="e.g. Tadesse" maxLength={100} className={errClass("last_name")} aria-invalid={!!validation.getError("last_name")} />
              </Field>
              <Field label="Gender">
                <Select value={formData.gender} onValueChange={v => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Phone Number" required error={validation.getError("phone")} success={!validation.getError("phone") && !!formData.phone && validation.touched.phone} fieldRef={registerRef("phone")} hint="Format: 09XXXXXXXX (10 digits)">
                <Input value={formData.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={() => onBlur("phone")} placeholder="09XXXXXXXX" maxLength={10} inputMode="numeric" className={errClass("phone")} aria-invalid={!!validation.getError("phone")} />
              </Field>
              <Field label="Email" error={validation.getError("email")} success={!validation.getError("email") && !!formData.email && validation.touched.email} fieldRef={registerRef("email")} hint="Required for portal access">
                <Input type="email" value={formData.email} onChange={e => set("email", e.target.value)} onBlur={() => onBlur("email")} placeholder="driver@example.com" maxLength={255} className={errClass("email")} aria-invalid={!!validation.getError("email")} />
              </Field>
              <Field label="Date of Birth" error={validation.getError("date_of_birth")} fieldRef={registerRef("date_of_birth")} hint="Driver must be at least 18 years old">
                <DatePickerField
                  value={formData.date_of_birth}
                  onChange={(v) => set("date_of_birth", v)}
                  onBlur={() => onBlur("date_of_birth")}
                  max={MAX_DOB}
                  placeholder="Select date of birth"
                  ariaInvalid={!!validation.getError("date_of_birth")}
                />
              </Field>
              <Field label="Employee ID" error={validation.getError("employee_id")}>
                <Input value={formData.employee_id} onChange={e => set("employee_id", e.target.value)} onBlur={() => onBlur("employee_id")} placeholder="EMP-001" maxLength={50} className={errClass("employee_id")} />
              </Field>
            </div>
          </Section>
        </TabsContent>

        {/* ============ STEP 2: ADDRESS ============ */}
        <TabsContent value="address" className="mt-4 space-y-6 focus-visible:outline-none">
          <Section icon={<MapPin className="w-5 h-5 text-primary" />} title="Address">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CascadingLocationSelector
                region={formData.address_region}
                zone={formData.address_zone}
                woreda={formData.address_woreda}
                onRegionChange={v => set("address_region", v)}
                onZoneChange={v => set("address_zone", v)}
                onWoredaChange={v => set("address_woreda", v)}
                regionLabel="Region"
                required
              />
              <div className="md:col-span-3">
                <Field label="Specific Address" error={validation.getError("address_specific")}>
                  <Input value={formData.address_specific} onChange={e => set("address_specific", e.target.value)} onBlur={() => onBlur("address_specific")} placeholder="Building name, street, directions..." maxLength={500} className={errClass("address_specific")} />
                </Field>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ============ STEP 3: LEGAL & ID ============ */}
        <TabsContent value="legal" className="mt-4 space-y-6 focus-visible:outline-none">
          <Section icon={<CreditCard className="w-5 h-5 text-primary" />} title="Legal & Verification">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="ID Type" required error={validation.getError("govt_id_type")} fieldRef={registerRef("govt_id_type")}>
                <Select value={formData.govt_id_type} onValueChange={v => { set("govt_id_type", v); validation.validateField("govt_id_type", v); }}>
                  <SelectTrigger className={errClass("govt_id_type")} onBlur={() => onBlur("govt_id_type")}><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={idLabel} required error={validation.getError("license_number")} success={!validation.getError("license_number") && !!formData.license_number && validation.touched.license_number} fieldRef={registerRef("license_number")}>
                <Input value={formData.license_number} onChange={e => set("license_number", e.target.value)} onBlur={() => onBlur("license_number")} placeholder={`Enter ${idLabel.toLowerCase()}...`} maxLength={50} className={errClass("license_number")} aria-invalid={!!validation.getError("license_number")} />
              </Field>
              <Field label="National ID (FAN)" error={validation.getError("national_id")} hint="Exactly 12 digits">
                <Input
                  value={formData.national_id}
                  onChange={e => set("national_id", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  onBlur={() => onBlur("national_id")}
                  placeholder="123456789012"
                  maxLength={12}
                  inputMode="numeric"
                  className={errClass("national_id")}
                  aria-invalid={!!validation.getError("national_id")}
                />
              </Field>
              <Field label="License Type / Class">
                <Select value={formData.license_type} onValueChange={v => set("license_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {LICENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="License Issue Date" error={validation.getError("license_issue_date")}>
                <DatePickerField
                  value={formData.license_issue_date}
                  onChange={(v) => set("license_issue_date", v)}
                  onBlur={() => onBlur("license_issue_date")}
                  max={today()}
                  placeholder="Select issue date"
                  ariaInvalid={!!validation.getError("license_issue_date")}
                />
              </Field>
              <Field label="License Expiry Date" error={validation.getError("license_expiry")} fieldRef={registerRef("license_expiry")}>
                <DatePickerField
                  value={formData.license_expiry}
                  onChange={(v) => { set("license_expiry", v); validation.validateField("license_expiry", v); }}
                  onBlur={() => onBlur("license_expiry")}
                  min={formData.license_issue_date || today()}
                  placeholder="Select expiry date"
                  ariaInvalid={!!validation.getError("license_expiry")}
                />
              </Field>
            </div>
          </Section>

          <Section icon={<Paperclip className="w-5 h-5 text-primary" />} title="Driver Attachments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploadField label="Driver's License (Front)" accept="image/*,.pdf" selectedFile={licenseFrontFile} onFileSelect={setLicenseFrontFile} />
              <FileUploadField label="Driver's License (Back)" accept="image/*,.pdf" selectedFile={licenseBackFile} onFileSelect={setLicenseBackFile} />
              <FileUploadField label="National ID Card" accept="image/*,.pdf" selectedFile={nationalIdFile} onFileSelect={setNationalIdFile} />
              <FileUploadField label="Profile Photo" accept="image/*" selectedFile={profilePhotoFile} onFileSelect={setProfilePhotoFile} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Accepted: Images and PDF. Max size: 5MB per file.</p>
          </Section>
        </TabsContent>

        {/* ============ STEP 4: EMPLOYMENT ============ */}
        <TabsContent value="employment" className="mt-4 space-y-6 focus-visible:outline-none">
          <Section icon={<Building2 className="w-5 h-5 text-primary" />} title="Employment Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Employment Status">
                <Select value={formData.employment_type} onValueChange={v => set("employment_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Driver Status" required error={validation.getError("status")}>
                <Select value={formData.status} onValueChange={v => { set("status", v); validation.validateField("status", v); }}>
                  <SelectTrigger className={errClass("status")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DRIVER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Effective Date" error={validation.getError("joining_date")} fieldRef={registerRef("joining_date")}>
                <DatePickerField
                  value={formData.joining_date}
                  onChange={(v) => { set("joining_date", v); validation.validateField("joining_date", v); }}
                  onBlur={() => onBlur("joining_date")}
                  placeholder="Select effective date"
                  ariaInvalid={!!validation.getError("joining_date")}
                />
              </Field>
              <Field label="Assigned Pool" required error={validation.getError("department")} hint="Corporate, Zone or Regional pool" fieldRef={registerRef("department")}>
                <Select value={formData.department} onValueChange={v => { set("department", v); set("assigned_pool", v); validation.validateField("department", v); }}>
                  <SelectTrigger className={errClass("department")} onBlur={() => onBlur("department")}>
                    <SelectValue placeholder="Select pool..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["Corporate Pools", "Regional Pools", "Other"].map(group => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {ASSIGNED_POOLS.filter(p => p.group === group).map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Years of Experience" error={validation.getError("experience_years")}>
                <Input type="number" min={0} max={60} value={formData.experience_years} onChange={e => set("experience_years", e.target.value)} onBlur={() => onBlur("experience_years")} placeholder="e.g. 3" className={errClass("experience_years")} />
              </Field>
            </div>
          </Section>

          <Section icon={<CreditCard className="w-5 h-5 text-primary" />} title="Telebirr Account (Optional)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Telebirr Account" error={validation.getError("telebirr_account")} hint="Optional — used for payroll/payouts">
                <Input value={formData.telebirr_account} onChange={e => set("telebirr_account", e.target.value.replace(/[^\d+]/g, "").slice(0, 13))} onBlur={() => onBlur("telebirr_account")} placeholder="09XXXXXXXX" maxLength={13} inputMode="tel" className={errClass("telebirr_account")} />
              </Field>
            </div>
          </Section>
        </TabsContent>

        {/* ============ STEP 5: EMERGENCY ============ */}
        <TabsContent value="emergency" className="mt-4 space-y-6 focus-visible:outline-none">
          <Section icon={<AlertCircle className="w-5 h-5 text-destructive" />} title="Emergency Contact">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Contact Name" required error={validation.getError("emergency_contact_name")} success={!validation.getError("emergency_contact_name") && !!formData.emergency_contact_name && validation.touched.emergency_contact_name} fieldRef={registerRef("emergency_contact_name")}>
                <Input value={formData.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} onBlur={() => onBlur("emergency_contact_name")} placeholder="Family member name" maxLength={150} className={errClass("emergency_contact_name")} aria-invalid={!!validation.getError("emergency_contact_name")} />
              </Field>
              <Field label="Contact Phone" required error={validation.getError("emergency_contact_phone")} success={!validation.getError("emergency_contact_phone") && !!formData.emergency_contact_phone && validation.touched.emergency_contact_phone} fieldRef={registerRef("emergency_contact_phone")} hint="Format: 09XXXXXXXX">
                <Input value={formData.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value.replace(/[^\d+]/g, "").slice(0, 13))} onBlur={() => onBlur("emergency_contact_phone")} placeholder="09XXXXXXXX" maxLength={13} inputMode="tel" className={errClass("emergency_contact_phone")} aria-invalid={!!validation.getError("emergency_contact_phone")} />
              </Field>
              <Field label="Blood Type">
                <Select value={formData.blood_type} onValueChange={v => set("blood_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={<Droplets className="w-5 h-5 text-primary" />} title="Identification Tags (Optional)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="RFID Tag"><Input value={formData.rfid_tag} onChange={e => set("rfid_tag", e.target.value)} placeholder="RFID tag number" maxLength={100} /></Field>
              <Field label="iButton ID"><Input value={formData.ibutton_id} onChange={e => set("ibutton_id", e.target.value)} placeholder="iButton ID" maxLength={100} /></Field>
              <Field label="Bluetooth ID"><Input value={formData.bluetooth_id} onChange={e => set("bluetooth_id", e.target.value)} placeholder="Bluetooth device ID" maxLength={100} /></Field>
            </div>
          </Section>
        </TabsContent>

        {/* ============ STEP 6: ACCOUNT ============ */}
        <TabsContent value="credentials" className="mt-4 space-y-6 focus-visible:outline-none">
          <Section icon={<Key className="w-5 h-5 text-primary" />} title="Account Credentials">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Password" required error={validation.getError("password")} success={!validation.getError("password") && !!formData.password && validation.touched.password} fieldRef={registerRef("password")} hint="Min 12 chars · upper · lower · digit · special">
                <div className="flex gap-2">
                  <Input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => set("password", e.target.value)} onBlur={() => onBlur("password")} placeholder="••••••••••••" maxLength={100} className={cn("flex-1", errClass("password"))} aria-invalid={!!validation.getError("password")} />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {/* Password strength meter */}
                {formData.password && <PasswordStrengthMeter password={formData.password} />}
              </Field>
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  const pwd = generatePassword();
                  set("password", pwd);
                  validation.validateField("password", pwd);
                  setShowPassword(true);
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Generate
                </Button>
                {formData.password && (
                  <Button type="button" variant="outline" size="icon" onClick={() => {
                    navigator.clipboard.writeText(formData.password);
                    toast({ title: "Copied", description: "Password copied to clipboard" });
                  }} aria-label="Copy password">
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Section>

          <Section icon={<FileText className="w-5 h-5 text-primary" />} title="Additional Notes">
            <Field label="Notes" error={validation.getError("notes")}>
              <Textarea value={formData.notes} onChange={e => set("notes", e.target.value)} onBlur={() => onBlur("notes")} placeholder="Additional information..." rows={3} maxLength={2000} className={errClass("notes")} />
              <p className="text-[11px] text-muted-foreground text-right">{formData.notes.length}/2000</p>
            </Field>
          </Section>
        </TabsContent>
      </Tabs>

      {/* In-step Prev/Next navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={goPrev} disabled={currentStepIdx === 0} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground hidden md:inline">
          {STEPS[currentStepIdx]?.label} · {currentStepIdx + 1}/{STEPS.length}
        </span>
        {currentStepIdx < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext} className="gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Badge variant="outline" className="gap-1 text-primary border-primary/40">
            <CheckCircle2 className="w-3 h-3" /> Final step
          </Badge>
        )}
      </div>
    </div>
  );

  const footerButtons = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button onClick={handleSubmit} disabled={createMutation.isPending} className="min-w-[140px]">
        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Register Driver
      </Button>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {body}
        <div className="flex justify-end gap-2 pt-4 border-t">{footerButtons}</div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-primary/5 via-background to-background">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">Register New Driver</DialogTitle>
              <DialogDescription className="mt-0.5">
                Complete each step. Fields validate as you go — descriptive errors guide you to fix issues quickly.
              </DialogDescription>
              {(draftSavedAt || draftRestoredAt) && (
                <div className="mt-2.5 max-w-md">
                  <DraftStatus
                    restoredAt={draftRestoredAt}
                    savedAt={draftSavedAt}
                    onClear={() => {
                      clearDraft();
                      setFormData({ ...initialForm, ...(prefill ?? {}) });
                      validation.reset();
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(95vh-220px)]">
          <div className="px-6 py-4">{body}</div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">{footerButtons}</DialogFooter>
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
  label,
  required,
  error,
  hint,
  success,
  fieldRef,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  success?: boolean;
  fieldRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5" ref={fieldRef}>
      <Label className={cn("text-sm flex items-center gap-1", error && "text-destructive", success && "text-foreground")}>
        {label}
        {required && <span className="text-destructive" aria-hidden="true">*</span>}
        {success && !error && <CheckCircle2 className="w-3 h-3 text-primary ml-auto" aria-label="Valid" />}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150" role="alert">
          <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Inline password strength meter — purely visual, complements the schema rules. */
function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = [
    { label: "12+ chars", ok: password.length >= 12 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Digit", ok: /[0-9]/.test(password) },
    { label: "Special", ok: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const pct = (score / checks.length) * 100;
  const tone =
    score <= 2 ? "bg-destructive" : score === 3 ? "bg-amber-500" : score === 4 ? "bg-yellow-400" : "bg-primary";
  return (
    <div className="space-y-1.5 mt-1">
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all duration-300", tone)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
              c.ok
                ? "border-primary/40 text-primary bg-primary/5"
                : "border-border text-muted-foreground bg-muted/40",
            )}
          >
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
