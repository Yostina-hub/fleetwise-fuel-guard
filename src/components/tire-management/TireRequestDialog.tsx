import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDepartments } from "@/hooks/useDepartments";
import { toast } from "sonner";
import { Plus, Trash2, Upload, FileText, X, Paperclip, CircleDot, CheckCircle2, Layers, User, Info, Wrench, AlertCircle, Truck, Calendar, Gauge, Phone, Mail, Building2, Fuel, Hash, ClipboardList, Coins, MessageSquare } from "lucide-react";
import { ValidatedField } from "@/components/forms/ValidatedField";
import { useTireRequestValidation } from "./useTireRequestValidation";
import { sanitizeNumeric, sanitizeDecimal, sanitizePhone } from "./tireRequestValidation";

const POSITIONS = ["Front Left", "Front Right", "Rear Left Outer", "Rear Left Inner", "Rear Right Outer", "Rear Right Inner", "Spare"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When true, render inline without the outer Dialog (used by Forms module). */
  embedded?: boolean;
  /** Optional context prefilled by the caller. */
  prefill?: { vehicle_id?: string; driver_id?: string };
  /** Called after a successful submission with the new tire_request id. */
  onSubmitted?: (payload: { id: string }) => void;
}

interface LineItem {
  position: string;
  tire_size: string;
  preferred_brand: string;
  preferred_model: string;
  notes: string;
}

interface AttachmentFile {
  file: File;
  id: string;
}

const emptyItem = (): LineItem => ({ position: "", tire_size: "", preferred_brand: "", preferred_model: "", notes: "" });

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const TireRequestDialog = ({ open, onOpenChange, embedded = false, prefill, onSubmitted }: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { user, profile } = useAuthContext() as any;
  const { departments, create: createDept } = useDepartments();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [showNewDept, setShowNewDept] = useState<"assigned" | "requestor" | null>(null);
  const [newDeptName, setNewDeptName] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [header, setHeader] = useState({
    vehicle_id: "",
    assigned_department_id: "",
    requestor_department_id: "",
    request_type: "replacement",
    priority: "normal",
    request_by_start_date: toLocalInput(now),
    request_by_completion_date: toLocalInput(tomorrow),
    additional_description: "",
    notes: "",
    estimated_cost: "",
    km_reading: "",
    driver_type: "",
    driver_name: "",
    driver_phone: "",
    fuel_level_in_tank: "",
    contact_phone: "",
    contact_email: profile?.email || user?.email || "",
    contact_preference: "",
    notify_user: false,
    reason: "",
  });

  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  useEffect(() => {
    if (open && (profile?.email || user?.email)) {
      setHeader(h => ({ ...h, contact_email: h.contact_email || profile?.email || user?.email || "" }));
    }
  }, [open, profile?.email, user?.email]);

  const reset = () => {
    setMode("single");
    setHeader({
      vehicle_id: "", assigned_department_id: "", requestor_department_id: "",
      request_type: "replacement", priority: "normal",
      request_by_start_date: toLocalInput(new Date()),
      request_by_completion_date: toLocalInput(new Date(Date.now() + 86400000)),
      additional_description: "", notes: "", estimated_cost: "",
      km_reading: "", driver_type: "", driver_name: "", driver_phone: "",
      fuel_level_in_tank: "", contact_phone: "",
      contact_email: profile?.email || user?.email || "",
      contact_preference: "", notify_user: false, reason: "",
    });
    setItems([emptyItem()]);
    setAttachments([]);
    setShowNewDept(null);
    setNewDeptName("");
  };

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const tooLarge = files.find(f => f.size > 10 * 1024 * 1024);
    if (tooLarge) {
      toast.error(`${tooLarge.name} exceeds 10MB limit`);
      return;
    }
    setAttachments(prev => [
      ...prev,
      ...files.map(file => ({ file, id: crypto.randomUUID() })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const handleQuickAddDept = async () => {
    if (!newDeptName.trim() || !showNewDept) return;
    try {
      const dept = await createDept.mutateAsync({ name: newDeptName.trim() });
      if (showNewDept === "assigned") {
        setHeader(h => ({ ...h, assigned_department_id: dept.id }));
      } else {
        setHeader(h => ({ ...h, requestor_department_id: dept.id }));
      }
      setNewDeptName("");
      setShowNewDept(null);
    } catch {/* toast handled in hook */}
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const activeItems = (mode === "single" ? items.slice(0, 1) : items).filter(it => it.position);
      if (activeItems.length === 0) throw new Error("At least one position is required");
      if (!header.vehicle_id) throw new Error("Asset (vehicle) is required");
      if (!header.assigned_department_id) throw new Error("Assigned Department is required");
      if (!header.requestor_department_id) throw new Error("Requestor Department is required");
      if (!header.additional_description.trim()) throw new Error("Additional Description is required");
      if (!header.driver_type) throw new Error("Driver type is required");
      if (!header.driver_phone.trim()) throw new Error("Driver Phone No. is required");
      if (!header.fuel_level_in_tank.trim()) throw new Error("Fuel level in the tank is required");
      if (!header.km_reading) throw new Error("KM reading is required");

      const { data: req, error: reqErr } = await supabase
        .from("tire_requests")
        .insert({
          organization_id: organizationId!,
          vehicle_id: header.vehicle_id,
          assigned_department_id: header.assigned_department_id,
          requestor_department_id: header.requestor_department_id,
          requested_by: user?.id || null,
          requested_by_name: profile?.full_name || user?.email || null,
          requested_by_role: profile?.role || null,
          request_type: header.request_type,
          priority: header.priority,
          request_by_start_date: header.request_by_start_date ? new Date(header.request_by_start_date).toISOString() : null,
          request_by_completion_date: header.request_by_completion_date ? new Date(header.request_by_completion_date).toISOString() : null,
          additional_description: header.additional_description,
          notes: header.notes || null,
          reason: header.reason || null,
          estimated_cost: header.estimated_cost ? parseFloat(header.estimated_cost) : null,
          km_reading: header.km_reading ? parseFloat(header.km_reading) : null,
          driver_type: header.driver_type,
          driver_name: header.driver_name || null,
          driver_phone: header.driver_phone,
          fuel_level_in_tank: header.fuel_level_in_tank,
          contact_phone: header.contact_phone || null,
          contact_email: header.contact_email || null,
          contact_preference: header.contact_preference || null,
          notify_user: header.notify_user,
          status: "pending",
        } as any)
        .select()
        .single();
      if (reqErr) throw reqErr;

      // Upload attachments to org-scoped folder
      const uploaded: { name: string; path: string; size: number; type: string }[] = [];
      for (const att of attachments) {
        const path = `${organizationId}/${req.id}/${Date.now()}-${att.file.name}`;
        const { error: upErr } = await supabase.storage
          .from("tire-request-attachments")
          .upload(path, att.file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        uploaded.push({ name: att.file.name, path, size: att.file.size, type: att.file.type });
      }
      if (uploaded.length > 0) {
        await supabase.from("tire_requests").update({ attachments: uploaded as any }).eq("id", req.id);
      }

      const itemsPayload = activeItems.map(it => ({
        organization_id: organizationId!,
        request_id: req.id,
        position: it.position,
        tire_size: it.tire_size || null,
        preferred_brand: it.preferred_brand || null,
        preferred_model: it.preferred_model || null,
        notes: it.notes || null,
      }));
      const { error: itemsErr } = await supabase.from("tire_request_items").insert(itemsPayload as any);
      if (itemsErr) throw itemsErr;

      const { data: createdItems } = await supabase
        .from("tire_request_items")
        .select("iproc_return_status")
        .eq("request_id", req.id);
      const needsReturn = (createdItems || []).some((i: any) => i.iproc_return_status === "pending");

      // Create the FMG-TIR 01 workflow instance and link it to the request.
      // The workflow drives the rest of the flow (Fleet Ops review → iPROC return → WO prep → approval → MR → fulfillment).
      const initialStage = needsReturn ? "iproc_return_check" : "fleet_ops_review";
      const initialLane = needsReturn ? "maintenance" : "fleet_ops";
      const { data: wfInstance, error: wfErr } = await supabase
        .from("workflow_instances")
        .insert({
          organization_id: organizationId!,
          workflow_type: "tire_request",
          reference_number: (req as any).request_number || `TIR-${Date.now()}`,
          title: `Tire request — ${header.request_type}`,
          description: header.additional_description || null,
          current_stage: initialStage,
          current_lane: initialLane,
          status: "active",
          priority: header.priority,
          vehicle_id: header.vehicle_id,
          created_by: user?.id || null,
          data: {
            tire_request_id: req.id,
            estimated_cost: header.estimated_cost ? parseFloat(header.estimated_cost) : null,
            request_type: header.request_type,
            assigned_department_id: header.assigned_department_id,
          },
        } as any)
        .select()
        .single();

      if (!wfErr && wfInstance) {
        await supabase
          .from("tire_requests")
          .update({
            workflow_instance_id: wfInstance.id,
            status: needsReturn ? "awaiting_return" : "pending",
          } as any)
          .eq("id", req.id);
      } else if (needsReturn) {
        await supabase.from("tire_requests").update({ status: "awaiting_return" }).eq("id", req.id);
      }
      return req;
    },
    onSuccess: (req: any) => {
      toast.success("Tire request submitted");
      queryClient.invalidateQueries({ queryKey: ["tire-requests"] });
      onSubmitted?.({ id: req.id });
      onOpenChange(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Apply caller-provided prefill once on mount.
  useEffect(() => {
    if (prefill?.vehicle_id) setHeader(h => ({ ...h, vehicle_id: prefill.vehicle_id! }));
  }, [prefill?.vehicle_id]);

  const HeaderInner = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
          <CircleDot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="text-[11px] text-muted-foreground truncate">Maintenance Home ›</span>
          <h3 className="text-sm font-semibold tracking-tight truncate">Create Tire Request</h3>
        </div>
      </div>
      <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="text-destructive">*</span> Required field · Approval requires previous tire returned (iPROC)
      </span>
    </div>
  );

  const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 pb-1">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
    </div>
  );

  const body = (
    <>
      {embedded ? (
        <div className="px-5 sm:px-6 py-3 border-b border-border bg-card">
          {HeaderInner}
        </div>
      ) : (
        <div className="px-3 sm:px-5 md:px-6 py-3 border-b border-border bg-card sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="sr-only">Create Tire Request</DialogTitle>
            <DialogDescription className="sr-only">
              Tire request form — fill in the sections and submit.
            </DialogDescription>
            {HeaderInner}
          </DialogHeader>
        </div>
      )}

      <div className={`${embedded ? "px-1" : "px-3 sm:px-5 md:px-6"} pt-2 pb-1 space-y-3`}>
        <div className="space-y-5">
          {/* ===== Header / Request meta ===== */}
          <section className="space-y-3">
            <SectionTitle icon={Layers} title="Request Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label><span className="text-destructive">*</span> Asset Number (Vehicle)</Label>
              <Select value={header.vehicle_id} onValueChange={v => setHeader(h => ({ ...h, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-primary font-medium text-sm">Work Request Type</Label>
              <Select value={header.request_type} onValueChange={v => setHeader(h => ({ ...h, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="replacement">Tire Replacement</SelectItem>
                  <SelectItem value="rotation">Rotation</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="new_install">New Install</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label><span className="text-destructive">*</span> Assigned Department</Label>
              <div className="flex gap-2">
                <Select value={header.assigned_department_id} onValueChange={v => setHeader(h => ({ ...h, assigned_department_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowNewDept("assigned")}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label><span className="text-destructive">*</span> Priority</Label>
              <Select value={header.priority} onValueChange={v => setHeader(h => ({ ...h, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label><span className="text-destructive">*</span> Request By Start Date</Label>
              <Input type="datetime-local" value={header.request_by_start_date} onChange={e => setHeader(h => ({ ...h, request_by_start_date: e.target.value }))} />
            </div>

            <div>
              <Label><span className="text-destructive">*</span> Request By Completion Date</Label>
              <Input type="datetime-local" value={header.request_by_completion_date} onChange={e => setHeader(h => ({ ...h, request_by_completion_date: e.target.value }))} />
            </div>

            <div>
              <Label className="text-primary font-medium text-sm">Requested For</Label>
              <Input value={profile?.full_name || user?.email || ""} disabled />
            </div>

            <div>
              <Label className="text-primary font-medium text-sm">Estimated Cost (ETB)</Label>
              <Input type="number" value={header.estimated_cost} onChange={e => setHeader(h => ({ ...h, estimated_cost: e.target.value }))} />
            </div>
            </div>
          </section>

          {/* Quick-add department popover */}
          {showNewDept && (
            <div className="flex items-center gap-2 rounded-lg border bg-accent/30 p-3">
              <Input
                autoFocus
                placeholder="New department name"
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleQuickAddDept(); }}
              />
              <Button size="sm" onClick={handleQuickAddDept} disabled={!newDeptName.trim() || createDept.isPending}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewDept(null); setNewDeptName(""); }}>
                Cancel
              </Button>
            </div>
          )}

          {/* ===== Request Description ===== */}
          <section className="space-y-3">
            <SectionTitle icon={FileText} title="Request Description" />
            <div>
              <Label><span className="text-destructive">*</span> Additional Description</Label>
              <Textarea
                rows={3}
                value={header.additional_description}
                onChange={e => setHeader(h => ({ ...h, additional_description: e.target.value }))}
                placeholder="Describe the tire issue, observation, or context..."
              />
            </div>
          </section>

          {/* ===== Attachments ===== */}
          <section className="space-y-3">
            <SectionTitle icon={Paperclip} title="Request Attachments" />
            <div className="rounded-lg border border-dashed p-3 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.doc,.docx"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="w-3.5 h-3.5" /> Add Attachments
              </Button>
              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Attachments None — photos of worn tire, inspection report, etc.</p>
              ) : (
                <div className="space-y-1">
                  {attachments.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1">
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{a.file.name}</span>
                        <Badge variant="secondary" className="shrink-0">{(a.file.size / 1024).toFixed(0)} KB</Badge>
                      </span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAttachment(a.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ===== Creation Information ===== */}
          <section className="space-y-3">
            <SectionTitle icon={User} title="Creation Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-medium text-sm">Created By</Label>
                <Input value={profile?.full_name || user?.email || ""} disabled />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-primary font-medium text-sm">Notify User</Label>
                  <div className="h-10 flex items-center">
                    <Switch checked={header.notify_user} onCheckedChange={v => setHeader(h => ({ ...h, notify_user: v }))} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-primary font-medium text-sm">Phone Number</Label>
                <Input value={header.contact_phone} onChange={e => setHeader(h => ({ ...h, contact_phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-primary font-medium text-sm">E-mail</Label>
                <Input type="email" value={header.contact_email} onChange={e => setHeader(h => ({ ...h, contact_email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-primary font-medium text-sm">Contact Preference</Label>
                <Select value={header.contact_preference} onValueChange={v => setHeader(h => ({ ...h, contact_preference: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="any">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ===== Descriptive Information (vehicle/driver) ===== */}
          <section className="space-y-3">
            <SectionTitle icon={Info} title="Descriptive Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-medium text-sm">Context Value</Label>
                <Input value="Vehicle Maintenance request" disabled />
              </div>
              <div>
                <Label><span className="text-destructive">*</span> Requestor Department</Label>
                <div className="flex gap-2">
                  <Select value={header.requestor_department_id} onValueChange={v => setHeader(h => ({ ...h, requestor_department_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowNewDept("requestor")}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label><span className="text-destructive">*</span> Type of Maintenance Request</Label>
                <Input value="Tyre replacement" disabled />
              </div>
              <div>
                <Label><span className="text-destructive">*</span> KM Reading</Label>
                <Input type="number" value={header.km_reading} onChange={e => setHeader(h => ({ ...h, km_reading: e.target.value }))} />
              </div>
              <div>
                <Label><span className="text-destructive">*</span> Driver Type</Label>
                <Select value={header.driver_type} onValueChange={v => setHeader(h => ({ ...h, driver_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company Driver</SelectItem>
                    <SelectItem value="contract">Contract Driver</SelectItem>
                    <SelectItem value="outsourced">Outsourced</SelectItem>
                    <SelectItem value="self">Self</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-primary font-medium text-sm">Driver Name</Label>
                <Input value={header.driver_name} onChange={e => setHeader(h => ({ ...h, driver_name: e.target.value }))} />
              </div>
              <div>
                <Label><span className="text-destructive">*</span> Driver Phone No.</Label>
                <Input value={header.driver_phone} onChange={e => setHeader(h => ({ ...h, driver_phone: e.target.value }))} />
              </div>
              <div>
                <Label><span className="text-destructive">*</span> Fuel Level in the Tank</Label>
                <Select value={header.fuel_level_in_tank} onValueChange={v => setHeader(h => ({ ...h, fuel_level_in_tank: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empty">Empty</SelectItem>
                    <SelectItem value="quarter">1/4</SelectItem>
                    <SelectItem value="half">1/2</SelectItem>
                    <SelectItem value="three_quarter">3/4</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-primary font-medium text-sm">Remark</Label>
                <Input value={header.notes} onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* ===== Tire-specific items ===== */}
          <section className="space-y-3">
            <SectionTitle icon={Wrench} title="Tire Request Lines" />
            <Tabs value={mode} onValueChange={(v) => { setMode(v as any); if (v === "single") setItems(prev => prev.slice(0, 1)); }}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="single">Single Position</TabsTrigger>
                <TabsTrigger value="batch">Batch (multiple)</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="mt-3">
                <ItemFields item={items[0]} onChange={(p) => updateItem(0, p)} />
              </TabsContent>

              <TabsContent value="batch" className="mt-3 space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <ItemFields item={it} onChange={(p) => updateItem(idx, p)} />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-2" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5" /> Add another position
                </Button>
              </TabsContent>
            </Tabs>
          </section>

          <section className="space-y-3">
            <div>
              <Label className="text-primary font-medium text-sm">Reason</Label>
              <Input value={header.reason} onChange={e => setHeader(h => ({ ...h, reason: e.target.value }))} placeholder="Worn out, puncture, scheduled rotation, etc." />
            </div>
          </section>
        </div>
      </div>

      {(() => {
        const FooterInner = (
          <div className="flex w-full items-center justify-end gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        );
        return embedded ? (
          <div className="pt-4 border-t border-border/60 mt-4">{FooterInner}</div>
        ) : (
          <DialogFooter className="px-3 sm:px-5 md:px-6 py-3 mt-4 bg-muted/30 border-t border-border/60 sm:justify-between sticky bottom-0 z-10">
            {FooterInner}
          </DialogFooter>
        );
      })()}
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl max-h-[94vh] overflow-y-auto p-0 gap-0">
        {body}
      </DialogContent>
    </Dialog>
  );
};

function ItemFields({ item, onChange }: { item: LineItem; onChange: (p: Partial<LineItem>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-primary font-medium text-xs"><span className="text-destructive">*</span> Position</Label>
          <Select value={item.position} onValueChange={v => onChange({ position: v })}>
            <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
            <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-primary font-medium text-xs">Tire Size</Label>
          <Input value={item.tire_size} onChange={e => onChange({ tire_size: e.target.value })} placeholder="e.g. 315/80R22.5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-primary font-medium text-xs">Preferred Brand</Label>
          <Input value={item.preferred_brand} onChange={e => onChange({ preferred_brand: e.target.value })} />
        </div>
        <div>
          <Label className="text-primary font-medium text-xs">Preferred Model</Label>
          <Input value={item.preferred_model} onChange={e => onChange({ preferred_model: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-primary font-medium text-xs">Item Notes</Label>
        <Input value={item.notes} onChange={e => onChange({ notes: e.target.value })} />
      </div>
    </div>
  );
}
