import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Loader2, Star, Send, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  maintenanceRequestId?: string;
  workOrderId?: string;
  vehicleId?: string;
  onSaved?: (woId: string) => void;
  onCancel?: () => void;
}

interface Operation {
  id?: string;
  sequence_number: number;
  operation_description: string;
  department: string;
  resource_sequence: number;
  resource: string;
  required_units: number;
  assigned_units: number;
  start_time?: Date;
  end_time?: Date;
  duration_hours: number;
  assigned_hours: number;
}

interface Material {
  id?: string;
  operation_sequence?: number;
  item_code: string;
  item_description: string;
  required_quantity: number;
  issued_quantity: number;
  uom: string;
  supply_type: string;
  required_date?: string;
  unit_cost: number;
}

interface Permit {
  id?: string;
  permit_number: string;
  permit_type: string;
  issued_by: string;
  valid_from?: string;
  valid_until?: string;
  status: string;
}

interface QualityPlan {
  id?: string;
  plan_name: string;
  characteristic: string;
  specification: string;
  result: string;
  pass: boolean | null;
}

interface MeterReading {
  id?: string;
  meter_name: string;
  reading_value: number;
  unit: string;
  captured_at?: string;
}

interface Attachment {
  id?: string;
  file_name: string;
  file_url: string;
  mime_type?: string;
  category: string;
}

const REQ = <span className="text-destructive">*</span>;

export default function OracleWorkOrderForm({ maintenanceRequestId, workOrderId, vehicleId, onSaved, onCancel }: Props) {
  const { organizationId } = useOrganization();

  // Header
  const [woNumber, setWoNumber] = useState(workOrderId ? "" : "WO" + Date.now().toString().slice(-7));
  const [assetNumber, setAssetNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [scheduledStart, setScheduledStart] = useState<Date | undefined>(new Date());
  const [scheduledCompletion, setScheduledCompletion] = useState<Date | undefined>(new Date(Date.now() + 86400000));
  const [duration, setDuration] = useState(0);
  const [requestNumber, setRequestNumber] = useState("");
  const [otherRequest, setOtherRequest] = useState("");
  const [planner, setPlanner] = useState("");
  const [description, setDescription] = useState("");
  const [departmentDescription, setDepartmentDescription] = useState("");
  const [assetActivity, setAssetActivity] = useState("");
  const [firmFlag, setFirmFlag] = useState("Yes");
  const [status, setStatus] = useState("Released");
  const [workOrderType, setWorkOrderType] = useState("");
  const [shutdownType, setShutdownType] = useState("");
  const [priority, setPriority] = useState("medium");
  const [pendingFlag, setPendingFlag] = useState(false);

  // Additional Details
  const [pmStartDate, setPmStartDate] = useState<Date>();
  const [pmEndDate, setPmEndDate] = useState<Date>();
  const [projectCode, setProjectCode] = useState("");
  const [taskCode, setTaskCode] = useState("");
  const [activityType, setActivityType] = useState("");
  const [activityCause, setActivityCause] = useState("");
  const [activitySource, setActivitySource] = useState("");
  const [scheduleName, setScheduleName] = useState("");
  const [enableMaterialIssueRequest, setEnableMaterialIssueRequest] = useState("Yes");
  const [planned, setPlanned] = useState("No");
  const [warrantyStatus, setWarrantyStatus] = useState("");
  const [warrantyActive, setWarrantyActive] = useState("No");
  const [warrantyExpDate, setWarrantyExpDate] = useState<Date>();
  const [tagoutRequired, setTagoutRequired] = useState("No");
  const [notificationRequired, setNotificationRequired] = useState("No");
  const [contextValue, setContextValue] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [remark1, setRemark1] = useState("");
  const [remark2, setRemark2] = useState("");
  const [remark3, setRemark3] = useState("");
  const [remark4, setRemark4] = useState("");
  const [agreementNumber, setAgreementNumber] = useState("");
  const [additionalDescription, setAdditionalDescription] = useState("");

  // Failure Information
  const [failureCode, setFailureCode] = useState("");
  const [failureCause, setFailureCause] = useState("");
  const [failureResolution, setFailureResolution] = useState("");

  // Operations
  const [operations, setOperations] = useState<Operation[]>([
    { sequence_number: 20, operation_description: "Pre-inspect the work", department: "FleetMnt03", resource_sequence: 20, resource: "Inspector", required_units: 1, assigned_units: 1, duration_hours: 0, assigned_hours: 0 },
    { sequence_number: 40, operation_description: "Maintenance", department: "FleetMnt03", resource_sequence: 10, resource: "Inspector", required_units: 1, assigned_units: 1, duration_hours: 0, assigned_hours: 0 },
    { sequence_number: 50, operation_description: "Collect invoice & report", department: "FleetMnt06", resource_sequence: 50, resource: "Inspector", required_units: 1, assigned_units: 1, duration_hours: 0, assigned_hours: 0 },
  ]);

  // Materials, Permits, Quality, Meters, Attachments
  const [materials, setMaterials] = useState<Material[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [qualityPlans, setQualityPlans] = useState<QualityPlan[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [savedWoId, setSavedWoId] = useState<string | null>(workOrderId || null);

  // Vehicle lookup
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-wo-lookup", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId)
        .order("plate_number")
        .limit(200);
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Load from maintenance request if provided
  useEffect(() => {
    if (!maintenanceRequestId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("maintenance_requests")
        .select("*, vehicles(plate_number, make, model)")
        .eq("id", maintenanceRequestId)
        .maybeSingle();
      if (!data) return;
      setRequestNumber(data.request_number || "");
      setAssetNumber(data.vehicles?.plate_number || "");
      setDepartment(data.requestor_department || "");
      setDescription(data.description || "");
      setAdditionalDescription(data.additional_description || "");
      if (data.priority) setPriority(data.priority);
      setRemark1(data.description || data.notes || "");
    })();
  }, [maintenanceRequestId]);

  // Load existing WO
  useEffect(() => {
    if (!workOrderId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("work_orders")
        .select("*, vehicles(plate_number)")
        .eq("id", workOrderId)
        .maybeSingle();
      if (!data) return;
      setWoNumber(data.work_order_number);
      setAssetNumber(data.vehicles?.plate_number || "");
      setDepartment(data.assigned_department || data.department || "");
      setDescription(data.service_description || "");
      setAdditionalDescription(data.additional_description || "");
      setSupplierName(data.supplier_name || "");
      setRemark1(data.remark_1 || "");
      setRemark2(data.remark_2 || "");
      setRemark3(data.remark_3 || "");
      setRemark4(data.remark_4 || "");
      setActivityType(data.activity_type || "");
      setPriority(data.priority || "medium");
      if (data.scheduled_date) setScheduledStart(new Date(data.scheduled_date));

      const [{ data: ops }, { data: mats }, { data: prms }, { data: qps }, { data: mtrs }, { data: atts }] = await Promise.all([
        (supabase as any).from("work_order_operations").select("*").eq("work_order_id", workOrderId).order("sequence_number"),
        (supabase as any).from("work_order_materials").select("*").eq("work_order_id", workOrderId),
        (supabase as any).from("work_order_permits").select("*").eq("work_order_id", workOrderId),
        (supabase as any).from("work_order_quality_plans").select("*").eq("work_order_id", workOrderId),
        (supabase as any).from("work_order_meter_readings").select("*").eq("work_order_id", workOrderId),
        (supabase as any).from("work_order_attachments").select("*").eq("work_order_id", workOrderId),
      ]);
      if (ops?.length) setOperations(ops as any);
      if (mats?.length) setMaterials(mats as any);
      if (prms?.length) setPermits(prms as any);
      if (qps?.length) setQualityPlans(qps as any);
      if (mtrs?.length) setMeterReadings(mtrs as any);
      if (atts?.length) setAttachments(atts as any);
    })();
  }, [workOrderId]);

  const addOperation = () => {
    const next = operations.length ? Math.max(...operations.map(o => o.sequence_number)) + 10 : 10;
    setOperations([...operations, { sequence_number: next, operation_description: "", department: "", resource_sequence: 10, resource: "", required_units: 1, assigned_units: 0, duration_hours: 0, assigned_hours: 0 }]);
  };
  const updateOp = (i: number, patch: Partial<Operation>) => setOperations(prev => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o));
  const removeOp = (i: number) => setOperations(prev => prev.filter((_, idx) => idx !== i));

  const addMaterial = () => setMaterials(prev => [...prev, { item_code: "", item_description: "", required_quantity: 1, issued_quantity: 0, uom: "EA", supply_type: "Push", unit_cost: 0 }]);
  const updateMat = (i: number, p: Partial<Material>) => setMaterials(prev => prev.map((m, idx) => idx === i ? { ...m, ...p } : m));
  const removeMat = (i: number) => setMaterials(prev => prev.filter((_, idx) => idx !== i));

  const addPermit = () => setPermits(prev => [...prev, { permit_number: "", permit_type: "general", issued_by: "", status: "pending" }]);
  const updatePermit = (i: number, p: Partial<Permit>) => setPermits(prev => prev.map((m, idx) => idx === i ? { ...m, ...p } : m));
  const removePermit = (i: number) => setPermits(prev => prev.filter((_, idx) => idx !== i));

  const addQuality = () => setQualityPlans(prev => [...prev, { plan_name: "", characteristic: "", specification: "", result: "", pass: null }]);
  const updateQuality = (i: number, p: Partial<QualityPlan>) => setQualityPlans(prev => prev.map((m, idx) => idx === i ? { ...m, ...p } : m));
  const removeQuality = (i: number) => setQualityPlans(prev => prev.filter((_, idx) => idx !== i));

  const addMeter = () => setMeterReadings(prev => [...prev, { meter_name: "Odometer", reading_value: 0, unit: "KM" }]);
  const updateMeter = (i: number, p: Partial<MeterReading>) => setMeterReadings(prev => prev.map((m, idx) => idx === i ? { ...m, ...p } : m));
  const removeMeter = (i: number) => setMeterReadings(prev => prev.filter((_, idx) => idx !== i));

  const addAttachment = () => setAttachments(prev => [...prev, { file_name: "", file_url: "", category: "general" }]);
  const updateAttachment = (i: number, p: Partial<Attachment>) => setAttachments(prev => prev.map((m, idx) => idx === i ? { ...m, ...p } : m));
  const removeAttachment = (i: number) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!assetNumber.trim()) { toast.error("Asset Number is required"); return; }
    if (!description.trim()) { toast.error("Description is required"); return; }

    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId) {
      const v = vehicles.find(x => x.plate_number === assetNumber);
      if (!v) { toast.error("Asset Number not found"); return; }
      resolvedVehicleId = v.id;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload: any = {
        organization_id: organizationId,
        vehicle_id: resolvedVehicleId,
        work_order_number: woNumber,
        work_type: workOrderType || "corrective",
        priority,
        service_description: description,
        additional_description: additionalDescription,
        status: "pending",
        scheduled_date: scheduledStart ? format(scheduledStart, "yyyy-MM-dd") : null,
        request_completion_date: scheduledCompletion ? scheduledCompletion.toISOString() : null,
        assigned_department: department,
        supplier_name: supplierName,
        remark_1: remark1, remark_2: remark2, remark_3: remark3, remark_4: remark4,
        activity_type: activityType, activity_cause: activityCause, activity_source: activitySource,
        schedule_name: scheduleName, planner, shutdown_type: shutdownType,
        firm_flag: firmFlag === "Yes",
        firm_status: status.toLowerCase(),
        pending_flag: pendingFlag,
        pm_suggested_start_date: pmStartDate?.toISOString() || null,
        pm_suggested_end_date: pmEndDate?.toISOString() || null,
        project_code: projectCode, task_code: taskCode,
        warranty_active: warrantyActive === "Yes",
        warranty_expiration_date: warrantyExpDate ? format(warrantyExpDate, "yyyy-MM-dd") : null,
        tagout_required: tagoutRequired === "Yes",
        notification_required: notificationRequired === "Yes",
        context_value: contextValue,
        agreement_number: agreementNumber,
        failure_code: failureCode, failure_cause: failureCause, failure_resolution: failureResolution,
        work_order_type: workOrderType,
        created_by_user_id: userData.user?.id,
      };
      if (maintenanceRequestId) payload.maintenance_request_id = maintenanceRequestId;

      let woId = savedWoId;
      if (woId) {
        const { error } = await (supabase as any).from("work_orders").update(payload).eq("id", woId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from("work_orders").insert(payload).select("id").single();
        if (error) throw error;
        woId = data.id;
        setSavedWoId(woId);
      }

      // Save operations
      if (woId && operations.length) {
        await (supabase as any).from("work_order_operations").delete().eq("work_order_id", woId);
        const opsPayload = operations.map(o => ({
          organization_id: organizationId,
          work_order_id: woId,
          sequence_number: o.sequence_number,
          operation_description: o.operation_description,
          department: o.department,
          resource_sequence: o.resource_sequence,
          resource: o.resource,
          required_units: o.required_units,
          assigned_units: o.assigned_units,
          start_time: o.start_time?.toISOString() || null,
          end_time: o.end_time?.toISOString() || null,
          duration_hours: o.duration_hours,
          assigned_hours: o.assigned_hours,
        }));
        await (supabase as any).from("work_order_operations").insert(opsPayload);
      }

      // Materials
      await (supabase as any).from("work_order_materials").delete().eq("work_order_id", woId);
      if (materials.length) {
        await (supabase as any).from("work_order_materials").insert(materials.map(m => ({
          organization_id: organizationId, work_order_id: woId,
          item_code: m.item_code, item_description: m.item_description,
          required_quantity: m.required_quantity, issued_quantity: m.issued_quantity,
          uom: m.uom, supply_type: m.supply_type, unit_cost: m.unit_cost,
          required_date: m.required_date || null, operation_sequence: m.operation_sequence || null,
        })));
      }

      // Permits
      await (supabase as any).from("work_order_permits").delete().eq("work_order_id", woId);
      if (permits.length) {
        await (supabase as any).from("work_order_permits").insert(permits.map(p => ({
          organization_id: organizationId, work_order_id: woId,
          permit_number: p.permit_number, permit_type: p.permit_type, issued_by: p.issued_by,
          valid_from: p.valid_from || null, valid_until: p.valid_until || null, status: p.status,
        })));
      }

      // Quality plans
      await (supabase as any).from("work_order_quality_plans").delete().eq("work_order_id", woId);
      if (qualityPlans.length) {
        await (supabase as any).from("work_order_quality_plans").insert(qualityPlans.map(q => ({
          organization_id: organizationId, work_order_id: woId,
          plan_name: q.plan_name, characteristic: q.characteristic,
          specification: q.specification, result: q.result, pass: q.pass,
        })));
      }

      // Meter readings
      await (supabase as any).from("work_order_meter_readings").delete().eq("work_order_id", woId);
      if (meterReadings.length) {
        await (supabase as any).from("work_order_meter_readings").insert(meterReadings.map(m => ({
          organization_id: organizationId, work_order_id: woId,
          meter_name: m.meter_name, reading_value: m.reading_value, unit: m.unit,
        })));
      }

      // Attachments
      await (supabase as any).from("work_order_attachments").delete().eq("work_order_id", woId);
      if (attachments.length) {
        await (supabase as any).from("work_order_attachments").insert(attachments.map(a => ({
          organization_id: organizationId, work_order_id: woId,
          file_name: a.file_name, file_url: a.file_url, mime_type: a.mime_type, category: a.category,
        })));
      }

      toast.success(`Work Order ${woNumber} saved`);
      if (woId) onSaved?.(woId);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally { setSubmitting(false); }
  };

  const handleSubmitForApproval = async () => {
    if (!savedWoId) { toast.error("Save the WO first"); return; }
    try {
      const { error } = await (supabase as any).rpc("initiate_work_order_approval", { p_work_order_id: savedWoId });
      if (error) throw error;
      toast.success("Submitted to delegation matrix for approval");
      onSaved?.(savedWoId);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleGenerateMagicLink = async () => {
    if (!savedWoId) { toast.error("Save the WO first"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("wo-supplier-magic-link", {
        body: { work_order_id: savedWoId, expires_in_days: 7 },
      });
      if (error) throw error;
      await navigator.clipboard.writeText(data.link);
      toast.success("Supplier link copied to clipboard (valid 7 days)");
    } catch (e: any) { toast.error(e.message); }
  };

  const DateBtn = ({ value, onChange }: { value?: Date; onChange: (d?: Date) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !value && "text-muted-foreground")}>
          {value ? format(value, "dd-MMM-yyyy HH:mm") : "Pick"}
          <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={value} onSelect={onChange} className="p-3 pointer-events-auto" /></PopoverContent>
    </Popover>
  );

  const Field = ({ label, required, children }: any) => (
    <div className="grid grid-cols-12 items-center gap-2 mb-2">
      <Label className="col-span-5 text-right text-xs">{required && REQ} {label}</Label>
      <div className="col-span-7">{children}</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <p className="text-xs text-muted-foreground">Work Orders: All &gt;</p>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {savedWoId ? "Update" : "Create"} Work Order: {woNumber}
            <Star className="w-4 h-4 text-muted-foreground" />
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{REQ} Indicates required field · Time = hours</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          {savedWoId && <Button variant="outline" size="sm" onClick={handleGenerateMagicLink}><LinkIcon className="w-3 h-3 mr-1" />Supplier Link</Button>}
          {savedWoId && <Button variant="outline" size="sm" onClick={handleSubmitForApproval}><Send className="w-3 h-3 mr-1" />Submit for Approval</Button>}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Save
          </Button>
          <Button size="sm" onClick={handleSave} disabled={submitting}>Apply</Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div>
            <Field label="Work Order">
              <Input value={woNumber} onChange={e => setWoNumber(e.target.value)} className="h-8 text-xs" />
            </Field>
            <Field label="Asset Number" required>
              <Input value={assetNumber} onChange={e => setAssetNumber(e.target.value)} list="wo-asset-list" className="h-8 text-xs" />
              <datalist id="wo-asset-list">{vehicles.map(v => <option key={v.id} value={v.plate_number}>{v.make} {v.model}</option>)}</datalist>
              <p className="text-[10px] text-muted-foreground mt-1">Asset Number is mandatory for Asset and Serialized Routes</p>
            </Field>
            <Field label="Asset Group"><Input className="h-8 text-xs" value={department} onChange={e => setDepartment(e.target.value)} /></Field>
            <Field label="Wip Accounting Class"><Input className="h-8 text-xs" placeholder="VMN-COR-11" /></Field>
            <Field label="Scheduled Start Date"><DateBtn value={scheduledStart} onChange={setScheduledStart} /></Field>
            <Field label="Scheduled Completion Date"><DateBtn value={scheduledCompletion} onChange={setScheduledCompletion} /></Field>
            <Field label="Duration"><Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-8 text-xs" /></Field>
            <Field label="Request Number">
              <div className="flex gap-2">
                <Input value={requestNumber} disabled className="h-8 text-xs bg-muted/30" />
                <span className="text-xs">Other Request:</span>
                <Input value={otherRequest} onChange={e => setOtherRequest(e.target.value)} className="h-8 text-xs w-24" />
              </div>
            </Field>
            <Field label="Planner"><Input value={planner} onChange={e => setPlanner(e.target.value)} className="h-8 text-xs" /></Field>
          </div>

          {/* Middle column */}
          <div>
            <Field label="Description"><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="text-xs" /></Field>
            <Field label="Department">
              <div className="flex gap-2 items-center">
                <Input value={department} onChange={e => setDepartment(e.target.value)} className="h-8 text-xs" />
              </div>
            </Field>
            <Field label="Department Description"><Input value={departmentDescription} onChange={e => setDepartmentDescription(e.target.value)} className="h-8 text-xs" placeholder="e.g. Fleet Op Mgr Personal Pool G-3" /></Field>
            <Field label="Asset Activity"><Input value={assetActivity} onChange={e => setAssetActivity(e.target.value)} className="h-8 text-xs" /></Field>
            <Field label="Firm">
              <Select value={firmFlag} onValueChange={setFirmFlag}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Work Order Type">
              <Select value={workOrderType} onValueChange={setWorkOrderType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Shutdown Type">
              <Select value={shutdownType} onValueChange={setShutdownType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2 ml-auto justify-end mt-2">
              <Checkbox checked={pendingFlag} onCheckedChange={(c) => setPendingFlag(!!c)} />
              <Label className="text-xs">Pending</Label>
            </div>
          </div>

          {/* Right column - Stats */}
          <Card className="p-3 bg-muted/20">
            <h4 className="font-semibold text-sm mb-2">Work Order Stats</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Required Hours</span><span>0</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Assigned Hours</span><span>{operations.reduce((s, o) => s + (o.assigned_hours || 0), 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Unassigned Hours</span><span>0</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Operations Completed</span><span>0 of {operations.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated Cost</span><span>0.00</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actual Cost</span><span>0.00</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Material Shortage</span><span>None</span></div>
            </div>
            <h4 className="font-semibold text-sm mt-3 mb-2">Asset Details</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Asset Description</span><span className="truncate ml-2">{vehicles.find(v => v.plate_number === assetNumber)?.make}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{department}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Asset Status</span><span>CREATED</span></div>
            </div>
          </Card>
        </div>
      </Card>

      {/* Additional Details */}
      <Accordion type="multiple" defaultValue={["additional", "operations"]} className="space-y-2">
        <AccordionItem value="additional" className="border rounded-md">
          <AccordionTrigger className="px-4">Additional Details</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div>
                <Field label="PM Suggested End Date"><DateBtn value={pmEndDate} onChange={setPmEndDate} /></Field>
                <Field label="PM Suggested Start Date"><DateBtn value={pmStartDate} onChange={setPmStartDate} /></Field>
                <Field label="Project"><Input value={projectCode} onChange={e => setProjectCode(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Task"><Input value={taskCode} onChange={e => setTaskCode(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Activity Type">
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="repair">Repair</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="overhaul">Overhaul</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Activity Cause">
                  <Select value={activityCause} onValueChange={setActivityCause}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="wear">Normal Wear</SelectItem><SelectItem value="accident">Accident</SelectItem><SelectItem value="defect">Defect</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Activity Source">
                  <Select value={activitySource} onValueChange={setActivitySource}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="driver">Driver Report</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="pm">PM Schedule</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Schedule Name"><Input value={scheduleName} onChange={e => setScheduleName(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Enable Material Issue Request">
                  <Select value={enableMaterialIssueRequest} onValueChange={setEnableMaterialIssueRequest}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Planned">
                  <Select value={planned} onValueChange={setPlanned}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Warranty Status">
                  <Select value={warrantyStatus} onValueChange={setWarrantyStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
                  </Select>
                </Field>
              </div>
              <div>
                <Field label="Warranty Active">
                  <Select value={warrantyActive} onValueChange={setWarrantyActive}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Warranty Expiration Date"><DateBtn value={warrantyExpDate} onChange={setWarrantyExpDate} /></Field>
                <Field label="Tagout Required">
                  <Select value={tagoutRequired} onValueChange={setTagoutRequired}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Notification Required">
                  <Select value={notificationRequired} onValueChange={setNotificationRequired}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Context"><Input value={contextValue} onChange={e => setContextValue(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Supplier Name"><Input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Genet Wondemagegnehu Garage" /></Field>
                <Field label="Remark 1"><Input value={remark1} onChange={e => setRemark1(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Remark 2"><Input value={remark2} onChange={e => setRemark2(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Remark 3"><Input value={remark3} onChange={e => setRemark3(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Remark 4"><Input value={remark4} onChange={e => setRemark4(e.target.value)} className="h-8 text-xs" /></Field>
                <Field label="Agreement Number"><Input value={agreementNumber} onChange={e => setAgreementNumber(e.target.value)} className="h-8 text-xs" /></Field>
              </div>
            </div>
            <div className="mt-3">
              <Field label="Additional Description"><Textarea value={additionalDescription} onChange={e => setAdditionalDescription(e.target.value)} rows={2} className="text-xs" /></Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="failure" className="border rounded-md">
          <AccordionTrigger className="px-4">Failure Information</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-2">
            <Field label="Failure Code"><Input value={failureCode} onChange={e => setFailureCode(e.target.value)} className="h-8 text-xs" /></Field>
            <Field label="Failure Cause"><Input value={failureCause} onChange={e => setFailureCause(e.target.value)} className="h-8 text-xs" /></Field>
            <Field label="Resolution"><Textarea value={failureResolution} onChange={e => setFailureResolution(e.target.value)} rows={2} className="text-xs" /></Field>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="operations" className="border rounded-md">
          <AccordionTrigger className="px-4">Operations</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex justify-between mb-2">
              <Badge variant="outline">Summary · {operations.length} operations</Badge>
              <Button size="sm" variant="outline" onClick={addOperation}><Plus className="w-3 h-3 mr-1" />Add Operation</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-12">Seq</TableHead>
                    <TableHead>Operation Description</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="w-20">Res.Seq</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="w-16">Req</TableHead>
                    <TableHead className="w-16">Asg</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="w-16">Hours</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell><Input type="number" value={op.sequence_number} onChange={e => updateOp(i, { sequence_number: Number(e.target.value) })} className="h-7 text-xs w-14" /></TableCell>
                      <TableCell><Input value={op.operation_description} onChange={e => updateOp(i, { operation_description: e.target.value })} className="h-7 text-xs min-w-32" /></TableCell>
                      <TableCell><Input value={op.department} onChange={e => updateOp(i, { department: e.target.value })} className="h-7 text-xs w-24" /></TableCell>
                      <TableCell><Input type="number" value={op.resource_sequence} onChange={e => updateOp(i, { resource_sequence: Number(e.target.value) })} className="h-7 text-xs w-14" /></TableCell>
                      <TableCell><Input value={op.resource} onChange={e => updateOp(i, { resource: e.target.value })} className="h-7 text-xs w-24" /></TableCell>
                      <TableCell><Input type="number" value={op.required_units} onChange={e => updateOp(i, { required_units: Number(e.target.value) })} className="h-7 text-xs w-14" /></TableCell>
                      <TableCell><Input type="number" value={op.assigned_units} onChange={e => updateOp(i, { assigned_units: Number(e.target.value) })} className="h-7 text-xs w-14" /></TableCell>
                      <TableCell><DateBtn value={op.start_time} onChange={d => updateOp(i, { start_time: d })} /></TableCell>
                      <TableCell><DateBtn value={op.end_time} onChange={d => updateOp(i, { end_time: d })} /></TableCell>
                      <TableCell><Input type="number" value={op.assigned_hours} onChange={e => updateOp(i, { assigned_hours: Number(e.target.value) })} className="h-7 text-xs w-14" /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeOp(i)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="materials" className="border rounded-md">
          <AccordionTrigger className="px-4">Materials ({materials.length})</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex justify-between mb-2">
              <Badge variant="outline">Manual Material Requirements</Badge>
              <Button size="sm" variant="outline" onClick={addMaterial}><Plus className="w-3 h-3 mr-1" />Add Material</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Req Qty</TableHead>
                    <TableHead className="w-20">Iss Qty</TableHead>
                    <TableHead className="w-16">UOM</TableHead>
                    <TableHead className="w-24">Supply</TableHead>
                    <TableHead className="w-20">Unit Cost</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-4">No materials added</TableCell></TableRow>
                  )}
                  {materials.map((m, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell><Input value={m.item_code} onChange={e => updateMat(i, { item_code: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input value={m.item_description} onChange={e => updateMat(i, { item_description: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input type="number" value={m.required_quantity} onChange={e => updateMat(i, { required_quantity: Number(e.target.value) })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input type="number" value={m.issued_quantity} onChange={e => updateMat(i, { issued_quantity: Number(e.target.value) })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input value={m.uom} onChange={e => updateMat(i, { uom: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell>
                        <Select value={m.supply_type} onValueChange={v => updateMat(i, { supply_type: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Push">Push</SelectItem><SelectItem value="Pull">Pull</SelectItem><SelectItem value="Bulk">Bulk</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" value={m.unit_cost} onChange={e => updateMat(i, { unit_cost: Number(e.target.value) })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeMat(i)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="permits" className="border rounded-md">
          <AccordionTrigger className="px-4">Work Permits ({permits.length})</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex justify-between mb-2">
              <Badge variant="outline">Required Permits</Badge>
              <Button size="sm" variant="outline" onClick={addPermit}><Plus className="w-3 h-3 mr-1" />Add Permit</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Permit #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead className="w-32">Valid From</TableHead>
                    <TableHead className="w-32">Valid Until</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permits.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">No permits added</TableCell></TableRow>
                  )}
                  {permits.map((p, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell><Input value={p.permit_number} onChange={e => updatePermit(i, { permit_number: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell>
                        <Select value={p.permit_type} onValueChange={v => updatePermit(i, { permit_type: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="hot_work">Hot Work</SelectItem>
                            <SelectItem value="confined_space">Confined Space</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                            <SelectItem value="height">Working at Height</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input value={p.issued_by} onChange={e => updatePermit(i, { issued_by: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input type="date" value={p.valid_from || ""} onChange={e => updatePermit(i, { valid_from: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input type="date" value={p.valid_until || ""} onChange={e => updatePermit(i, { valid_until: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell>
                        <Select value={p.status} onValueChange={v => updatePermit(i, { status: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removePermit(i)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="quality" className="border rounded-md">
          <AccordionTrigger className="px-4">Quality Collection Plans ({qualityPlans.length})</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex justify-between mb-2">
              <Badge variant="outline">Quality Inspections</Badge>
              <Button size="sm" variant="outline" onClick={addQuality}><Plus className="w-3 h-3 mr-1" />Add Plan</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Characteristic</TableHead>
                    <TableHead>Specification</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="w-24">Pass/Fail</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualityPlans.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">No quality plans added</TableCell></TableRow>
                  )}
                  {qualityPlans.map((q, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell><Input value={q.plan_name} onChange={e => updateQuality(i, { plan_name: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input value={q.characteristic} onChange={e => updateQuality(i, { characteristic: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input value={q.specification} onChange={e => updateQuality(i, { specification: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input value={q.result} onChange={e => updateQuality(i, { result: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell>
                        <Select value={q.pass === null ? "" : q.pass ? "pass" : "fail"} onValueChange={v => updateQuality(i, { pass: v === "pass" })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeQuality(i)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="meters" className="border rounded-md">
          <AccordionTrigger className="px-4">Meter Readings ({meterReadings.length})</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex justify-between mb-2">
              <Badge variant="outline">Asset Meters</Badge>
              <Button size="sm" variant="outline" onClick={addMeter}><Plus className="w-3 h-3 mr-1" />Add Reading</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Meter Name</TableHead>
                    <TableHead className="w-32">Reading</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meterReadings.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No meter readings captured</TableCell></TableRow>
                  )}
                  {meterReadings.map((m, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell>
                        <Select value={m.meter_name} onValueChange={v => updateMeter(i, { meter_name: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Odometer">Odometer</SelectItem>
                            <SelectItem value="Engine Hours">Engine Hours</SelectItem>
                            <SelectItem value="Fuel Level">Fuel Level</SelectItem>
                            <SelectItem value="Battery Voltage">Battery Voltage</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" value={m.reading_value} onChange={e => updateMeter(i, { reading_value: Number(e.target.value) })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Input value={m.unit} onChange={e => updateMeter(i, { unit: e.target.value })} className="h-7 text-xs" /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeMeter(i)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="attachments" className="border rounded-md">
          <AccordionTrigger className="px-4">Linked Documents ({attachments.length})</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex justify-between mb-2">
              <Badge variant="outline">Attachments</Badge>
              <Button size="sm" variant="outline" onClick={addAttachment}><Plus className="w-3 h-3 mr-1" />Add Document</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>File Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attachments.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No documents linked</TableCell></TableRow>
                  )}
                  {attachments.map((a, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell><Input value={a.file_name} onChange={e => updateAttachment(i, { file_name: e.target.value })} className="h-7 text-xs" placeholder="invoice.pdf" /></TableCell>
                      <TableCell><Input value={a.file_url} onChange={e => updateAttachment(i, { file_url: e.target.value })} className="h-7 text-xs" placeholder="https://..." /></TableCell>
                      <TableCell>
                        <Select value={a.category} onValueChange={v => updateAttachment(i, { category: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="invoice">Invoice</SelectItem>
                            <SelectItem value="quotation">Quotation</SelectItem>
                            <SelectItem value="photo">Photo</SelectItem>
                            <SelectItem value="report">Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAttachment(i)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
