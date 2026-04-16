import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export type ClaimStage =
  | "driver_report"          // Step 1: Driver reports to police
  | "claim_notification"     // Step 2: Driver completes claim notification w/ Fleet Inspector
  | "completeness_review"    // Step 3: Fleet Operation reviews for completeness
  | "documents_sent"         // Step 4: Send claim documents
  | "insurance_processing"   // Step 5: Insurance Mgmt forwards to insurance company
  | "third_party_dealing"    // Step 6: Insurance company deals with third party (within coverage)
  | "finance_settlement"     // Step 7: Inform Finance to settle payment
  | "ap_processing"          // FAM-APY 01 — Account Payable Section
  | "notification_letter"    // Step 8: Send notification letter to Fleet Operation Mgmt
  | "closed";

export const STAGE_ORDER: ClaimStage[] = [
  "driver_report",
  "claim_notification",
  "completeness_review",
  "documents_sent",
  "insurance_processing",
  "third_party_dealing",
  "finance_settlement",
  "ap_processing",
  "notification_letter",
  "closed",
];

export const STAGE_LANES: Record<ClaimStage, "driver" | "fleet_ops" | "ap_disbursement" | "insurance_mgmt" | "insurance_co"> = {
  driver_report: "driver",
  claim_notification: "driver",
  completeness_review: "fleet_ops",
  documents_sent: "fleet_ops",
  insurance_processing: "insurance_mgmt",
  third_party_dealing: "insurance_co",
  finance_settlement: "insurance_mgmt",
  ap_processing: "ap_disbursement",
  notification_letter: "insurance_mgmt",
  closed: "insurance_mgmt",
};

export const STAGE_LABEL: Record<ClaimStage, string> = {
  driver_report: "1 — Police Report",
  claim_notification: "2 — Claim Notification Form",
  completeness_review: "3 — Review Completeness",
  documents_sent: "4 — Send Claim Documents",
  insurance_processing: "5 — Forward to Insurance Co.",
  third_party_dealing: "6 — Deal w/ Third Party",
  finance_settlement: "7 — Finance Settlement",
  ap_processing: "FAM-APY 01 — Account Payable",
  notification_letter: "8 — Notify Fleet Ops Mgmt",
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
      decision?: "approve" | "reject" | "forward" | "complete" | "yes" | "no";
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
        update.completeness_check = args.decision === "approve" ? "complete" : "incomplete";
      }
      if (args.to_stage === "insurance_processing") {
        update.forwarded_to_insurance_by = u.user?.id;
        update.forwarded_to_insurance_at = now;
      }
      if (args.to_stage === "third_party_dealing") {
        update.third_party_dealt_at = now;
      }
      if (args.to_stage === "finance_settlement") {
        update.finance_notified_by = u.user?.id;
        update.finance_notified_at = now;
      }
      if (args.to_stage === "notification_letter") {
        update.notification_letter_sent_by = u.user?.id;
        update.notification_letter_sent_at = now;
      }
      if (args.to_stage === "closed") {
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
