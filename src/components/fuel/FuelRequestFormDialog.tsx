import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, Truck, Power, FileText, ClipboardCheck, Send, MapPin, History,
  Fuel, User, Phone, Mail, Building2, Calendar, AlertTriangle, AlertCircle, Hash, Gauge, Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";
import { toast } from "sonner";
import { ValidatedField } from "@/components/forms/ValidatedField";
import { useFuelRequestValidation } from "./useFuelRequestValidation";
import {
  sanitizePhone, sanitizeEmail, sanitizeNumeric, sanitizeProjectNumber,
  sanitizeText, sanitizeShortText,
} from "./fuelRequestValidation";

export interface FuelRequestPrefill {
  request_type?: "vehicle" | "generator";
  vehicle_id?: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  fuel_type?: string;
  /** lock fields when caller already has the entity context (e.g. driver portal) */
  lockVehicle?: boolean;
  lockDriver?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: FuelRequestPrefill;
  /** Source of the request — used for trigger_source field */
  source?: "manual" | "driver_portal" | "auto";
  /** Invalidate these query keys after successful create */
  invalidateKeys?: string[][];
  /** Optional callback fired after a successful fuel request submission. */
  onSubmitted?: (payload: { fuel_request_id?: string }) => void;
  /** When true, render inline without the Dialog wrapper — used by the unified Forms renderer. */
  embedded?: boolean;
}

interface FormData {
  request_type: string;
  vehicle_id: string;
  generator_id: string;
  driver_id: string;
  fuel_type: string;
  liters_requested: string;
  estimated_cost: string;
  purpose: string;
  current_odometer: string;
  notes: string;
  driver_type: string;
  driver_name: string;
  employee_id_no: string;
  vehicle_driver_name: string;
  requestor_department: string;
  fuel_in_telebirr: string;
  driver_phone: string;
  fuel_by_cash_coupon: string;
  fuel_request_type: string;
  adjustment_wo_number: string;
  project_number: string;
  task_number: string;
  remark: string;
  asset_criticality: string;
  additional_description: string;
  context_value: string;
  assigned_department: string;
  request_by_start_date: string;
  request_by_completion_date: string;
  requested_for: string;
  work_request_type: string;
  priority: string;
  phone_number: string;
  email: string;
  notify_user: boolean;
  contact_preference: string;
  technician_name: string;
  technician_employee_id: string;
  security_name: string;
  route: string;
  running_hours: string;
}

const buildInitial = (prefill?: FuelRequestPrefill): FormData => ({
  request_type: prefill?.request_type || "vehicle",
  vehicle_id: prefill?.vehicle_id || "",
  generator_id: "",
  driver_id: prefill?.driver_id || "",
  fuel_type: prefill?.fuel_type || "diesel",
  liters_requested: "",
  estimated_cost: "",
  purpose: "",
  current_odometer: "",
  notes: "",
  driver_type: "",
  driver_name: prefill?.driver_name || "",
  employee_id_no: "",
  vehicle_driver_name: "",
  requestor_department: "",
  fuel_in_telebirr: "",
  driver_phone: prefill?.driver_phone || "",
  fuel_by_cash_coupon: "",
  fuel_request_type: "",
  adjustment_wo_number: "",
  project_number: "",
  task_number: "",
  remark: "",
  asset_criticality: "",
  additional_description: "",
  context_value: prefill?.request_type === "generator" ? "Fuel request for generator" : "Fuel request for vehicle",
  assigned_department: "",
  request_by_start_date: new Date().toISOString().slice(0, 16),
  request_by_completion_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  requested_for: prefill?.driver_name || "",
  work_request_type: "fuel_request",
  priority: "medium",
  phone_number: prefill?.driver_phone || "",
  email: "",
  notify_user: true,
  contact_preference: "phone",
  technician_name: "",
  technician_employee_id: "",
  security_name: "",
  route: "",
  running_hours: "",
});

// Approved Stations Panel
const ApprovedStationsPanel = ({ organizationId, onSelectStation }: any) => {
  const { data: stations = [] } = useQuery({
    queryKey: ["approved-fuel-stations", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("approved_fuel_stations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .limit(20);
      return data || [];
    },
    enabled: !!organizationId,
  });

  if (stations.length === 0) return null;

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Approved Fuel Stations ({stations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {stations.map((s: any) => (
            <button
              key={s.id}
              onClick={() => onSelectStation?.(s.id)}
              className="flex items-center justify-between w-full text-xs p-2 rounded hover:bg-muted/50 transition-colors text-left"
            >
              <div>
                <span className="font-medium">{s.name}</span>
                {s.brand && <span className="text-muted-foreground ml-1">({s.brand})</span>}
              </div>
              <MapPin className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Previous Clearance Report
const PreviousClearanceReport = ({ vehicleId, generatorId, organizationId, formatFuel, formatCurrency }: any) => {
  const targetId = vehicleId || generatorId;
  const { data: history = [] } = useQuery({
    queryKey: ["fuel-clearance-history", vehicleId ? "vehicle" : "generator", targetId],
    queryFn: async () => {
      if (!targetId || !organizationId) return [];
      let q = supabase
        .from("fuel_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .in("status", ["fulfilled", "cleared", "deviation_detected"])
        .order("created_at", { ascending: false })
        .limit(5);
      q = vehicleId ? q.eq("vehicle_id", vehicleId) : q.eq("generator_id", generatorId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!targetId && !!organizationId,
  });

  if (!targetId || history.length === 0) return null;

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Previous Clearance Report
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-2">
          {history.map((h: any) => (
            <div key={h.id} className="text-xs grid grid-cols-4 gap-2 p-2 rounded bg-muted/30">
              <span className="font-mono">{h.request_number}</span>
              <span>{formatFuel(h.actual_liters || h.liters_approved || 0)}</span>
              <span>{h.actual_cost ? formatCurrency(h.actual_cost) : "—"}</span>
              <span className="text-muted-foreground">{format(new Date(h.created_at), "MMM dd")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const FuelRequestFormDialog = ({
  open,
  onOpenChange,
  prefill,
  source = "manual",
  invalidateKeys = [["fuel-requests"]],
  onSubmitted,
  embedded = false,
}: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { formatCurrency, formatFuel, settings } = useOrganizationSettings();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormData>(() => buildInitial(prefill));
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const v = useFuelRequestValidation();

  useEffect(() => {
    if (open) {
      setForm(buildInitial(prefill));
      setSelectedStation(null);
      v.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill?.vehicle_id, prefill?.driver_id, prefill?.request_type]);

  // Auto-fill driver phone/employee from drivers list when driver_id present (driver portal)
  useEffect(() => {
    if (!open || !prefill?.driver_id) return;
    const d = drivers.find(x => x.id === prefill.driver_id);
    if (d) {
      setForm(f => ({
        ...f,
        driver_phone: f.driver_phone || d.phone || "",
        driver_name: f.driver_name || `${d.first_name} ${d.last_name}`,
        phone_number: f.phone_number || d.phone || "",
        employee_id_no: f.employee_id_no || (d as any).employee_id || "",
      }));
    }
  }, [open, prefill?.driver_id, drivers]);

  // Generators
  const { data: generators = [] } = useQuery({
    queryKey: ["generators", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("generators")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  // Departments
  const { data: departments = [] } = useQuery({
    queryKey: ["business-units", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("business_units")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const handleDriverSelect = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    setForm(f => ({
      ...f,
      driver_id: driverId,
      driver_name: driver ? `${driver.first_name} ${driver.last_name}` : "",
      driver_phone: driver?.phone || "",
    }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const liters = parseFloat(form.liters_requested);
      if (isNaN(liters) || liters <= 0) throw new Error("Liters required");
      if (form.request_type === "vehicle" && !form.vehicle_id) throw new Error("Vehicle required");
      if (form.request_type === "generator" && !form.generator_id) throw new Error("Generator required");

      const reqNum = `FR-${Date.now().toString(36).toUpperCase()}`;
      const { data: user } = await supabase.auth.getUser();

      let prevOdometer: number | null = null;
      if (form.request_type === "vehicle" && form.vehicle_id) {
        const { data: lastReq } = await supabase
          .from("fuel_requests")
          .select("current_odometer")
          .eq("vehicle_id", form.vehicle_id)
          .eq("request_type", "vehicle")
          .not("current_odometer", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        prevOdometer = lastReq?.current_odometer || null;
      }

      let efficiency: number | null = null;
      if (prevOdometer && form.current_odometer) {
        const kmDiff = parseFloat(form.current_odometer) - prevOdometer;
        if (kmDiff > 0 && liters > 0) {
          efficiency = Math.round((kmDiff / liters) * 100) / 100;
        }
      }

      const insertData: any = {
        organization_id: organizationId,
        request_type: form.request_type,
        vehicle_id: form.request_type === "vehicle" ? form.vehicle_id : vehicles[0]?.id,
        generator_id: form.request_type === "generator" ? form.generator_id : null,
        driver_id: form.driver_id || null,
        requested_by: user.user?.id,
        request_number: reqNum,
        fuel_type: form.fuel_type,
        liters_requested: liters,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        purpose: form.purpose || null,
        current_odometer: form.current_odometer ? parseFloat(form.current_odometer) : null,
        previous_odometer: prevOdometer,
        efficiency_km_per_liter: efficiency,
        notes: form.notes || null,
        status: "pending",
        clearance_status: "pending",
        station_id: selectedStation,
        trigger_source: source,
        driver_type: form.driver_type || null,
        driver_name: form.driver_name || null,
        employee_id_no: form.employee_id_no || null,
        vehicle_driver_name: form.vehicle_driver_name || null,
        requestor_department: form.requestor_department || null,
        fuel_in_telebirr: form.fuel_in_telebirr ? parseFloat(form.fuel_in_telebirr) : null,
        driver_phone: form.driver_phone || null,
        fuel_by_cash_coupon: form.fuel_by_cash_coupon ? parseFloat(form.fuel_by_cash_coupon) : null,
        fuel_request_type: form.fuel_request_type || null,
        adjustment_wo_number: form.adjustment_wo_number || null,
        project_number: form.project_number || null,
        task_number: form.task_number || null,
        remark: form.remark || null,
        asset_criticality: form.asset_criticality || null,
        additional_description: form.additional_description || null,
        context_value: form.context_value || "Fuel request for vehicle",
        assigned_department: form.assigned_department || null,
        request_by_start_date: form.request_by_start_date ? new Date(form.request_by_start_date).toISOString() : null,
        request_by_completion_date: form.request_by_completion_date ? new Date(form.request_by_completion_date).toISOString() : null,
        requested_for: form.requested_for || null,
        work_request_type: form.work_request_type || null,
        priority: form.priority || "medium",
        phone_number: form.phone_number || null,
        email: form.email || null,
        notify_user: form.notify_user,
        contact_preference: form.contact_preference || null,
        technician_name: form.technician_name || null,
        technician_employee_id: form.technician_employee_id || null,
        security_name: form.security_name || null,
        route: form.route || null,
        running_hours: form.running_hours ? parseFloat(form.running_hours) : null,
      };

      const { data: inserted, error } = await supabase.from("fuel_requests").insert(insertData).select("id").single();
      if (error) throw error;

      if (inserted?.id) {
        await supabase.rpc("route_fuel_request_approval", { p_fuel_request_id: inserted.id });
      }
      return inserted?.id as string | undefined;
    },
    onSuccess: (insertedId) => {
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      onSubmitted?.({ fuel_request_id: insertedId });
      onOpenChange(false);
      toast.success("Fuel request submitted & routed for approval");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof FormData>(k: K, value: FormData[K]) => setForm(f => ({ ...f, [k]: value }));

  /** Build the FRFormValues snapshot consumed by the validation hook. */
  const validationSnapshot = () => ({
    request_type: form.request_type,
    vehicle_id: form.vehicle_id,
    generator_id: form.generator_id,
    driver_id: form.driver_id,
    driver_type: form.driver_type,
    driver_phone: form.driver_phone,
    phone_number: form.phone_number,
    email: form.email,
    current_odometer: form.current_odometer,
    running_hours: form.running_hours,
    liters_requested: form.liters_requested,
    estimated_cost: form.estimated_cost,
    fuel_in_telebirr: form.fuel_in_telebirr,
    fuel_by_cash_coupon: form.fuel_by_cash_coupon,
    fuel_type: form.fuel_type,
    fuel_request_type: form.fuel_request_type,
    assigned_department: form.assigned_department,
    requestor_department: form.requestor_department,
    request_by_start_date: form.request_by_start_date,
    request_by_completion_date: form.request_by_completion_date,
    priority: form.priority,
    context_value: form.context_value,
    technician_name: form.technician_name,
    project_number: form.project_number,
    purpose: form.purpose,
    remark: form.remark,
    additional_description: form.additional_description,
    notes: form.notes,
  });

  const handleSubmit = () => {
    const result = v.validateAll(validationSnapshot());
    if (!result.ok) {
      const firstMsg = Object.values(result.errors)[0];
      toast.error(firstMsg ?? "Please fix the highlighted fields and try again.");
      return;
    }
    // Apply sanitized values back into the form before submitting.
    setForm((f) => ({
      ...f,
      driver_phone: result.sanitized.driver_phone ?? "",
      phone_number: result.sanitized.phone_number ?? "",
      email: result.sanitized.email ?? "",
      project_number: result.sanitized.project_number ?? "",
      purpose: result.sanitized.purpose ?? "",
      remark: result.sanitized.remark ?? "",
      additional_description: result.sanitized.additional_description ?? "",
      notes: result.sanitized.notes ?? "",
      technician_name: result.sanitized.technician_name ?? "",
    }));
    createMutation.mutate();
  };

  const lockVehicle = !!prefill?.lockVehicle;
  const lockDriver = !!prefill?.lockDriver;
  const lockType = !!prefill?.request_type;

  const body = (
    <>
      {!embedded && (
        <DialogHeader>
          <DialogTitle>New Fuel Request</DialogTitle>
          <DialogDescription>Submit a fuel clearance request for vehicle or generator</DialogDescription>
        </DialogHeader>
      )}
      <ScrollArea className={embedded ? "max-h-[70vh] pr-2" : "max-h-[75vh] pr-2"}>
          <div className="space-y-4">
            {(() => {
              const visibleErrorCount = (Object.keys(v.errors) as Array<keyof typeof v.errors>).filter(
                (k) => v.touched[k] && v.errors[k],
              ).length;
              if (visibleErrorCount === 0) return null;
              return (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {visibleErrorCount === 1
                      ? "1 field needs your attention before you can submit this fuel request."
                      : `${visibleErrorCount} fields need your attention before you can submit this fuel request.`}
                  </span>
                </div>
              );
            })()}
            {/* ─── Work Request Header ─────────────────────────── */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Work Request Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ValidatedField
                  id="fr-asset"
                  label="Asset Number"
                  icon={form.request_type === "vehicle" ? Truck : Power}
                  required
                  error={form.request_type === "vehicle" ? v.getError("vehicle_id") : v.getError("generator_id")}
                  filled={!!(form.request_type === "vehicle" ? form.vehicle_id : form.generator_id)}
                >
                  {form.request_type === "vehicle" ? (
                    <Select
                      value={form.vehicle_id}
                      onValueChange={(val) => { set("vehicle_id", val); v.validateField("vehicle_id", val, validationSnapshot()); }}
                      disabled={lockVehicle}
                    >
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>{vehicles.map(vh => <SelectItem key={vh.id} value={vh.id}>{vh.plate_number} — {vh.make} {vh.model}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={form.generator_id}
                      onValueChange={(val) => { set("generator_id", val); v.validateField("generator_id", val, validationSnapshot()); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select generator" /></SelectTrigger>
                      <SelectContent>{generators.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </ValidatedField>

                <ValidatedField id="fr-wrt" label="Work Request Type" icon={Briefcase}>
                  <Select value={form.work_request_type} onValueChange={val => set("work_request_type", val)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fuel_request">Fuel Request</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </ValidatedField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ValidatedField
                  id="fr-dept-assigned"
                  label="Assigned Department"
                  icon={Building2}
                  required
                  error={v.getError("assigned_department")}
                >
                  <Select
                    value={form.assigned_department}
                    onValueChange={(val) => { set("assigned_department", val); v.validateField("assigned_department", val); }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      {departments.length === 0 && <SelectItem value="default">Default Department</SelectItem>}
                    </SelectContent>
                  </Select>
                </ValidatedField>

                <ValidatedField
                  id="fr-priority"
                  label="Priority"
                  icon={AlertTriangle}
                  required
                  error={v.getError("priority")}
                >
                  <Select
                    value={form.priority}
                    onValueChange={(val) => { set("priority", val); v.validateField("priority", val); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </ValidatedField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ValidatedField
                  id="fr-start"
                  label="Request By Start Date"
                  icon={Calendar}
                  required
                  error={v.getError("request_by_start_date")}
                >
                  <Input
                    type="datetime-local"
                    value={form.request_by_start_date}
                    onChange={(e) => { set("request_by_start_date", e.target.value); v.validateField("request_by_start_date", e.target.value, validationSnapshot()); }}
                    onBlur={(e) => v.handleBlur("request_by_start_date", e.target.value, validationSnapshot())}
                  />
                </ValidatedField>

                <ValidatedField
                  id="fr-end"
                  label="Request By Completion Date"
                  icon={Calendar}
                  required
                  error={v.getError("request_by_completion_date")}
                >
                  <Input
                    type="datetime-local"
                    value={form.request_by_completion_date}
                    onChange={(e) => { set("request_by_completion_date", e.target.value); v.validateField("request_by_completion_date", e.target.value, validationSnapshot()); }}
                    onBlur={(e) => v.handleBlur("request_by_completion_date", e.target.value, validationSnapshot())}
                  />
                </ValidatedField>
              </div>

              <ValidatedField id="fr-requested-for" label="Requested For" icon={User}>
                <Input
                  value={form.requested_for}
                  onChange={(e) => set("requested_for", sanitizeShortText(e.target.value))}
                  placeholder="e.g. ETHIO7146"
                />
              </ValidatedField>
            </div>

            {/* ─── Creation / Contact ──────────────────────────── */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Creation Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ValidatedField
                  id="fr-phone"
                  label="Phone Number"
                  icon={Phone}
                  error={v.getError("phone_number")}
                  hint="Ethiopian numbers only — e.g. 0911234567 or +251911234567"
                >
                  <Input
                    inputMode="tel"
                    value={form.phone_number}
                    onChange={(e) => { const s = sanitizePhone(e.target.value); set("phone_number", s); v.validateField("phone_number", s, validationSnapshot()); }}
                    onBlur={(e) => v.handleBlur("phone_number", sanitizePhone(e.target.value), validationSnapshot())}
                    placeholder="+251..."
                  />
                </ValidatedField>

                <ValidatedField id="fr-email" label="Email" icon={Mail} error={v.getError("email")}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => { const s = sanitizeEmail(e.target.value); set("email", s); v.validateField("email", s); }}
                    onBlur={(e) => v.handleBlur("email", sanitizeEmail(e.target.value))}
                    placeholder="user@example.com"
                  />
                </ValidatedField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ValidatedField id="fr-notify" label="Notify User">
                  <Select value={form.notify_user ? "yes" : "no"} onValueChange={val => set("notify_user", val === "yes")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </ValidatedField>
                <ValidatedField id="fr-contact-pref" label="Contact Preference">
                  <Select value={form.contact_preference} onValueChange={val => set("contact_preference", val)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </ValidatedField>
              </div>
            </div>

            <Separator />

            <div className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Descriptive Information
            </div>

            {/* Type Tabs */}
            <Tabs
              value={form.request_type}
              onValueChange={(val) => {
                if (lockType) return;
                setForm(f => ({
                  ...f,
                  request_type: val,
                  vehicle_id: "",
                  generator_id: "",
                  context_value: val === "vehicle" ? "Fuel request for vehicle" : "Fuel request for generator",
                }));
                v.reset();
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="vehicle" className="flex-1 gap-2" disabled={lockType && form.request_type !== "vehicle"}>
                  <Truck className="h-4 w-4" /> Vehicle Fuel Request
                </TabsTrigger>
                <TabsTrigger value="generator" className="flex-1 gap-2" disabled={lockType && form.request_type !== "generator"}>
                  <Power className="h-4 w-4" /> Generator Fuel Request
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <ValidatedField id="fr-context" label="Context Value" required error={v.getError("context_value")}>
              <Select value={form.context_value} onValueChange={(val) => { set("context_value", val); v.validateField("context_value", val); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fuel request for vehicle">Fuel request for vehicle</SelectItem>
                  <SelectItem value="Fuel request for generator">Fuel request for generator</SelectItem>
                </SelectContent>
              </Select>
            </ValidatedField>

            {form.request_type === "vehicle" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <ValidatedField id="fr-vehicle" label="Vehicle (Asset)" icon={Truck} required error={v.getError("vehicle_id")}>
                    <Select
                      value={form.vehicle_id}
                      onValueChange={(val) => { set("vehicle_id", val); v.validateField("vehicle_id", val, validationSnapshot()); }}
                      disabled={lockVehicle}
                    >
                      <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                      <SelectContent>{vehicles.map(vh => <SelectItem key={vh.id} value={vh.id}>{vh.plate_number} — {vh.make} {vh.model}</SelectItem>)}</SelectContent>
                    </Select>
                  </ValidatedField>

                  <ValidatedField id="fr-odo" label="KM Reading" icon={Gauge} required error={v.getError("current_odometer")}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.current_odometer}
                      onChange={(e) => { const s = sanitizeNumeric(e.target.value); set("current_odometer", s); v.validateField("current_odometer", s, validationSnapshot()); }}
                      onBlur={(e) => v.handleBlur("current_odometer", sanitizeNumeric(e.target.value), validationSnapshot())}
                      placeholder="Current odometer"
                    />
                  </ValidatedField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedField id="fr-driver-type" label="Driver Type" required error={v.getError("driver_type")}>
                    <Select
                      value={form.driver_type}
                      onValueChange={(val) => { set("driver_type", val); v.validateField("driver_type", val, validationSnapshot()); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select driver type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="outsourced">Outsourced</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </ValidatedField>

                  <ValidatedField id="fr-driver" label="Driver" icon={User} required error={v.getError("driver_id")}>
                    <Select
                      value={form.driver_id}
                      onValueChange={(val) => { handleDriverSelect(val); v.validateField("driver_id", val, validationSnapshot()); }}
                      disabled={lockDriver}
                    >
                      <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                      <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </ValidatedField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedField id="fr-driver-name" label="Driver Name" icon={User}>
                    <Input
                      value={form.driver_name}
                      onChange={(e) => set("driver_name", sanitizeShortText(e.target.value))}
                    />
                  </ValidatedField>
                  <ValidatedField id="fr-emp" label="Employee ID No." icon={Hash}>
                    <Input
                      value={form.employee_id_no}
                      onChange={(e) => set("employee_id_no", sanitizeShortText(e.target.value))}
                    />
                  </ValidatedField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedField id="fr-vdrv" label="Vehicle Driver Name" icon={User}>
                    <Input
                      value={form.vehicle_driver_name}
                      onChange={(e) => set("vehicle_driver_name", sanitizeShortText(e.target.value))}
                    />
                  </ValidatedField>
                  <ValidatedField
                    id="fr-driver-phone"
                    label="Driver Phone"
                    icon={Phone}
                    required
                    error={v.getError("driver_phone")}
                    hint="Ethiopian numbers only — e.g. 0911234567 or +251911234567"
                  >
                    <Input
                      inputMode="tel"
                      value={form.driver_phone}
                      onChange={(e) => { const s = sanitizePhone(e.target.value); set("driver_phone", s); v.validateField("driver_phone", s, validationSnapshot()); }}
                      onBlur={(e) => v.handleBlur("driver_phone", sanitizePhone(e.target.value), validationSnapshot())}
                      placeholder="+251..."
                    />
                  </ValidatedField>
                </div>

                <PreviousClearanceReport vehicleId={form.vehicle_id} organizationId={organizationId} formatFuel={formatFuel} formatCurrency={formatCurrency} />
              </>
            ) : (
              <>
                <ValidatedField id="fr-gen" label="Generator (Asset)" icon={Power} required error={v.getError("generator_id")}>
                  <Select
                    value={form.generator_id}
                    onValueChange={(val) => { set("generator_id", val); v.validateField("generator_id", val, validationSnapshot()); }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select generator" /></SelectTrigger>
                    <SelectContent>
                      {generators.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} — {g.location || g.model || ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ValidatedField>

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedField id="fr-tech" label="Technician Name" icon={User} required error={v.getError("technician_name")}>
                    <Input
                      value={form.technician_name}
                      onChange={(e) => { const s = sanitizeShortText(e.target.value); set("technician_name", s); v.validateField("technician_name", s, validationSnapshot()); }}
                      onBlur={(e) => v.handleBlur("technician_name", sanitizeShortText(e.target.value), validationSnapshot())}
                    />
                  </ValidatedField>
                  <ValidatedField id="fr-tech-emp" label="Technician Employee ID" icon={Hash}>
                    <Input
                      value={form.technician_employee_id}
                      onChange={(e) => set("technician_employee_id", sanitizeShortText(e.target.value))}
                    />
                  </ValidatedField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedField id="fr-sec" label="Security Name" icon={User}>
                    <Input value={form.security_name} onChange={(e) => set("security_name", sanitizeShortText(e.target.value))} />
                  </ValidatedField>
                  <ValidatedField id="fr-route" label="Route / Site" icon={MapPin}>
                    <Input value={form.route} onChange={(e) => set("route", sanitizeText(e.target.value))} />
                  </ValidatedField>
                </div>

                <ValidatedField id="fr-rh" label="Running Hours" icon={Gauge} error={v.getError("running_hours")}>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={form.running_hours}
                    onChange={(e) => { const s = sanitizeNumeric(e.target.value); set("running_hours", s); v.validateField("running_hours", s); }}
                    onBlur={(e) => v.handleBlur("running_hours", sanitizeNumeric(e.target.value))}
                  />
                </ValidatedField>

                <PreviousClearanceReport generatorId={form.generator_id} organizationId={organizationId} formatFuel={formatFuel} formatCurrency={formatCurrency} />
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <ValidatedField id="fr-req-dept" label="Requestor Department" icon={Building2} required error={v.getError("requestor_department")}>
                <Select
                  value={form.requestor_department}
                  onValueChange={(val) => { set("requestor_department", val); v.validateField("requestor_department", val); }}
                >
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    {departments.length === 0 && <SelectItem value="default">Default Department</SelectItem>}
                  </SelectContent>
                </Select>
              </ValidatedField>

              <ValidatedField id="fr-frtype" label="Fuel Request Type" icon={Fuel} required error={v.getError("fuel_request_type")}>
                <Select
                  value={form.fuel_request_type}
                  onValueChange={(val) => { set("fuel_request_type", val); v.validateField("fuel_request_type", val); }}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="top_up">Top Up</SelectItem>
                    <SelectItem value="full_tank">Full Tank</SelectItem>
                  </SelectContent>
                </Select>
              </ValidatedField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ValidatedField id="fr-ftype" label="Fuel Type" icon={Fuel} required error={v.getError("fuel_type")}>
                <Select value={form.fuel_type} onValueChange={(val) => { set("fuel_type", val); v.validateField("fuel_type", val); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </ValidatedField>

              <ValidatedField id="fr-liters" label="Fuel in Liter" icon={Fuel} required error={v.getError("liters_requested")}>
                <Input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form.liters_requested}
                  onChange={(e) => { const s = sanitizeNumeric(e.target.value); set("liters_requested", s); v.validateField("liters_requested", s); }}
                  onBlur={(e) => v.handleBlur("liters_requested", sanitizeNumeric(e.target.value))}
                  placeholder="0.0"
                />
              </ValidatedField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ValidatedField id="fr-tb" label="Fuel in Telebirr" error={v.getError("fuel_in_telebirr")}>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.fuel_in_telebirr}
                  onChange={(e) => { const s = sanitizeNumeric(e.target.value); set("fuel_in_telebirr", s); v.validateField("fuel_in_telebirr", s); }}
                  onBlur={(e) => v.handleBlur("fuel_in_telebirr", sanitizeNumeric(e.target.value))}
                  placeholder="Amount in ETB"
                />
              </ValidatedField>
              <ValidatedField id="fr-coupon" label="Fuel by Cash Coupon" error={v.getError("fuel_by_cash_coupon")}>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.fuel_by_cash_coupon}
                  onChange={(e) => { const s = sanitizeNumeric(e.target.value); set("fuel_by_cash_coupon", s); v.validateField("fuel_by_cash_coupon", s); }}
                  onBlur={(e) => v.handleBlur("fuel_by_cash_coupon", sanitizeNumeric(e.target.value))}
                />
              </ValidatedField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ValidatedField id="fr-cost" label={`Estimated Cost (${settings?.currency || "ETB"})`} error={v.getError("estimated_cost")}>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.estimated_cost}
                  onChange={(e) => { const s = sanitizeNumeric(e.target.value); set("estimated_cost", s); v.validateField("estimated_cost", s); }}
                  onBlur={(e) => v.handleBlur("estimated_cost", sanitizeNumeric(e.target.value))}
                />
              </ValidatedField>
              <ValidatedField id="fr-crit" label="Asset Criticality">
                <Select value={form.asset_criticality} onValueChange={val => set("asset_criticality", val)}>
                  <SelectTrigger><SelectValue placeholder="Select criticality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </ValidatedField>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <ValidatedField id="fr-adj" label="Adjustment WO No." icon={Hash}>
                <Input
                  value={form.adjustment_wo_number}
                  onChange={(e) => set("adjustment_wo_number", sanitizeShortText(e.target.value))}
                />
              </ValidatedField>
              <ValidatedField
                id="fr-proj"
                label="Project No."
                icon={Hash}
                error={v.getError("project_number")}
                hint="2–30 chars: letters, digits, '-', '_' or '/'"
              >
                <Input
                  value={form.project_number}
                  onChange={(e) => { const s = sanitizeProjectNumber(e.target.value); set("project_number", s); v.validateField("project_number", s); }}
                  onBlur={(e) => v.handleBlur("project_number", sanitizeProjectNumber(e.target.value))}
                />
              </ValidatedField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ValidatedField id="fr-task" label="Task No." icon={Hash}>
                <Input
                  value={form.task_number}
                  onChange={(e) => set("task_number", sanitizeShortText(e.target.value))}
                />
              </ValidatedField>
              <ValidatedField id="fr-purpose" label="Purpose" error={v.getError("purpose")}>
                <Input
                  value={form.purpose}
                  onChange={(e) => { const s = sanitizeText(e.target.value); set("purpose", s); v.validateField("purpose", s); }}
                  onBlur={(e) => v.handleBlur("purpose", sanitizeText(e.target.value))}
                />
              </ValidatedField>
            </div>

            <ApprovedStationsPanel organizationId={organizationId} onSelectStation={setSelectedStation} />
            {selectedStation && (
              <p className="text-xs text-success flex items-center gap-1"><MapPin className="h-3 w-3" /> Station selected</p>
            )}

            <ValidatedField id="fr-addl" label="Additional Description" error={v.getError("additional_description")}>
              <Textarea
                value={form.additional_description}
                onChange={(e) => { const s = sanitizeText(e.target.value); set("additional_description", s); v.validateField("additional_description", s); }}
                onBlur={(e) => v.handleBlur("additional_description", sanitizeText(e.target.value))}
                rows={2}
              />
            </ValidatedField>
            <ValidatedField id="fr-remark" label="Remark" error={v.getError("remark")}>
              <Textarea
                value={form.remark}
                onChange={(e) => { const s = sanitizeText(e.target.value); set("remark", s); v.validateField("remark", s); }}
                onBlur={(e) => v.handleBlur("remark", sanitizeText(e.target.value))}
                rows={2}
              />
            </ValidatedField>
            <ValidatedField id="fr-notes" label="Notes" error={v.getError("notes")}>
              <Textarea
                value={form.notes}
                onChange={(e) => { const s = sanitizeText(e.target.value); set("notes", s); v.validateField("notes", s); }}
                onBlur={(e) => v.handleBlur("notes", sanitizeText(e.target.value))}
                rows={2}
              />
            </ValidatedField>

            {v.errorCount > 0 && v.showAllErrors && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {v.errorCount} field{v.errorCount === 1 ? "" : "s"} need attention. Scroll up to review the highlighted entries.
                </span>
              </div>
            )}
          </div>
      </ScrollArea>
      {embedded ? (
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </div>
      ) : (
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default FuelRequestFormDialog;
