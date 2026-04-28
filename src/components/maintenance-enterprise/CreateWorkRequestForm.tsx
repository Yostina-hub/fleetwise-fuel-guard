import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, CalendarIcon, CheckCircle2, Upload, X, Paperclip, Star, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMaintenanceRequestValidation } from "./useMaintenanceRequestValidation";
import {
  sanitizeNumeric,
  sanitizePhone,
  sanitizeShortText,
  type MRFormValues,
} from "./maintenanceRequestValidation";

interface Props {
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  scheduleId?: string;
  defaultRequestType?: string;
  /** When 'trip_inspection' the form renders the Oracle EBS Veh. Trip Inspection layout with Pre/Post-trip subtype. */
  defaultContext?: "vehicle_maintenance" | "trip_inspection" | "generator_maintenance" | "equipment_maintenance";
  defaultInspectionSubType?: "pre_trip" | "post_trip" | "annual" | "";
  onSubmitted?: (result?: Record<string, any>) => void;
  onCancel?: () => void;
}

interface Attachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

const REQUIRED_MARK = <span className="text-destructive">*</span>;

export default function CreateWorkRequestForm({
  vehicleId,
  vehiclePlate,
  driverId,
  driverName,
  scheduleId,
  defaultRequestType = "corrective",
  defaultContext = "vehicle_maintenance",
  defaultInspectionSubType = "",
  onSubmitted,
  onCancel,
}: Props) {
  const { organizationId } = useOrganization();
  const { createRequest } = useMaintenanceRequests();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTripInspection = defaultContext === "trip_inspection";

  // Header
  const [assetNumber, setAssetNumber] = useState(vehiclePlate || "");
  const [assignedDept, setAssignedDept] = useState("");
  const [requestStartDate, setRequestStartDate] = useState<Date>(new Date());
  const [requestedFor, setRequestedFor] = useState("");
  const [workRequestType, setWorkRequestType] = useState(
    isTripInspection ? "inspection" : defaultRequestType
  );
  const [priority, setPriority] = useState("medium");
  const [completionDate, setCompletionDate] = useState<Date | undefined>(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [assetCriticality, setAssetCriticality] = useState("");

  // Description
  const [additionalDescription, setAdditionalDescription] = useState("");

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Creation Info
  const [createdBy, setCreatedBy] = useState("");
  const [notifyUser, setNotifyUser] = useState("No");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [contactPreference, setContactPreference] = useState("");

  // Descriptive Info
  const [contextValue, setContextValue] = useState(
    isTripInspection ? "Veh. Trip Inspection request" : "Vehicle Maintenance request"
  );
  const [requestorDepartment, setRequestorDepartment] = useState("");
  const [requestorPool, setRequestorPool] = useState("");
  const [requestorEmployeeId, setRequestorEmployeeId] = useState("");
  const [maintenanceTypeReq, setMaintenanceTypeReq] = useState("");
  const [kmReading, setKmReading] = useState("");
  const [driverType, setDriverType] = useState("");
  const [selectedDriverName, setSelectedDriverName] = useState(driverName || "");
  const [driverPhone, setDriverPhone] = useState("");
  const [fuelLevel, setFuelLevel] = useState("");
  const [inspectionSubType, setInspectionSubType] = useState<string>(defaultInspectionSubType);
  const [requestedQuantity, setRequestedQuantity] = useState<string>("");
  const [remark, setRemark] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Per-field validation (mirrors fuel/vehicle request standard)
  const validation = useMaintenanceRequestValidation();
  const buildValues = (): MRFormValues => ({
    asset_number: assetNumber,
    assigned_dept: assignedDept,
    request_start_date: requestStartDate ? requestStartDate.toISOString() : "",
    completion_date: completionDate ? completionDate.toISOString() : "",
    work_request_type: workRequestType,
    priority,
    context_value: contextValue,
    additional_description: additionalDescription,
    phone_number: phoneNumber,
    email: emailAddr,
    requestor_department: requestorDepartment,
    requestor_pool: requestorPool,
    requestor_employee_id: requestorEmployeeId,
    driver_type: driverType,
    driver_name: selectedDriverName,
    driver_phone: driverPhone,
    maintenance_type_req: maintenanceTypeReq,
    inspection_sub_type: inspectionSubType,
    km_reading: kmReading,
    fuel_level: fuelLevel,
    requested_quantity: requestedQuantity,
    remark,
  });

  // Auto-fill creator info
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, employee_code, department")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (profile) {
        const code = profile.employee_code || "";
        const name = profile.full_name || "";
        setCreatedBy(code ? `${code} (${name})` : name || userData.user.email || "");
        setEmailAddr(profile.email || userData.user.email || "");
        if (profile.phone) setPhoneNumber(profile.phone);
        if (profile.department) {
          setAssignedDept(profile.department);
          setRequestorDepartment(profile.department);
        }
        if (code) {
          setRequestedFor(code);
          setRequestorEmployeeId(code);
        }
      } else {
        setCreatedBy(userData.user.email || "");
        setEmailAddr(userData.user.email || "");
      }
    })();
  }, []);

  // Fleet pools for Requestor Pool dropdown
  const { data: pools = [] } = useQuery({
    queryKey: ["fleet-pools-lookup", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("fleet_pools")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Auto-fill driver phone
  useEffect(() => {
    if (!driverId) return;
    (async () => {
      const { data } = await supabase
        .from("drivers")
        .select("first_name, last_name, phone")
        .eq("id", driverId)
        .maybeSingle();
      if (data) {
        if (!selectedDriverName) {
          setSelectedDriverName(`${data.first_name} ${data.last_name}`);
        }
        if (data.phone) setDriverPhone(data.phone);
      }
    })();
  }, [driverId]);

  // Vehicle search (asset number lookup)
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-lookup", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId)
        .order("plate_number")
        .limit(100);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !organizationId) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB`);
          continue;
        }
        const path = `${organizationId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("maintenance-attachments")
          .upload(path, file);
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
          continue;
        }
        uploaded.push({ name: file.name, path, size: file.size, type: file.type });
      }
      setAttachments(prev => [...prev, ...uploaded]);
      if (uploaded.length) toast.success(`${uploaded.length} file(s) uploaded`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = async (att: Attachment) => {
    await supabase.storage.from("maintenance-attachments").remove([att.path]);
    setAttachments(prev => prev.filter(a => a.path !== att.path));
  };

  const isSafetyComfortCtx = contextValue === "V Safety & Comfort Request";

  const validate = (): string | null => {
    if (!assetNumber.trim()) return "Asset Number is required";
    if (!assignedDept.trim()) return "Assigned Department is required";
    if (!requestStartDate) return "Request By Start Date is required";
    if (!additionalDescription.trim()) return "Additional Description is required";
    if (!isTripInspection && !isSafetyComfortCtx && !requestorDepartment.trim()) return "Requestor Department is required";
    if ((isTripInspection || isSafetyComfortCtx) && !requestorPool.trim()) return "Requestor Pool is required";
    if ((isTripInspection || isSafetyComfortCtx) && !driverType.trim()) return "Driver type is required";
    if (!isTripInspection && !isSafetyComfortCtx && !maintenanceTypeReq.trim()) return "Type of maintenance request is required";
    if (isSafetyComfortCtx && !maintenanceTypeReq.trim()) return "Type of Request is required";
    if ((workRequestType === "inspection" || isTripInspection) && !inspectionSubType) return "Type of Request is required";
    if (!kmReading.trim()) return "KM reading is required";
    if (!driverPhone.trim()) return "Driver Phone No. is required";
    if (!isTripInspection && !isSafetyComfortCtx && !fuelLevel.trim()) return "Fuel level in the tank is required";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    // Resolve vehicle id from asset number if needed
    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId) {
      const v = vehicles.find(x => x.plate_number === assetNumber);
      if (!v) { toast.error("Asset Number not found in fleet"); return; }
      resolvedVehicleId = v.id;
    }

    setSubmitting(true);
    try {
      const prefix = isTripInspection ? "TI-" : "MR-";
      const reqNumber = prefix + Date.now().toString().slice(-8);
      const { data: userData } = await supabase.auth.getUser();
      const { data: insertedReq, error } = await (supabase as any)
        .from("maintenance_requests")
        .insert({
          organization_id: organizationId,
          request_number: reqNumber,
          vehicle_id: resolvedVehicleId,
          driver_id: driverId || null,
          requested_by: userData.user?.id,
          request_type: isTripInspection ? "inspection" : workRequestType,
          request_subtype: isTripInspection ? inspectionSubType : (workRequestType === "inspection" ? inspectionSubType : null),
          trigger_source: scheduleId ? "preventive_schedule" : "manual",
          priority,
          status: "submitted",
          workflow_stage: "submitted",
          requestor_department: requestorDepartment || null,
          requestor_pool: requestorPool || null,
          requestor_employee_id: requestorEmployeeId || null,
          driver_type: driverType || null,
          driver_phone: driverPhone || null,
          km_reading: kmReading ? Number(kmReading) : null,
          fuel_level: fuelLevel ? Number(fuelLevel) : null,
          description: maintenanceTypeReq || (isTripInspection ? `Vehicle ${inspectionSubType?.replace("_", "-")} Inspection Request` : null),
          additional_description: additionalDescription,
          notes: [
            requestedQuantity ? `Requested Quantity: ${requestedQuantity}` : null,
            remark || null,
          ].filter(Boolean).join("\n") || null,
          remark: remark || null,
          request_start_date: requestStartDate.toISOString(),
          request_by_completion_date: completionDate?.toISOString() || null,
          requested_completion_date: completionDate ? format(completionDate, "yyyy-MM-dd") : null,
          notify_user: notifyUser === "Yes",
          contact_phone: phoneNumber || null,
          contact_email: emailAddr || null,
          contact_preference: contactPreference || null,
          context_value: contextValue,
          asset_criticality: assetCriticality || null,
          attachments: attachments as any,
          schedule_id: scheduleId || null,
        })
        .select("id, approver_role")
        .maybeSingle();
      if (error) throw error;

      // If this is an inspection request, also seed a vehicle_inspections row and bidirectionally link.
      let createdInspectionId: string | null = null;
      if ((workRequestType === "inspection" || isTripInspection) && resolvedVehicleId && inspectionSubType) {
        const { data: insp } = await (supabase as any)
          .from("vehicle_inspections")
          .insert({
            organization_id: organizationId,
            vehicle_id: resolvedVehicleId,
            driver_id: driverId || null,
            inspection_type: inspectionSubType, // 'annual' | 'pre_trip' | 'post_trip'
            status: "pending",
            odometer_km: kmReading ? Number(kmReading) : null,
            inspection_date: new Date().toISOString(),
            mechanic_notes: `Linked to work request ${reqNumber}. ${additionalDescription}`,
            outsource_stage: inspectionSubType === "annual" ? "awaiting_approval" : null,
            maintenance_request_id: insertedReq?.id || null,
          })
          .select("id")
          .maybeSingle();

        createdInspectionId = insp?.id ?? null;

        if (insp?.id && insertedReq?.id) {
          await (supabase as any)
            .from("maintenance_requests")
            .update({ inspection_id: insp.id })
            .eq("id", insertedReq.id);
        }
      }

      const approverInfo = insertedReq?.approver_role
        ? ` — routed to ${insertedReq.approver_role.replace(/_/g, " ")}`
        : "";
      toast.success(`Work Request ${reqNumber} created${approverInfo}`);
      onSubmitted?.({
        maintenance_request_id: insertedReq?.id ?? null,
        inspection_id: createdInspectionId,
        vehicle_id: resolvedVehicleId,
        driver_id: driverId || null,
        request_type: isTripInspection ? "inspection" : workRequestType,
        inspection_type: inspectionSubType || null,
        title: isTripInspection
          ? `${inspectionSubType?.replace(/_/g, " ") || "Trip"} inspection — ${assetNumber}`
          : `${workRequestType} work request — ${assetNumber}`,
        description: additionalDescription || remark || null,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-base font-semibold border-b pb-2 mb-4 text-foreground">{children}</h3>
  );

  const FieldRow = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="grid grid-cols-12 items-center gap-2 mb-3">
      <Label className="col-span-4 text-right text-sm">
        {required && REQUIRED_MARK} {label}
      </Label>
      <div className="col-span-8">{children}</div>
    </div>
  );

  const DatePickerInline = ({ value, onChange }: { value?: Date; onChange: (d?: Date) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !value && "text-muted-foreground")}>
          {value ? format(value, "dd-MMM-yyyy HH:mm:ss") : "Pick date"}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <p className="text-xs text-muted-foreground">Maintenance Home &gt;</p>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Create Work Request
            <Star className="w-5 h-5 text-muted-foreground hover:text-warning cursor-pointer" />
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{REQUIRED_MARK} indicates required field</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="outline" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Save
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Apply
          </Button>
        </div>
      </div>

      {/* Header grid: 2 columns */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <FieldRow label="Asset Number" required>
              <div className="relative">
                <Input value={assetNumber} onChange={e => setAssetNumber(e.target.value)} list="asset-list" className="pr-8" />
                <datalist id="asset-list">
                  {vehicles.map(v => <option key={v.id} value={v.plate_number}>{v.make} {v.model}</option>)}
                </datalist>
                <Search className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </FieldRow>
            <FieldRow label="Assigned Department" required>
              <Input value={assignedDept} onChange={e => setAssignedDept(e.target.value)} placeholder="Department" />
            </FieldRow>
            <FieldRow label="Request By Start Date" required>
              <DatePickerInline value={requestStartDate} onChange={d => d && setRequestStartDate(d)} />
            </FieldRow>
            <FieldRow label="Requested For">
              <Input value={requestedFor} onChange={e => setRequestedFor(e.target.value)} placeholder="Employee code" />
            </FieldRow>
          </div>
          <div>
            <FieldRow label="Work Request Type">
              <Select value={workRequestType} onValueChange={setWorkRequestType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Priority" required>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Request By Completion Date">
              <div>
                <DatePickerInline value={completionDate} onChange={setCompletionDate} />
                <p className="text-xs text-muted-foreground mt-1">(example {format(new Date(Date.now() + 86400000), "dd-MMM-yyyy HH:mm:ss")})</p>
              </div>
            </FieldRow>
            <FieldRow label="Asset Criticality">
              <Select value={assetCriticality} onValueChange={setAssetCriticality}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </div>
      </Card>

      {/* Request Description */}
      <Card className="p-6">
        <SectionTitle>Request Description</SectionTitle>
        <FieldRow label="Additional Description" required>
          <Textarea value={additionalDescription} onChange={e => setAdditionalDescription(e.target.value)} rows={3} />
        </FieldRow>
      </Card>

      {/* Request Attachments */}
      <Card className="p-6">
        <SectionTitle>Request Attachments</SectionTitle>
        <FieldRow label="Attachments">
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Add Attachment
            </Button>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <div className="space-y-1">
                {attachments.map(att => (
                  <div key={att.path} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-sm">
                    <Paperclip className="w-3 h-3" />
                    <span className="flex-1 truncate">{att.name}</span>
                    <Badge variant="outline" className="text-xs">{(att.size / 1024).toFixed(1)} KB</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAttachment(att)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FieldRow>
      </Card>

      {/* Creation Information */}
      <Card className="p-6">
        <SectionTitle>Creation Information</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <FieldRow label="Created By">
              <Input value={createdBy} disabled className="bg-muted/30" />
            </FieldRow>
            <FieldRow label="Phone Number">
              <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
            </FieldRow>
            <FieldRow label="Contact Preference">
              <Select value={contactPreference} onValueChange={setContactPreference}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
          <div>
            <FieldRow label="Notify User">
              <Select value={notifyUser} onValueChange={setNotifyUser}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="E-mail">
              <Input value={emailAddr} onChange={e => setEmailAddr(e.target.value)} type="email" />
            </FieldRow>
          </div>
        </div>
      </Card>

      {/* Descriptive Information */}
      <Card className="p-6">
        <SectionTitle>Descriptive Information</SectionTitle>
        <div className="max-w-3xl">
          <FieldRow label="Context Value" required>
            <div>
              <Select value={contextValue} onValueChange={setContextValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Veh. Trip Inspection request">Veh. Trip Inspection request</SelectItem>
                  <SelectItem value="Vehicle Maintenance request">Vehicle Maintenance request</SelectItem>
                  <SelectItem value="V Safety & Comfort Request">V Safety & Comfort Request</SelectItem>
                  <SelectItem value="Generator Maintenance request">Generator Maintenance request</SelectItem>
                  <SelectItem value="Equipment Maintenance request">Equipment Maintenance request</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {contextValue === "Veh. Trip Inspection request"
                  ? "Vehicle pre and post trip inspection request"
                  : contextValue === "V Safety & Comfort Request"
                  ? "Vehicle safety & comfort request (broken AC, seatbelt, accessories, etc.)"
                  : contextValue}
              </p>
            </div>
          </FieldRow>

          <FieldRow label="Driver type" required={isTripInspection || isSafetyComfortCtx}>
            <Select value={driverType} onValueChange={setDriverType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff Driver</SelectItem>
                <SelectItem value="outsourced">Outsourced Driver</SelectItem>
                <SelectItem value="contract">Contract Driver</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Driver Name">
            <Input value={selectedDriverName} onChange={e => setSelectedDriverName(e.target.value)} />
          </FieldRow>

          <FieldRow label="Employee ID">
            <Input value={requestorEmployeeId} onChange={e => setRequestorEmployeeId(e.target.value)} placeholder="Employee number" />
          </FieldRow>

          <FieldRow label="Requestor Pool" required={isTripInspection || isSafetyComfortCtx}>
            <Select value={requestorPool} onValueChange={setRequestorPool}>
              <SelectTrigger><SelectValue placeholder="Select pool" /></SelectTrigger>
              <SelectContent>
                {pools.length === 0 && <SelectItem value="__none__" disabled>No pools configured</SelectItem>}
                {pools.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Type of Request" required={isTripInspection || isSafetyComfortCtx || workRequestType === "inspection"}>
            {isTripInspection ? (
              <div className="space-y-2 rounded-md border p-3">
                {[
                  { value: "post_trip", label: "Vehicle Post-Trip Inspection Request", hint: "Filed after a trip; closed by initiator." },
                  { value: "pre_trip",  label: "Vehicle Pre-Trip Inspection Request",  hint: "Filed before a trip; closed by initiator." },
                  { value: "annual",    label: "Vehicle Annual Inspection Request (Bolo)", hint: "Routes to outsourcing pipeline (RFQ → PO → payment)." },
                ].map(opt => (
                  <label key={opt.value} className="flex items-start gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="trip-inspection-subtype"
                      value={opt.value}
                      checked={inspectionSubType === opt.value}
                      onChange={() => setInspectionSubType(opt.value)}
                      className="mt-1 accent-primary"
                    />
                    <span>
                      <span className="font-medium">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <Select value={maintenanceTypeReq} onValueChange={setMaintenanceTypeReq}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Oil Change">Oil Change</SelectItem>
                  <SelectItem value="Brake Service">Brake Service</SelectItem>
                  <SelectItem value="Tire Service">Tire Service</SelectItem>
                  <SelectItem value="Engine Repair">Engine Repair</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Body / Paint">Body / Paint</SelectItem>
                  <SelectItem value="Air Conditioning">Air Conditioning</SelectItem>
                  <SelectItem value="Transmission">Transmission</SelectItem>
                  <SelectItem value="Suspension">Suspension</SelectItem>
                  <SelectItem value="General Inspection">General Inspection</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FieldRow>

          {isTripInspection && inspectionSubType === "annual" && (
            <div className="rounded-md border-l-4 border-primary bg-primary/5 p-3 mb-3 text-xs">
              <p className="font-medium text-foreground mb-1">Annual Inspection — Outsourcing pipeline</p>
              <p className="text-muted-foreground">
                After approval (delegation matrix), a work order is created and routed to the
                Outsourcing pipeline: <strong>RFQ → quotes → supplier select → PO → invoice → payment</strong>.
                Annual registration cost, date and Bolo certificate are captured at the closing step on the
                inspection record.
              </p>
            </div>
          )}

          {!isTripInspection && workRequestType === "inspection" && (
            <FieldRow label="Inspection sub-type" required>
              <Select value={inspectionSubType} onValueChange={setInspectionSubType}>
                <SelectTrigger><SelectValue placeholder="Select sub-type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="pre_trip">Pre-trip</SelectItem>
                  <SelectItem value="post_trip">Post-trip</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          )}

          {!isTripInspection && !isSafetyComfortCtx && (
            <FieldRow label="Requestor Department" required>
              <Input value={requestorDepartment} onChange={e => setRequestorDepartment(e.target.value)} />
            </FieldRow>
          )}

          <FieldRow label="KM reading" required>
            <Input type="number" value={kmReading} onChange={e => setKmReading(e.target.value)} />
          </FieldRow>

          <FieldRow label="Driver Phone No." required>
            <Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} />
          </FieldRow>

          {!isTripInspection && !isSafetyComfortCtx && (
            <FieldRow label="Fuel level in the tank" required>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={100} value={fuelLevel} onChange={e => setFuelLevel(e.target.value)} className="max-w-[160px]" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </FieldRow>
          )}

          <FieldRow label="Requested Quantity">
            <Input
              type="number"
              min={0}
              value={requestedQuantity}
              onChange={e => setRequestedQuantity(e.target.value)}
              className="max-w-[200px]"
              placeholder="e.g. 1"
            />
          </FieldRow>

          <FieldRow label="Remark">
            <Textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} />
          </FieldRow>
        </div>
      </Card>

      {/* Bottom toolbar */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Save
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Apply
        </Button>
      </div>
    </div>
  );
}
