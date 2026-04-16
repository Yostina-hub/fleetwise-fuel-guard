import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

// Full Ethio Telecom Third-Party Damage workflow (20 steps + branches)
export type ClaimStage =
  | "driver_report"             // 1 — Driver reports to police, obtains report
  | "claim_notification"        // 2 — Fill claim notification form, send report
  | "completeness_review"       // 3 — Analyze claim notification (Insurance Mgmt)
  | "policy_coverage_check"     // Decision — Covered by insurance policy?
  | "not_covered_end"           // FMG-FMG 18 — Not covered (terminal)
  | "request_quotations"        // 4 — Request quotation from approved garages
  | "quotation_selection"       // 5 — Select least price, communicate via email
  | "supplier_notification"     // 6a/6b — Inform winner garage, provide pro forma
  | "vehicle_handover"          // 7 — Hand over vehicle to supplier garage
  | "repair_in_progress"        // 8/9 — Receive vehicle, maintain, follow up
  | "repair_completed"          // 10 — Garage reports completion + payment request
  | "wo_verification"           // 11 — Check if maintenance per WO (OK?)
  | "vehicle_returned"          // 12 — Return vehicle to garage / customer
  | "payment_processing"        // 13a/13b — Provide receipt to Insurance Mgmt
  | "receipt_signed"            // 15 — Sign receipt copy, collect original
  | "salvage_recovery"          // 14 — Collect maintained vehicle & salvage
  | "compensation_request"      // 16 — Request claim compensation from third party
  | "third_party_negotiation"   // Decision — Agreed?
  | "finance_collection"        // 17 — Inform Finance to collect agreed amount
  | "amount_collected"          // 18 — Collect agreed amount from third party
  | "legal_division"            // SER-LGM 06 — Represent ET as plaintiff
  | "legal_outcome"             // 20 — Inform result to Insurance Mgmt
  | "document_archived"         // 19 — Update / archive document
  | "closed";

export const STAGE_ORDER: ClaimStage[] = [
  "driver_report", "claim_notification", "completeness_review", "policy_coverage_check",
  "request_quotations", "quotation_selection", "supplier_notification", "vehicle_handover",
  "repair_in_progress", "repair_completed", "wo_verification", "vehicle_returned",
  "payment_processing", "receipt_signed", "salvage_recovery", "compensation_request",
  "third_party_negotiation", "finance_collection", "amount_collected",
  "legal_division", "legal_outcome", "document_archived", "closed", "not_covered_end",
];

export type ClaimLane =
  | "fleet_ops"
  | "supplier_garage"
  | "fleet_maintenance"
  | "insurance_mgmt"
  | "disbursement"
  | "fleet_sourcing"
  | "legal";

export const STAGE_LANES: Record<ClaimStage, ClaimLane> = {
  driver_report: "fleet_ops",
  claim_notification: "fleet_ops",
  vehicle_handover: "fleet_ops",
  vehicle_returned: "fleet_maintenance",

  supplier_notification: "supplier_garage",
  repair_in_progress: "supplier_garage",
  repair_completed: "supplier_garage",

  wo_verification: "fleet_maintenance",
  not_covered_end: "fleet_maintenance",

  completeness_review: "insurance_mgmt",
  policy_coverage_check: "insurance_mgmt",
  quotation_selection: "insurance_mgmt",
  receipt_signed: "insurance_mgmt",
  compensation_request: "insurance_mgmt",
  third_party_negotiation: "insurance_mgmt",
  salvage_recovery: "insurance_mgmt",
  legal_outcome: "insurance_mgmt",
  document_archived: "insurance_mgmt",
  closed: "insurance_mgmt",

  payment_processing: "disbursement",
  finance_collection: "disbursement",
  amount_collected: "disbursement",

  request_quotations: "fleet_sourcing",

  legal_division: "legal",
};

export const STAGE_LABEL: Record<ClaimStage, string> = {
  driver_report: "1 — Driver Police Report",
  claim_notification: "2 — Claim Notification Form",
  completeness_review: "3 — Analyze Claim Notification",
  policy_coverage_check: "Covered by Policy?",
  not_covered_end: "FMG-FMG 18 — Not Covered (End)",
  request_quotations: "4 — Request Quotations",
  quotation_selection: "5 — Select Least Price",
  supplier_notification: "6a/6b — Inform Winner Garage",
  vehicle_handover: "7 — Hand Over Vehicle",
  repair_in_progress: "8/9 — Repair & Follow Up",
  repair_completed: "10 — Repair Completed",
  wo_verification: "11 — Verify Per WO",
  vehicle_returned: "12 — Return Vehicle",
  payment_processing: "13a/13b — Payment Receipt",
  receipt_signed: "15 — Sign Receipt",
  salvage_recovery: "14 — Collect Salvage",
  compensation_request: "16 — Request Compensation",
  third_party_negotiation: "Third Party Agreed?",
  finance_collection: "17 — Inform Finance",
  amount_collected: "18 — Amount Collected",
  legal_division: "SER-LGM 06 — Legal (ET as Plaintiff)",
  legal_outcome: "20 — Legal Outcome",
  document_archived: "19 — Archive Document",
  closed: "Closed",
};

export interface ThirdPartyClaim {
  id: string;
  organization_id: string;
  claim_number: string;
  vehicle_id: string;
  driver_id: string | null;
  accident_date: string;
  accident_location: string | null;
  description: string | null;
  damage_description: string | null;
  third_party_name: string | null;
  third_party_vehicle: string | null;
  third_party_insurance: string | null;
  third_party_contact: string | null;
  police_report_number: string | null;
  fault_party: string | null;
  fault_determination: string | null;
  estimated_repair_cost: number | null;
  claim_amount: number | null;
  approved_amount: number | null;
  settlement_amount: number | null;
  settlement_reference: string | null;
  status: string;
  workflow_stage: ClaimStage;
  completeness_check: string | null;
  completeness_checked_at: string | null;
  forwarded_to_insurance_at: string | null;
  within_insurance_coverage: boolean | null;
  within_limit: boolean | null;
  third_party_dealt_at: string | null;
  finance_notified_at: string | null;
  notification_letter_sent_at: string | null;
  notification_letter_url: string | null;
  documents: string[] | null;
  photos: string[] | null;
  notes: string | null;
  filed_at: string | null;
  settled_at: string | null;
  created_at: string;
  // Extended Ethio Telecom workflow fields
  covered_by_policy: boolean | null;
  policy_analysis_notes: string | null;
  quotations_requested_at: string | null;
  quotation_count: number | null;
  selected_supplier_garage: string | null;
  selected_supplier_contact: string | null;
  quotation_amount: number | null;
  quotation_selected_at: string | null;
  work_order_number: string | null;
  work_order_url: string | null;
  work_order_approved_at: string | null;
  vehicle_handover_at: string | null;
  repair_status: string | null;
  repair_completion_reported_at: string | null;
  payment_requested_by_garage_at: string | null;
  maintenance_per_wo_ok: boolean | null;
  vehicle_returned_at: string | null;
  payment_receipt_url: string | null;
  receipt_signed_at: string | null;
  salvage_collected: boolean | null;
  salvage_value: number | null;
  salvage_notes: string | null;
  salvage_collected_at: string | null;
  compensation_requested_at: string | null;
  third_party_agreed: boolean | null;
  agreed_amount: number | null;
  collected_from_third_party: number | null;
  collected_at: string | null;
  legal_case_number: string | null;
  legal_filed_at: string | null;
  legal_status: string | null;
  legal_outcome: string | null;
  legal_outcome_at: string | null;
  pro_forma_invoice_url: string | null;
  archived: boolean | null;
  archived_at: string | null;
}

export interface ClaimTransition {
  id: string;
  claim_id: string;
  from_stage: string | null;
  to_stage: string;
  decision: string | null;
  performed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

export const useThirdPartyClaimWorkflow = (filters?: { stage?: ClaimStage }) => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["third-party-claims", organizationId, filters?.stage],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase
        .from("accident_claims")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("fault_party", "third_party")
        .order("created_at", { ascending: false });
      if (filters?.stage) q = q.eq("workflow_stage", filters.stage);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ThirdPartyClaim[];
    },
    enabled: !!organizationId,
  });

  const createClaim = useMutation({
    mutationFn: async (payload: {
      vehicle_id: string;
      driver_id?: string;
      accident_date: string;
      accident_location?: string;
      description?: string;
      third_party_name?: string;
      third_party_vehicle?: string;
      third_party_insurance?: string;
      third_party_contact?: string;
      police_report_number?: string;
    }) => {
      if (!organizationId) throw new Error("No org");
      const claim_number = `TPC-${Date.now().toString(36).toUpperCase()}`;
      const { data: u } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("accident_claims")
        .insert({
          organization_id: organizationId,
          claim_number,
          fault_party: "third_party",
          incident_type: "third_party_fault",
          status: "filed",
          workflow_stage: payload.police_report_number ? "claim_notification" : "driver_report",
          ...payload,
        } as any)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("claim_workflow_transitions").insert({
        organization_id: organizationId,
        claim_id: data.id,
        from_stage: null,
        to_stage: payload.police_report_number ? "claim_notification" : "driver_report",
        decision: "created",
        performed_by: u.user?.id,
        performed_by_name: u.user?.email ?? null,
        notes: "Claim created",
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["third-party-claims"] });
      toast.success("Third-party claim created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transition = useMutation({
    mutationFn: async (args: {
      id: string;
      to_stage: ClaimStage;
      decision?: string;
      notes?: string;
      patch?: Partial<ThirdPartyClaim>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: existing, error: fetchErr } = await supabase
        .from("accident_claims")
        .select("workflow_stage, organization_id")
        .eq("id", args.id)
        .single();
      if (fetchErr) throw fetchErr;

      const now = new Date().toISOString();
      const update: any = { workflow_stage: args.to_stage, ...args.patch };

      // Auto-stamp based on stage
      if (args.to_stage === "completeness_review") {
        update.completeness_checked_by = u.user?.id;
        update.completeness_checked_at = now;
      }
      if (args.to_stage === "request_quotations") update.quotations_requested_at = now;
      if (args.to_stage === "quotation_selection") update.quotation_selected_at = now;
      if (args.to_stage === "vehicle_handover") update.vehicle_handover_at = now;
      if (args.to_stage === "repair_completed") update.repair_completion_reported_at = now;
      if (args.to_stage === "vehicle_returned") update.vehicle_returned_at = now;
      if (args.to_stage === "receipt_signed") update.receipt_signed_at = now;
      if (args.to_stage === "salvage_recovery") update.salvage_collected_at = now;
      if (args.to_stage === "compensation_request") update.compensation_requested_at = now;
      if (args.to_stage === "amount_collected") update.collected_at = now;
      if (args.to_stage === "legal_division") update.legal_filed_at = now;
      if (args.to_stage === "legal_outcome") update.legal_outcome_at = now;
      if (args.to_stage === "document_archived") {
        update.archived = true;
        update.archived_at = now;
      }
      if (args.to_stage === "closed" || args.to_stage === "not_covered_end") {
        update.status = "settled";
        update.settled_at = now;
      }

      const { error } = await supabase.from("accident_claims").update(update).eq("id", args.id);
      if (error) throw error;

      await supabase.from("claim_workflow_transitions").insert({
        organization_id: existing.organization_id,
        claim_id: args.id,
        from_stage: existing.workflow_stage,
        to_stage: args.to_stage,
        decision: args.decision ?? null,
        performed_by: u.user?.id,
        performed_by_name: u.user?.email ?? null,
        notes: args.notes ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["third-party-claims"] });
      qc.invalidateQueries({ queryKey: ["claim-transitions"] });
      toast.success("Stage updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { claims, isLoading, createClaim, transition };
};

export const useClaimTransitions = (claimId: string | null) => {
  return useQuery({
    queryKey: ["claim-transitions", claimId],
    queryFn: async () => {
      if (!claimId) return [];
      const { data, error } = await supabase
        .from("claim_workflow_transitions")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ClaimTransition[];
    },
    enabled: !!claimId,
  });
};
