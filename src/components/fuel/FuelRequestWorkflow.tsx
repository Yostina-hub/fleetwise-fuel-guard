import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Fuel, CheckCircle, Clock, XCircle, Search, Plus, Loader2, Eye, Check, X,
  Download, AlertTriangle, MapPin, Wallet, FileText, Zap, ArrowRight,
  ClipboardCheck, Send, History, Truck, Power, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { TelebirrEmoneyPanel } from "./TelebirrEmoneyPanel";
import { FuelClarificationPanel } from "./FuelClarificationPanel";

const ITEMS_PER_PAGE = 15;
const APPROVER_ROLES = ["fleet_manager", "operations_manager", "org_admin", "super_admin", "fleet_owner"];

// Status configuration
const STATUS_CONFIG: Record<string, { variant: any; className: string; icon: any }> = {
  pending: { variant: "outline", className: "text-warning border-warning/30", icon: Clock },
  approved: { variant: "outline", className: "bg-success/10 text-success border-success/30", icon: CheckCircle },
  fulfilled: { variant: "secondary", className: "bg-primary/10 text-primary", icon: Fuel },
  rejected: { variant: "destructive", className: "", icon: XCircle },
  deviation_detected: { variant: "outline", className: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
  cleared: { variant: "outline", className: "bg-success/10 text-success border-success/30", icon: ClipboardCheck },
};

interface FuelRequestFormData {
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
  // Enhanced fields from reference
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
}

const initialForm: FuelRequestFormData = {
  request_type: "vehicle",
  vehicle_id: "",
  generator_id: "",
  driver_id: "",
  fuel_type: "diesel",
  liters_requested: "",
  estimated_cost: "",
  purpose: "",
  current_odometer: "",
  notes: "",
  driver_type: "",
  driver_name: "",
  employee_id_no: "",
  vehicle_driver_name: "",
  requestor_department: "",
  fuel_in_telebirr: "",
  driver_phone: "",
  fuel_by_cash_coupon: "",
  fuel_request_type: "",
  adjustment_wo_number: "",
  project_number: "",
  task_number: "",
  remark: "",
  asset_criticality: "",
  additional_description: "",
  context_value: "Fuel request for vehicle",
};

// Previous Clearance Report (supports both vehicles and generators)
const PreviousClearanceReport = ({ vehicleId, generatorId, organizationId, formatFuel, formatCurrency }: any) => {
  const targetId = vehicleId || generatorId;
  const targetType = vehicleId ? "vehicle" : "generator";
  const { data: history = [] } = useQuery({
    queryKey: ["fuel-clearance-history", targetType, targetId],
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
            <div key={h.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="font-mono">{h.request_number}</span>
                <span className="text-muted-foreground">{format(new Date(h.created_at), "MMM dd")}</span>
                {h.trigger_source === "auto" && (
                  <Badge variant="outline" className="text-[10px] border-primary/50 text-primary"><Zap className="h-2.5 w-2.5 mr-0.5" />Auto</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>{formatFuel(h.actual_liters || h.liters_approved || h.liters_requested)}</span>
                {h.efficiency_km_per_liter && (
                  <span className="text-muted-foreground">{h.efficiency_km_per_liter} km/L</span>
                )}
                {h.deviation_percent != null && (
                  <Badge variant="outline" className={Math.abs(h.deviation_percent) > 5 ? "text-destructive text-[10px]" : "text-success text-[10px]"}>
                    {h.deviation_percent > 0 ? "+" : ""}{h.deviation_percent}%
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">{h.clearance_status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Nearby Stations Panel
const NearbyStationsPanel = ({ organizationId, onSelectStation }: any) => {
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

// Work Order Status Card
const FuelWorkOrderCard = ({ workOrderId, organizationId, formatCurrency }: any) => {
  const { data: workOrder } = useQuery({
    queryKey: ["fuel-work-order", workOrderId],
    queryFn: async () => {
      if (!workOrderId) return null;
      const { data } = await supabase
        .from("fuel_work_orders")
        .select("*")
        .eq("id", workOrderId)
        .single();
      return data;
    },
    enabled: !!workOrderId,
  });

  if (!workOrder) return null;

  const steps = [
    { label: "Work Order Created", done: true, icon: FileText },
    { label: "WO Approved", done: workOrder.approved_at != null, icon: CheckCircle },
    { label: "E-Money Initiated", done: workOrder.emoney_initiated, icon: Wallet },
    { label: "E-Money Approved", done: workOrder.emoney_approved_at != null, icon: Check },
    { label: "Transfer Complete", done: workOrder.emoney_transfer_status === "completed", icon: Send },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Fuel Work Order — {workOrder.work_order_number}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-1 flex-wrap">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                step.done ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
              }`}>
                <step.icon className="h-3 w-3" />
                {step.label}
              </div>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
        {workOrder.emoney_amount && (
          <div className="mt-2 text-xs text-muted-foreground">
            E-Money Amount: <span className="font-medium text-foreground">{formatCurrency(workOrder.emoney_amount)}</span>
            {workOrder.emoney_transfer_ref && <> • Ref: <span className="font-mono">{workOrder.emoney_transfer_ref}</span></>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Deviation Alert & Justification
const DeviationPanel = ({ request, onSubmitJustification }: any) => {
  const [justification, setJustification] = useState("");

  if (!request || request.clearance_status !== "deviation_detected") return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Fuel Deviation Detected — {request.deviation_percent > 0 ? "+" : ""}{request.deviation_percent}%
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-muted-foreground">Approved:</span> <span className="font-medium">{request.liters_approved}L</span></div>
          <div><span className="text-muted-foreground">Actual:</span> <span className="font-medium">{request.actual_liters}L</span></div>
          <div><span className="text-muted-foreground">Difference:</span> <span className="font-medium text-destructive">{(request.actual_liters - request.liters_approved).toFixed(1)}L</span></div>
        </div>
        {!request.deviation_justification ? (
          <div className="space-y-2">
            <Label className="text-xs">Justification Required</Label>
            <Textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Explain the deviation..."
              rows={2}
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSubmitJustification(request.id, justification)}
              disabled={!justification.trim()}
            >
              Submit Justification
            </Button>
          </div>
        ) : (
          <div className="text-xs">
            <span className="text-muted-foreground">Justification:</span>
            <p className="mt-1">{request.deviation_justification}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Auto-trigger settings dialog
const FuelAutoTriggerSettings = ({ organizationId, settings, onClose }: { organizationId: string; settings: any; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [threshold, setThreshold] = useState(String(settings?.fuel_efficiency_threshold || 5));
  const [enabled, setEnabled] = useState(settings?.fuel_auto_request_enabled || false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organization_settings")
        .update({
          fuel_efficiency_threshold: parseFloat(threshold),
          fuel_auto_request_enabled: enabled,
        })
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
      toast.success("Auto fuel trigger settings saved");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm">Auto Fuel Request</Label>
        <Button
          size="sm"
          variant={enabled ? "default" : "outline"}
          onClick={() => setEnabled(!enabled)}
        >
          {enabled ? "Enabled" : "Disabled"}
        </Button>
      </div>
      <div>
        <Label className="text-sm">Fuel Efficiency Threshold (km/liter)</Label>
        <p className="text-xs text-muted-foreground mb-1">When a vehicle's fuel efficiency drops below this value, the system will auto-create a fuel request</p>
        <Input
          type="number"
          step="0.5"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
          placeholder="e.g. 5.0"
        />
      </div>
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
};

export const FuelRequestWorkflow = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { formatCurrency, formatFuel, settings } = useOrganizationSettings();
  const { hasRole } = useAuthContext();
  const canApprove = APPROVER_ROLES.some(r => hasRole(r));
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showApprove, setShowApprove] = useState<any>(null);
  const [showReject, setShowReject] = useState<any>(null);
  const [showFulfill, setShowFulfill] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [form, setForm] = useState<FuelRequestFormData>(initialForm);
  const [rejectReason, setRejectReason] = useState("");
  const [approvedLiters, setApprovedLiters] = useState("");
  const [actualLiters, setActualLiters] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

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
    enabled: !!organizationId,
  });

  // Departments for requestor_department
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
    enabled: !!organizationId,
  });

  // Fuel requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["fuel-requests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("fuel_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const getPlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "—";
  const getDriverName = (id?: string | null) => {
    if (!id) return "—";
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  };
  const getGeneratorName = (id?: string | null) => {
    if (!id) return "—";
    return generators.find((g: any) => g.id === id)?.name || "—";
  };

  // Auto-fill driver info when driver selected
  const handleDriverSelect = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    setForm(f => ({
      ...f,
      driver_id: driverId,
      driver_name: driver ? `${driver.first_name} ${driver.last_name}` : "",
      driver_phone: driver?.phone || "",
    }));
  };

  // Create
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const liters = parseFloat(form.liters_requested);
      if (isNaN(liters) || liters <= 0) throw new Error("Liters required");
      if (form.request_type === "vehicle" && !form.vehicle_id) throw new Error("Vehicle required");
      if (form.request_type === "generator" && !form.generator_id) throw new Error("Generator required");

      const reqNum = `FR-${Date.now().toString(36).toUpperCase()}`;
      const { data: user } = await supabase.auth.getUser();

      // Get previous odometer for vehicle requests
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
          .single();
        prevOdometer = lastReq?.current_odometer || null;
      }

      // Calculate efficiency
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
        station_id: selectedStation,
        trigger_source: "manual",
        // Enhanced fields
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
      };

      const { data: inserted, error } = await supabase.from("fuel_requests").insert(insertData).select("id").single();
      if (error) throw error;

      if (inserted?.id) {
        await supabase.rpc("route_fuel_request_approval", { p_fuel_request_id: inserted.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      setShowCreate(false);
      setForm(initialForm);
      setSelectedStation(null);
      toast.success("Fuel request submitted & routed for approval");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Approve
  const approveMutation = useMutation({
    mutationFn: async ({ id, liters }: { id: string; liters: number }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("fuel_requests").update({
        status: "approved",
        liters_approved: liters,
        approved_by: user.user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      setShowApprove(null);
      toast.success("Request approved — Fuel Work Order created automatically");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Reject
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("fuel_requests").update({
        status: "rejected",
        rejected_reason: reason,
        approved_by: user.user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      setShowReject(null);
      setRejectReason("");
      toast.success("Request rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Fulfill with actual liters (triggers deviation detection)
  const fulfillMutation = useMutation({
    mutationFn: async ({ id, actual, cost }: { id: string; actual: number; cost?: number }) => {
      const { error } = await supabase.from("fuel_requests").update({
        status: "fulfilled",
        actual_liters: actual,
        actual_cost: cost || null,
        fulfilled_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      setShowFulfill(null);
      setActualLiters("");
      setActualCost("");
      toast.success("Fuel dispensed — clearance data recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Submit deviation justification
  const justificationMutation = useMutation({
    mutationFn: async ({ id, justification }: { id: string; justification: string }) => {
      const { error } = await supabase.from("fuel_requests").update({
        deviation_justification: justification,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast.success("Justification submitted for review");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // E-Money operations on work order
  const emoneyMutation = useMutation({
    mutationFn: async ({ workOrderId, action, amount }: { workOrderId: string; action: string; amount?: number }) => {
      const { data: user } = await supabase.auth.getUser();
      const updates: any = {};
      if (action === "initiate") {
        updates.emoney_initiated = true;
        updates.emoney_amount = amount;
        updates.emoney_transfer_status = "initiated";
      } else if (action === "approve") {
        updates.emoney_approved_by = user.user?.id;
        updates.emoney_approved_at = new Date().toISOString();
        updates.emoney_transfer_status = "approved";
      } else if (action === "complete") {
        updates.emoney_transfer_status = "completed";
        updates.emoney_transfer_ref = `ETR-${Date.now().toString(36).toUpperCase()}`;
      }
      const { error } = await supabase.from("fuel_work_orders").update(updates).eq("id", workOrderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-work-order"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast.success("E-Money operation completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusBadge = (s: string) => {
    const config = STATUS_CONFIG[s] || { variant: "outline", className: "", icon: Clock };
    return <Badge variant={config.variant} className={config.className}>{s.replace("_", " ")}</Badge>;
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r: any) => r.status === "pending").length,
    approved: requests.filter((r: any) => r.status === "approved").length,
    fulfilled: requests.filter((r: any) => r.status === "fulfilled").length,
    deviations: requests.filter((r: any) => r.clearance_status === "deviation_detected").length,
    totalLiters: requests.filter((r: any) => ["fulfilled", "cleared"].includes(r.status)).reduce((s: number, r: any) => s + (r.actual_liters || r.liters_approved || 0), 0),
    autoTriggered: requests.filter((r: any) => r.trigger_source === "auto").length,
  }), [requests]);

  const filtered = requests.filter((r: any) =>
    !search || r.request_number?.toLowerCase().includes(search.toLowerCase()) ||
    getPlate(r.vehicle_id)?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ["Request #", "Type", "Source", "Vehicle/Generator", "Driver", "Fuel Type", "Requested L", "Approved L", "Actual L", "Deviation %", "Est. Cost", "Actual Cost", "Status", "Clearance", "Department", "Project #", "Date"];
    const rows = filtered.map((r: any) => [
      r.request_number, r.request_type, r.trigger_source || "manual",
      r.request_type === "generator" ? getGeneratorName(r.generator_id) : getPlate(r.vehicle_id),
      getDriverName(r.driver_id), r.fuel_type, r.liters_requested,
      r.liters_approved || "", r.actual_liters || "", r.deviation_percent || "",
      r.estimated_cost || "", r.actual_cost || "",
      r.status, r.clearance_status,
      r.requestor_department || "", r.project_number || "",
      format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fuel-requests-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(filtered.length, ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fuel Request & Clearance Workflow</h1>
          <p className="text-muted-foreground">End-to-end fuel request, approval, dispensing, and clearance management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canApprove && (
            <Button variant="outline" className="gap-2" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />Auto Trigger
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={exportCSV}><Download className="w-4 h-4" />Export</Button>
          <Button className="gap-2" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Request</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2"><Fuel className="h-6 w-6 text-primary" /><div><p className="text-xl font-bold">{stats.total}</p><p className="text-[11px] text-muted-foreground">Total</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2"><Clock className="h-6 w-6 text-warning" /><div><p className="text-xl font-bold">{stats.pending}</p><p className="text-[11px] text-muted-foreground">Pending</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2"><CheckCircle className="h-6 w-6 text-success" /><div><p className="text-xl font-bold">{stats.approved}</p><p className="text-[11px] text-muted-foreground">Approved</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2"><Fuel className="h-6 w-6 text-primary" /><div><p className="text-xl font-bold">{formatFuel(stats.totalLiters)}</p><p className="text-[11px] text-muted-foreground">Dispensed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /><div><p className="text-xl font-bold">{stats.deviations}</p><p className="text-[11px] text-muted-foreground">Deviations</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-success" /><div><p className="text-xl font-bold">{stats.fulfilled}</p><p className="text-[11px] text-muted-foreground">Fulfilled</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2"><Zap className="h-6 w-6 text-primary" /><div><p className="text-xl font-bold">{stats.autoTriggered}</p><p className="text-[11px] text-muted-foreground">Auto-Triggered</p></div></div></CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by request # or plate..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
          <TabsTrigger value="auto">Auto-Triggered</TabsTrigger>
          <TabsTrigger value="deviation_detected">Deviations</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        {["all", "pending", "approved", "fulfilled", "auto", "deviation_detected", "rejected"].map(tab => {
          const tabData = tab === "all" ? filtered
            : tab === "auto" ? filtered.filter((r: any) => r.trigger_source === "auto")
            : tab === "deviation_detected" ? filtered.filter((r: any) => r.clearance_status === "deviation_detected")
            : filtered.filter((r: any) => r.status === tab);
          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <Card>
                <div className="overflow-x-auto">
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Vehicle/Generator</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Fuel</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Dev. %</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Clearance</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={14} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : tabData.length === 0 ? (
                        <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No fuel requests found</TableCell></TableRow>
                      ) : (
                        tabData.slice(startIndex, endIndex).map((r: any) => (
                          <TableRow key={r.id} className={r.clearance_status === "deviation_detected" ? "bg-destructive/5" : ""}>
                            <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {r.request_type === "generator" ? <><Power className="h-3 w-3 mr-1" />Gen</> : <><Truck className="h-3 w-3 mr-1" />Veh</>}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {r.trigger_source === "auto" ? (
                                <Badge variant="outline" className="text-[10px] border-primary/50 text-primary"><Zap className="h-2.5 w-2.5 mr-0.5" />Auto</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Manual</span>
                              )}
                            </TableCell>
                            <TableCell>{r.request_type === "generator" ? getGeneratorName(r.generator_id) : getPlate(r.vehicle_id)}</TableCell>
                            <TableCell>{getDriverName(r.driver_id)}</TableCell>
                            <TableCell className="capitalize text-xs">{r.fuel_type}</TableCell>
                            <TableCell>{formatFuel(r.liters_requested)}</TableCell>
                            <TableCell>{r.liters_approved ? formatFuel(r.liters_approved) : "—"}</TableCell>
                            <TableCell>{r.actual_liters ? formatFuel(r.actual_liters) : "—"}</TableCell>
                            <TableCell>
                              {r.deviation_percent != null ? (
                                <span className={Math.abs(r.deviation_percent) > 5 ? "text-destructive font-medium" : "text-success"}>
                                  {r.deviation_percent > 0 ? "+" : ""}{r.deviation_percent}%
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>{statusBadge(r.status)}</TableCell>
                            <TableCell>{statusBadge(r.clearance_status)}</TableCell>
                            <TableCell className="text-xs">{format(new Date(r.created_at), "MMM dd")}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <TooltipProvider>
                                  <Tooltip><TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setShowDetail(r)}><Eye className="w-4 h-4" /></Button>
                                  </TooltipTrigger><TooltipContent>View details</TooltipContent></Tooltip>
                                </TooltipProvider>
                                {r.status === "pending" && canApprove && (
                                  <>
                                    <Button variant="ghost" size="sm" className="text-success" onClick={() => { setShowApprove(r); setApprovedLiters(String(r.liters_requested)); }}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowReject(r)}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                {r.status === "approved" && canApprove && (
                                  <Button variant="ghost" size="sm" className="text-primary" onClick={() => { setShowFulfill(r); setActualLiters(String(r.liters_approved || r.liters_requested)); }}>
                                    <Fuel className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
              <TablePagination currentPage={currentPage} totalItems={tabData.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </TabsContent>
          );
        })}
      </Tabs>

      {/* === CREATE REQUEST DIALOG === */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>New Fuel Request</DialogTitle>
            <DialogDescription>Submit a fuel clearance request for vehicle or generator</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-2">
            <div className="space-y-4">
              {/* Request Type Tabs */}
              <Tabs value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v, vehicle_id: "", generator_id: "", context_value: v === "vehicle" ? "Fuel request for vehicle" : "Fuel request for generator" }))}>
                <TabsList className="w-full">
                  <TabsTrigger value="vehicle" className="flex-1 gap-2"><Truck className="h-4 w-4" /> Vehicle Fuel Request</TabsTrigger>
                  <TabsTrigger value="generator" className="flex-1 gap-2"><Power className="h-4 w-4" /> Generator Fuel Request</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Context Value */}
              <div>
                <Label>Context Value *</Label>
                <Select value={form.context_value} onValueChange={v => setForm(f => ({ ...f, context_value: v }))}>
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
                      <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>KM Reading *</Label>
                      <Input type="number" value={form.current_odometer} onChange={e => setForm(f => ({ ...f, current_odometer: e.target.value }))} placeholder="Current odometer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Driver Type *</Label>
                      <Select value={form.driver_type} onValueChange={v => setForm(f => ({ ...f, driver_type: v }))}>
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
                      <Select value={form.driver_id} onValueChange={handleDriverSelect}>
                        <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                        <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Driver Name</Label>
                      <Input value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} placeholder="Auto-filled from driver selection" />
                    </div>
                    <div>
                      <Label>Employee ID No.</Label>
                      <Input value={form.employee_id_no} onChange={e => setForm(f => ({ ...f, employee_id_no: e.target.value }))} placeholder="Employee ID" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vehicle Driver Name</Label>
                      <Input value={form.vehicle_driver_name} onChange={e => setForm(f => ({ ...f, vehicle_driver_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Driver Phone *</Label>
                      <Input value={form.driver_phone} onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))} placeholder="+251..." />
                    </div>
                  </div>

                  {/* Previous clearance report */}
                  <PreviousClearanceReport vehicleId={form.vehicle_id} organizationId={organizationId} formatFuel={formatFuel} formatCurrency={formatCurrency} />
                </>
              ) : (
                <div>
                  <Label>Generator *</Label>
                  <Select value={form.generator_id} onValueChange={v => setForm(f => ({ ...f, generator_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select generator" /></SelectTrigger>
                    <SelectContent>
                      {generators.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name} — {g.location || g.model || ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {generators.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No generators registered. Register generators first.</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Requestor Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Requestor Department *</Label>
                  <Select value={form.requestor_department} onValueChange={v => setForm(f => ({ ...f, requestor_department: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                      {departments.length === 0 && <SelectItem value="default">Default Department</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuel Request Type *</Label>
                  <Select value={form.fuel_request_type} onValueChange={v => setForm(f => ({ ...f, fuel_request_type: v }))}>
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

              {/* Fuel details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
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
                  <Input type="number" step="0.1" value={form.liters_requested} onChange={e => setForm(f => ({ ...f, liters_requested: e.target.value }))} placeholder="0.0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fuel in Telebirr *</Label>
                  <Input type="number" step="0.01" value={form.fuel_in_telebirr} onChange={e => setForm(f => ({ ...f, fuel_in_telebirr: e.target.value }))} placeholder="Amount in ETB" />
                </div>
                <div>
                  <Label>Fuel by Cash Coupon</Label>
                  <Input type="number" step="0.01" value={form.fuel_by_cash_coupon} onChange={e => setForm(f => ({ ...f, fuel_by_cash_coupon: e.target.value }))} placeholder="Amount" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Cost ({settings?.currency || "ETB"})</Label>
                  <Input type="number" step="0.01" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
                </div>
                <div>
                  <Label>Asset Criticality</Label>
                  <Select value={form.asset_criticality} onValueChange={v => setForm(f => ({ ...f, asset_criticality: v }))}>
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

              {/* Project/Task details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Adjustment Required WO No.</Label>
                  <Input value={form.adjustment_wo_number} onChange={e => setForm(f => ({ ...f, adjustment_wo_number: e.target.value }))} placeholder="Work order number" />
                </div>
                <div>
                  <Label>Project No.</Label>
                  <Input value={form.project_number} onChange={e => setForm(f => ({ ...f, project_number: e.target.value }))} placeholder="Project number" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Task No.</Label>
                  <Input value={form.task_number} onChange={e => setForm(f => ({ ...f, task_number: e.target.value }))} placeholder="Task number" />
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Daily operations" />
                </div>
              </div>

              {/* Nearby stations */}
              <NearbyStationsPanel organizationId={organizationId} onSelectStation={setSelectedStation} />
              {selectedStation && (
                <p className="text-xs text-success flex items-center gap-1"><MapPin className="h-3 w-3" /> Station selected</p>
              )}

              {/* Description fields */}
              <div>
                <Label>Additional Description *</Label>
                <Textarea value={form.additional_description} onChange={e => setForm(f => ({ ...f, additional_description: e.target.value }))} rows={2} placeholder="Provide additional details about this request..." />
              </div>

              <div>
                <Label>Remark</Label>
                <Textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={2} placeholder="Any additional remarks..." />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === APPROVE DIALOG === */}
      <Dialog open={!!showApprove} onOpenChange={() => setShowApprove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Fuel Request</DialogTitle>
            <DialogDescription>Review and approve {showApprove?.request_number}. A fuel work order will be auto-created.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{showApprove && getPlate(showApprove.vehicle_id)}</span></div>
              <div><span className="text-muted-foreground">Requested:</span> <span className="font-medium">{showApprove && formatFuel(showApprove.liters_requested)}</span></div>
              {showApprove?.efficiency_km_per_liter && (
                <div className="col-span-2"><span className="text-muted-foreground">Efficiency:</span> <span className="font-medium">{showApprove.efficiency_km_per_liter} km/L</span></div>
              )}
              {showApprove?.trigger_source === "auto" && (
                <div className="col-span-2">
                  <Badge variant="outline" className="border-primary/50 text-primary"><Zap className="h-3 w-3 mr-1" />Auto-triggered (efficiency: {showApprove.auto_trigger_efficiency} km/L)</Badge>
                </div>
              )}
            </div>
            {/* Previous clearance report in approval */}
            {showApprove?.vehicle_id && (
              <PreviousClearanceReport vehicleId={showApprove.vehicle_id} organizationId={organizationId} formatFuel={formatFuel} formatCurrency={formatCurrency} />
            )}
            <div>
              <Label>Liters to Approve</Label>
              <Input type="number" step="0.1" value={approvedLiters} onChange={e => setApprovedLiters(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(null)}>Cancel</Button>
            <Button onClick={() => approveMutation.mutate({ id: showApprove.id, liters: parseFloat(approvedLiters) })} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve & Create Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === FULFILL DIALOG === */}
      <Dialog open={!!showFulfill} onOpenChange={() => setShowFulfill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Fuel Dispensing</DialogTitle>
            <DialogDescription>Enter actual dispensed amount for {showFulfill?.request_number}. Deviation will be auto-calculated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Approved:</span> <span className="font-medium">{showFulfill && formatFuel(showFulfill.liters_approved || showFulfill.liters_requested)}</span></div>
              <div><span className="text-muted-foreground">Est. Cost:</span> <span className="font-medium">{showFulfill?.estimated_cost ? formatCurrency(showFulfill.estimated_cost) : "—"}</span></div>
            </div>
            <div>
              <Label>Actual Liters Dispensed *</Label>
              <Input type="number" step="0.1" value={actualLiters} onChange={e => setActualLiters(e.target.value)} />
            </div>
            <div>
              <Label>Actual Cost ({settings?.currency || "ETB"})</Label>
              <Input type="number" step="0.01" value={actualCost} onChange={e => setActualCost(e.target.value)} />
            </div>
            {actualLiters && showFulfill?.liters_approved && (
              <div className="p-2 rounded bg-muted/30 text-xs">
                <span className="text-muted-foreground">Projected Deviation: </span>
                <span className={Math.abs(((parseFloat(actualLiters) - showFulfill.liters_approved) / showFulfill.liters_approved) * 100) > 5 ? "text-destructive font-medium" : "text-success"}>
                  {(((parseFloat(actualLiters) - showFulfill.liters_approved) / showFulfill.liters_approved) * 100).toFixed(1)}%
                </span>
                {Math.abs(((parseFloat(actualLiters) - showFulfill.liters_approved) / showFulfill.liters_approved) * 100) > 5 && (
                  <span className="text-destructive ml-1">⚠ Justification will be required</span>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFulfill(null)}>Cancel</Button>
            <Button onClick={() => fulfillMutation.mutate({ id: showFulfill.id, actual: parseFloat(actualLiters), cost: actualCost ? parseFloat(actualCost) : undefined })} disabled={fulfillMutation.isPending || !actualLiters}>
              {fulfillMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Dispensing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === REJECT DIALOG === */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Fuel Request</DialogTitle>
            <DialogDescription>Reject {showReject?.request_number}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason for Rejection *</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this request is rejected..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: showReject.id, reason: rejectReason })} disabled={rejectMutation.isPending || !rejectReason.trim()}>
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === DETAIL DIALOG === */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader><DialogTitle>Request Details — {showDetail?.request_number}</DialogTitle></DialogHeader>
          {showDetail && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 pr-2">
                {/* Auto-trigger indicator */}
                {showDetail.trigger_source === "auto" && (
                  <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-2 text-sm">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Auto-triggered at {showDetail.auto_triggered_at ? format(new Date(showDetail.auto_triggered_at), "MMM dd, HH:mm") : "—"}</span>
                    {showDetail.auto_trigger_efficiency && (
                      <Badge variant="outline" className="text-[10px]">{showDetail.auto_trigger_efficiency} km/L</Badge>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground block">Type</span>
                    <Badge variant="outline">{showDetail.request_type === "generator" ? "Generator" : "Vehicle"}</Badge>
                  </div>
                  <div><span className="text-muted-foreground block">Source</span>
                    <Badge variant="outline">{showDetail.trigger_source === "auto" ? "Auto-Triggered" : "Manual"}</Badge>
                  </div>
                  <div><span className="text-muted-foreground block">Vehicle</span><span className="font-medium">{getPlate(showDetail.vehicle_id)}</span></div>
                  {showDetail.generator_id && <div><span className="text-muted-foreground block">Generator</span><span className="font-medium">{getGeneratorName(showDetail.generator_id)}</span></div>}
                  <div><span className="text-muted-foreground block">Driver</span><span className="font-medium">{getDriverName(showDetail.driver_id)}</span></div>
                  {showDetail.driver_type && <div><span className="text-muted-foreground block">Driver Type</span><span className="font-medium capitalize">{showDetail.driver_type}</span></div>}
                  {showDetail.driver_phone && <div><span className="text-muted-foreground block">Driver Phone</span><span className="font-medium">{showDetail.driver_phone}</span></div>}
                  {showDetail.employee_id_no && <div><span className="text-muted-foreground block">Employee ID</span><span className="font-medium">{showDetail.employee_id_no}</span></div>}
                  {showDetail.requestor_department && <div><span className="text-muted-foreground block">Department</span><span className="font-medium">{showDetail.requestor_department}</span></div>}
                  <div><span className="text-muted-foreground block">Fuel Type</span><span className="font-medium capitalize">{showDetail.fuel_type}</span></div>
                  {showDetail.fuel_request_type && <div><span className="text-muted-foreground block">Request Type</span><span className="font-medium capitalize">{showDetail.fuel_request_type}</span></div>}
                  <div><span className="text-muted-foreground block">Status</span>{statusBadge(showDetail.status)}</div>
                  <div><span className="text-muted-foreground block">Clearance</span>{statusBadge(showDetail.clearance_status)}</div>
                  <div><span className="text-muted-foreground block">Liters Requested</span><span className="font-medium">{formatFuel(showDetail.liters_requested)}</span></div>
                  <div><span className="text-muted-foreground block">Liters Approved</span><span className="font-medium">{showDetail.liters_approved ? formatFuel(showDetail.liters_approved) : "—"}</span></div>
                  <div><span className="text-muted-foreground block">Actual Liters</span><span className="font-medium">{showDetail.actual_liters ? formatFuel(showDetail.actual_liters) : "—"}</span></div>
                  <div><span className="text-muted-foreground block">Deviation</span>
                    <span className={showDetail.deviation_percent != null && Math.abs(showDetail.deviation_percent) > 5 ? "font-medium text-destructive" : "font-medium"}>
                      {showDetail.deviation_percent != null ? `${showDetail.deviation_percent}%` : "—"}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground block">Est. Cost</span><span className="font-medium">{showDetail.estimated_cost ? formatCurrency(showDetail.estimated_cost) : "—"}</span></div>
                  <div><span className="text-muted-foreground block">Actual Cost</span><span className="font-medium">{showDetail.actual_cost ? formatCurrency(showDetail.actual_cost) : "—"}</span></div>
                  {showDetail.fuel_in_telebirr && <div><span className="text-muted-foreground block">Fuel in Telebirr</span><span className="font-medium">{formatCurrency(showDetail.fuel_in_telebirr)}</span></div>}
                  {showDetail.fuel_by_cash_coupon && <div><span className="text-muted-foreground block">Cash Coupon</span><span className="font-medium">{formatCurrency(showDetail.fuel_by_cash_coupon)}</span></div>}
                  <div><span className="text-muted-foreground block">Odometer</span><span className="font-medium">{showDetail.current_odometer || "—"}</span></div>
                  {showDetail.efficiency_km_per_liter && <div><span className="text-muted-foreground block">Efficiency</span><span className="font-medium">{showDetail.efficiency_km_per_liter} km/L</span></div>}
                  {showDetail.project_number && <div><span className="text-muted-foreground block">Project #</span><span className="font-medium">{showDetail.project_number}</span></div>}
                  {showDetail.task_number && <div><span className="text-muted-foreground block">Task #</span><span className="font-medium">{showDetail.task_number}</span></div>}
                  {showDetail.asset_criticality && <div><span className="text-muted-foreground block">Asset Criticality</span><span className="font-medium capitalize">{showDetail.asset_criticality}</span></div>}
                  <div><span className="text-muted-foreground block">Requested At</span><span className="font-medium">{format(new Date(showDetail.requested_at), "MMM dd, yyyy HH:mm")}</span></div>
                  {showDetail.approved_at && <div><span className="text-muted-foreground block">Approved At</span><span className="font-medium">{format(new Date(showDetail.approved_at), "MMM dd, yyyy HH:mm")}</span></div>}
                  {showDetail.fulfilled_at && <div><span className="text-muted-foreground block">Fulfilled At</span><span className="font-medium">{format(new Date(showDetail.fulfilled_at), "MMM dd, yyyy HH:mm")}</span></div>}
                </div>

                {showDetail.purpose && <div className="text-sm"><span className="text-muted-foreground block">Purpose</span><p>{showDetail.purpose}</p></div>}
                {showDetail.additional_description && <div className="text-sm"><span className="text-muted-foreground block">Additional Description</span><p>{showDetail.additional_description}</p></div>}
                {showDetail.rejected_reason && <div className="text-sm"><span className="text-muted-foreground block">Rejection Reason</span><p className="text-destructive">{showDetail.rejected_reason}</p></div>}
                {showDetail.remark && <div className="text-sm"><span className="text-muted-foreground block">Remark</span><p>{showDetail.remark}</p></div>}
                {showDetail.notes && <div className="text-sm"><span className="text-muted-foreground block">Notes</span><p>{showDetail.notes}</p></div>}

                {/* Work Order */}
                {showDetail.fuel_work_order_id && (
                  <FuelWorkOrderCard workOrderId={showDetail.fuel_work_order_id} organizationId={organizationId} formatCurrency={formatCurrency} />
                )}

                {/* Deviation */}
                <DeviationPanel
                  request={showDetail}
                  onSubmitJustification={(id: string, j: string) => justificationMutation.mutate({ id, justification: j })}
                />

                {/* Telebirr E-Money Pipeline (replaces placeholder buttons) */}
                {showDetail.fuel_work_order_id && showDetail.status === "approved" && (
                  <TelebirrEmoneyPanel
                    workOrderId={showDetail.fuel_work_order_id}
                    fuelRequestId={showDetail.id}
                    driverPhone={showDetail.driver_phone}
                    approvedAmount={Number(showDetail.estimated_cost || 0)}
                    canApprove={canApprove}
                  />
                )}

                {/* Clarification & clearance loop (steps 14-17) */}
                {showDetail.status === "fulfilled" && organizationId && (
                  <FuelClarificationPanel
                    fuelRequestId={showDetail.id}
                    organizationId={organizationId}
                    canRequest={canApprove}
                    canJustify={canApprove}
                    canResolve={canApprove}
                  />
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* === AUTO TRIGGER SETTINGS DIALOG === */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Auto Fuel Request Settings</DialogTitle>
            <DialogDescription>Configure automatic fuel request triggering based on vehicle efficiency</DialogDescription>
          </DialogHeader>
          {organizationId && (
            <FuelAutoTriggerSettings
              organizationId={organizationId}
              settings={settings}
              onClose={() => setShowSettings(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
