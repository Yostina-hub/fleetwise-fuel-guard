import { useEffect, useRef, useState } from "react";
import { CascadingLocationSelector } from "@/components/fleet/CascadingLocationSelector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Loader2,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  MapPin,
  Briefcase,
  Building2,
  Droplets,
  Paperclip,
  Edit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Driver } from "@/hooks/useDrivers";
import {
  DRIVER_TYPES,
  ID_TYPES,
  LICENSE_TYPES,
  EMPLOYMENT_STATUSES,
  DRIVER_STATUSES,
  ASSIGNED_POOLS,
  ASSIGNED_LOCATIONS,
  BLOOD_TYPES,
  GENDERS,
} from "./formConstants";
import FileUploadField from "./FileUploadField";
import { uploadFleetFile } from "./uploadFleetFile";
import { useDriverValidation } from "./useDriverValidation";
import type { DriverFieldName } from "./driverValidation";
import { DatePickerField } from "@/components/shared/DatePickerField";

const today = () => new Date().toISOString().split("T")[0];
const MAX_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split("T")[0];
})();

const REQUIRED_FIELDS: Set<DriverFieldName> = new Set([
  "driver_type",
  "first_name",
  "middle_name",
  "last_name",
  "phone",
  "govt_id_type",
  "license_number",
  "status",
  "department",
  "emergency_contact_name",
  "emergency_contact_phone",
]);

const initialForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  phone: "",
  email: "",
  date_of_birth: "",
  driver_type: "",
  address_region: "",
  address_zone: "",
  address_woreda: "",
  address_specific: "",
  govt_id_type: "",
  license_number: "",
  national_id: "",
  license_type: "",
  license_issue_date: "",
  license_expiry: "",
  employment_type: "regular",
  contract_end_date: "",
  status: "active",
  joining_date: "",
  department: "",
  experience_years: "",
  assigned_pool: "",
  pool_category: "",
  telebirr_account: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  blood_type: "",
  notes: "",
  rfid_tag: "",
  ibutton_id: "",
  bluetooth_id: "",
  employee_id: "",
  medical_certificate_expiry: "",
  license_front_url: "",
  license_back_url: "",
  national_id_url: "",
  avatar_url: "",
};

const EDIT_STEPS: { id: string; label: string; icon: React.ComponentType<any>; fields: DriverFieldName[] }[] = [
  {
    id: "personal",
    label: "Personal",
    icon: User,
    fields: ["driver_type", "first_name", "middle_name", "last_name", "phone", "email", "date_of_birth", "employee_id"],
  },
  {
    id: "address",
    label: "Address",
    icon: MapPin,
    fields: ["address_specific"],
  },
  {
    id: "legal",
    label: "Legal & ID",
    icon: CreditCard,
    fields: ["govt_id_type", "license_number", "national_id", "license_issue_date", "license_expiry"],
  },
  {
    id: "employment",
    label: "Employment",
    icon: Building2,
    fields: ["status", "department", "joining_date", "experience_years", "telebirr_account"],
  },
  {
    id: "emergency",
    label: "Emergency",
    icon: AlertCircle,
    fields: ["emergency_contact_name", "emergency_contact_phone", "blood_type", "rfid_tag", "ibutton_id", "bluetooth_id"],
  },
  {
    id: "notes",
    label: "Notes",
    icon: FileText,
    fields: ["notes"],
  },
];

const EDIT_FIELD_ORDER: DriverFieldName[] = EDIT_STEPS.flatMap((step) => step.fields);

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
}

export default function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const validation = useDriverValidation();
  const resetValidation = validation.reset;
  const fieldRefs = useRef<Partial<Record<DriverFieldName, HTMLElement | null>>>({});

  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string>(EDIT_STEPS[0].id);
  const [formData, setFormData] = useState(initialForm);

  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveStep(EDIT_STEPS[0].id);
      resetValidation();
      return;
    }

    if (!driver) return;

    let cancelled = false;
    setLoading(true);
    setLicenseFrontFile(null);
    setLicenseBackFile(null);
    setNationalIdFile(null);
    setProfilePhotoFile(null);

    supabase
      .from("drivers")
      .select("*")
      .eq("id", driver.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);

        if (error) {
          toast({
            title: "Error",
            description: error.message || "Failed to load driver details",
            variant: "destructive",
          });
          return;
        }

        if (!data) return;

        setFormData({
          ...initialForm,
          first_name: data.first_name || "",
          middle_name: (data as any).middle_name || "",
          last_name: data.last_name || "",
          gender: (data as any).gender || "",
          phone: data.phone || "",
          email: data.email || "",
          date_of_birth: (data as any).date_of_birth || "",
          driver_type: (data as any).driver_type || "",
          address_region: (data as any).address_region || "",
          address_zone: (data as any).address_zone || "",
          address_woreda: (data as any).address_woreda || "",
          address_specific: (data as any).address_specific || "",
          govt_id_type: (data as any).govt_id_type || "",
          license_number: data.license_number || "",
          national_id: (data as any).national_id || "",
          license_type: (data as any).license_type || "",
          license_issue_date: (data as any).license_issue_date || "",
          license_expiry: data.license_expiry || "",
          employment_type: (data as any).employment_type || "regular",
          contract_end_date: (data as any).contract_end_date || "",
          status: data.status || "active",
          joining_date: (data as any).joining_date || (data as any).hire_date || "",
          department: (data as any).department || (data as any).assigned_pool || "",
          experience_years: (data as any).experience_years?.toString() || "",
          assigned_pool: (data as any).assigned_pool || (data as any).department || "",
          pool_category: (() => {
            const v = (data as any).department || (data as any).assigned_pool || "";
            return ASSIGNED_LOCATIONS.find((l) => l.value === v)?.group || "";
          })(),
          telebirr_account: (data as any).telebirr_account || "",
          emergency_contact_name: data.emergency_contact_name || "",
          emergency_contact_phone: data.emergency_contact_phone || "",
          blood_type: (data as any).blood_type || "",
          notes: data.notes || "",
          rfid_tag: data.rfid_tag || "",
          ibutton_id: data.ibutton_id || "",
          bluetooth_id: data.bluetooth_id || "",
          employee_id: data.employee_id || "",
          medical_certificate_expiry: data.medical_certificate_expiry || "",
          license_front_url: (data as any).license_front_url || "",
          license_back_url: (data as any).license_back_url || "",
          national_id_url: (data as any).national_id_url || "",
          avatar_url: data.avatar_url || "",
        });
        resetValidation();
      });

    return () => {
      cancelled = true;
    };
  }, [driver, open, toast, resetValidation]);

  const set = (field: keyof typeof initialForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validation.touched[field as DriverFieldName]) {
      validation.validateField(field as DriverFieldName, value);
    }
  };

  const onBlur = (field: DriverFieldName) => {
    validation.handleBlur(field, formData[field]);
  };

  const registerRef = (field: DriverFieldName) => (el: HTMLElement | null) => {
    fieldRefs.current[field] = el;
  };

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!driver) throw new Error("No driver selected");

      const payload = { ...data } as Record<string, unknown>;

      if (licenseFrontFile) {
        payload.license_front_url = await uploadFleetFile("driver-documents", driver.id, "license_front", licenseFrontFile);
      }
      if (licenseBackFile) {
        payload.license_back_url = await uploadFleetFile("driver-documents", driver.id, "license_back", licenseBackFile);
      }
      if (nationalIdFile) {
        payload.national_id_url = await uploadFleetFile("driver-documents", driver.id, "national_id", nationalIdFile);
      }
      if (profilePhotoFile) {
        payload.avatar_url = await uploadFleetFile("driver-documents", driver.id, "profile_photo", profilePhotoFile);
      }

      const { data: updated, error } = await supabase
        .from("drivers")
        .update(payload)
        .eq("id", driver.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("Update blocked: check permissions or record availability");
      return updated;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Driver updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["driver", driver?.id] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update driver",
        variant: "destructive",
      });
    },
  });

  const stepHasErrors = (stepId: string) => {
    const step = EDIT_STEPS.find((item) => item.id === stepId);
    return step?.fields.some((field) => validation.errors[field]) ?? false;
  };

  const stepIsComplete = (stepId: string) => {
    const step = EDIT_STEPS.find((item) => item.id === stepId);
    if (!step) return false;

    return step.fields.every((field) => {
      const value = formData[field];
      const hasError = validation.errors[field];
      return !hasError && (typeof value === "string" ? value.trim().length > 0 || !REQUIRED_FIELDS.has(field) : true);
    });
  };

  const completedFields = EDIT_FIELD_ORDER.filter(
    (field) => !validation.errors[field] && !!formData[field]?.toString().trim(),
  ).length;
  const progressPct = Math.round((completedFields / EDIT_FIELD_ORDER.length) * 100);
  const errorCount = Object.keys(validation.errors).filter((key) => EDIT_FIELD_ORDER.includes(key as DriverFieldName)).length;

  const currentStepIdx = EDIT_STEPS.findIndex((step) => step.id === activeStep);
  const goPrev = () => currentStepIdx > 0 && setActiveStep(EDIT_STEPS[currentStepIdx - 1].id);
  const goNext = () => {
    const step = EDIT_STEPS[currentStepIdx];
    const result = validation.validateFields(step.fields, formData);

    if (!result.ok) {
      const count = Object.keys(result.errors).length;
      toast({
        title: `${count} ${count === 1 ? "field needs" : "fields need"} attention on this step`,
        description: Object.values(result.errors)[0],
        variant: "destructive",
      });
      return;
    }

    if (currentStepIdx < EDIT_STEPS.length - 1) setActiveStep(EDIT_STEPS[currentStepIdx + 1].id);
  };

  const handleSubmit = () => {
    const result = validation.validateFields(EDIT_FIELD_ORDER, formData);

    if (!result.ok) {
      const count = Object.keys(result.errors).length;
      const firstInvalidField = EDIT_FIELD_ORDER.find((field) => result.errors[field]);
      const targetStep = EDIT_STEPS.find((step) => step.fields.some((field) => result.errors[field]));

      if (targetStep) setActiveStep(targetStep.id);

      toast({
        title: `Please fix ${count} ${count === 1 ? "error" : "errors"}`,
        description: firstInvalidField ? result.errors[firstInvalidField] : "Please review the highlighted fields.",
        variant: "destructive",
      });

      if (firstInvalidField) {
        setTimeout(() => {
          const el = fieldRefs.current[firstInvalidField];
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const focusable = el.querySelector<HTMLElement>("input, button, textarea, [tabindex]") ?? el;
          focusable.focus?.();
        }, 50);
      }
      return;
    }

    const cleanData = {
      first_name: formData.first_name.trim(),
      middle_name: formData.middle_name.trim() || null,
      last_name: formData.last_name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      driver_type: formData.driver_type || null,
      gender: formData.gender || null,
      date_of_birth: formData.date_of_birth || null,
      address_region: formData.address_region || null,
      address_zone: formData.address_zone || null,
      address_woreda: formData.address_woreda || null,
      address_specific: formData.address_specific.trim() || null,
      govt_id_type: formData.govt_id_type || null,
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
      hire_date: formData.joining_date || null,
      department: formData.department || null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years, 10) : null,
      assigned_pool: formData.assigned_pool || formData.department || null,
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
    };

    updateMutation.mutate(cleanData);
  };

  if (!driver) return null;

  const idLabel = formData.govt_id_type === "passport"
    ? "Passport Number"
    : formData.govt_id_type === "kebele_id"
      ? "Kebele ID Number"
      : "License Number";

  const errClass = (field: DriverFieldName) => (
    validation.getError(field) ? "border-destructive focus-visible:ring-destructive" : ""
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-primary/5 via-background to-background">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Edit className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">Edit Driver</DialogTitle>
              <DialogDescription className="mt-0.5">
                Same registration workflow, prefilled with this driver&apos;s current details for faster editing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[calc(95vh-220px)]">
              <div className="px-6 py-4">
                <div className="flex flex-col">
                  <div className="sticky top-0 z-10 -mx-2 px-2 pt-2 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">
                          Step <span className="font-semibold text-foreground">{currentStepIdx + 1}</span> of {EDIT_STEPS.length} ·{" "}
                          <span className="font-semibold text-foreground">{EDIT_STEPS[currentStepIdx]?.label}</span>
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
                      {EDIT_STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const hasErr = stepHasErrors(step.id);
                        const done = stepIsComplete(step.id) && !hasErr;

                        return (
                          <TabsTrigger
                            key={step.id}
                            value={step.id}
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
                                {hasErr ? "!" : done ? <CheckCircle2 className="w-3 h-3" /> : index + 1}
                              </span>
                              <Icon className="w-3.5 h-3.5 hidden md:inline" />
                            </div>
                            <span className="font-medium">{step.label}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

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

                    <TabsContent value="personal" className="mt-4 space-y-6 focus-visible:outline-none">
                      <Section icon={<Briefcase className="w-5 h-5 text-primary" />} title="Employment Type">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                          <Field label="Driver Type" required error={validation.getError("driver_type")} fieldRef={registerRef("driver_type")}>
                            <Select value={formData.driver_type} onValueChange={(value) => { set("driver_type", value); validation.validateField("driver_type", value); }}>
                              <SelectTrigger className={errClass("driver_type")} onBlur={() => onBlur("driver_type")}>
                                <SelectValue placeholder="Select driver type..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Ethio telecom</SelectLabel>
                                  {DRIVER_TYPES.filter((item) => item.group === "Ethio telecom").map((item) => (
                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                  ))}
                                </SelectGroup>
                                <SelectGroup>
                                  <SelectLabel>Other</SelectLabel>
                                  {DRIVER_TYPES.filter((item) => item.group === "Other").map((item) => (
                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </Section>

                      <Section icon={<User className="w-5 h-5 text-primary" />} title="Personal Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                          <Field label="First Name" required error={validation.getError("first_name")} success={!validation.getError("first_name") && !!formData.first_name && validation.touched.first_name} fieldRef={registerRef("first_name")}>
                            <Input value={formData.first_name} onChange={(e) => set("first_name", e.target.value)} onBlur={() => onBlur("first_name")} placeholder="e.g. Abebe" maxLength={100} className={errClass("first_name")} aria-invalid={!!validation.getError("first_name")} />
                          </Field>
                          <Field label="Middle Name" required error={validation.getError("middle_name")} success={!validation.getError("middle_name") && !!formData.middle_name && validation.touched.middle_name} fieldRef={registerRef("middle_name")}>
                            <Input value={formData.middle_name} onChange={(e) => set("middle_name", e.target.value)} onBlur={() => onBlur("middle_name")} placeholder="e.g. Kebede" maxLength={100} className={errClass("middle_name")} aria-invalid={!!validation.getError("middle_name")} />
                          </Field>
                          <Field label="Last Name" required error={validation.getError("last_name")} success={!validation.getError("last_name") && !!formData.last_name && validation.touched.last_name} fieldRef={registerRef("last_name")}>
                            <Input value={formData.last_name} onChange={(e) => set("last_name", e.target.value)} onBlur={() => onBlur("last_name")} placeholder="e.g. Tadesse" maxLength={100} className={errClass("last_name")} aria-invalid={!!validation.getError("last_name")} />
                          </Field>
                          <Field label="Gender">
                            <Select value={formData.gender} onValueChange={(value) => set("gender", value)}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {GENDERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Phone Number" required error={validation.getError("phone")} success={!validation.getError("phone") && !!formData.phone && validation.touched.phone} fieldRef={registerRef("phone")} hint="Format: 09XXXXXXXX (10 digits)">
                            <Input value={formData.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={() => onBlur("phone")} placeholder="09XXXXXXXX" maxLength={10} inputMode="numeric" className={errClass("phone")} aria-invalid={!!validation.getError("phone")} />
                          </Field>
                          <Field label="Email" error={validation.getError("email")} success={!validation.getError("email") && !!formData.email && validation.touched.email} fieldRef={registerRef("email")} hint="Used for portal access">
                            <Input type="email" value={formData.email} onChange={(e) => set("email", e.target.value)} onBlur={() => onBlur("email")} placeholder="driver@example.com" maxLength={255} className={errClass("email")} aria-invalid={!!validation.getError("email")} />
                          </Field>
                          <Field label="Date of Birth" error={validation.getError("date_of_birth")} fieldRef={registerRef("date_of_birth")} hint="Driver must be at least 18 years old">
                            <DatePickerField
                              value={formData.date_of_birth}
                              onChange={(value) => set("date_of_birth", value)}
                              onBlur={() => onBlur("date_of_birth")}
                              max={MAX_DOB}
                              placeholder="Select date of birth"
                              ariaInvalid={!!validation.getError("date_of_birth")}
                            />
                          </Field>
                          <Field label="Employee ID" error={validation.getError("employee_id")}>
                            <Input value={formData.employee_id} onChange={(e) => set("employee_id", e.target.value)} onBlur={() => onBlur("employee_id")} placeholder="EMP-001" maxLength={50} className={errClass("employee_id")} />
                          </Field>
                        </div>
                      </Section>
                    </TabsContent>

                    <TabsContent value="address" className="mt-4 space-y-6 focus-visible:outline-none">
                      <Section icon={<MapPin className="w-5 h-5 text-primary" />} title="Address">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                          <CascadingLocationSelector
                            region={formData.address_region}
                            zone={formData.address_zone}
                            woreda={formData.address_woreda}
                            onRegionChange={(value) => set("address_region", value)}
                            onZoneChange={(value) => set("address_zone", value)}
                            onWoredaChange={(value) => set("address_woreda", value)}
                            regionLabel="Region"
                            required
                          />
                          <div className="md:col-span-3">
                            <Field label="Specific Address" error={validation.getError("address_specific")}>
                              <Input value={formData.address_specific} onChange={(e) => set("address_specific", e.target.value)} onBlur={() => onBlur("address_specific")} placeholder="Building name, street, directions..." maxLength={500} className={errClass("address_specific")} />
                            </Field>
                          </div>
                        </div>
                      </Section>
                    </TabsContent>

                    <TabsContent value="legal" className="mt-4 space-y-6 focus-visible:outline-none">
                      <Section icon={<CreditCard className="w-5 h-5 text-primary" />} title="Legal & Verification">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                          <Field label="ID Type" required error={validation.getError("govt_id_type")} fieldRef={registerRef("govt_id_type")}>
                            <Select value={formData.govt_id_type} onValueChange={(value) => { set("govt_id_type", value); validation.validateField("govt_id_type", value); }}>
                              <SelectTrigger className={errClass("govt_id_type")} onBlur={() => onBlur("govt_id_type")}><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {ID_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label={idLabel} required error={validation.getError("license_number")} success={!validation.getError("license_number") && !!formData.license_number && validation.touched.license_number} fieldRef={registerRef("license_number")}>
                            <Input value={formData.license_number} onChange={(e) => set("license_number", e.target.value)} onBlur={() => onBlur("license_number")} placeholder={`Enter ${idLabel.toLowerCase()}...`} maxLength={50} className={errClass("license_number")} aria-invalid={!!validation.getError("license_number")} />
                          </Field>
                          <Field label="National ID (FAN)" error={validation.getError("national_id")} hint="Exactly 12 digits">
                            <Input
                              value={formData.national_id}
                              onChange={(e) => set("national_id", e.target.value.replace(/\D/g, "").slice(0, 12))}
                              onBlur={() => onBlur("national_id")}
                              placeholder="123456789012"
                              maxLength={12}
                              inputMode="numeric"
                              className={errClass("national_id")}
                              aria-invalid={!!validation.getError("national_id")}
                            />
                          </Field>
                          <Field label="License Type / Class">
                            <Select value={formData.license_type} onValueChange={(value) => set("license_type", value)}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {LICENSE_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="License Issue Date" error={validation.getError("license_issue_date")}>
                            <DatePickerField
                              value={formData.license_issue_date}
                              onChange={(value) => set("license_issue_date", value)}
                              onBlur={() => onBlur("license_issue_date")}
                              max={today()}
                              placeholder="Select issue date"
                              ariaInvalid={!!validation.getError("license_issue_date")}
                            />
                          </Field>
                          <Field label="License Expiry Date" error={validation.getError("license_expiry")} fieldRef={registerRef("license_expiry")}>
                            <DatePickerField
                              value={formData.license_expiry}
                              onChange={(value) => { set("license_expiry", value); validation.validateField("license_expiry", value); }}
                              onBlur={() => onBlur("license_expiry")}
                              min={formData.license_issue_date || today()}
                              placeholder="Select expiry date"
                              ariaInvalid={!!validation.getError("license_expiry")}
                            />
                          </Field>
                        </div>
                      </Section>

                      <Section icon={<Paperclip className="w-5 h-5 text-primary" />} title="Driver Attachments">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                          <FileUploadField label="Driver's License (Front)" accept="image/*,.pdf" currentUrl={formData.license_front_url || null} selectedFile={licenseFrontFile} onFileSelect={setLicenseFrontFile} />
                          <FileUploadField label="Driver's License (Back)" accept="image/*,.pdf" currentUrl={formData.license_back_url || null} selectedFile={licenseBackFile} onFileSelect={setLicenseBackFile} />
                          <FileUploadField label="National ID Card" accept="image/*,.pdf" currentUrl={formData.national_id_url || null} selectedFile={nationalIdFile} onFileSelect={setNationalIdFile} />
                          <FileUploadField label="Profile Photo" accept="image/*" currentUrl={formData.avatar_url || null} selectedFile={profilePhotoFile} onFileSelect={setProfilePhotoFile} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Accepted: Images and PDF. Max size: 5MB per file.</p>
                      </Section>
                    </TabsContent>

                    <TabsContent value="employment" className="mt-4 space-y-6 focus-visible:outline-none">
                      <Section icon={<Building2 className="w-5 h-5 text-primary" />} title="Employment Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                          <Field label="Employment Status">
                            <Select value={formData.employment_type} onValueChange={(value) => { set("employment_type", value); if (value !== "contract") set("contract_end_date", ""); }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {EMPLOYMENT_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                          {formData.employment_type === "contract" && (
                            <Field label="Contract End Date" required error={validation.getError("contract_end_date" as any)} fieldRef={registerRef("contract_end_date" as any)}>
                              <DatePickerField
                                value={formData.contract_end_date}
                                onChange={(value) => { set("contract_end_date", value); validation.validateField("contract_end_date" as any, value); }}
                                onBlur={() => onBlur("contract_end_date" as any)}
                                min={today()}
                                placeholder="Select end date"
                                ariaInvalid={!!validation.getError("contract_end_date" as any)}
                              />
                            </Field>
                          )}
                          <Field label="Driver Status" required error={validation.getError("status")}>
                            <Select value={formData.status} onValueChange={(value) => { set("status", value); validation.validateField("status", value); }}>
                              <SelectTrigger className={errClass("status")}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DRIVER_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Effective Date" error={validation.getError("joining_date")} fieldRef={registerRef("joining_date")}>
                            <DatePickerField
                              value={formData.joining_date}
                              onChange={(value) => { set("joining_date", value); validation.validateField("joining_date", value); }}
                              onBlur={() => onBlur("joining_date")}
                              placeholder="Select effective date"
                              ariaInvalid={!!validation.getError("joining_date")}
                            />
                          </Field>
                          <Field label="Pool Category" required hint="Corporate / Zone / Region">
                            <Select
                              value={formData.pool_category}
                              onValueChange={(v) => {
                                set("pool_category", v);
                                const cur = ASSIGNED_LOCATIONS.find((l) => l.value === formData.department);
                                if (!cur || cur.group !== v) {
                                  set("department", "");
                                  set("assigned_pool", "");
                                  validation.validateField("department", "");
                                }
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Corporate">Corporate</SelectItem>
                                <SelectItem value="Zone">Zone</SelectItem>
                                <SelectItem value="Region">Region</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Assigned Pool" required error={validation.getError("department")} hint="Filtered by Pool Category" fieldRef={registerRef("department")}>
                            <Select
                              value={formData.department}
                              onValueChange={(value) => { set("department", value); set("assigned_pool", value); validation.validateField("department", value); }}
                              disabled={!formData.pool_category}
                            >
                              <SelectTrigger className={cn(errClass("department"), !formData.pool_category && "opacity-50")} onBlur={() => onBlur("department")}>
                                <SelectValue placeholder={formData.pool_category ? "Select pool..." : "Pick category first"} />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {formData.pool_category === "Corporate" ? (
                                  ASSIGNED_LOCATIONS
                                    .filter((l) => l.group === "Corporate" && !(l as any).parent)
                                    .flatMap((parent) => {
                                      const subs = ASSIGNED_LOCATIONS.filter(
                                        (l: any) => l.group === "Corporate" && l.parent === parent.value,
                                      );
                                      return [
                                        <SelectItem key={parent.value} value={parent.value}>
                                          <span className="flex items-center gap-2 font-semibold">
                                            <MapPin className="h-3.5 w-3.5 text-primary" />
                                            {parent.label}
                                          </span>
                                        </SelectItem>,
                                        ...subs.map((s: any) => (
                                          <SelectItem key={s.value} value={s.value}>
                                            <span className="flex items-center gap-2 pl-4 text-sm">
                                              <span className="text-muted-foreground">└</span>
                                              <span className="truncate">{s.label}</span>
                                              {s.shift && s.shift !== "all" && (
                                                <span className="ml-auto text-[10px] uppercase text-muted-foreground">{s.shift}</span>
                                              )}
                                            </span>
                                          </SelectItem>
                                        )),
                                      ];
                                    })
                                ) : (
                                  ASSIGNED_LOCATIONS
                                    .filter((l) => l.group === formData.pool_category)
                                    .map((l) => (
                                      <SelectItem key={l.value} value={l.value}>
                                        <span className="flex items-center gap-2">
                                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                          {l.label}
                                        </span>
                                      </SelectItem>
                                    ))
                                )}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Years of Experience" error={validation.getError("experience_years")}>
                            <Input type="number" min={0} max={60} value={formData.experience_years} onChange={(e) => set("experience_years", e.target.value)} onBlur={() => onBlur("experience_years")} placeholder="e.g. 3" className={errClass("experience_years")} />
                          </Field>
                        </div>
                      </Section>

                      <Section icon={<CreditCard className="w-5 h-5 text-primary" />} title="Telebirr Account (Optional)">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                          <Field label="Telebirr Account" error={validation.getError("telebirr_account")} hint="Optional — used for payroll/payouts">
                            <Input value={formData.telebirr_account} onChange={(e) => set("telebirr_account", e.target.value.replace(/[^\d+]/g, "").slice(0, 13))} onBlur={() => onBlur("telebirr_account")} placeholder="09XXXXXXXX" maxLength={13} inputMode="tel" className={errClass("telebirr_account")} />
                          </Field>
                        </div>
                      </Section>
                    </TabsContent>

                    <TabsContent value="emergency" className="mt-4 space-y-6 focus-visible:outline-none">
                      <Section icon={<AlertCircle className="w-5 h-5 text-destructive" />} title="Emergency Contact">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                          <Field label="Contact Name" required error={validation.getError("emergency_contact_name")} success={!validation.getError("emergency_contact_name") && !!formData.emergency_contact_name && validation.touched.emergency_contact_name} fieldRef={registerRef("emergency_contact_name")}>
                            <Input value={formData.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} onBlur={() => onBlur("emergency_contact_name")} placeholder="Family member name" maxLength={150} className={errClass("emergency_contact_name")} aria-invalid={!!validation.getError("emergency_contact_name")} />
                          </Field>
                          <Field label="Contact Phone" required error={validation.getError("emergency_contact_phone")} success={!validation.getError("emergency_contact_phone") && !!formData.emergency_contact_phone && validation.touched.emergency_contact_phone} fieldRef={registerRef("emergency_contact_phone")} hint="Format: 09XXXXXXXX">
                            <Input value={formData.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value.replace(/[^\d+]/g, "").slice(0, 13))} onBlur={() => onBlur("emergency_contact_phone")} placeholder="09XXXXXXXX" maxLength={13} inputMode="tel" className={errClass("emergency_contact_phone")} aria-invalid={!!validation.getError("emergency_contact_phone")} />
                          </Field>
                          <Field label="Blood Type">
                            <Select value={formData.blood_type} onValueChange={(value) => set("blood_type", value)}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {BLOOD_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </Section>

                      <Section icon={<Droplets className="w-5 h-5 text-primary" />} title="Identification Tags (Optional)">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                          <Field label="RFID Tag"><Input value={formData.rfid_tag} onChange={(e) => set("rfid_tag", e.target.value)} placeholder="RFID tag number" maxLength={100} /></Field>
                          <Field label="iButton ID"><Input value={formData.ibutton_id} onChange={(e) => set("ibutton_id", e.target.value)} placeholder="iButton ID" maxLength={100} /></Field>
                          <Field label="Bluetooth ID"><Input value={formData.bluetooth_id} onChange={(e) => set("bluetooth_id", e.target.value)} placeholder="Bluetooth device ID" maxLength={100} /></Field>
                        </div>
                      </Section>
                    </TabsContent>

                    <TabsContent value="notes" className="mt-4 space-y-6 focus-visible:outline-none">
                      <Section icon={<FileText className="w-5 h-5 text-primary" />} title="Additional Notes">
                        <Field label="Notes" error={validation.getError("notes")}>
                          <Textarea value={formData.notes} onChange={(e) => set("notes", e.target.value)} onBlur={() => onBlur("notes")} placeholder="Additional information..." rows={4} maxLength={2000} className={errClass("notes")} />
                          <p className="text-[11px] text-muted-foreground text-right">{formData.notes.length}/2000</p>
                        </Field>
                      </Section>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={goPrev} disabled={currentStepIdx === 0} className="gap-1">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <span className="text-xs text-muted-foreground hidden md:inline">
                      {EDIT_STEPS[currentStepIdx]?.label} · {currentStepIdx + 1}/{EDIT_STEPS.length}
                    </span>
                    {currentStepIdx < EDIT_STEPS.length - 1 ? (
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
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="min-w-[140px]">
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}
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
