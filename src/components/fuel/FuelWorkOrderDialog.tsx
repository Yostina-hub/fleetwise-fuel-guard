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
import { Loader2, FileText, Settings, AlertCircle, Wrench, Boxes, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFuelWorkOrderValidation } from "./useFuelWorkOrderValidation";
import { sanitizeDecimal, type FuelWorkOrderValues } from "./fuelWorkOrderValidation";

/** Tiny inline error chip — reused per field below. */
const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <p
      role="alert"
      className="mt-1 flex items-start gap-1.5 text-xs font-medium text-destructive animate-fade-in"
    >
      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
      <span>{msg}</span>
    </p>
  ) : null;

const errorRing = (hasError?: boolean) =>
  hasError
    ? "border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive/40"
    : "";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workOrderId?: string | null;
  fuelRequestId?: string | null;
}

const DEFAULT_FORM = {
  work_order_number: "",
  asset_number: "",
  asset_group: "",
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
  work_order_type: "",
  shutdown_type: "",
  priority: "medium",
  project: "",
  task: "",
  rebuild_parent: "",
  activity_type: "",
  activity_cause: "",
  activity_source: "",
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
  emoney_amount: 0,
  notes: "",
};

export const FuelWorkOrderDialog = ({ open, onOpenChange, workOrderId, fuelRequestId }: Props) => {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  // Load existing WO if editing
  const { data: existingWO } = useQuery({
    queryKey: ["fuel-work-order-edit", workOrderId],
    queryFn: async () => {
      if (!workOrderId) return null;
      const { data, error } = await supabase
        .from("fuel_work_orders")
        .select("*")
        .eq("id", workOrderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId && open,
  });

  // Load related fuel request for header pre-fill
  const { data: linkedRequest } = useQuery({
    queryKey: ["fuel-request-for-wo", fuelRequestId, existingWO?.fuel_request_id],
    queryFn: async () => {
      const id = fuelRequestId || existingWO?.fuel_request_id;
      if (!id) return null;
      const { data } = await supabase
        .from("fuel_requests")
        .select("*, vehicles:vehicle_id(plate_number, make, model), generators:generator_id(name)")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!(fuelRequestId || existingWO?.fuel_request_id) && open,
  });

  useEffect(() => {
    if (existingWO) {
      setForm({ ...DEFAULT_FORM, ...existingWO,
        scheduled_start_date: existingWO.scheduled_start_date ? new Date(existingWO.scheduled_start_date).toISOString().slice(0, 16) : "",
        scheduled_completion_date: existingWO.scheduled_completion_date ? new Date(existingWO.scheduled_completion_date).toISOString().slice(0, 16) : "",
        warranty_expiration_date: existingWO.warranty_expiration_date ? new Date(existingWO.warranty_expiration_date).toISOString().slice(0, 16) : "",
      } as any);
    } else if (open && !workOrderId) {
      // New WO – pre-fill from linked request
      const woNum = `FWO-${Date.now().toString(36).toUpperCase()}`;
      setForm({
        ...DEFAULT_FORM,
        work_order_number: woNum,
        request_number: linkedRequest?.request_number || "",
        asset_number: linkedRequest?.vehicles?.plate_number || linkedRequest?.generators?.name || "",
        description: linkedRequest?.purpose || "Fuel work order",
        department: linkedRequest?.assigned_department || linkedRequest?.requestor_department || "",
        priority: linkedRequest?.priority || "medium",
        scheduled_start_date: linkedRequest?.request_by_start_date ? new Date(linkedRequest.request_by_start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        scheduled_completion_date: linkedRequest?.request_by_completion_date ? new Date(linkedRequest.request_by_completion_date).toISOString().slice(0, 16) : "",
        context: linkedRequest?.context_value || "",
        additional_description: linkedRequest?.additional_description || "",
        work_order_type: linkedRequest?.work_request_type || "fuel",
        activity_type: "fuel_dispense",
        activity_cause: linkedRequest?.trigger_source === "auto" ? "low_efficiency" : "request",
        activity_source: linkedRequest?.trigger_source || "manual",
        emoney_amount: linkedRequest?.estimated_cost || 0,
      });
    }
  }, [existingWO, linkedRequest, open, workOrderId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organization not loaded");
      const { data: user } = await supabase.auth.getUser();
      const payload: any = {
        organization_id: organizationId,
        fuel_request_id: fuelRequestId || existingWO?.fuel_request_id || null,
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
        emoney_amount: Number(form.emoney_amount) || 0,
        notes: form.notes || null,
        created_by_user_id: user.user?.id,
        status: form.wo_status === "released" ? "approved" : "pending",
      };

      if (workOrderId) {
        const { error } = await supabase.from("fuel_work_orders").update(payload).eq("id", workOrderId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fuel_work_orders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-work-order"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast.success(workOrderId ? "Work order updated" : "Work order created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {workOrderId ? "Edit Fuel Work Order" : "Create Fuel Work Order"}
          </DialogTitle>
          <DialogDescription>
            <span className="text-destructive">*</span> Indicates required field · Time = hours
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[72vh] pr-3">
          <div className="space-y-4">
            {/* === HEADER GRID === */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left column */}
                <div className="space-y-3">
                  <div>
                    <Label><span className="text-destructive">*</span> Work Order</Label>
                    <Input
                      value={form.work_order_number}
                      onChange={(e) => setForm((f) => ({ ...f, work_order_number: e.target.value }))}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label>Asset Number</Label>
                    <Input
                      value={form.asset_number}
                      onChange={(e) => setForm((f) => ({ ...f, asset_number: e.target.value }))}
                      placeholder="e.g. ETHIO7146"
                    />
                    <p className="text-[10px] text-primary mt-0.5">Asset Number is mandatory for Assets and Serialized Rebuilds</p>
                  </div>
                  <div>
                    <Label><span className="text-destructive">*</span> Asset Group</Label>
                    <Select value={form.asset_group} onValueChange={(v) => setForm((f) => ({ ...f, asset_group: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vehicle">Vehicle</SelectItem>
                        <SelectItem value="generator">Generator</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label><span className="text-destructive">*</span> WIP Accounting Class</Label>
                    <Input
                      value={form.wip_accounting_class}
                      onChange={(e) => setForm((f) => ({ ...f, wip_accounting_class: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Scheduled Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_start_date}
                      onChange={(e) => setForm((f) => ({ ...f, scheduled_start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Scheduled Completion Date</Label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_completion_date}
                      onChange={(e) => setForm((f) => ({ ...f, scheduled_completion_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.duration}
                      onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Request Number</Label>
                    <Input
                      value={form.request_number}
                      onChange={(e) => setForm((f) => ({ ...f, request_number: e.target.value }))}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Middle column */}
                <div className="space-y-3">
                  <div>
                    <Label>Planner</Label>
                    <Input
                      value={form.planner_name}
                      onChange={(e) => setForm((f) => ({ ...f, planner_name: e.target.value }))}
                      placeholder="Planner name"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Department Description</Label>
                    <Input
                      value={form.department_description}
                      onChange={(e) => setForm((f) => ({ ...f, department_description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label><span className="text-destructive">*</span> Asset Activity</Label>
                    <Input
                      value={form.asset_activity}
                      onChange={(e) => setForm((f) => ({ ...f, asset_activity: e.target.value }))}
                      placeholder="e.g. Refueling"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                    <div>
                      <Label>Status</Label>
                      <Select value={form.wo_status} onValueChange={(v) => setForm((f) => ({ ...f, wo_status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="released">Released</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Work Order Type</Label>
                      <Select value={form.work_order_type} onValueChange={(v) => setForm((f) => ({ ...f, work_order_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fuel">Fuel</SelectItem>
                          <SelectItem value="preventive">Preventive</SelectItem>
                          <SelectItem value="corrective">Corrective</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Shutdown Type</Label>
                      <Select value={form.shutdown_type} onValueChange={(v) => setForm((f) => ({ ...f, shutdown_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="unplanned">Unplanned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                </div>

                {/* Right column - Asset Details panel */}
                <div className="rounded-lg border border-border bg-card p-3 space-y-2 h-fit">
                  <h4 className="font-semibold text-sm">Asset Details</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Asset Description</span><span className="font-medium">{linkedRequest?.vehicles?.make} {linkedRequest?.vehicles?.model}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Area</span><span className="font-medium">—</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-medium">{form.department || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Asset Criticality</span><span className="font-medium">{linkedRequest?.asset_criticality || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Asset Status</span><span className="font-medium">Active</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Parent Asset</span><span className="font-medium">—</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* === Collapsible sections === */}
            <Accordion type="multiple" defaultValue={["additional"]} className="space-y-2">
              <AccordionItem value="additional" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> Additional Details</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-3">
                      <div>
                        <Label>Project</Label>
                        <Input value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Task</Label>
                        <Input value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Rebuild Parent</Label>
                        <Input value={form.rebuild_parent} onChange={(e) => setForm((f) => ({ ...f, rebuild_parent: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Activity Type</Label>
                        <Select value={form.activity_type} onValueChange={(v) => setForm((f) => ({ ...f, activity_type: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fuel_dispense">Fuel Dispense</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                            <SelectItem value="repair">Repair</SelectItem>
                            <SelectItem value="replacement">Replacement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Activity Cause</Label>
                        <Select value={form.activity_cause} onValueChange={(v) => setForm((f) => ({ ...f, activity_cause: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="request">Request</SelectItem>
                            <SelectItem value="low_efficiency">Low Efficiency</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Activity Source</Label>
                        <Select value={form.activity_source} onValueChange={(v) => setForm((f) => ({ ...f, activity_source: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="auto">Automatic</SelectItem>
                            <SelectItem value="schedule">Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Material Issue Req.</Label>
                          <Select value={form.enable_material_issue_request ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, enable_material_issue_request: v === "yes" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Planned</Label>
                          <Select value={form.planned ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, planned: v === "yes" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Warranty Status</Label>
                          <Select value={form.warranty_status} onValueChange={(v) => setForm((f) => ({ ...f, warranty_status: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Warranty Active</Label>
                          <Select value={form.warranty_active ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, warranty_active: v === "yes" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Warranty Expiration Date</Label>
                        <Input type="datetime-local" value={form.warranty_expiration_date} onChange={(e) => setForm((f) => ({ ...f, warranty_expiration_date: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Tagout Required</Label>
                          <Select value={form.tagout_required ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, tagout_required: v === "yes" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Notification Required</Label>
                          <Select value={form.notification_required ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, notification_required: v === "yes" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Context</Label>
                        <Input value={form.context} onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Supplier Name</Label>
                        <Input value={form.supplier_name} onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} placeholder="e.g. NOC Fuel Station" />
                      </div>
                      <div>
                        <Label>Remark 1</Label>
                        <Input value={form.remark1} onChange={(e) => setForm((f) => ({ ...f, remark1: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Remark 2</Label>
                        <Input value={form.remark2} onChange={(e) => setForm((f) => ({ ...f, remark2: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Remark 3</Label>
                        <Input value={form.remark3} onChange={(e) => setForm((f) => ({ ...f, remark3: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Remark 4</Label>
                        <Input value={form.remark4} onChange={(e) => setForm((f) => ({ ...f, remark4: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Agreement Number</Label>
                        <Input value={form.agreement_number} onChange={(e) => setForm((f) => ({ ...f, agreement_number: e.target.value }))} className="font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>Additional Description</Label>
                    <Textarea rows={2} value={form.additional_description} onChange={(e) => setForm((f) => ({ ...f, additional_description: e.target.value }))} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="failure" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Failure Information</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2">
                    <div>
                      <Label>Failure Code</Label>
                      <Input value={form.failure_code} onChange={(e) => setForm((f) => ({ ...f, failure_code: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Failure Cause</Label>
                      <Input value={form.failure_cause} onChange={(e) => setForm((f) => ({ ...f, failure_cause: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Resolution</Label>
                      <Input value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="operations" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Operations</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground py-2">
                    Operations defined per WO (E-money initiation, transfer, PIN confirmation, pullback) are automated by the Telebirr pipeline once WO is released.
                  </p>
                  <div>
                    <Label>E-Money Amount (ETB)</Label>
                    <Input type="number" step="0.01" value={form.emoney_amount} onChange={(e) => setForm((f) => ({ ...f, emoney_amount: Number(e.target.value) }))} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="materials" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Materials</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground py-2">
                    Material issue (fuel quantity, coupons) is auto-managed against the linked fuel request quantities.
                    {linkedRequest && (
                      <span className="block mt-1">
                        Linked: <span className="font-medium text-foreground">{linkedRequest.liters_requested}L {linkedRequest.fuel_type}</span>
                      </span>
                    )}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permits" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Work Permits & Clearance</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div>
                    <Label>Notes</Label>
                    <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any safety, clearance, or permit notes..." />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.work_order_number}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {workOrderId ? "Save Changes" : "Create Work Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
