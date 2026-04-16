import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

// FMG-FMG 18 — Vehicle Accident Maintenance Management NOT Covered by Insurance
// 9-step workflow across Eligible Driver, Fleet Operation, Fleet Maintenance, Sourcing/SCM
export type InternalStage =
  | "driver_report"              // 1 — Driver reports accident in writing to supervisor
  | "fleet_ops_analysis"         // 2 — Fleet Ops analyzes the document & accident
  | "coverage_decision"          // Decision — Covered by insurance?
  | "covered_redirect"           // ERM-INM 06 — Routed to third-party claim flow (terminal)
  | "negligence_check"           // 3 — Check if driver negligence caused accident
  | "discipline_action"          // Employee Discipline Action Procedure (terminal)
  | "consolidation"              // 4 — Consolidate info; not covered, maintained by ET
  | "contract_check"             // 5 — Identify if damaged parts maintainable per existing contract
  | "use_existing_contract"      // FMG-FMG 05 — Maintained per existing contract (terminal)
  | "supplier_short_list"        // SCM-SPR 01 — Supplier short list
  | "procurement_management"     // SCM-PRO 01 — Procurement management
  | "supplier_notification"      // 7 — Notify selected supplier / partner
  | "maintenance_followup"       // 8 — Follow-up maintenance as per PO
  | "maintenance_complete_check" // Decision — Complete?
  | "scd_confirmation"           // 9 — Provide confirmation to SCD
  | "service_confirmation"       // SCM-PRO 05 — Service / work delivery confirmation (PO/contract)
  | "closed";

export type InternalLane = "driver" | "fleet_ops" | "fleet_maintenance" | "sourcing";

export const STAGE_LANES: Record<InternalStage, InternalLane> = {
  driver_report: "driver",
  fleet_ops_analysis: "fleet_ops",
  coverage_decision: "fleet_ops",
  covered_redirect: "fleet_ops",
  negligence_check: "fleet_ops",
  discipline_action: "fleet_ops",
  consolidation: "fleet_ops",
  contract_check: "fleet_maintenance",
  use_existing_contract: "fleet_maintenance",
  supplier_short_list: "sourcing",
  procurement_management: "sourcing",
  supplier_notification: "sourcing",
  maintenance_followup: "fleet_maintenance",
  maintenance_complete_check: "fleet_maintenance",
  scd_confirmation: "fleet_maintenance",
  service_confirmation: "sourcing",
  closed: "fleet_maintenance",
};

export const STAGE_LABEL: Record<InternalStage, string> = {
  driver_report: "1 — Driver Report (Letter/Form)",
  fleet_ops_analysis: "2 — Analyze Document & Accident",
  coverage_decision: "Covered by Insurance?",
  covered_redirect: "ERM-INM 06 — Route to TP Claim",
  negligence_check: "3 — Check Negligence",
  discipline_action: "Discipline Action Procedure",
  consolidation: "4 — Consolidate (Not Covered)",
  contract_check: "5 — Existing Contract?",
  use_existing_contract: "FMG-FMG 05 — Use Contract",
  supplier_short_list: "SCM-SPR 01 — Supplier Short List",
  procurement_management: "SCM-PRO 01 — Procurement",
  supplier_notification: "7 — Notify Supplier",
  maintenance_followup: "8 — Follow-up Maintenance",
  maintenance_complete_check: "Complete?",
  scd_confirmation: "9 — SCD Confirmation",
  service_confirmation: "SCM-PRO 05 — Service Confirmation",
  closed: "Closed",
};

export interface InternalAccidentClaim {
  id: string;
  organization_id: string;
  claim_number: string;
  vehicle_id: string;
  driver_id: string | null;
  supervisor_name: string | null;
  accident_date: string;
  accident_location: string | null;
  description: string | null;
  damage_description: string | null;
  damaged_parts: string[] | null;
  report_document_url: string | null;
  photos: string[] | null;
  workflow_stage: InternalStage;
  status: string;
  document_analyzed_at: string | null;
  covered_by_insurance: boolean | null;
  coverage_notes: string | null;
  third_party_claim_id: string | null;
  negligence_check_at: string | null;
  negligence_found: boolean | null;
  negligence_notes: string | null;
  discipline_action_reference: string | null;
  discipline_action_at: string | null;
  consolidated_at: string | null;
  consolidation_notes: string | null;
  existing_contract_check_at: string | null;
  existing_contract_found: boolean | null;
  contract_id: string | null;
  procurement_requested_at: string | null;
  procurement_request_number: string | null;
  scm_short_list: any;
  selected_supplier: string | null;
  selected_supplier_contact: string | null;
  supplier_notified_at: string | null;
  estimated_cost: number | null;
  approved_cost: number | null;
  po_number: string | null;
  po_url: string | null;
  po_approved_at: string | null;
  maintenance_started_at: string | null;
  maintenance_completed_at: string | null;
  is_complete: boolean | null;
  follow_up_notes: string | null;
  scd_confirmation_at: string | null;
  scd_confirmation_url: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface InternalTransition {
  id: string;
  claim_id: string;
  from_stage: string | null;
  to_stage: string;
  decision: string | null;
  performed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

export const useInternalAccidentWorkflow = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["internal-accident-claims", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("internal_accident_claims")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as InternalAccidentClaim[];
    },
    enabled: !!organizationId,
  });

  const createClaim = useMutation({
    mutationFn: async (payload: {
      vehicle_id: string;
      driver_id?: string;
      supervisor_name?: string;
      accident_date: string;
      accident_location?: string;
      description?: string;
      damage_description?: string;
      report_document_url?: string;
    }) => {
      if (!organizationId) throw new Error("No org");
      const claim_number = `IAC-${Date.now().toString(36).toUpperCase()}`;
      const { data: u } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("internal_accident_claims")
        .insert({
          organization_id: organizationId,
          claim_number,
          status: "open",
          workflow_stage: "fleet_ops_analysis",
          created_by: u.user?.id,
          ...payload,
        })
        .select()
        .single();
      if (error) throw error;

      await (supabase as any).from("internal_claim_transitions").insert({
        organization_id: organizationId,
        claim_id: data.id,
        from_stage: null,
        to_stage: "fleet_ops_analysis",
        decision: "created",
        performed_by: u.user?.id,
        performed_by_name: u.user?.email ?? null,
        notes: "Driver submitted accident report",
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internal-accident-claims"] });
      toast.success("Accident report submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transition = useMutation({
    mutationFn: async (args: {
      id: string;
      to_stage: InternalStage;
      decision?: string;
      notes?: string;
      patch?: Partial<InternalAccidentClaim>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("internal_accident_claims")
        .select("workflow_stage, organization_id")
        .eq("id", args.id)
        .single();
      if (fetchErr) throw fetchErr;

      const now = new Date().toISOString();
      const update: any = { workflow_stage: args.to_stage, ...args.patch };

      if (args.to_stage === "fleet_ops_analysis") update.document_analyzed_at = now;
      if (args.to_stage === "negligence_check") update.negligence_check_at = now;
      if (args.to_stage === "discipline_action") update.discipline_action_at = now;
      if (args.to_stage === "consolidation") update.consolidated_at = now;
      if (args.to_stage === "contract_check") update.existing_contract_check_at = now;
      if (args.to_stage === "procurement_management") update.procurement_requested_at = now;
      if (args.to_stage === "supplier_notification") update.supplier_notified_at = now;
      if (args.to_stage === "maintenance_followup") update.maintenance_started_at = now;
      if (args.to_stage === "scd_confirmation") update.scd_confirmation_at = now;
      if (args.to_stage === "closed" || args.to_stage === "covered_redirect" ||
          args.to_stage === "discipline_action" || args.to_stage === "use_existing_contract" ||
          args.to_stage === "service_confirmation") {
        update.status = "closed";
        update.closed_at = now;
      }

      const { error } = await (supabase as any)
        .from("internal_accident_claims")
        .update(update)
        .eq("id", args.id);
      if (error) throw error;

      await (supabase as any).from("internal_claim_transitions").insert({
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
      qc.invalidateQueries({ queryKey: ["internal-accident-claims"] });
      qc.invalidateQueries({ queryKey: ["internal-claim-transitions"] });
      toast.success("Stage updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { claims, isLoading, createClaim, transition };
};

export const useInternalClaimTransitions = (claimId: string | null) => {
  return useQuery({
    queryKey: ["internal-claim-transitions", claimId],
    queryFn: async () => {
      if (!claimId) return [];
      const { data, error } = await (supabase as any)
        .from("internal_claim_transitions")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as InternalTransition[];
    },
    enabled: !!claimId,
  });
};
