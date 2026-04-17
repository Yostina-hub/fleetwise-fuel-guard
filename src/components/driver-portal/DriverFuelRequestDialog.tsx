import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Fuel, Loader2, Car, Wallet, Briefcase, AlertTriangle, FileText, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleFuelType?: string | null;
}

const initial = (driverName: string, vehicleFuelType?: string | null) => ({
  // Core
  fuel_type: vehicleFuelType || "diesel",
  liters_requested: "",
  estimated_cost: "",
  current_odometer: "",
  purpose: "",
  notes: "",
  priority: "medium",
  asset_criticality: "",
  fuel_request_type: "",
  // Driver / requestor
  driver_name: driverName || "",
  employee_id_no: "",
  driver_phone: "",
  requestor_department: "",
  assigned_department: "",
  requested_for: driverName || "",
  // Project / WO refs
  project_number: "",
  task_number: "",
  adjustment_wo_number: "",
  // Payment split
  fuel_in_telebirr: "",
  fuel_by_cash_coupon: "",
  // Schedule
  request_by_start_date: new Date().toISOString().slice(0, 16),
  request_by_completion_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
  // Contact
  phone_number: "",
  email: "",
  notify_user: true,
  contact_preference: "phone",
  // Extra
  remark: "",
  additional_description: "",
});

const DriverFuelRequestDialog = ({
  open, onOpenChange, driverId, driverName, vehicleId, vehiclePlate, vehicleFuelType
}: Props) => {
  const { organizationId } = useOrganization();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("essentials");
  const [form, setForm] = useState(initial(driverName || "", vehicleFuelType));

  useEffect(() => {
    if (open) setForm(initial(driverName || "", vehicleFuelType));
  }, [open, driverName, vehicleFuelType]);

  // Departments
  const { data: departments = [] } = useQuery({
    queryKey: ["business-units-driver", organizationId],
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

  // Driver phone/email auto-fill
  useEffect(() => {
    if (!driverId || !open) return;
    (async () => {
      const { data } = await supabase
        .from("drivers")
        .select("phone, employee_id, email")
        .eq("id", driverId)
        .maybeSingle();
      if (data) {
        setForm(f => ({
          ...f,
          driver_phone: f.driver_phone || data.phone || "",
          phone_number: f.phone_number || data.phone || "",
          email: f.email || (data as any).email || "",
          employee_id_no: f.employee_id_no || data.employee_id || "",
        }));
      }
    })();
  }, [driverId, open]);

  // Last odometer
  const { data: lastOdo } = useQuery({
    queryKey: ["last-odo", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data } = await supabase
        .from("fuel_requests")
        .select("current_odometer")
        .eq("vehicle_id", vehicleId)
        .not("current_odometer", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.current_odometer || null;
    },
    enabled: !!vehicleId && open,
  });

  const litersNum = parseFloat(form.liters_requested) || 0;
  const telebirr = parseFloat(form.fuel_in_telebirr) || 0;
  const cash = parseFloat(form.fuel_by_cash_coupon) || 0;
  const splitTotal = telebirr + cash;
  const estCost = parseFloat(form.estimated_cost) || 0;
  const splitMismatch = estCost > 0 && splitTotal > 0 && Math.abs(splitTotal - estCost) > 0.01;

  const handleSubmit = async () => {
    if (!organizationId || !vehicleId || !driverId) {
      toast.error("Missing driver or vehicle info");
      return;
    }
    if (!litersNum || litersNum <= 0) {
      toast.error("Enter a valid amount of fuel needed");
      setTab("essentials");
      return;
    }
    if (splitMismatch) {
      toast.error("Telebirr + Cash/Coupon must equal Estimated Cost");
      setTab("payment");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const reqNumber = `FR-${Date.now().toString(36).toUpperCase()}`;

      // Compute efficiency
      let efficiency: number | null = null;
      const curOdo = parseFloat(form.current_odometer);
      if (lastOdo && curOdo && curOdo > lastOdo && litersNum > 0) {
        efficiency = Math.round(((curOdo - lastOdo) / litersNum) * 100) / 100;
      }

      const payload: any = {
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        requested_by: userData.user?.id,
        request_number: reqNumber,
        request_type: "vehicle",
        fuel_type: form.fuel_type,
        liters_requested: litersNum,
        estimated_cost: estCost || null,
        current_odometer: curOdo || null,
        previous_odometer: lastOdo || null,
        efficiency_km_per_liter: efficiency,
        purpose: form.purpose || null,
        notes: form.notes || null,
        priority: form.priority,
        asset_criticality: form.asset_criticality || null,
        fuel_request_type: form.fuel_request_type || null,
        // Driver/requestor
        driver_name: form.driver_name || driverName,
        employee_id_no: form.employee_id_no || null,
        driver_phone: form.driver_phone || null,
        requestor_department: form.requestor_department || null,
        assigned_department: form.assigned_department || null,
        requested_for: form.requested_for || driverName,
        // Project / WO
        project_number: form.project_number || null,
        task_number: form.task_number || null,
        adjustment_wo_number: form.adjustment_wo_number || null,
        // Payment
        fuel_in_telebirr: telebirr || null,
        fuel_by_cash_coupon: cash || null,
        // Schedule
        request_by_start_date: form.request_by_start_date ? new Date(form.request_by_start_date).toISOString() : null,
        request_by_completion_date: form.request_by_completion_date ? new Date(form.request_by_completion_date).toISOString() : null,
        // Contact
        phone_number: form.phone_number || null,
        email: form.email || null,
        notify_user: form.notify_user,
        contact_preference: form.contact_preference || null,
        // Extra
        remark: form.remark || null,
        additional_description: form.additional_description || null,
        context_value: "Fuel request from driver portal",
        trigger_source: "driver_portal",
        status: "pending",
        clearance_status: "pending",
      };

      const { error } = await (supabase as any).from("fuel_requests").insert(payload);
      if (error) throw error;

      toast.success(`Fuel request ${reqNumber} submitted for approval`);
      queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit fuel request");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" /> New Fuel Request
            {vehiclePlate && <Badge variant="outline" className="ml-2">{vehiclePlate}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {vehicleId
              ? "Complete the fuel request — it will be routed for approval and may auto-create a work order."
              : "No vehicle assigned — contact Fleet Operations"}
          </DialogDescription>
        </DialogHeader>

        {!vehicleId ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No vehicle assigned to you.</p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="essentials"><Fuel className="w-4 h-4 mr-1" />Essentials</TabsTrigger>
              <TabsTrigger value="project"><Briefcase className="w-4 h-4 mr-1" />Project</TabsTrigger>
              <TabsTrigger value="payment"><Wallet className="w-4 h-4 mr-1" />Payment</TabsTrigger>
              <TabsTrigger value="contact"><Phone className="w-4 h-4 mr-1" />Contact</TabsTrigger>
            </TabsList>

            {/* ESSENTIALS */}
            <TabsContent value="essentials" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Fuel Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Fuel Type *</Label>
                      <Select value={form.fuel_type} onValueChange={v => set("fuel_type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="petrol">Petrol/Benzine</SelectItem>
                          <SelectItem value="cng">CNG</SelectItem>
                          <SelectItem value="electric">Electric (charging)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Liters Requested *</Label>
                      <Input type="number" min="1" step="0.5" value={form.liters_requested}
                        onChange={e => set("liters_requested", e.target.value)} placeholder="e.g. 50" />
                    </div>
                    <div>
                      <Label>Estimated Cost</Label>
                      <Input type="number" min="0" step="0.01" value={form.estimated_cost}
                        onChange={e => set("estimated_cost", e.target.value)} placeholder="auto if blank" />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={v => set("priority", v)}>
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
                      <Label>Asset Criticality</Label>
                      <Select value={form.asset_criticality} onValueChange={v => set("asset_criticality", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Request Sub-Type</Label>
                      <Select value={form.fuel_request_type} onValueChange={v => set("fuel_request_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">Routine Refill</SelectItem>
                          <SelectItem value="long_trip">Long Trip</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Current Odometer (km)</Label>
                      <Input type="number" value={form.current_odometer}
                        onChange={e => set("current_odometer", e.target.value)} placeholder="e.g. 124500" />
                      {lastOdo != null && (
                        <p className="text-xs text-muted-foreground mt-1">Last recorded: {Number(lastOdo).toLocaleString()} km</p>
                      )}
                    </div>
                    <div>
                      <Label>Purpose</Label>
                      <Input value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="e.g. Refill before long trip" />
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea value={form.notes} rows={2} onChange={e => set("notes", e.target.value)}
                      placeholder="Additional context for fleet operations" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Schedule</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Request Start</Label>
                    <Input type="datetime-local" value={form.request_by_start_date}
                      onChange={e => set("request_by_start_date", e.target.value)} />
                  </div>
                  <div>
                    <Label>Required By</Label>
                    <Input type="datetime-local" value={form.request_by_completion_date}
                      onChange={e => set("request_by_completion_date", e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PROJECT */}
            <TabsContent value="project" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Requestor</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Driver Name</Label>
                    <Input value={form.driver_name} onChange={e => set("driver_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Employee ID</Label>
                    <Input value={form.employee_id_no} onChange={e => set("employee_id_no", e.target.value)} />
                  </div>
                  <div>
                    <Label>Requestor Department</Label>
                    <Select value={form.requestor_department} onValueChange={v => set("requestor_department", v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned Department</Label>
                    <Select value={form.assigned_department} onValueChange={v => set("assigned_department", v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Requested For</Label>
                    <Input value={form.requested_for} onChange={e => set("requested_for", e.target.value)}
                      placeholder="Person/team this fuel is for" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Project & Work Order Refs</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Project #</Label>
                    <Input value={form.project_number} onChange={e => set("project_number", e.target.value)} />
                  </div>
                  <div>
                    <Label>Task #</Label>
                    <Input value={form.task_number} onChange={e => set("task_number", e.target.value)} />
                  </div>
                  <div>
                    <Label>Adjustment WO #</Label>
                    <Input value={form.adjustment_wo_number} onChange={e => set("adjustment_wo_number", e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Label>Additional Description</Label>
                    <Textarea rows={2} value={form.additional_description}
                      onChange={e => set("additional_description", e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PAYMENT */}
            <TabsContent value="payment" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" />Payment Split</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Telebirr (E-Money)</Label>
                      <Input type="number" min="0" step="0.01" value={form.fuel_in_telebirr}
                        onChange={e => set("fuel_in_telebirr", e.target.value)} />
                    </div>
                    <div>
                      <Label>Cash / Coupon</Label>
                      <Input type="number" min="0" step="0.01" value={form.fuel_by_cash_coupon}
                        onChange={e => set("fuel_by_cash_coupon", e.target.value)} />
                    </div>
                  </div>
                  {estCost > 0 && (
                    <div className={`text-sm p-3 rounded-md flex items-center gap-2 ${
                      splitMismatch ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"
                    }`}>
                      {splitMismatch && <AlertTriangle className="w-4 h-4" />}
                      Total split: <strong>{formatCurrency(splitTotal)}</strong> / Estimated: <strong>{formatCurrency(estCost)}</strong>
                      {splitMismatch && " — must match"}
                    </div>
                  )}
                  <div>
                    <Label>Remark</Label>
                    <Textarea rows={2} value={form.remark} onChange={e => set("remark", e.target.value)}
                      placeholder="Payment-related notes" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CONTACT */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Contact & Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-1"><Phone className="w-3 h-3" />Phone</Label>
                      <Input value={form.phone_number} onChange={e => set("phone_number", e.target.value)} />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1"><Mail className="w-3 h-3" />Email</Label>
                      <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
                    </div>
                    <div>
                      <Label>Preferred Channel</Label>
                      <Select value={form.contact_preference} onValueChange={v => set("contact_preference", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Checkbox id="notify" checked={form.notify_user}
                        onCheckedChange={v => set("notify_user", !!v)} />
                      <Label htmlFor="notify" className="cursor-pointer">Notify me on status updates</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {vehicleId && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.liters_requested}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
              Submit Request
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DriverFuelRequestDialog;
