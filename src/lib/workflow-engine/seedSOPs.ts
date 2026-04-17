// Phase A — Idempotent seeder that upserts the 14 SOP workflows into the
// `workflows` table as visual graphs. Re-running this function will UPDATE
// existing seeded SOPs in place (matched by name), preserving their UUIDs and
// run history.
import { supabase } from "@/integrations/supabase/client";
import {
  fleetInspectionConfig, vehicleRegistrationConfig, vehicleInsuranceRenewalConfig,
  preventiveMaintenanceConfig, breakdownMaintenanceConfig, vehicleDispatchConfig,
  driverOnboardingConfig, driverTrainingConfig, driverAllowanceConfig,
  vehicleDisposalConfig, roadsideAssistanceConfig, licenseRenewalConfig,
  outsourceRentalConfig, safetyComfortConfig,
} from "./configs";
import { convertSopConfigToGraph } from "./sopConverter";
import type { WorkflowConfig } from "./types";

const ALL_SOPS: WorkflowConfig[] = [
  fleetInspectionConfig, vehicleRegistrationConfig, vehicleInsuranceRenewalConfig,
  preventiveMaintenanceConfig, breakdownMaintenanceConfig, vehicleDispatchConfig,
  driverOnboardingConfig, driverTrainingConfig, driverAllowanceConfig,
  vehicleDisposalConfig, roadsideAssistanceConfig, licenseRenewalConfig,
  outsourceRentalConfig, safetyComfortConfig,
];

export interface SeedReport {
  inserted: number;
  updated: number;
  total: number;
  errors: string[];
}

export async function seedSOPWorkflows(
  organizationId: string,
  userId?: string,
): Promise<SeedReport> {
  const report: SeedReport = { inserted: 0, updated: 0, total: ALL_SOPS.length, errors: [] };
  if (!organizationId) {
    report.errors.push("No organization selected");
    return report;
  }

  // Fetch existing seeded SOPs (matched by name) so we can update in-place.
  const seededNames = ALL_SOPS.map((c) => `${c.sopCode} — ${c.title}`);
  const { data: existing, error: fetchErr } = await supabase
    .from("workflows")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("category", "sop")
    .in("name", seededNames);

  if (fetchErr) {
    report.errors.push(`Failed to fetch existing SOPs: ${fetchErr.message}`);
    return report;
  }
  const existingByName = new Map((existing || []).map((w: any) => [w.name, w.id]));

  for (const config of ALL_SOPS) {
    try {
      const graph = convertSopConfigToGraph(config);
      const existingId = existingByName.get(graph.name);

      if (existingId) {
        const { error } = await supabase
          .from("workflows")
          .update({
            description: graph.description,
            category: graph.category,
            nodes: graph.nodes as any,
            edges: graph.edges as any,
            // Don't touch status/version/run_count on update.
          })
          .eq("id", existingId);
        if (error) throw error;
        report.updated++;
      } else {
        const { error } = await supabase.from("workflows").insert({
          organization_id: organizationId,
          name: graph.name,
          description: graph.description,
          category: graph.category,
          nodes: graph.nodes as any,
          edges: graph.edges as any,
          status: "draft",
          created_by: userId || null,
        });
        if (error) throw error;
        report.inserted++;
      }
    } catch (e: any) {
      report.errors.push(`${config.sopCode}: ${e?.message || "unknown error"}`);
    }
  }

  return report;
}
