import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThirdPartyClaimWorkflow } from "@/hooks/useThirdPartyClaimWorkflow";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

/**
 * Third-party fault claim schema
 * ------------------------------
 * - Vehicle is required (the claim has to anchor to one of our vehicles).
 * - Accident date is required, in the past, and not older than 1 year
 *   (older claims must be filed via the historical-import flow).
 * - Description is required (>= 20 chars) — insurers reject placeholder text.
 * - Cross-field: if a third-party name is provided, a contact (phone/email)
 *   must accompany it so the claim is actually actionable.
 */
const claimSchema = z
  .object({
    vehicle_id: z.string().min(1, "Vehicle is required"),
    driver_id: z.string().optional().or(z.literal("")),
    accident_date: z.string().min(1, "Accident date and time are required"),
    accident_location: z
      .string()
      .trim()
      .min(3, "Accident location is required")
      .max(200, "Location must be 200 characters or fewer"),
    description: z
      .string()
      .trim()
      .min(20, "Provide at least 20 characters describing the accident")
      .max(2000, "Description must be 2000 characters or fewer"),
    third_party_name: z
      .string()
      .trim()
      .max(120, "Name must be 120 characters or fewer")
      .optional()
      .or(z.literal("")),
    third_party_vehicle: z
      .string()
      .trim()
      .max(80, "Vehicle must be 80 characters or fewer")
      .optional()
      .or(z.literal("")),
    third_party_insurance: z
      .string()
      .trim()
      .max(120, "Insurance must be 120 characters or fewer")
      .optional()
      .or(z.literal("")),
    third_party_contact: z
      .string()
      .trim()
      .max(120, "Contact must be 120 characters or fewer")
      .optional()
      .or(z.literal("")),
    police_report_number: z
      .string()
      .trim()
      .max(60, "Report number must be 60 characters or fewer")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.accident_date) {
      const t = new Date(data.accident_date).getTime();
      if (Number.isFinite(t)) {
        const now = Date.now();
        if (t > now + 60_000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accident_date"],
            message: "Accident date cannot be in the future",
          });
        }
        const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
        if (t < now - ONE_YEAR) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accident_date"],
            message: "Accidents older than 1 year must be filed via historical import",
          });
        }
      }
    }
    if (data.third_party_name?.trim() && !data.third_party_contact?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["third_party_contact"],
        message: "Provide a contact (phone or email) for the named third party",
      });
    }
  });

export function NewThirdPartyClaimDialog({ open, onOpenChange }: Props) {
  const { organizationId } = useOrganization();
  const { createClaim } = useThirdPartyClaimWorkflow();
  const [form, setForm] = useState({
    vehicle_id: "",
    driver_id: "",
    accident_date: new Date().toISOString().slice(0, 16),
    accident_location: "",
    description: "",
    third_party_name: "",
    third_party_vehicle: "",
    third_party_insurance: "",
    third_party_contact: "",
    police_report_number: "",
  });
  const v = useFieldValidation(claimSchema, () => form);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId!).limit(500);
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-list", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, first_name, last_name").eq("organization_id", organizationId!).limit(500);
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const resetForm = () => {
    setForm({
      vehicle_id: "",
      driver_id: "",
      accident_date: new Date().toISOString().slice(0, 16),
      accident_location: "",
      description: "",
      third_party_name: "",
      third_party_vehicle: "",
      third_party_insurance: "",
      third_party_contact: "",
      police_report_number: "",
    });
    v.reset();
  };

  const submit = async () => {
    const result = v.validateAll(form);
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} invalid field${count === 1 ? "" : "s"} before creating the claim`);
      return;
    }
    try {
      await createClaim.mutateAsync({
        ...form,
        driver_id: form.driver_id || undefined,
        accident_date: new Date(form.accident_date).toISOString(),
      });
      toast.success("Third-party claim created");
      resetForm();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create claim");
    }
  };

  const errCls = (field: keyof typeof form) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";
  const visibleErrorCount = Object.keys(v.errors).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Third-Party Fault Claim</DialogTitle>
          <DialogDescription>
            <span className="text-destructive">*</span> indicates required field.
          </DialogDescription>
        </DialogHeader>

        {visibleErrorCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">
                {visibleErrorCount} field{visibleErrorCount === 1 ? "" : "s"} need attention
              </div>
              <div className="text-xs opacity-90">
                Fix the highlighted fields before creating the claim.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Vehicle <span className="text-destructive">*</span></Label>
            <Select
              value={form.vehicle_id}
              onValueChange={(val) => {
                setForm(f => ({ ...f, vehicle_id: val }));
                v.handleChange("vehicle_id", val);
              }}
            >
              <SelectTrigger className={cn(errCls("vehicle_id"))} aria-invalid={!!v.getError("vehicle_id")}>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>{vehicles.map((veh: any) => <SelectItem key={veh.id} value={veh.id}>{veh.plate_number}</SelectItem>)}</SelectContent>
            </Select>
            {v.getError("vehicle_id") && (
              <p className="text-sm text-destructive mt-1">{v.getError("vehicle_id")}</p>
            )}
          </div>
          <div>
            <Label>Driver</Label>
            <Select value={form.driver_id} onValueChange={(val) => setForm(f => ({ ...f, driver_id: val }))}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>{drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Accident date/time <span className="text-destructive">*</span></Label>
            <Input
              type="datetime-local"
              max={new Date().toISOString().slice(0, 16)}
              value={form.accident_date}
              onChange={e => {
                setForm(f => ({ ...f, accident_date: e.target.value }));
                v.handleChange("accident_date", e.target.value);
              }}
              onBlur={e => v.handleBlur("accident_date", e.target.value)}
              aria-invalid={!!v.getError("accident_date")}
              className={cn(errCls("accident_date"))}
            />
            {v.getError("accident_date") && (
              <p className="text-sm text-destructive mt-1">{v.getError("accident_date")}</p>
            )}
          </div>
          <div>
            <Label>Police report #</Label>
            <Input
              value={form.police_report_number}
              onChange={e => {
                setForm(f => ({ ...f, police_report_number: e.target.value }));
                v.handleChange("police_report_number", e.target.value);
              }}
              onBlur={e => v.handleBlur("police_report_number", e.target.value)}
              placeholder="If obtained"
              className={cn(errCls("police_report_number"))}
            />
            {v.getError("police_report_number") && (
              <p className="text-sm text-destructive mt-1">{v.getError("police_report_number")}</p>
            )}
          </div>
          <div className="col-span-2">
            <Label>Accident location <span className="text-destructive">*</span></Label>
            <Input
              value={form.accident_location}
              onChange={e => {
                setForm(f => ({ ...f, accident_location: e.target.value }));
                v.handleChange("accident_location", e.target.value);
              }}
              onBlur={e => v.handleBlur("accident_location", e.target.value)}
              aria-invalid={!!v.getError("accident_location")}
              className={cn(errCls("accident_location"))}
            />
            {v.getError("accident_location") && (
              <p className="text-sm text-destructive mt-1">{v.getError("accident_location")}</p>
            )}
          </div>
          <div className="col-span-2">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Textarea
              rows={4}
              value={form.description}
              placeholder="Describe what happened, who was at fault, weather, road conditions, witnesses..."
              onChange={e => {
                setForm(f => ({ ...f, description: e.target.value }));
                v.handleChange("description", e.target.value);
              }}
              onBlur={e => v.handleBlur("description", e.target.value)}
              aria-invalid={!!v.getError("description")}
              className={cn(errCls("description"))}
            />
            {v.getError("description") && (
              <p className="text-sm text-destructive mt-1">{v.getError("description")}</p>
            )}
          </div>

          <div className="col-span-2 border-t pt-3 mt-2">
            <p className="text-sm font-semibold mb-2">Third party information</p>
          </div>
          <div>
            <Label>Third party name</Label>
            <Input
              value={form.third_party_name}
              onChange={e => {
                setForm(f => ({ ...f, third_party_name: e.target.value }));
                v.handleChange("third_party_name", e.target.value);
              }}
              onBlur={e => v.handleBlur("third_party_name", e.target.value)}
              className={cn(errCls("third_party_name"))}
            />
            {v.getError("third_party_name") && (
              <p className="text-sm text-destructive mt-1">{v.getError("third_party_name")}</p>
            )}
          </div>
          <div>
            <Label>Third party vehicle</Label>
            <Input
              value={form.third_party_vehicle}
              onChange={e => {
                setForm(f => ({ ...f, third_party_vehicle: e.target.value }));
                v.handleChange("third_party_vehicle", e.target.value);
              }}
              onBlur={e => v.handleBlur("third_party_vehicle", e.target.value)}
              className={cn(errCls("third_party_vehicle"))}
            />
          </div>
          <div>
            <Label>Third party insurance</Label>
            <Input
              value={form.third_party_insurance}
              onChange={e => {
                setForm(f => ({ ...f, third_party_insurance: e.target.value }));
                v.handleChange("third_party_insurance", e.target.value);
              }}
              onBlur={e => v.handleBlur("third_party_insurance", e.target.value)}
              className={cn(errCls("third_party_insurance"))}
            />
          </div>
          <div>
            <Label>
              Third party contact
              {form.third_party_name.trim() && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              value={form.third_party_contact}
              placeholder="Phone or email"
              onChange={e => {
                setForm(f => ({ ...f, third_party_contact: e.target.value }));
                v.handleChange("third_party_contact", e.target.value);
              }}
              onBlur={e => v.handleBlur("third_party_contact", e.target.value)}
              aria-invalid={!!v.getError("third_party_contact")}
              className={cn(errCls("third_party_contact"))}
            />
            {v.getError("third_party_contact") && (
              <p className="text-sm text-destructive mt-1">{v.getError("third_party_contact")}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={createClaim.isPending}>
            {createClaim.isPending ? "Creating..." : "Create claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
