import { useState } from "react";
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
import { z } from "zod";
import { Loader2, User, CreditCard, FileText, AlertCircle, MapPin, Briefcase, Building2, Key, Copy, RefreshCw, Droplets, Paperclip } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DRIVER_TYPES, ADMIN_REGIONS, ID_TYPES, LICENSE_TYPES, EMPLOYMENT_STATUSES,
  DRIVER_STATUSES, ROUTE_TYPES, BLOOD_TYPES, GENDERS, ASSIGNED_LOCATIONS,
} from "./formConstants";
import FileUploadField from "./FileUploadField";
import { uploadFleetFile } from "./uploadFleetFile";

const nameRegex = /^[\p{L}\s'.-]+$/u;

const driverSchema = z.object({
  first_name: z.string().trim().min(2, "Min 2 characters").max(100).regex(nameRegex, "Invalid characters"),
  middle_name: z.string().trim().min(2, "Min 2 characters").max(100).regex(nameRegex, "Invalid characters"),
  last_name: z.string().trim().min(2, "Min 2 characters").max(100).regex(nameRegex, "Invalid characters"),
  phone: z.string().trim().regex(/^09[0-9]{8}$/, "Ethiopian phone: 09XXXXXXXX"),
  driver_type: z.string().min(1, "Required"),
  govt_id_type: z.string().min(1, "Required"),
  license_number: z.string().trim().min(1, "Required"),
  department: z.string().min(1, "Assigned location is required"),
  emergency_contact_name: z.string().trim().min(1, "Required"),
  emergency_contact_phone: z.string().trim().min(1, "Required"),
  password: z.string().min(12, "Min 12 characters").max(100)
    .regex(/[A-Z]/, "Need uppercase").regex(/[a-z]/, "Need lowercase")
    .regex(/[0-9]/, "Need digit").regex(/[!@#$%^&*(),.?":{}|<>]/, "Need special char"),
});

const generatePassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, render the form body inline (no outer Dialog wrapper). */
  embedded?: boolean;
  /** Optional initial values (e.g. when launched from a workflow task). */
  prefill?: Record<string, any>;
  /** Fired after the driver row is successfully inserted. */
  onSubmitted?: (result: { id: string }) => void;
}

const initialForm = {
  first_name: "", middle_name: "", last_name: "",
  gender: "", phone: "", email: "", date_of_birth: "",
  driver_type: "ethio_contract",
  address_region: "", address_zone: "", address_woreda: "", address_specific: "",
  govt_id_type: "", license_number: "", national_id: "",
  license_type: "", license_issue_date: "", license_expiry: "",
  employment_type: "regular", status: "active",
  joining_date: "", department: "", experience_years: "", route_type: "intracity",
  bank_name: "", bank_account: "",
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
  const [formData, setFormData] = useState({ ...initialForm, ...(prefill ?? {}) });
  const [showPassword, setShowPassword] = useState(false);

  // File attachments
  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  const set = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!canSubmit()) throw new Error("Please wait before submitting again");
      const { data: inserted, error } = await supabase.from("drivers").insert({
        ...data,
        organization_id: organizationId,
      }).select("id").single();
      if (error) throw error;

      // Upload attachments if provided
      const driverId = inserted.id;
      const updates: Record<string, string> = {};

      if (licenseFrontFile) {
        updates.license_front_url = await uploadFleetFile("driver-documents", driverId, "license_front", licenseFrontFile);
      }
      if (licenseBackFile) {
        updates.license_back_url = await uploadFleetFile("driver-documents", driverId, "license_back", licenseBackFile);
      }
      if (nationalIdFile) {
        updates.national_id_url = await uploadFleetFile("driver-documents", driverId, "national_id", nationalIdFile);
      }
      if (profilePhotoFile) {
        updates.avatar_url = await uploadFleetFile("driver-documents", driverId, "profile_photo", profilePhotoFile);
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase.from("drivers").update(updates).eq("id", driverId);
        if (updateErr) console.error("Failed to update attachment URLs:", updateErr);
      }

      // Provision Driver Portal account when email + password supplied
      // (assigns the `driver` role so the sidebar entry becomes visible via RBAC)
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
      return { portalProvisioned };
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: result?.portalProvisioned
          ? "Driver registered and portal access provisioned"
          : "Driver registered successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setFormData({ ...initialForm });
      setLicenseFrontFile(null); setLicenseBackFile(null);
      setNationalIdFile(null); setProfilePhotoFile(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to register driver", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    const validation = driverSchema.safeParse(formData);
    if (!validation.success) {
      toast({ title: "Validation Error", description: validation.error.errors[0].message, variant: "destructive" });
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
      status: formData.status,
      joining_date: formData.joining_date || null,
      department: formData.department || null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      route_type: formData.route_type || null,
      bank_name: formData.bank_name.trim() || null,
      bank_account: formData.bank_account.trim() || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Register New Driver
          </DialogTitle>
          <DialogDescription>Enter driver details per the registration specification</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <div className="p-6 space-y-6">

            {/* 1.1 Employment Type */}
            <Section icon={<Briefcase className="w-5 h-5 text-primary" />} title="Employment Type">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Driver Type *">
                  <Select value={formData.driver_type} onValueChange={v => set("driver_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

            {/* 1.2 Personal Information */}
            <Section icon={<User className="w-5 h-5 text-primary" />} title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="First Name *">
                  <Input value={formData.first_name} onChange={e => set("first_name", e.target.value)} placeholder="e.g. Abebe" />
                </Field>
                <Field label="Middle Name *">
                  <Input value={formData.middle_name} onChange={e => set("middle_name", e.target.value)} placeholder="e.g. Kebede" />
                </Field>
                <Field label="Last Name *">
                  <Input value={formData.last_name} onChange={e => set("last_name", e.target.value)} placeholder="e.g. Tadesse" />
                </Field>
                <Field label="Gender">
                  <Select value={formData.gender} onValueChange={v => set("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Phone Number *">
                  <Input value={formData.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="09XXXXXXXX" maxLength={10} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={formData.email} onChange={e => set("email", e.target.value)} placeholder="driver@example.com" />
                </Field>
                <Field label="Date of Birth">
                  <Input type="date" value={formData.date_of_birth} onChange={e => set("date_of_birth", e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]} />
                </Field>
                <Field label="Employee ID">
                  <Input value={formData.employee_id} onChange={e => set("employee_id", e.target.value)} placeholder="EMP-001" />
                </Field>
              </div>
            </Section>

            {/* 1.3 Address */}
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
                  <Field label="Specific Address">
                    <Input value={formData.address_specific} onChange={e => set("address_specific", e.target.value)} placeholder="Building name, street, directions..." maxLength={500} />
                  </Field>
                </div>
              </div>
            </Section>

            {/* 1.4 Legal & Verification */}
            <Section icon={<CreditCard className="w-5 h-5 text-primary" />} title="Legal & Verification">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="ID Type *">
                  <Select value={formData.govt_id_type} onValueChange={v => set("govt_id_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={`${idLabel} *`}>
                  <Input value={formData.license_number} onChange={e => set("license_number", e.target.value)} placeholder={`Enter ${idLabel.toLowerCase()}...`} />
                </Field>
                <Field label="National ID (FAN)">
                  <Input value={formData.national_id} onChange={e => set("national_id", e.target.value)} placeholder="Please Enter FAN" />
                </Field>
                <Field label="License Type / Class">
                  <Select value={formData.license_type} onValueChange={v => set("license_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="License Issue Date">
                  <Input type="date" value={formData.license_issue_date} onChange={e => set("license_issue_date", e.target.value)} />
                </Field>
                <Field label="License Expiry Date">
                  <Input type="date" value={formData.license_expiry} onChange={e => set("license_expiry", e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* 1.5 Driver Attachments */}
            <Section icon={<Paperclip className="w-5 h-5 text-primary" />} title="Driver Attachments">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadField
                  label="Driver's License (Front)"
                  accept="image/*,.pdf"
                  selectedFile={licenseFrontFile}
                  onFileSelect={setLicenseFrontFile}
                />
                <FileUploadField
                  label="Driver's License (Back)"
                  accept="image/*,.pdf"
                  selectedFile={licenseBackFile}
                  onFileSelect={setLicenseBackFile}
                />
                <FileUploadField
                  label="National ID Card"
                  accept="image/*,.pdf"
                  selectedFile={nationalIdFile}
                  onFileSelect={setNationalIdFile}
                />
                <FileUploadField
                  label="Profile Photo"
                  accept="image/*"
                  selectedFile={profilePhotoFile}
                  onFileSelect={setProfilePhotoFile}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Accepted: Images and PDF. Max size: 5MB per file.</p>
            </Section>

            {/* 1.6 Employment Details */}
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
                <Field label="Driver Status">
                  <Select value={formData.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DRIVER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Effective Date">
                  <Input type="date" value={formData.joining_date} onChange={e => set("joining_date", e.target.value)} />
                </Field>
                <Field label="Assigned Location *">
                  <Select value={formData.department} onValueChange={v => set("department", v)}>
                    <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
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
                <Field label="Years of Experience">
                  <Input type="number" min={0} value={formData.experience_years} onChange={e => set("experience_years", e.target.value)} placeholder="e.g. 3" />
                </Field>
                <Field label="Type of Routes">
                  <Select value={formData.route_type} onValueChange={v => set("route_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROUTE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* 1.7 Banking */}
            <Section icon={<CreditCard className="w-5 h-5 text-primary" />} title="Banking Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Bank Name">
                  <Input value={formData.bank_name} onChange={e => set("bank_name", e.target.value)} />
                </Field>
                <Field label="Bank Account Number">
                  <Input value={formData.bank_account} onChange={e => set("bank_account", e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* 1.8 Emergency Contact */}
            <Section icon={<AlertCircle className="w-5 h-5 text-destructive" />} title="Emergency Contact">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Contact Name *">
                  <Input value={formData.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} placeholder="Family member name" />
                </Field>
                <Field label="Contact Phone *">
                  <Input value={formData.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} placeholder="09****1234" />
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

            {/* Identification Tags */}
            <Section icon={<Droplets className="w-5 h-5 text-primary" />} title="Identification Tags (Optional)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="RFID Tag"><Input value={formData.rfid_tag} onChange={e => set("rfid_tag", e.target.value)} placeholder="RFID tag number" /></Field>
                <Field label="iButton ID"><Input value={formData.ibutton_id} onChange={e => set("ibutton_id", e.target.value)} placeholder="iButton ID" /></Field>
                <Field label="Bluetooth ID"><Input value={formData.bluetooth_id} onChange={e => set("bluetooth_id", e.target.value)} placeholder="Bluetooth device ID" /></Field>
              </div>
            </Section>

            {/* 1.9 Account Credentials */}
            <Section icon={<Key className="w-5 h-5 text-primary" />} title="Account Credentials">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Password *">
                  <div className="flex gap-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={e => set("password", e.target.value)}
                      placeholder="Min 12 chars, upper/lower/digit/special"
                      maxLength={100}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? "🙈" : "👁"}
                    </Button>
                  </div>
                </Field>
                <div className="flex items-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    const pwd = generatePassword();
                    set("password", pwd);
                    setShowPassword(true);
                  }}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Generate
                  </Button>
                  {formData.password && (
                    <Button type="button" variant="outline" size="icon" onClick={() => {
                      navigator.clipboard.writeText(formData.password);
                      toast({ title: "Copied", description: "Password copied to clipboard" });
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Section>

            {/* 1.10 Notes */}
            <Section icon={<FileText className="w-5 h-5 text-primary" />} title="Additional Notes">
              <Textarea value={formData.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional information..." rows={3} />
            </Section>

          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="min-w-[120px]">
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Register Driver
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
