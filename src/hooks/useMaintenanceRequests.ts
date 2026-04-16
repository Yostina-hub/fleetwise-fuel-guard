import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface MaintenanceRequest {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string | null;
  requested_by: string | null;
  approved_by: string | null;
  request_number: string;
  request_type: string;
  trigger_source: string;
  km_reading: number | null;
  running_hours: number | null;
  fuel_level: number | null;
  priority: string;
  status: string;
  workflow_stage: string | null;
  requestor_department: string | null;
  description: string | null;
  rejection_reason: string | null;
  notes: string | null;
  work_order_id: string | null;
  schedule_id: string | null;
  approved_at: string | null;
  requested_completion_date: string | null;
  created_at: string;
  updated_at: string;
  // Pre-inspection
  pre_inspection_done: boolean | null;
  pre_inspection_by: string | null;
  pre_inspection_at: string | null;
  pre_inspection_notes: string | null;
  needs_maintenance: boolean | null;
  // Supplier
  supplier_id: string | null;
  supplier_name: string | null;
  vehicle_delivered_at: string | null;
  vehicle_delivered_by: string | null;
  // Variation
  variation_requested: boolean | null;
  variation_notes: string | null;
  variation_accepted: boolean | null;
  variation_accepted_by: string | null;
  variation_accepted_at: string | null;
  // Inspector
  inspector_id: string | null;
  inspector_assigned_at: string | null;
  post_inspection_result: string | null;
  post_inspection_at: string | null;
  post_inspection_notes: string | null;
  // Acceptance
  maintenance_accepted: boolean | null;
  maintenance_accepted_at: string | null;
  maintenance_accepted_by: string | null;
  // Delivery
  delivery_document_url: string | null;
  delivery_checked_at: string | null;
  delivery_acceptable: boolean | null;
  vehicle_received_at: string | null;
  // Closure
  scrap_return_form_url: string | null;
  spare_parts_collected: boolean | null;
  files_updated: boolean | null;
  correction_notes: string | null;
  supplier_invoice_url: string | null;
  supplier_report_url: string | null;
  // Relations
  vehicle?: { plate_number: string; make: string; model: string } | null;
  driver?: { first_name: string; last_name: string } | null;
}

export type WorkflowStage =
  | "submitted"
  | "under_review"
  | "pre_inspection"
  | "no_maintenance"
  | "wo_preparation"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "vehicle_delivery"
  | "supplier_maintenance"
  | "variation_review"
  | "inspector_assigned"
  | "post_inspection"
  | "acceptance_review"
  | "correction_required"
  | "payment_pending"
  | "delivery_check"
  | "vehicle_received"
  | "files_updated"
  | "completed";

export const WORKFLOW_STAGES: { key: WorkflowStage; label: string }[] = [
  { key: "submitted", label: "1. Request Submitted" },
  { key: "under_review", label: "2. Fleet Review" },
  { key: "pre_inspection", label: "4. Pre-Inspection" },
  { key: "no_maintenance", label: "5. No Maintenance Needed" },
  { key: "wo_preparation", label: "6. WO Preparation" },
  { key: "pending_approval", label: "6b. Pending Approval" },
  { key: "approved", label: "6c. Approved" },
  { key: "rejected", label: "3. Rejected" },
  { key: "vehicle_delivery", label: "6b. Vehicle Delivery" },
  { key: "supplier_maintenance", label: "9. Supplier Maintenance" },
  { key: "variation_review", label: "10. Variation Review" },
  { key: "inspector_assigned", label: "11. Inspector Assigned" },
  { key: "post_inspection", label: "15. Post-Maintenance Inspection" },
  { key: "acceptance_review", label: "Acceptance Review" },
  { key: "correction_required", label: "25. Correction Required" },
  { key: "payment_pending", label: "16. Payment Pending" },
  { key: "delivery_check", label: "28. Delivery Check" },
  { key: "vehicle_received", label: "23. Vehicle Received" },
  { key: "files_updated", label: "21. Files Updated" },
  { key: "completed", label: "End" },
];

export const useMaintenanceRequests = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["maintenance-requests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model), driver:drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MaintenanceRequest[];
    },
    enabled: !!organizationId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    queryClient.invalidateQueries({ queryKey: ["work-orders"] });
  };

  const createRequest = useMutation({
    mutationFn: async (payload: {
      vehicle_id: string;
      driver_id?: string;
      request_type: string;
      trigger_source?: string;
      km_reading?: number;
      running_hours?: number;
      fuel_level?: number;
      priority: string;
      requestor_department?: string;
      description?: string;
      requested_completion_date?: string;
      notes?: string;
      schedule_id?: string;
    }) => {
      if (!organizationId) throw new Error("No organization");
      const reqNumber = "MR-" + Date.now().toString().slice(-8);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("maintenance_requests").insert({
        organization_id: organizationId,
        request_number: reqNumber,
        requested_by: userData.user?.id,
        status: "submitted",
        workflow_stage: "submitted",
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Maintenance request created"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          status: "approved",
          workflow_stage: "approved",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Request approved — Work order auto-created"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          status: "rejected",
          workflow_stage: "rejected",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Request rejected"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 2: Fleet Operation reviews
  const reviewRequest = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ workflow_stage: "under_review" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Request moved to review"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 4: Pre-inspection
  const submitPreInspection = useMutation({
    mutationFn: async ({ id, needs_maintenance, notes }: { id: string; needs_maintenance: boolean; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: needs_maintenance ? "wo_preparation" : "no_maintenance",
          status: needs_maintenance ? "in_progress" : "completed",
          pre_inspection_done: true,
          pre_inspection_by: userData.user?.id,
          pre_inspection_at: new Date().toISOString(),
          pre_inspection_notes: notes || null,
          needs_maintenance,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Pre-inspection recorded"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 7b: Deliver vehicle to supplier
  const deliverToSupplier = useMutation({
    mutationFn: async ({ id, supplier_name, supplier_id }: { id: string; supplier_name: string; supplier_id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: "supplier_maintenance",
          supplier_name,
          supplier_id: supplier_id || null,
          vehicle_delivered_at: new Date().toISOString(),
          vehicle_delivered_by: userData.user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Vehicle delivered to supplier"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 10: Supplier reports variation
  const submitVariation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: "variation_review",
          variation_requested: true,
          variation_notes: notes,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Variation submitted for review"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 11: Accept/reject variation
  const handleVariation = useMutation({
    mutationFn: async ({ id, accepted }: { id: string; accepted: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: accepted ? "supplier_maintenance" : "correction_required",
          variation_accepted: accepted,
          variation_accepted_by: userData.user?.id,
          variation_accepted_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Variation decision recorded"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 11: Assign inspector
  const assignInspector = useMutation({
    mutationFn: async ({ id, inspector_id }: { id: string; inspector_id: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: "inspector_assigned",
          inspector_id,
          inspector_assigned_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Inspector assigned"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 15: Post-maintenance inspection
  const submitPostInspection = useMutation({
    mutationFn: async ({ id, result, notes }: { id: string; result: string; notes?: string }) => {
      const accepted = result === "pass";
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: accepted ? "payment_pending" : "correction_required",
          post_inspection_result: result,
          post_inspection_at: new Date().toISOString(),
          post_inspection_notes: notes || null,
          maintenance_accepted: accepted,
          maintenance_accepted_at: new Date().toISOString(),
          maintenance_accepted_by: userData.user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Post-inspection recorded"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 17: Supplier sends report & invoice
  const submitSupplierDocs = useMutation({
    mutationFn: async ({ id, invoice_url, report_url }: { id: string; invoice_url?: string; report_url?: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: "delivery_check",
          supplier_invoice_url: invoice_url || null,
          supplier_report_url: report_url || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Supplier documents recorded"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 28: Delivery check
  const checkDelivery = useMutation({
    mutationFn: async ({ id, acceptable }: { id: string; acceptable: boolean }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: acceptable ? "vehicle_received" : "correction_required",
          delivery_checked_at: new Date().toISOString(),
          delivery_acceptable: acceptable,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Delivery check recorded"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 23: Vehicle received
  const receiveVehicle = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: "files_updated",
          vehicle_received_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Vehicle received"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 20-21: Collect spare parts & update files → Complete
  const completeRequest = useMutation({
    mutationFn: async ({ id, spare_parts_collected }: { id: string; spare_parts_collected?: boolean }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          status: "completed",
          workflow_stage: "completed",
          spare_parts_collected: spare_parts_collected ?? true,
          files_updated: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Request completed — files updated"); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Send for correction (step 25/26)
  const sendForCorrection = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          workflow_stage: "supplier_maintenance",
          correction_notes: notes,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Sent back to supplier for correction"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const stats = {
    total: requests.length,
    draft: requests.filter(r => r.status === "draft").length,
    submitted: requests.filter(r => r.status === "submitted").length,
    approved: requests.filter(r => r.status === "approved" || r.status === "work_order_created").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length,
  };

  return {
    requests,
    isLoading,
    createRequest,
    approveRequest,
    rejectRequest,
    reviewRequest,
    submitPreInspection,
    deliverToSupplier,
    submitVariation,
    handleVariation,
    assignInspector,
    submitPostInspection,
    submitSupplierDocs,
    checkDelivery,
    receiveVehicle,
    completeRequest,
    sendForCorrection,
    stats,
  };
};
