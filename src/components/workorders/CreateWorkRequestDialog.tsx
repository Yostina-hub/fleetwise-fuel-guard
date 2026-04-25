import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Wrench, AlertTriangle, CheckCircle } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

const workRequestSchema = z.object({
  vehicle_id: z.string().uuid("Please select an asset/vehicle"),
  request_type: z.string().min(1, "Request type is required"),
  assigned_department: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  request_start_date: z.string().min(1, "Start date is required"),
  request_completion_date: z.string().min(1, "Completion date is required"),
  requested_for: z.string().optional(),
  asset_criticality: z.string().optional(),
  service_description: z.string().trim().min(1, "Description is required").max(1000),
  maintenance_type: z.string().optional(),
  km_reading: z.number().optional(),
  driver_type: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  fuel_level: z.number().optional(),
  remark: z.string().optional(),
  notify_user: z.boolean().optional(),
  contact_preference: z.string().optional(),
});

interface CreateWorkRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** When true, render inline (no outer Dialog) — used by the unified FormRenderer / legacy registry. */
  embedded?: boolean;
  /** Optional callback fired after a successful work-request submission. */
  onSubmitted?: (payload: { id: string; work_order_number: string }) => void;
}

const REQUEST_TYPES = [
  { value: "maintenance", label: "Vehicle Maintenance Request" },
  { value: "repair", label: "Repair Request" },
  { value: "inspection", label: "Inspection Request" },
  { value: "preventive", label: "Preventive Maintenance" },
  { value: "emergency", label: "Emergency Repair" },
  { value: "body_work", label: "Body Work Request" },
];

const MAINTENANCE_TYPES = [
  "Oil Change", "Tire Service", "Brake Service", "Engine Repair",
  "Transmission", "Electrical", "Body Repair", "AC/Heating",
  "Suspension", "Exhaust", "Battery", "Windshield/Glass", "Other",
];

const DRIVER_TYPES = [
  "Internal", "Outsourced", "Temporary", "Contract",
];

const CreateWorkRequestDialog = ({ open, onOpenChange, onSuccess, embedded, onSubmitted }: CreateWorkRequestDialogProps) => {
  const { organizationId } = useOrganization();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: unknown, ctx?: Record<string, unknown>) => {
    const candidate = { ...form, ...(ctx ?? {}), [field]: value };
    const parsed = workRequestSchema.safeParse({
      ...candidate,
      km_reading: candidate.km_reading ? Number(candidate.km_reading) : undefined,
      fuel_level: candidate.fuel_level ? Number(candidate.fuel_level) : undefined,
    });
    const issue = parsed.success ? null : parsed.error.issues.find(i => i.path[0] === field);
    setFieldErrors(prev => {
      const next = { ...prev };
      if (issue) next[field] = issue.message;
      else delete next[field];
      return next;
    });
  };

  const handleBlur = (field: string, value: unknown) => {
    setTouched(prev => (prev[field] ? prev : { ...prev, [field]: true }));
    validateField(field, value);
  };

  const errorOf = (field: string) => (touched[field] ? fieldErrors[field] : undefined);

  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  const [form, setForm] = useState({
    vehicle_id: "",
    request_type: "maintenance",
    assigned_department: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    request_start_date: now,
    request_completion_date: "",
    requested_for: "",
    asset_criticality: "normal",
    service_description: "",
    maintenance_type: "",
    km_reading: "",
    driver_type: "",
    driver_name: "",
    driver_phone: "",
    fuel_level: "",
    remark: "",
    notify_user: false,
    contact_preference: "email",
  });

  // Reset on open
  useEffect(() => {
    if (open || embedded) {
      const nowStr = format(new Date(), "yyyy-MM-dd'T'HH:mm");
      setForm(f => ({ ...f, request_start_date: nowStr, request_completion_date: "" }));
      setFieldErrors({});
      setTouched({});
    }
  }, [open, embedded]);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles-for-wo", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && (open || !!embedded),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("id, name")
        .eq("organization_id", organizationId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && (open || !!embedded),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-for-wo", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, phone, employment_type")
        .eq("organization_id", organizationId!)
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        full_name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        phone_number: d.phone || '',
        employment_type: d.employment_type || '',
      }));
    },
    enabled: !!organizationId && (open || !!embedded),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-for-wo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      return {
        id: user.id,
        email: user.email || "",
        full_name: profile?.full_name || user.email?.split("@")[0] || "",
        phone: profile?.phone || "",
      };
    },
    enabled: open || !!embedded,
  });

  const handleDriverSelect = (driverName: string) => {
    const driver = drivers.find(d => d.full_name === driverName);
    setForm(f => ({
      ...f,
      driver_name: driverName,
      driver_phone: driver?.phone_number || "",
      driver_type: driver?.employment_type || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = workRequestSchema.safeParse({
      ...form,
      km_reading: form.km_reading ? Number(form.km_reading) : undefined,
      fuel_level: form.fuel_level ? Number(form.fuel_level) : undefined,
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path?.[0];
        if (typeof key === "string" && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      // Mark every errored field as touched so messages render via errorOf().
      setTouched(prev => {
        const next = { ...prev };
        for (const k of Object.keys(errs)) next[k] = true;
        return next;
      });
      return;
    }

    setSubmitting(true);
    try {
      const woNumber = `WR-${Date.now().toString().slice(-8)}`;
      const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id);

      const { data: insertedWO, error } = await supabase.from("work_orders").insert({
        work_order_number: woNumber,
        organization_id: organizationId!,
        vehicle_id: form.vehicle_id,
        work_type: form.maintenance_type || form.request_type,
        request_type: form.request_type,
        assigned_department: form.assigned_department || null,
        priority: form.priority,
        service_description: form.service_description,
        request_start_date: form.request_start_date ? new Date(form.request_start_date).toISOString() : null,
        request_completion_date: form.request_completion_date ? new Date(form.request_completion_date).toISOString() : null,
        requested_for: form.requested_for || currentUser?.full_name || null,
        asset_criticality: form.asset_criticality,
        maintenance_type: form.maintenance_type || null,
        km_reading: form.km_reading ? Number(form.km_reading) : null,
        driver_type: form.driver_type || null,
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        fuel_level: form.fuel_level ? Number(form.fuel_level) : null,
        remark: form.remark || null,
        notify_user: form.notify_user,
        contact_preference: form.contact_preference,
        created_by_user_id: currentUser?.id || null,
        created_by_name: currentUser?.full_name || null,
        created_by_email: currentUser?.email || null,
        created_by_phone: currentUser?.phone || null,
        scheduled_date: form.request_start_date ? new Date(form.request_start_date).toISOString().split("T")[0] : null,
        parts_cost: 0,
        labor_cost: 0,
        total_cost: 0,
      }).select("id, work_order_number").single();

      if (error) throw error;
      onSuccess?.();
      onSubmitted?.({ id: insertedWO!.id, work_order_number: insertedWO!.work_order_number });
      onOpenChange(false);
    } catch (err: any) {
      setFieldErrors({ _form: err.message || "Failed to create work request" });
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary" />
        Create Work Request
      </DialogTitle>
    </DialogHeader>
  );

  const formEl = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fieldErrors._form && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {fieldErrors._form}
        </div>
      )}

      {/* Section 1: Asset & Request Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Asset & Request Information</h3>
        <Separator />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Asset Number *</Label>
          <Select
            value={form.vehicle_id}
            onValueChange={v => {
              setForm(f => ({ ...f, vehicle_id: v }));
              validateField("vehicle_id", v);
              setTouched(prev => ({ ...prev, vehicle_id: true }));
            }}
          >
            <SelectTrigger className={errorOf("vehicle_id") ? "border-destructive" : undefined}>
              <SelectValue placeholder="Select vehicle..." />
            </SelectTrigger>
            <SelectContent>
              {vehiclesLoading ? (
                <SelectItem value="__loading" disabled>Loading...</SelectItem>
              ) : vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorOf("vehicle_id") && <p className="text-xs text-destructive mt-1">{errorOf("vehicle_id")}</p>}
        </div>

        <div>
          <Label>Work Request Type *</Label>
          <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REQUEST_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Assigned Department</Label>
          <Select value={form.assigned_department} onValueChange={v => setForm(f => ({ ...f, assigned_department: v }))}>
            <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
              <SelectItem value="fleet_operations">Fleet Operations</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Priority *</Label>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Request Start Date & Time *</Label>
          <Input
            type="datetime-local"
            value={form.request_start_date}
            onChange={e => { setForm(f => ({ ...f, request_start_date: e.target.value })); validateField("request_start_date", e.target.value); }}
            onBlur={e => handleBlur("request_start_date", e.target.value)}
            aria-invalid={!!errorOf("request_start_date")}
            className={errorOf("request_start_date") ? "border-destructive focus-visible:ring-destructive" : undefined}
          />
          {errorOf("request_start_date") && <p className="text-xs text-destructive mt-1">{errorOf("request_start_date")}</p>}
        </div>

        <div>
          <Label>Request Completion Date & Time *</Label>
          <Input
            type="datetime-local"
            value={form.request_completion_date}
            onChange={e => { setForm(f => ({ ...f, request_completion_date: e.target.value })); validateField("request_completion_date", e.target.value); }}
            onBlur={e => handleBlur("request_completion_date", e.target.value)}
            aria-invalid={!!errorOf("request_completion_date")}
            className={errorOf("request_completion_date") ? "border-destructive focus-visible:ring-destructive" : undefined}
          />
          {errorOf("request_completion_date") && <p className="text-xs text-destructive mt-1">{errorOf("request_completion_date")}</p>}
        </div>

        <div>
          <Label>Requested For</Label>
          <Input
            value={form.requested_for}
            onChange={e => setForm(f => ({ ...f, requested_for: e.target.value }))}
            placeholder={currentUser?.full_name || "Enter name..."}
          />
        </div>

        <div>
          <Label>Asset Criticality</Label>
          <Select value={form.asset_criticality} onValueChange={v => setForm(f => ({ ...f, asset_criticality: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 2: Description */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Request Description</h3>
        <Separator />
      </div>

      <div>
        <Label>Additional Description *</Label>
        <Textarea
          value={form.service_description}
          onChange={e => { setForm(f => ({ ...f, service_description: e.target.value })); validateField("service_description", e.target.value); }}
          onBlur={e => handleBlur("service_description", e.target.value)}
          placeholder="Describe the work needed..."
          rows={3}
          aria-invalid={!!errorOf("service_description")}
          className={errorOf("service_description") ? "border-destructive focus-visible:ring-destructive" : undefined}
        />
        {errorOf("service_description") && <p className="text-xs text-destructive mt-1">{errorOf("service_description")}</p>}
      </div>

      {/* Section 3: Creation Information */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Creation Information</h3>
        <Separator />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground text-xs">Created By</Label>
          <p className="text-sm font-medium mt-1">{currentUser?.full_name || "Loading..."}</p>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-muted-foreground text-xs">Notify User</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.notify_user}
              onCheckedChange={v => setForm(f => ({ ...f, notify_user: !!v }))}
            />
            <span className="text-sm">{form.notify_user ? "Yes" : "No"}</span>
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Phone Number</Label>
          <p className="text-sm mt-1">{currentUser?.phone || "-"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">E-mail</Label>
          <p className="text-sm mt-1">{currentUser?.email || "-"}</p>
        </div>
        <div>
          <Label>Contact Preference</Label>
          <Select value={form.contact_preference} onValueChange={v => setForm(f => ({ ...f, contact_preference: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 4: Descriptive Information */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Descriptive Information</h3>
        <Separator />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-muted-foreground text-xs">Context Value</Label>
          <div className="mt-1">
            <Badge variant="secondary" className="text-xs">
              {REQUEST_TYPES.find(t => t.value === form.request_type)?.label || "Vehicle Maintenance Request"}
            </Badge>
          </div>
        </div>

        <div>
          <Label>Requestor Department</Label>
          <Select value={form.assigned_department} onValueChange={v => setForm(f => ({ ...f, assigned_department: v }))}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
              <SelectItem value="fleet_operations">Fleet Operations</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Type of Maintenance Request</Label>
          <Select value={form.maintenance_type} onValueChange={v => setForm(f => ({ ...f, maintenance_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {MAINTENANCE_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>KM Reading</Label>
          <Input
            type="number"
            value={form.km_reading}
            onChange={e => setForm(f => ({ ...f, km_reading: e.target.value }))}
            placeholder="Current odometer..."
          />
        </div>

        <div>
          <Label>Driver Type</Label>
          <Select value={form.driver_type} onValueChange={v => setForm(f => ({ ...f, driver_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {DRIVER_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Driver Name</Label>
          <Select value={form.driver_name} onValueChange={handleDriverSelect}>
            <SelectTrigger><SelectValue placeholder="Select driver..." /></SelectTrigger>
            <SelectContent>
              {drivers.map(d => (
                <SelectItem key={d.id} value={d.full_name}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Driver Phone No.</Label>
          <Input
            value={form.driver_phone}
            onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))}
            placeholder="Auto-filled from driver..."
            readOnly={!!drivers.find(d => d.full_name === form.driver_name)}
          />
        </div>

        <div>
          <Label>Fuel Level in Tank</Label>
          <Input
            type="number"
            value={form.fuel_level}
            onChange={e => setForm(f => ({ ...f, fuel_level: e.target.value }))}
            placeholder="Liters or %..."
          />
        </div>

        <div className="md:col-span-2">
          <Label>Remark</Label>
          <Textarea
            value={form.remark}
            onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
            placeholder="Additional notes..."
            rows={2}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Submit Request
            </>
          )}
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return <div className="space-y-4">{formEl}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {header}
        {formEl}
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkRequestDialog;
