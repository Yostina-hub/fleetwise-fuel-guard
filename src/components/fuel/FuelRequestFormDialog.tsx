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
  Fuel, User, Phone, Mail, Building2, Calendar, AlertTriangle, Hash, Gauge, Briefcase,
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

  // Reset on open/prefill change
  useEffect(() => {
    if (open) {
      setForm(buildInitial(prefill));
      setSelectedStation(null);
    }
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

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(f => ({ ...f, [k]: v }));

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
            {/* Work Request Header */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Work Request Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Asset Number *</Label>
                  {form.request_type === "vehicle" ? (
                    <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)} disabled={lockVehicle}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Select value={form.generator_id} onValueChange={v => set("generator_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Select generator" /></SelectTrigger>
                      <SelectContent>{generators.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label>Work Request Type</Label>
                  <Select value={form.work_request_type} onValueChange={v => set("work_request_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fuel_request">Fuel Request</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assigned Department *</Label>
                  <Select value={form.assigned_department} onValueChange={v => set("assigned_department", v)}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      {departments.length === 0 && <SelectItem value="default">Default Department</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority *</Label>
                  <Select value={form.priority} onValueChange={v => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Request By Start Date *</Label>
                  <Input type="datetime-local" value={form.request_by_start_date} onChange={e => set("request_by_start_date", e.target.value)} />
                </div>
                <div>
                  <Label>Request By Completion Date *</Label>
                  <Input type="datetime-local" value={form.request_by_completion_date} onChange={e => set("request_by_completion_date", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Requested For</Label>
                <Input value={form.requested_for} onChange={e => set("requested_for", e.target.value)} placeholder="e.g. ETHIO7146" />
              </div>
            </div>

            {/* Creation Information */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Creation Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input value={form.phone_number} onChange={e => set("phone_number", e.target.value)} placeholder="+251..." />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="user@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Notify User</Label>
                  <Select value={form.notify_user ? "yes" : "no"} onValueChange={v => set("notify_user", v === "yes")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contact Preference</Label>
                  <Select value={form.contact_preference} onValueChange={v => set("contact_preference", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Descriptive Information
            </div>

            {/* Type Tabs */}
            <Tabs value={form.request_type} onValueChange={v => !lockType && setForm(f => ({ ...f, request_type: v, vehicle_id: "", generator_id: "", context_value: v === "vehicle" ? "Fuel request for vehicle" : "Fuel request for generator" }))}>
              <TabsList className="w-full">
                <TabsTrigger value="vehicle" className="flex-1 gap-2" disabled={lockType && form.request_type !== "vehicle"}>
                  <Truck className="h-4 w-4" /> Vehicle Fuel Request
                </TabsTrigger>
                <TabsTrigger value="generator" className="flex-1 gap-2" disabled={lockType && form.request_type !== "generator"}>
                  <Power className="h-4 w-4" /> Generator Fuel Request
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <Label>Context Value *</Label>
              <Select value={form.context_value} onValueChange={v => set("context_value", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fuel request for vehicle">Fuel request for vehicle</SelectItem>
                  <SelectItem value="Fuel request for generator">Fuel request for generator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.request_type === "vehicle" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vehicle (Asset) *</Label>
                    <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)} disabled={lockVehicle}>
                      <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                      <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>KM Reading *</Label>
                    <Input type="number" value={form.current_odometer} onChange={e => set("current_odometer", e.target.value)} placeholder="Current odometer" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Driver Type *</Label>
                    <Select value={form.driver_type} onValueChange={v => set("driver_type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select driver type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="outsourced">Outsourced</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Driver *</Label>
                    <Select value={form.driver_id} onValueChange={handleDriverSelect} disabled={lockDriver}>
                      <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                      <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Driver Name</Label>
                    <Input value={form.driver_name} onChange={e => set("driver_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Employee ID No.</Label>
                    <Input value={form.employee_id_no} onChange={e => set("employee_id_no", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vehicle Driver Name</Label>
                    <Input value={form.vehicle_driver_name} onChange={e => set("vehicle_driver_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Driver Phone *</Label>
                    <Input value={form.driver_phone} onChange={e => set("driver_phone", e.target.value)} placeholder="+251..." />
                  </div>
                </div>
                <PreviousClearanceReport vehicleId={form.vehicle_id} organizationId={organizationId} formatFuel={formatFuel} formatCurrency={formatCurrency} />
              </>
            ) : (
              <>
                <div>
                  <Label>Generator (Asset) *</Label>
                  <Select value={form.generator_id} onValueChange={v => set("generator_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select generator" /></SelectTrigger>
                    <SelectContent>
                      {generators.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} — {g.location || g.model || ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Technician Name *</Label>
                    <Input value={form.technician_name} onChange={e => set("technician_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Technician Employee ID</Label>
                    <Input value={form.technician_employee_id} onChange={e => set("technician_employee_id", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Security Name</Label>
                    <Input value={form.security_name} onChange={e => set("security_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Route / Site</Label>
                    <Input value={form.route} onChange={e => set("route", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Running Hours</Label>
                  <Input type="number" step="0.1" value={form.running_hours} onChange={e => set("running_hours", e.target.value)} />
                </div>
                <PreviousClearanceReport generatorId={form.generator_id} organizationId={organizationId} formatFuel={formatFuel} formatCurrency={formatCurrency} />
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Requestor Department *</Label>
                <Select value={form.requestor_department} onValueChange={v => set("requestor_department", v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    {departments.length === 0 && <SelectItem value="default">Default Department</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fuel Request Type *</Label>
                <Select value={form.fuel_request_type} onValueChange={v => set("fuel_request_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="top_up">Top Up</SelectItem>
                    <SelectItem value="full_tank">Full Tank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fuel Type</Label>
                <Select value={form.fuel_type} onValueChange={v => set("fuel_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fuel in Liter *</Label>
                <Input type="number" step="0.1" value={form.liters_requested} onChange={e => set("liters_requested", e.target.value)} placeholder="0.0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fuel in Telebirr</Label>
                <Input type="number" step="0.01" value={form.fuel_in_telebirr} onChange={e => set("fuel_in_telebirr", e.target.value)} placeholder="Amount in ETB" />
              </div>
              <div>
                <Label>Fuel by Cash Coupon</Label>
                <Input type="number" step="0.01" value={form.fuel_by_cash_coupon} onChange={e => set("fuel_by_cash_coupon", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Cost ({settings?.currency || "ETB"})</Label>
                <Input type="number" step="0.01" value={form.estimated_cost} onChange={e => set("estimated_cost", e.target.value)} />
              </div>
              <div>
                <Label>Asset Criticality</Label>
                <Select value={form.asset_criticality} onValueChange={v => set("asset_criticality", v)}>
                  <SelectTrigger><SelectValue placeholder="Select criticality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Adjustment WO No.</Label>
                <Input value={form.adjustment_wo_number} onChange={e => set("adjustment_wo_number", e.target.value)} />
              </div>
              <div>
                <Label>Project No.</Label>
                <Input value={form.project_number} onChange={e => set("project_number", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Task No.</Label>
                <Input value={form.task_number} onChange={e => set("task_number", e.target.value)} />
              </div>
              <div>
                <Label>Purpose</Label>
                <Input value={form.purpose} onChange={e => set("purpose", e.target.value)} />
              </div>
            </div>

            <ApprovedStationsPanel organizationId={organizationId} onSelectStation={setSelectedStation} />
            {selectedStation && (
              <p className="text-xs text-success flex items-center gap-1"><MapPin className="h-3 w-3" /> Station selected</p>
            )}

            <div>
              <Label>Additional Description</Label>
              <Textarea value={form.additional_description} onChange={e => set("additional_description", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Remark</Label>
              <Textarea value={form.remark} onChange={e => set("remark", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </div>
      </ScrollArea>
      {embedded ? (
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </div>
      ) : (
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
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
