import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Zap, Settings, AlertCircle, BatteryCharging, Boxes, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEVWorkOrderValidation } from "./useEVWorkOrderValidation";
import { sanitizeDecimal, type EVWorkOrderFieldKey } from "./evWorkOrderValidation";

/** Inline destructive error chip used next to gated header fields. */
const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <p
      role="alert"
      className="mt-1 flex items-start gap-1 text-[11px] font-medium text-destructive animate-fade-in"
    >
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
      <span>{msg}</span>
    </p>
  ) : null;

const errorRing = (hasError?: string) =>
  hasError ? "border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive/40" : "";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workOrderId?: string | null;
  vehicleId?: string | null;
  chargingSessionId?: string | null;
}

const DEFAULT_FORM = {
  work_order_number: "",
  vehicle_id: "",
  station_id: "",
  charging_session_id: "",
  asset_number: "",
  asset_group: "vehicle",
  wip_accounting_class: "eAM_Default",
  scheduled_start_date: "",
  scheduled_completion_date: "",
  duration: 0,
  request_number: "",
  planner_name: "",
  description: "",
  department: "",
  department_description: "",
  asset_activity: "",
  firm: false,
  wo_status: "draft",
  work_order_type: "charging",
  shutdown_type: "",
  priority: "medium",
  project: "",
  task: "",
  rebuild_parent: "",
  activity_type: "ev_charge",
  activity_cause: "request",
  activity_source: "manual",
  enable_material_issue_request: true,
  planned: false,
  warranty_status: "",
  warranty_active: false,
  warranty_expiration_date: "",
  tagout_required: false,
  notification_required: false,
  context: "",
  supplier_name: "",
  remark1: "",
  remark2: "",
  remark3: "",
  remark4: "",
  agreement_number: "",
  additional_description: "",
  failure_code: "",
  failure_cause: "",
  resolution: "",
  target_soc_percent: 100,
  current_soc_percent: 0,
  energy_required_kwh: 0,
  energy_delivered_kwh: 0,
  charging_type: "ac",
  connector_type: "",
  estimated_cost: 0,
  actual_cost: 0,
  cost_per_kwh: 0,
  notes: "",
};

export const EVWorkOrderDialog = ({ open, onOpenChange, workOrderId, vehicleId, chargingSessionId }: Props) => {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const validation = useEVWorkOrderValidation(form as any);
  const { errors: vErrors, markTouched, markAllTouched, validateAll, invalidCount, submitAttempted } = validation;
  const onBlur = (f: EVWorkOrderFieldKey) => () => markTouched(f);

  const { data: existingWO } = useQuery({
    queryKey: ["ev-work-order-edit", workOrderId],
    queryFn: async () => {
      if (!workOrderId) return null;
      const { data, error } = await supabase.from("ev_work_orders").select("*").eq("id", workOrderId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId && open,
  });

  const { data: evVehicles = [] } = useQuery({
    queryKey: ["ev-vehicles-for-wo", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("ev_vehicle_data")
        .select("vehicle_id, battery_capacity_kwh, current_soc_percent, max_charging_rate_kw, charging_connector_type, vehicles:vehicle_id(plate_number, make, model)")
        .eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const { data: stations = [] } = useQuery({
    queryKey: ["ev-stations-for-wo", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("ev_charging_stations")
        .select("id, name, max_power_kw, cost_per_kwh, connector_types")
        .eq("organization_id", organizationId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  useEffect(() => {
    if (existingWO) {
      setForm({
        ...DEFAULT_FORM,
        ...(existingWO as any),
        scheduled_start_date: existingWO.scheduled_start_date ? new Date(existingWO.scheduled_start_date).toISOString().slice(0, 16) : "",
        scheduled_completion_date: existingWO.scheduled_completion_date ? new Date(existingWO.scheduled_completion_date).toISOString().slice(0, 16) : "",
        warranty_expiration_date: existingWO.warranty_expiration_date ? new Date(existingWO.warranty_expiration_date).toISOString().slice(0, 16) : "",
      });
    } else if (open && !workOrderId) {
      const woNum = `EVWO-${Date.now().toString(36).toUpperCase()}`;
      const ev = evVehicles.find((v: any) => v.vehicle_id === vehicleId);
      setForm({
        ...DEFAULT_FORM,
        work_order_number: woNum,
        vehicle_id: vehicleId || "",
        charging_session_id: chargingSessionId || "",
        asset_number: ev?.vehicles?.plate_number || "",
        asset_activity: "EV Charging",
        description: "EV charging / battery service work order",
        current_soc_percent: ev?.current_soc_percent || 0,
        connector_type: ev?.charging_connector_type || "",
        scheduled_start_date: new Date().toISOString().slice(0, 16),
      });
    }
  }, [existingWO, open, workOrderId, vehicleId, chargingSessionId, evVehicles]);

  useEffect(() => {
    const ev = evVehicles.find((v: any) => v.vehicle_id === form.vehicle_id);
    const station = stations.find((s: any) => s.id === form.station_id);
    if (ev?.battery_capacity_kwh && form.target_soc_percent > 0) {
      const cap = Number(ev.battery_capacity_kwh);
      const soc = Number(form.current_soc_percent || 0);
      const target = Number(form.target_soc_percent);
      const required = Math.max(0, ((target - soc) / 100) * cap);
      const cpk = station?.cost_per_kwh ? Number(station.cost_per_kwh) : Number(form.cost_per_kwh || 0);
      setForm((f) => ({
        ...f,
        energy_required_kwh: Number(required.toFixed(2)),
        cost_per_kwh: cpk,
        estimated_cost: Number((required * cpk).toFixed(2)),
      }));
    }
  }, [form.vehicle_id, form.station_id, form.target_soc_percent, form.current_soc_percent]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organization not loaded");
      const { data: user } = await supabase.auth.getUser();
      const payload: any = {
        organization_id: organizationId,
        vehicle_id: form.vehicle_id || null,
        station_id: form.station_id || null,
        charging_session_id: form.charging_session_id || null,
        work_order_number: form.work_order_number,
        asset_number: form.asset_number || null,
        asset_group: form.asset_group || null,
        wip_accounting_class: form.wip_accounting_class || "eAM_Default",
        scheduled_start_date: form.scheduled_start_date || null,
        scheduled_completion_date: form.scheduled_completion_date || null,
        duration: Number(form.duration) || 0,
        request_number: form.request_number || null,
        planner_name: form.planner_name || null,
        description: form.description || null,
        department: form.department || null,
        department_description: form.department_description || null,
        asset_activity: form.asset_activity || null,
        firm: !!form.firm,
        wo_status: form.wo_status || "draft",
        work_order_type: form.work_order_type || null,
        shutdown_type: form.shutdown_type || null,
        priority: form.priority || "medium",
        project: form.project || null,
        task: form.task || null,
        rebuild_parent: form.rebuild_parent || null,
        activity_type: form.activity_type || null,
        activity_cause: form.activity_cause || null,
        activity_source: form.activity_source || null,
        enable_material_issue_request: !!form.enable_material_issue_request,
        planned: !!form.planned,
        warranty_status: form.warranty_status || null,
        warranty_active: !!form.warranty_active,
        warranty_expiration_date: form.warranty_expiration_date || null,
        tagout_required: !!form.tagout_required,
        notification_required: !!form.notification_required,
        context: form.context || null,
        supplier_name: form.supplier_name || null,
        remark1: form.remark1 || null,
        remark2: form.remark2 || null,
        remark3: form.remark3 || null,
        remark4: form.remark4 || null,
        agreement_number: form.agreement_number || null,
        additional_description: form.additional_description || null,
        failure_code: form.failure_code || null,
        failure_cause: form.failure_cause || null,
        resolution: form.resolution || null,
        target_soc_percent: Number(form.target_soc_percent) || null,
        current_soc_percent: Number(form.current_soc_percent) || null,
        energy_required_kwh: Number(form.energy_required_kwh) || null,
        energy_delivered_kwh: Number(form.energy_delivered_kwh) || null,
        charging_type: form.charging_type || null,
        connector_type: form.connector_type || null,
        estimated_cost: Number(form.estimated_cost) || null,
        actual_cost: Number(form.actual_cost) || null,
        cost_per_kwh: Number(form.cost_per_kwh) || null,
        notes: form.notes || null,
        created_by_user_id: user.user?.id,
        status: form.wo_status === "released" ? "approved" : form.wo_status === "completed" ? "completed" : "pending",
      };

      if (workOrderId) {
        const { error } = await supabase.from("ev_work_orders").update(payload).eq("id", workOrderId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ev_work_orders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ev-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ev-work-order-edit"] });
      toast.success(workOrderId ? "EV work order updated" : "EV work order created");
      validation.reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedVehicle: any = evVehicles.find((v: any) => v.vehicle_id === form.vehicle_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-500" />
            {workOrderId ? "Edit EV Work Order" : "Create EV Work Order"}
          </DialogTitle>
          <DialogDescription>
            <span className="text-destructive">*</span> Indicates required field · Energy in kWh · Time in hours
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[72vh] pr-3">
          <div className="space-y-4">
            {submitAttempted && invalidCount > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">
                    {invalidCount} field{invalidCount === 1 ? "" : "s"} need attention
                  </div>
                  <div className="text-xs opacity-90">
                    Fix the highlighted required and EV-safety fields before saving.
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label><span className="text-destructive">*</span> Work Order</Label>
                    <Input className={cn("font-mono", errorRing(vErrors.work_order_number))} value={form.work_order_number}
                      onBlur={onBlur("work_order_number")}
                      aria-invalid={!!vErrors.work_order_number || undefined}
                      onChange={(e) => setForm((f) => ({ ...f, work_order_number: e.target.value }))} />
                    <FieldError msg={vErrors.work_order_number} />
                  </div>
                  <div>
                    <Label><span className="text-destructive">*</span> EV Vehicle</Label>
                    <Select value={form.vehicle_id} onValueChange={(v) => {
                      const ev = evVehicles.find((x: any) => x.vehicle_id === v);
                      markTouched("vehicle_id");
                      setForm((f) => ({
                        ...f,
                        vehicle_id: v,
                        asset_number: ev?.vehicles?.plate_number || "",
                        current_soc_percent: ev?.current_soc_percent || 0,
                        connector_type: ev?.charging_connector_type || "",
                      }));
                    }}>
                      <SelectTrigger className={errorRing(vErrors.vehicle_id)} aria-invalid={!!vErrors.vehicle_id || undefined}>
                        <SelectValue placeholder="Select EV" />
                      </SelectTrigger>
                      <SelectContent>
                        {evVehicles.map((v: any) => (
                          <SelectItem key={v.vehicle_id} value={v.vehicle_id}>
                            {v.vehicles?.plate_number} · {v.vehicles?.make} {v.vehicles?.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError msg={vErrors.vehicle_id} />
                  </div>
                  <div>
                    <Label>Asset Number</Label>
                    <Input className={errorRing(vErrors.asset_number)} value={form.asset_number}
                      onBlur={onBlur("asset_number")}
                      aria-invalid={!!vErrors.asset_number || undefined}
                      onChange={(e) => setForm((f) => ({ ...f, asset_number: e.target.value }))} />
                    <FieldError msg={vErrors.asset_number} />
                  </div>
                  <div>
                    <Label><span className="text-destructive">*</span> Asset Group</Label>
                    <Select value={form.asset_group} onValueChange={(v) => { markTouched("asset_group"); setForm((f) => ({ ...f, asset_group: v })); }}>
                      <SelectTrigger className={errorRing(vErrors.asset_group)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vehicle">EV Vehicle</SelectItem>
                        <SelectItem value="battery">Battery Pack</SelectItem>
                        <SelectItem value="charger">Charger</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError msg={vErrors.asset_group} />
                  </div>
                  <div>
                    <Label><span className="text-destructive">*</span> WIP Accounting Class</Label>
                    <Input className={errorRing(vErrors.wip_accounting_class)} value={form.wip_accounting_class}
                      onBlur={onBlur("wip_accounting_class")}
                      onChange={(e) => setForm((f) => ({ ...f, wip_accounting_class: e.target.value }))} />
                    <FieldError msg={vErrors.wip_accounting_class} />
                  </div>
                  <div>
                    <Label>Scheduled Start</Label>
                    <Input type="datetime-local" className={errorRing(vErrors.scheduled_start_date)} value={form.scheduled_start_date}
                      onBlur={onBlur("scheduled_start_date")}
                      onChange={(e) => setForm((f) => ({ ...f, scheduled_start_date: e.target.value }))} />
                    <FieldError msg={vErrors.scheduled_start_date} />
                  </div>
                  <div>
                    <Label>Scheduled Completion</Label>
                    <Input type="datetime-local" className={errorRing(vErrors.scheduled_completion_date)} value={form.scheduled_completion_date}
                      onBlur={onBlur("scheduled_completion_date")}
                      onChange={(e) => setForm((f) => ({ ...f, scheduled_completion_date: e.target.value }))} />
                    <FieldError msg={vErrors.scheduled_completion_date} />
                  </div>
                  <div>
                    <Label>Duration (hours)</Label>
                    <Input type="number" step="0.5" min="0" className={errorRing(vErrors.duration)} value={form.duration}
                      onBlur={onBlur("duration")}
                      onChange={(e) => setForm((f) => ({ ...f, duration: Number(sanitizeDecimal(e.target.value)) || 0 }))} />
                    <FieldError msg={vErrors.duration} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Planner</Label>
                    <Input value={form.planner_name}
                      onChange={(e) => setForm((f) => ({ ...f, planner_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea rows={2} value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Asset Activity</Label>
                    <Input value={form.asset_activity}
                      onChange={(e) => setForm((f) => ({ ...f, asset_activity: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Status</Label>
                      <Select value={form.wo_status} onValueChange={(v) => setForm((f) => ({ ...f, wo_status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="released">Released</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={form.work_order_type} onValueChange={(v) => setForm((f) => ({ ...f, work_order_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="charging">Charging</SelectItem>
                          <SelectItem value="battery_service">Battery Service</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="diagnostic">Diagnostic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Firm</Label>
                      <Select value={form.firm ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, firm: v === "yes" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Request Number</Label>
                    <Input className="font-mono text-xs" value={form.request_number}
                      onChange={(e) => setForm((f) => ({ ...f, request_number: e.target.value }))} />
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2 h-fit">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <BatteryCharging className="h-4 w-4 text-emerald-500" />
                    EV Asset Details
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Make/Model</span>
                      <span className="font-medium">{selectedVehicle?.vehicles?.make} {selectedVehicle?.vehicles?.model || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Battery</span>
                      <span className="font-medium">{selectedVehicle?.battery_capacity_kwh || "—"} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current SoC</span>
                      <span className="font-medium text-emerald-500">{selectedVehicle?.current_soc_percent ?? "—"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Charge Rate</span>
                      <span className="font-medium">{selectedVehicle?.max_charging_rate_kw || "—"} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connector</span>
                      <span className="font-medium">{selectedVehicle?.charging_connector_type || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Accordion type="multiple" defaultValue={["charging"]} className="space-y-2">
              <AccordionItem value="charging" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> Charging Details</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2">
                    <div>
                      <Label>Charging Station</Label>
                      <Select value={form.station_id} onValueChange={(v) => {
                        const s = stations.find((x: any) => x.id === v);
                        setForm((f) => ({ ...f, station_id: v, cost_per_kwh: s?.cost_per_kwh || f.cost_per_kwh }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                        <SelectContent>
                          {stations.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.max_power_kw}kW)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Charging Type</Label>
                      <Select value={form.charging_type} onValueChange={(v) => setForm((f) => ({ ...f, charging_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="level1">Level 1 (AC)</SelectItem>
                          <SelectItem value="level2">Level 2 (AC)</SelectItem>
                          <SelectItem value="ac">AC Standard</SelectItem>
                          <SelectItem value="dc_fast">DC Fast Charge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Connector</Label>
                      <Select value={form.connector_type} onValueChange={(v) => setForm((f) => ({ ...f, connector_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ccs2">CCS Type 2</SelectItem>
                          <SelectItem value="ccs1">CCS Type 1</SelectItem>
                          <SelectItem value="chademo">CHAdeMO</SelectItem>
                          <SelectItem value="type2">Type 2 (Mennekes)</SelectItem>
                          <SelectItem value="gbt">GB/T</SelectItem>
                          <SelectItem value="tesla">Tesla</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Current SoC (%)</Label>
                      <Input type="number" min="0" max="100" className={errorRing(vErrors.current_soc_percent)} value={form.current_soc_percent}
                        onBlur={onBlur("current_soc_percent")}
                        onChange={(e) => setForm((f) => ({ ...f, current_soc_percent: Number(e.target.value) }))} />
                      <FieldError msg={vErrors.current_soc_percent} />
                    </div>
                    <div>
                      <Label>Target SoC (%)</Label>
                      <Input type="number" min="0" max="100" className={errorRing(vErrors.target_soc_percent)} value={form.target_soc_percent}
                        onBlur={onBlur("target_soc_percent")}
                        onChange={(e) => setForm((f) => ({ ...f, target_soc_percent: Number(e.target.value) }))} />
                      <FieldError msg={vErrors.target_soc_percent} />
                    </div>
                    <div>
                      <Label>Energy Required (kWh)</Label>
                      <Input type="number" step="0.01" value={form.energy_required_kwh}
                        onChange={(e) => setForm((f) => ({ ...f, energy_required_kwh: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Cost per kWh (ETB)</Label>
                      <Input type="number" step="0.01" value={form.cost_per_kwh}
                        onChange={(e) => setForm((f) => ({ ...f, cost_per_kwh: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Estimated Cost (ETB)</Label>
                      <Input type="number" step="0.01" value={form.estimated_cost} readOnly className="bg-muted/30" />
                    </div>
                    <div>
                      <Label>Actual Cost (ETB)</Label>
                      <Input type="number" step="0.01" value={form.actual_cost}
                        onChange={(e) => setForm((f) => ({ ...f, actual_cost: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Energy Delivered (kWh)</Label>
                      <Input type="number" step="0.01" value={form.energy_delivered_kwh}
                        onChange={(e) => setForm((f) => ({ ...f, energy_delivered_kwh: Number(e.target.value) }))} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="additional" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> Additional Details</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-3">
                      <div><Label>Project</Label><Input value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))} /></div>
                      <div><Label>Task</Label><Input value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))} /></div>
                      <div>
                        <Label>Activity Type</Label>
                        <Select value={form.activity_type} onValueChange={(v) => setForm((f) => ({ ...f, activity_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ev_charge">EV Charge</SelectItem>
                            <SelectItem value="battery_diagnostic">Battery Diagnostic</SelectItem>
                            <SelectItem value="cell_balance">Cell Balancing</SelectItem>
                            <SelectItem value="firmware_update">Firmware Update</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                            <SelectItem value="repair">Repair</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Activity Cause</Label>
                        <Select value={form.activity_cause} onValueChange={(v) => setForm((f) => ({ ...f, activity_cause: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="request">Request</SelectItem>
                            <SelectItem value="low_soc">Low SoC</SelectItem>
                            <SelectItem value="battery_health">Battery Health Decline</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Activity Source</Label>
                        <Select value={form.activity_source} onValueChange={(v) => setForm((f) => ({ ...f, activity_source: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="auto">Automatic</SelectItem>
                            <SelectItem value="schedule">Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div><Label>Supplier / Operator</Label><Input value={form.supplier_name} onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} /></div>
                      <div><Label>Agreement Number</Label><Input className="font-mono" value={form.agreement_number} onChange={(e) => setForm((f) => ({ ...f, agreement_number: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Warranty Active</Label>
                          <Select value={form.warranty_active ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, warranty_active: v === "yes" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Warranty Expiry</Label>
                          <Input type="date" value={form.warranty_expiration_date?.slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, warranty_expiration_date: e.target.value }))} />
                        </div>
                      </div>
                      <div><Label>Remark 1</Label><Input value={form.remark1} onChange={(e) => setForm((f) => ({ ...f, remark1: e.target.value }))} /></div>
                      <div><Label>Remark 2</Label><Input value={form.remark2} onChange={(e) => setForm((f) => ({ ...f, remark2: e.target.value }))} /></div>
                    </div>
                  </div>
                  <div className="mt-3"><Label>Additional Description</Label><Textarea rows={2} value={form.additional_description} onChange={(e) => setForm((f) => ({ ...f, additional_description: e.target.value }))} /></div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="failure" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Failure Information</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2">
                    <div><Label>Failure Code</Label><Input value={form.failure_code} onChange={(e) => setForm((f) => ({ ...f, failure_code: e.target.value }))} /></div>
                    <div><Label>Failure Cause</Label><Input value={form.failure_cause} onChange={(e) => setForm((f) => ({ ...f, failure_cause: e.target.value }))} /></div>
                    <div><Label>Resolution</Label><Input value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))} /></div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="materials" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Materials</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground py-2">
                    Material issue (battery cells, BMS modules, charging cables) is auto-managed against linked work order parts.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permits" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Permits & Clearance</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <Label>Tagout Required</Label>
                      <Select value={form.tagout_required ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, tagout_required: v === "yes" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notification Required</Label>
                      <Select value={form.notification_required ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, notification_required: v === "yes" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Safety notes (high-voltage handling, PPE, lockout)..." />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => { validation.reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (!validateAll()) {
                markAllTouched();
                toast.error(`Please fix ${invalidCount} invalid field${invalidCount === 1 ? "" : "s"} before saving`);
                return;
              }
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700">
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {workOrderId ? "Save Changes" : "Create Work Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
